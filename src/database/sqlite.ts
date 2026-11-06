import * as SQLite from 'expo-sqlite';
import {
  Plant,
  HerbariumEntry,
  GbifSpeciesPhoto,
  GbifSpeciesRecord,
} from '@/types';

let db: SQLite.SQLiteDatabase | null = null;

export async function getLocalDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('maboundza_offline.db');
    await initLocalDatabase(db);
  }
  return db;
}

async function initLocalDatabase(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    -- Cached Offline Plant Fiches
    CREATE TABLE IF NOT EXISTS local_plants (
      id TEXT PRIMARY KEY,
      scientific_name TEXT NOT NULL,
      french_name TEXT NOT NULL,
      family_name TEXT,
      botanical_description TEXT,
      toxicity_level TEXT,
      precautions TEXT,
      image_url TEXT,
      json_payload TEXT NOT NULL,
      cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS local_gbif_species (
      id TEXT PRIMARY KEY,
      gbif_species_key INTEGER NOT NULL UNIQUE,
      scientific_name TEXT NOT NULL,
      family_name TEXT,
      genus TEXT,
      authorship TEXT,
      common_name TEXT,
      common_name_language TEXT,
      occurrence_count INTEGER NOT NULL,
      source_url TEXT NOT NULL,
      cached_at TEXT NOT NULL,
      local_image_uri TEXT,
      image_credit TEXT,
      image_license TEXT,
      image_source_url TEXT,
      photo_checked_at TEXT,
      photo_error TEXT
    );

    CREATE TABLE IF NOT EXISTS local_gbif_photos (
      id TEXT PRIMARY KEY,
      species_id TEXT NOT NULL,
      remote_url TEXT NOT NULL,
      local_image_uri TEXT NOT NULL,
      image_credit TEXT NOT NULL,
      image_license TEXT NOT NULL,
      image_source_url TEXT NOT NULL,
      cached_at TEXT NOT NULL,
      UNIQUE(species_id, remote_url)
    );

    CREATE TABLE IF NOT EXISTS local_gbif_excluded_species (
      gbif_species_key INTEGER PRIMARY KEY
    );

    -- Local Herbarium Entries
    CREATE TABLE IF NOT EXISTS local_herbarium (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plant_id TEXT,
      custom_title TEXT,
      captured_image_url TEXT NOT NULL,
      organ_type TEXT,
      latitude REAL,
      longitude REAL,
      location_name TEXT,
      notes TEXT,
      scanned_at TEXT,
      is_synced INTEGER DEFAULT 0
    );

    -- Offline Mutation Sync Queue
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      action_type TEXT NOT NULL, -- 'SAVE_HERBARIUM', 'SUBMIT_CONTRIBUTION', 'RECORD_SCAN'
      payload_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      retry_count INTEGER DEFAULT 0
    );
  `);

  const speciesColumns = await database.getAllAsync<{ name: string }>(
    'PRAGMA table_info(local_gbif_species)'
  );
  const existingColumns = new Set(speciesColumns.map((column) => column.name));
  const photoColumns = [
    ['local_image_uri', 'TEXT'],
    ['image_credit', 'TEXT'],
    ['image_license', 'TEXT'],
    ['image_source_url', 'TEXT'],
    ['photo_checked_at', 'TEXT'],
    ['photo_error', 'TEXT'],
  ] as const;
  if (!existingColumns.has('common_name_language')) {
    await database.execAsync(
      'ALTER TABLE local_gbif_species ADD COLUMN common_name_language TEXT'
    );
  }
  for (const [name, type] of photoColumns) {
    if (!existingColumns.has(name)) {
      await database.execAsync(`ALTER TABLE local_gbif_species ADD COLUMN ${name} ${type}`);
    }
  }

  await database.runAsync(
    `UPDATE local_gbif_species
     SET photo_checked_at = NULL, photo_error = NULL
     WHERE photo_error = ?`,
    ['L’image GBIF dépasse la taille maximale autorisée de 5 Mo.']
  );

  await database.withTransactionAsync(async () => {
    const legacyPhotos = await database.getAllAsync<
      Pick<GbifSpeciesRecord, 'id' | 'local_image_uri' | 'image_credit' | 'image_license' | 'image_source_url'>
    >(
      `SELECT id, local_image_uri, image_credit, image_license, image_source_url
       FROM local_gbif_species WHERE local_image_uri IS NOT NULL`
    );
    for (const photo of legacyPhotos) {
      if (!photo.local_image_uri) {
        continue;
      }
      await database.runAsync(
        `INSERT OR IGNORE INTO local_gbif_photos
         (id, species_id, remote_url, local_image_uri, image_credit, image_license, image_source_url, cached_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `legacy-${photo.id}`,
          photo.id,
          photo.local_image_uri,
          photo.local_image_uri,
          photo.image_credit ?? 'Auteur non renseigné',
          photo.image_license ?? 'Licence non renseignée',
          photo.image_source_url ?? '',
          new Date().toISOString(),
        ]
      );
    }
  });
}

