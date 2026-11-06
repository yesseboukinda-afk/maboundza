import {
  getLocalGbifSpeciesPhotoUrls,
  getLocalGbifSpeciesNeedingPhotos,
  getLocalGbifSpeciesCount,
  getLocalGbifSpeciesKeys,
  getLocalGbifSpeciesNeedingFrenchNames,
  saveLocalGbifExcludedSpeciesKeys,
  saveLocalGbifSpecies,
  saveLocalGbifSpeciesPhoto,
  updateLocalGbifSpeciesPhotoStatus,
  updateLocalGbifSpeciesFrenchName,
  updateLocalGbifSpeciesCounts,
} from '@/database/sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { GbifSpeciesPhoto, GbifSpeciesRecord } from '@/types';

const GBIF_API = 'https://api.gbif.org/v1';
const MAX_SPECIES = 1000;
const MAX_SPECIES_PER_SYNC = 30;
const FACET_PAGE_SIZE = 1000;
const MAX_PHOTOS_PER_SPECIES = 3;
const REQUEST_CONCURRENCY = 6;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_SOURCE_IMAGE_SIZE_BYTES = 30 * 1024 * 1024;
const MAX_CACHED_IMAGE_DIMENSION = 1600;

interface GbifFacetResponse {
  facets?: Array<{
    counts?: Array<{ name: string; count: number }>;
  }>;
}

interface GbifTaxon {
  key: number;
  rank?: string;
  taxonomicStatus?: string;
  scientificName?: string;
  family?: string;
  genus?: string;
  authorship?: string;
  vernacularName?: string;
}

interface GbifVernacularName {
  vernacularName?: string;
  language?: string;
}

interface GbifVernacularResponse {
  results?: GbifVernacularName[];
}

interface GbifMedia {
  identifier?: string;
  creator?: string;
  rightsHolder?: string;
  publisher?: string;
  license?: string;
  type?: string;
}

interface GbifOccurrence {
  key: number;
  references?: string;
  media?: GbifMedia[];
}

interface GbifOccurrenceResponse {
  results?: GbifOccurrence[];
}

interface GbifSyncResult {
  cachedCount: number;
  addedCount: number;
  failureCount: number;
  photosAddedCount: number;
  photoFailureCount: number;
  photoErrors: string[];
  hasMore: boolean;
}

let syncInFlight: Promise<GbifSyncResult> | null = null;

export function isGbifNetworkError(error: unknown): boolean {
  const pending: unknown[] = [error];
  const seen = new Set<unknown>();
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || seen.has(current)) {
      continue;
    }
    seen.add(current);
    if (current instanceof Error) {
      if (/unknownhostexception|unable to resolve host|no address associated with hostname|network request failed|network is unreachable|internet connection appears to be offline|fetch failed/i.test(current.message)) {
        return true;
      }
      pending.push(current.cause);
    } else if (typeof current === 'string') {
      if (/unknownhostexception|unable to resolve host|no address associated with hostname|network request failed|network is unreachable|internet connection appears to be offline|fetch failed/i.test(current)) {
        return true;
      }
    } else if (typeof current === 'object' && current !== null && 'cause' in current) {
      pending.push(current.cause);
    }
  }
  return false;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`GBIF a répondu avec le statut HTTP ${response.status}.`);
  }
  return response.json() as Promise<T>;
}

async function getSpeciesFacets(
  offset: number
): Promise<Array<{ key: number; count: number }>> {
  const url = new URL(`${GBIF_API}/occurrence/search`);
  url.searchParams.set('country', 'GA');
  url.searchParams.set('kingdomKey', '6');
  url.searchParams.set('taxonRank', 'SPECIES');
  url.searchParams.set('occurrenceStatus', 'PRESENT');
  url.searchParams.set('limit', '0');
  url.searchParams.set('facet', 'speciesKey');
  url.searchParams.set('facetLimit', String(FACET_PAGE_SIZE));
  url.searchParams.set('facetOffset', String(offset));

  const result = await fetchJson<GbifFacetResponse>(url.toString());
  const counts = result.facets?.[0]?.counts ?? [];
  return counts
    .map(({ name, count }) => ({ key: Number(name), count }))
    .filter(({ key, count }) => Number.isInteger(key) && count > 0);
}

