import * as SQLite from 'expo-sqlite';
import { Plant, HerbariumEntry } from '@/types';

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