export async function getLocalGbifSpecies(
  query?: string,
  limit = 60,
  offset = 0
): Promise<GbifSpeciesRecord[]> {
  const database = await getLocalDatabase();
  const normalizedQuery = query?.trim();
  const pageSize = Math.max(1, Math.floor(limit));
  const pageOffset = Math.max(0, Math.floor(offset));
  const species = normalizedQuery
    ? await database.getAllAsync<GbifSpeciesRecord>(
        `SELECT * FROM local_gbif_species
         WHERE scientific_name LIKE ? OR family_name LIKE ? OR genus LIKE ? OR common_name LIKE ?
         ORDER BY occurrence_count DESC, scientific_name ASC
         LIMIT ? OFFSET ?`,
        [...Array(4).fill(`%${normalizedQuery}%`), pageSize, pageOffset]
      )
    : await database.getAllAsync<GbifSpeciesRecord>(
        `SELECT * FROM local_gbif_species
         ORDER BY occurrence_count DESC, scientific_name ASC
         LIMIT ? OFFSET ?`,
        [pageSize, pageOffset]
      );
  if (species.length === 0) {
    return species;
  }

  const photosBySpecies = new Map<string, GbifSpeciesPhoto[]>();
  const speciesIds = species.map((record) => record.id);
  for (let offset = 0; offset < speciesIds.length; offset += 500) {
    const speciesIdBatch = speciesIds.slice(offset, offset + 500);
    const placeholders = speciesIdBatch.map(() => '?').join(', ');
    const photos = await database.getAllAsync<GbifSpeciesPhoto>(
      `SELECT * FROM local_gbif_photos WHERE species_id IN (${placeholders}) ORDER BY species_id, cached_at ASC`,
      speciesIdBatch
    );
    for (const photo of photos) {
      const speciesPhotos = photosBySpecies.get(photo.species_id) ?? [];
      speciesPhotos.push(photo);
      photosBySpecies.set(photo.species_id, speciesPhotos);
    }
  }

  return species.map((record) => ({
    ...record,
    photos: photosBySpecies.get(record.id) ?? [],
  }));
}