async function fetchTaxon(
  key: number,
  occurrenceCount: number,
  cachedAt: string
): Promise<GbifSpeciesRecord | null> {
  const taxon = await fetchJson<GbifTaxon>(`${GBIF_API}/species/${key}`);
  if (
    taxon.rank !== 'SPECIES' ||
    taxon.taxonomicStatus !== 'ACCEPTED' ||
    !taxon.scientificName
  ) {
    return null;
  }

  let commonName: string | undefined;
  try {
    commonName = await fetchFrenchVernacularName(key);
  } catch (error) {
    if (!isGbifNetworkError(error)) {
      console.warn(`Impossible de récupérer le nom français GBIF pour ${taxon.scientificName}:`, error);
    }
  }
  return {
    id: `gbif-${key}`,
    gbif_species_key: key,
    scientific_name: taxon.scientificName,
    family_name: taxon.family,
    genus: taxon.genus,
    authorship: taxon.authorship,
    common_name: commonName,
    common_name_language: commonName ? 'fra' : 'und',
    occurrence_count: occurrenceCount,
    source_url: `https://www.gbif.org/species/${key}`,
    cached_at: cachedAt,
  };
}

async function fetchFrenchVernacularName(key: number): Promise<string | undefined> {
  const names = await fetchJson<GbifVernacularResponse>(
    `${GBIF_API}/species/${key}/vernacularNames?limit=100`
  );
  const frenchName = names.results?.find(({ language, vernacularName }) =>
    !!vernacularName?.trim() && /^(fra|fre|fr)$/i.test(language?.trim() ?? '')
  )?.vernacularName?.trim();
  return frenchName || undefined;
}

async function refreshFrenchVernacularNames(): Promise<void> {
  const species = await getLocalGbifSpeciesNeedingFrenchNames(MAX_SPECIES_PER_SYNC);
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(REQUEST_CONCURRENCY, species.length) },
    async () => {
      while (nextIndex < species.length) {
        const item = species[nextIndex++];
        try {
          const frenchName = await fetchFrenchVernacularName(item.gbif_species_key);
          await updateLocalGbifSpeciesFrenchName(
            item.gbif_species_key,
            frenchName ?? null
          );
        } catch (error) {
          if (!isGbifNetworkError(error)) {
            console.warn(
              `Impossible de récupérer le nom français GBIF pour ${item.scientific_name}:`,
              error
            );
          }
        }
      }
    }
  );
  await Promise.all(workers);
}

function getReusableImageLicense(license?: string): string | null {
  if (!license) {
    return null;
  }

  const normalized = license.trim().toLowerCase();
  if (/\bcc[-\s]?by[-\s]?nc\b|\bcc[-\s]?by[-\s]?nd\b/.test(normalized)) {
    return null;
  }
  if (/creativecommons\.org\/publicdomain\/zero\/1\.0|(?:^|\W)cc0(?:$|\W)/.test(normalized)) {
    return 'CC0';
  }
  if (
    /creativecommons\.org\/licenses\/by-sa\/(?:2\.0|2\.5|3\.0|4\.0)|\bcc[-\s]?by[-\s]?sa\b/.test(
      normalized
    )
  ) {
    return 'CC BY-SA';
  }
  if (
    /creativecommons\.org\/licenses\/by\/(?:2\.0|2\.5|3\.0|4\.0)|\bcc[-\s]?by\b/.test(
      normalized
    )
  ) {
    return 'CC BY';
  }

  return null;
}

async function findLicensedImage(
  speciesKey: number
): Promise<Array<{ media: GbifMedia; sourceUrl: string; license: string }>> {
  const url = new URL(`${GBIF_API}/occurrence/search`);
  url.searchParams.set('country', 'GA');
  url.searchParams.set('taxonKey', String(speciesKey));
  url.searchParams.set('mediaType', 'StillImage');
  url.searchParams.set('occurrenceStatus', 'PRESENT');
  url.searchParams.set('limit', '12');

  const result = await fetchJson<GbifOccurrenceResponse>(url.toString());
  const candidates: Array<{ media: GbifMedia; sourceUrl: string; license: string }> = [];
  const seenImages = new Set<string>();
  for (const occurrence of result.results ?? []) {
    for (const media of occurrence.media ?? []) {
      const license = getReusableImageLicense(media.license);
      if (!license || media.type?.toLowerCase() !== 'stillimage' || !media.identifier) {
        continue;
      }
      if (seenImages.has(media.identifier)) {
        continue;
      }

      const creator = media.creator || media.rightsHolder;
      if (license !== 'CC0' && !creator) {
        continue;
      }

      let imageUrl: URL;
      try {
        imageUrl = new URL(media.identifier);
      } catch {
        continue;
      }
      if (imageUrl.protocol !== 'https:') {
        continue;
      }

      seenImages.add(media.identifier);
      candidates.push({
        media,
        license,
        sourceUrl:
          occurrence.references && /^https?:\/\//i.test(occurrence.references)
            ? occurrence.references
            : `https://www.gbif.org/occurrence/${occurrence.key}`,
      });
    }
  }

  return candidates;
}