export async function getLocalGbifSpeciesCount(query?: string): Promise<number> {
  const database = await getLocalDatabase();
  const normalizedQuery = query?.trim();
  const row = normalizedQuery
    ? await database.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) AS count FROM local_gbif_species
         WHERE scientific_name LIKE ? OR family_name LIKE ? OR genus LIKE ? OR common_name LIKE ?`,
        [...Array(4).fill(`%${normalizedQuery}%`)]
      )
    : await database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM local_gbif_species'
      );
  return row?.count ?? 0;
}

export async function getLocalGbifSpeciesKeys(): Promise<Set<number>> {
  const database = await getLocalDatabase();
  const rows = await database.getAllAsync<{ gbif_species_key: number }>(
    `SELECT gbif_species_key FROM local_gbif_species
     UNION SELECT gbif_species_key FROM local_gbif_excluded_species`
  );
  return new Set(rows.map((row) => row.gbif_species_key));
}

export async function getLocalGbifSpeciesNeedingFrenchNames(
  limit: number
): Promise<Array<Pick<GbifSpeciesRecord, 'gbif_species_key' | 'scientific_name'>>> {
  const database = await getLocalDatabase();
  return database.getAllAsync(
    `SELECT gbif_species_key, scientific_name FROM local_gbif_species
     WHERE common_name_language IS NULL
     ORDER BY occurrence_count DESC, scientific_name ASC
     LIMIT ?`,
    [Math.max(1, Math.floor(limit))]
  );
}

export async function updateLocalGbifSpeciesFrenchName(
  speciesKey: number,
  commonName: string | null
): Promise<void> {
  const database = await getLocalDatabase();
  await database.runAsync(
    `UPDATE local_gbif_species
     SET common_name = ?, common_name_language = ?
     WHERE gbif_species_key = ?`,
    [commonName, commonName ? 'fra' : 'und', speciesKey]
  );
}

export async function saveLocalGbifExcludedSpeciesKeys(keys: number[]): Promise<void> {
  if (keys.length === 0) {
    return;
  }

  const database = await getLocalDatabase();
  await database.withTransactionAsync(async () => {
    for (const key of keys) {
      await database.runAsync(
        'INSERT OR IGNORE INTO local_gbif_excluded_species (gbif_species_key) VALUES (?)',
        [key]
      );
    }
  });
}

export async function getLocalGbifSpeciesNeedingPhotos(
  limit: number,
  photosPerSpecies: number,
  forceRetry = false
): Promise<GbifSpeciesRecord[]> {
  const database = await getLocalDatabase();
  const retryBefore = forceRetry
    ? new Date().toISOString()
    : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  return database.getAllAsync<GbifSpeciesRecord>(
    `SELECT * FROM local_gbif_species
     WHERE (SELECT COUNT(*) FROM local_gbif_photos WHERE species_id = local_gbif_species.id) < ?
       AND (photo_checked_at IS NULL OR photo_checked_at < ?)
     ORDER BY
       (SELECT COUNT(*) FROM local_gbif_photos WHERE species_id = local_gbif_species.id) ASC,
       occurrence_count DESC,
       scientific_name ASC
     LIMIT ?`,
    [photosPerSpecies, retryBefore, limit]
  );
}

export async function getLocalGbifSpeciesPhotoUrls(speciesId: string): Promise<Set<string>> {
  const database = await getLocalDatabase();
  const rows = await database.getAllAsync<{ remote_url: string }>(
    'SELECT remote_url FROM local_gbif_photos WHERE species_id = ?',
    [speciesId]
  );
  return new Set(rows.map((row) => row.remote_url));
}

export async function saveLocalGbifSpeciesPhoto(
  speciesId: string,
  photo: Omit<GbifSpeciesPhoto, 'cached_at'>,
  cachedAt: string
): Promise<void> {
  const database = await getLocalDatabase();
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT OR IGNORE INTO local_gbif_photos
       (id, species_id, remote_url, local_image_uri, image_credit, image_license, image_source_url, cached_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        photo.id,
        speciesId,
        photo.remote_url,
        photo.local_image_uri,
        photo.image_credit,
        photo.image_license,
        photo.image_source_url,
        cachedAt,
      ]
    );
    await database.runAsync(
      `UPDATE local_gbif_species
       SET local_image_uri = COALESCE(local_image_uri, ?),
           image_credit = COALESCE(image_credit, ?),
           image_license = COALESCE(image_license, ?),
           image_source_url = COALESCE(image_source_url, ?)
       WHERE id = ?`,
      [
        photo.local_image_uri,
        photo.image_credit,
        photo.image_license,
        photo.image_source_url,
        speciesId,
      ]
    );
  });
}

export async function updateLocalGbifSpeciesPhotoStatus(
  id: string,
  checkedAt: string | null,
  error?: string
): Promise<void> {
  const database = await getLocalDatabase();
  await database.runAsync(
    'UPDATE local_gbif_species SET photo_checked_at = ?, photo_error = ? WHERE id = ?',
    [checkedAt, error ?? null, id]
  );
}

export async function updateLocalGbifSpeciesCounts(
  counts: Array<{ key: number; count: number }>,
  updatedAt: string
): Promise<void> {
  const database = await getLocalDatabase();
  await database.withTransactionAsync(async () => {
    for (const { key, count } of counts) {
      await database.runAsync(
        'UPDATE local_gbif_species SET occurrence_count = ?, cached_at = ? WHERE gbif_species_key = ?',
        [count, updatedAt, key]
      );
    }
  });
}

export async function saveLocalGbifSpecies(records: GbifSpeciesRecord[]): Promise<void> {
  if (records.length === 0) {
    return;
  }

  const database = await getLocalDatabase();
  await database.withTransactionAsync(async () => {
    for (const record of records) {
      await database.runAsync(
        `INSERT OR REPLACE INTO local_gbif_species
         (id, gbif_species_key, scientific_name, family_name, genus, authorship, common_name, common_name_language, occurrence_count, source_url, cached_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.id,
          record.gbif_species_key,
          record.scientific_name,
          record.family_name ?? null,
          record.genus ?? null,
          record.authorship ?? null,
          record.common_name ?? null,
          record.common_name_language ?? 'und',
          record.occurrence_count,
          record.source_url,
          record.cached_at,
        ]
      );
    }
  });
}

export async function savePlantToLocalCache(plant: Plant): Promise<void> {
  const database = await getLocalDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO local_plants (id, scientific_name, french_name, family_name, botanical_description, toxicity_level, precautions, image_url, json_payload)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      plant.id,
      plant.scientific_name,
      plant.french_name,
      plant.family?.scientific_name || '',
      plant.botanical_description,
      plant.safety?.toxicity_level || 'NONE',
      plant.safety?.precautions || '',
      plant.images && plant.images[0] ? plant.images[0].image_url : '',
      JSON.stringify(plant)
    ]
  );
}

export async function replaceLocalPublishedPlants(plants: Plant[]): Promise<void> {
  const database = await getLocalDatabase();
  await database.withTransactionAsync(async () => {
    await database.runAsync('DELETE FROM local_plants');
    for (const plant of plants) {
      await database.runAsync(
        `INSERT OR REPLACE INTO local_plants
         (id, scientific_name, french_name, family_name, botanical_description, toxicity_level, precautions, image_url, json_payload)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          plant.id,
          plant.scientific_name,
          plant.french_name,
          plant.family?.scientific_name || '',
          plant.botanical_description,
          plant.safety?.toxicity_level || 'NONE',
          plant.safety?.precautions || '',
          plant.images?.[0]?.image_url || '',
          JSON.stringify(plant),
        ]
      );
    }
  });
}

export async function getLocalPlants(query?: string): Promise<Plant[]> {
  const database = await getLocalDatabase();
  let sql = 'SELECT json_payload FROM local_plants';
  let params: string[] = [];

  if (query && query.trim().length > 0) {
    sql += ' WHERE french_name LIKE ? OR scientific_name LIKE ?';
    params = [`%${query}%`, `%${query}%`];
  }

  const rows = await database.getAllAsync<{ json_payload: string }>(sql, params);
  return rows.map((r) => JSON.parse(r.json_payload));
}

export async function getLocalPlantById(id: string): Promise<Plant | null> {
  const database = await getLocalDatabase();
  const row = await database.getFirstAsync<{ json_payload: string }>(
    'SELECT json_payload FROM local_plants WHERE id = ?',
    [id]
  );
  return row ? JSON.parse(row.json_payload) : null;
}

export async function saveLocalHerbariumEntry(entry: HerbariumEntry): Promise<void> {
  const database = await getLocalDatabase();
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT OR REPLACE INTO local_herbarium (id, user_id, plant_id, custom_title, captured_image_url, organ_type, latitude, longitude, location_name, notes, scanned_at, is_synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.user_id,
        entry.plant_id || null,
        entry.custom_title || '',
        entry.captured_image_url,
        entry.organ_type,
        entry.latitude ?? null,
        entry.longitude ?? null,
        entry.location_name || '',
        entry.notes || '',
        entry.scanned_at,
        entry.is_synced ? 1 : 0
      ]
    );

    if (!entry.is_synced) {
      await database.runAsync(
        `INSERT OR REPLACE INTO sync_queue (id, action_type, payload_json) VALUES (?, ?, ?)`,
        [entry.id, 'SAVE_HERBARIUM', JSON.stringify(entry)]
      );
    }
  });
}

export async function getLocalHerbariumEntries(userId: string): Promise<HerbariumEntry[]> {
  const database = await getLocalDatabase();
  const rows = await database.getAllAsync<any>(
    'SELECT * FROM local_herbarium WHERE user_id = ? ORDER BY scanned_at DESC',
    [userId]
  );

  return rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    plant_id: r.plant_id,
    custom_title: r.custom_title,
    captured_image_url: r.captured_image_url,
    organ_type: r.organ_type,
    latitude: r.latitude,
    longitude: r.longitude,
    location_name: r.location_name,
    notes: r.notes,
    scanned_at: r.scanned_at,
    is_synced: r.is_synced === 1,
  }));
}