async function downloadGbifImage(
  speciesKey: number,
  photoIndex: number,
  imageUrl: string
): Promise<string> {
  if (!FileSystem.documentDirectory) {
    throw new Error('Le stockage local des images est indisponible.');
  }

  const directory = `${FileSystem.documentDirectory}gbif-images/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });

  const url = new URL(imageUrl);
  const extension = url.pathname.match(/\.(jpe?g|png|webp)$/i)?.[1]?.toLowerCase() ?? 'jpg';
  const localUri = `${directory}gbif-${speciesKey}-${photoIndex}.jpg`;
  const sourceUri = `${directory}gbif-${speciesKey}-${photoIndex}-source.${extension}`;
  const existingFile = await FileSystem.getInfoAsync(localUri);
  if (existingFile.exists) {
    if (existingFile.size !== undefined && existingFile.size <= MAX_IMAGE_SIZE_BYTES) {
      return localUri;
    }
    await FileSystem.deleteAsync(localUri, { idempotent: true });
  }

  let optimizedUri: string | null = null;
  try {
    const download = await FileSystem.downloadAsync(imageUrl, sourceUri);
    if (download.status < 200 || download.status >= 300) {
      throw new Error(`Le téléchargement de l’image GBIF a échoué (HTTP ${download.status}).`);
    }

    const mimeType = download.mimeType?.toLowerCase();
    if (
      mimeType &&
      !mimeType.startsWith('image/') &&
      mimeType !== 'application/octet-stream' &&
      mimeType !== 'binary/octet-stream'
    ) {
      throw new Error(`Le serveur a renvoyé un contenu non image (${download.mimeType}).`);
    }

    const sourceInfo = await FileSystem.getInfoAsync(sourceUri);
    if (!sourceInfo.exists || sourceInfo.size === undefined || sourceInfo.size === 0) {
      throw new Error('Le fichier image GBIF téléchargé est vide.');
    }
    if (sourceInfo.size > MAX_SOURCE_IMAGE_SIZE_BYTES) {
      throw new Error('L’image source GBIF dépasse la limite de téléchargement de 30 Mo.');
    }

    const context = ImageManipulator.manipulate(sourceUri, {
      maxWidth: MAX_CACHED_IMAGE_DIMENSION,
      maxHeight: MAX_CACHED_IMAGE_DIMENSION,
    });
    const renderedImage = await context.renderAsync();
    const optimizedImage = await renderedImage.saveAsync({
      format: SaveFormat.JPEG,
      compress: 0.78,
    });
    optimizedUri = optimizedImage.uri;
    const optimizedInfo = await FileSystem.getInfoAsync(optimizedImage.uri);
    if (
      !optimizedInfo.exists ||
      optimizedInfo.size === undefined ||
      optimizedInfo.size === 0 ||
      optimizedInfo.size > MAX_IMAGE_SIZE_BYTES
    ) {
      throw new Error('La photo GBIF reste trop volumineuse après optimisation.');
    }

    await FileSystem.moveAsync({ from: optimizedImage.uri, to: localUri });
    optimizedUri = null;
    return localUri;
  } catch (error) {
    await FileSystem.deleteAsync(localUri, { idempotent: true });
    throw error;
  } finally {
    await FileSystem.deleteAsync(sourceUri, { idempotent: true });
    if (optimizedUri) {
      await FileSystem.deleteAsync(optimizedUri, { idempotent: true });
    }
  }
}

async function cacheGbifPhotos(
  species: GbifSpeciesRecord
): Promise<{ addedCount: number; error?: string }> {
  const existingImageUrls = await getLocalGbifSpeciesPhotoUrls(species.id);
  const existingPhotoCount = existingImageUrls.size;
  const candidates = await findLicensedImage(species.gbif_species_key);
  let addedCount = 0;
  const errors: string[] = [];

  for (const [candidateIndex, candidate] of candidates.entries()) {
    const imageUrl = candidate.media.identifier;
    if (!imageUrl || existingImageUrls.has(imageUrl)) {
      continue;
    }

    const photoIndex = existingPhotoCount + addedCount + 1;
    try {
      const localImageUri = await downloadGbifImage(
        species.gbif_species_key,
        existingPhotoCount + candidateIndex + 1,
        imageUrl
      );
      const photo: Omit<GbifSpeciesPhoto, 'cached_at'> = {
        id: `gbif-${species.gbif_species_key}-${photoIndex}`,
        species_id: species.id,
        remote_url: imageUrl,
        local_image_uri: localImageUri,
        image_credit:
          candidate.media.creator ||
          candidate.media.rightsHolder ||
          candidate.media.publisher ||
          'Auteur non renseigné',
        image_license: candidate.media.license || candidate.license,
        image_source_url: candidate.sourceUrl,
      };
      await saveLocalGbifSpeciesPhoto(species.id, photo, new Date().toISOString());
      existingImageUrls.add(imageUrl);
      addedCount++;
      if (existingPhotoCount + addedCount >= MAX_PHOTOS_PER_SPECIES || addedCount >= 1) {
        break;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue de téléchargement.';
      errors.push(message);
    }
  }

  const full = existingPhotoCount + addedCount >= MAX_PHOTOS_PER_SPECIES;
  const error = addedCount === 0 && errors.length > 0 ? errors[0] : undefined;
  if (error && !isGbifNetworkError(error)) {
    console.warn(
      `Impossible de récupérer une photo GBIF pour ${species.scientific_name} après ${errors.length} tentative(s): ${error}`
    );
  }
  await updateLocalGbifSpeciesPhotoStatus(
    species.id,
    full || addedCount === 0 ? new Date().toISOString() : null,
    full ? undefined : error
  );
  return { addedCount, error: full ? undefined : error };
}

async function syncGbifSpecies(): Promise<GbifSyncResult> {
  const cachedCount = await getLocalGbifSpeciesCount();
  const cachedKeys = await getLocalGbifSpeciesKeys();
  const availableSlots = Math.max(0, MAX_SPECIES - cachedCount);
  const batchSize = Math.min(availableSlots, MAX_SPECIES_PER_SYNC);
  const facets: Array<{ key: number; count: number }> = [];
  const batch: Array<{ key: number; count: number }> = [];
  let facetOffset = 0;
  let hasMoreFacetPages = false;

  while (batch.length < batchSize) {
    const page = await getSpeciesFacets(facetOffset);
    facets.push(...page);
    const newSpecies = page.filter(({ key }) => !cachedKeys.has(key));
    batch.push(...newSpecies.slice(0, batchSize - batch.length));
    facetOffset += page.length;
    hasMoreFacetPages = page.length === FACET_PAGE_SIZE;
    if (!hasMoreFacetPages) {
      break;
    }
  }

  const cachedAt = new Date().toISOString();
  await updateLocalGbifSpeciesCounts(
    facets.filter(({ key }) => cachedKeys.has(key)),
    cachedAt
  );
  const records: GbifSpeciesRecord[] = [];
  const failures: Error[] = [];
  const excludedKeys: number[] = [];
  let nextIndex = 0;

  const workers = Array.from(
    { length: Math.min(REQUEST_CONCURRENCY, batch.length) },
    async () => {
      while (nextIndex < batch.length) {
        const index = nextIndex++;
        const item = batch[index];
        try {
          const record = await fetchTaxon(item.key, item.count, cachedAt);
          if (record) {
            records.push(record);
          } else {
            excludedKeys.push(item.key);
          }
        } catch (error) {
          failures.push(
            error instanceof Error ? error : new Error('Échec de lecture d’une fiche GBIF.')
          );
        }
      }
    }
  );

  await Promise.all(workers);
  await saveLocalGbifSpecies(records);
  await saveLocalGbifExcludedSpeciesKeys(excludedKeys);
  await refreshFrenchVernacularNames();
  const speciesNeedingPhotos = await getLocalGbifSpeciesNeedingPhotos(
    MAX_SPECIES_PER_SYNC,
    MAX_PHOTOS_PER_SPECIES
  );
  let photosAddedCount = 0;
  let photoFailureCount = 0;
  const photoErrors: string[] = [];
  let nextPhotoIndex = 0;
  const photoWorkers = Array.from(
    { length: Math.min(REQUEST_CONCURRENCY, speciesNeedingPhotos.length) },
    async () => {
      while (nextPhotoIndex < speciesNeedingPhotos.length) {
        const index = nextPhotoIndex++;
        const species = speciesNeedingPhotos[index];
        try {
          const result = await cacheGbifPhotos(species);
          photosAddedCount += result.addedCount;
          if (result.error) {
            photoFailureCount++;
            photoErrors.push(`${species.scientific_name} : ${result.error}`);
          }
        } catch (error) {
          photoFailureCount++;
          const message = error instanceof Error ? error.message : 'Erreur inconnue de récupération.';
          photoErrors.push(`${species.scientific_name} : ${message}`);
          await updateLocalGbifSpeciesPhotoStatus(
            species.id,
            new Date().toISOString(),
            message
          );
          if (!isGbifNetworkError(error)) {
            console.error(`Impossible de récupérer l’image GBIF pour ${species.scientific_name}:`, error);
          }
        }
      }
    }
  );
  await Promise.all(photoWorkers);
  const totalCount = await getLocalGbifSpeciesCount();
  const knownKeys = await getLocalGbifSpeciesKeys();
  const hasMoreSpecies =
    totalCount < MAX_SPECIES &&
    (facets.some(({ key }) => !knownKeys.has(key)) ||
      hasMoreFacetPages ||
      failures.length > 0);
  const hasMorePhotos =
    (await getLocalGbifSpeciesNeedingPhotos(1, MAX_PHOTOS_PER_SPECIES)).length > 0;

  const unexpectedFailures = failures.filter((error) => !isGbifNetworkError(error));
  if (unexpectedFailures.length > 0) {
    console.error('Certaines fiches GBIF n’ont pas pu être récupérées:', unexpectedFailures);
  }

  return {
    cachedCount: totalCount,
    addedCount: records.length,
    failureCount: failures.length,
    photosAddedCount,
    photoFailureCount,
    photoErrors,
    hasMore: hasMoreSpecies || hasMorePhotos,
  };
}

export function syncGbifSpeciesToLocal(): Promise<GbifSyncResult> {
  if (!syncInFlight) {
    syncInFlight = syncGbifSpecies().finally(() => {
      syncInFlight = null;
    });
  }
  return syncInFlight;
}
