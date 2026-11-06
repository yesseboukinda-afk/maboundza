import {
  getLocalDatabase,
  getLocalHerbariumEntries,
  saveLocalHerbariumEntry,
  savePlantToLocalCache,
} from '@/database/sqlite';
import { database, storage } from '@/services/firebase';
import { get, onValue, ref, set } from 'firebase/database';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import * as FileSystem from 'expo-file-system/legacy';
import { HerbariumEntry, Plant } from '@/types';

export interface PendingSyncItem {
  id: string;
  action_type: string;
  payload_json: string;
  retry_count: number;
}

export async function processSyncQueue(userId: string): Promise<{ processedCount: number; successCount: number }> {
  const db = await getLocalDatabase();
  const queue = await db.getAllAsync<PendingSyncItem>(
    'SELECT * FROM sync_queue ORDER BY created_at ASC LIMIT 50'
  );

  let successCount = 0;

  for (const item of queue) {
    try {
      const payload = JSON.parse(item.payload_json);
      const ownerId = payload.user_id ?? payload.contributor_id;
      if (ownerId !== userId) {
        continue;
      }

      if (item.action_type === 'SAVE_HERBARIUM') {
        if (!database) {
          throw new Error('Firebase is not configured.');
        }
        const capturedImageUrl = await uploadObservationPhoto(
          userId,
          payload.id,
          payload.captured_image_url
        );
        await set(ref(database, `herbarium_entries/${payload.user_id}/${payload.id}`), {
          id: payload.id,
          user_id: payload.user_id,
          plant_id: payload.plant_id ?? null,
          custom_title: payload.custom_title ?? '',
          captured_image_url: capturedImageUrl,
          organ_type: payload.organ_type ?? 'unknown',
          latitude: payload.latitude ?? null,
          longitude: payload.longitude ?? null,
          location_name: payload.location_name ?? '',
          notes: payload.notes ?? '',
          scanned_at: payload.scanned_at ?? new Date().toISOString(),
        });

        await db.runAsync('UPDATE local_herbarium SET is_synced = 1 WHERE id = ?', [payload.id]);
        await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [item.id]);
        successCount++;
      } else if (item.action_type === 'SUBMIT_CONTRIBUTION') {
        if (!database) {
          throw new Error('Firebase is not configured.');
        }
        const contributionRef = ref(database, `contributions/${payload.contributor_id}/${item.id}`);
        await set(contributionRef, {
          id: item.id,
          contributor_id: payload.contributor_id,
          type: payload.type,
          proposed_scientific_name: payload.proposed_scientific_name,
          proposed_french_name: payload.proposed_french_name,
          proposed_local_name: payload.proposed_local_name,
          language_id: payload.language_id,
          proposed_usage: payload.proposed_usage,
          latitude: payload.latitude,
          longitude: payload.longitude,
        });

        await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [item.id]);
        successCount++;
      }
    } catch (err) {
      console.warn(`Sync queue processing error for item ${item.id}:`, err);
      await db.runAsync('UPDATE sync_queue SET retry_count = retry_count + 1 WHERE id = ?', [item.id]);
    }
  }

  return { processedCount: queue.length, successCount };
}

export function subscribeToAccountData(userId: string): () => void {
  if (!database) {
    return () => {};
  }

  const unsubscribePlants = onValue(
    ref(database, 'plants'),
    (snapshot) => {
      if (!snapshot.exists()) {
        return;
      }

      const plants = Object.values(snapshot.val() as Record<string, Plant>)
        .filter((plant) => plant.is_published);
      void Promise.all(plants.map(savePlantToLocalCache)).catch((error: unknown) => {
        console.error('Unable to cache botanical records for offline use:', error);
      });
    },
    (error) => console.error('Unable to synchronize botanical records:', error)
  );

  const unsubscribeHerbarium = onValue(
    ref(database, `herbarium_entries/${userId}`),
    (snapshot) => {
      if (!snapshot.exists()) {
        return;
      }

      void cacheRemoteHerbariumEntries(userId, snapshot.val() as Record<string, Partial<HerbariumEntry>>)
        .catch((error: unknown) => {
          console.error('Unable to cache remote herbarium entries:', error);
        });
    },
    (error) => console.error('Unable to synchronize herbarium entries:', error)
  );

  return () => {
    unsubscribePlants();
    unsubscribeHerbarium();
  };
}

async function cacheRemoteHerbariumEntries(
  userId: string,
  remoteEntries: Record<string, Partial<HerbariumEntry>>
): Promise<void> {
  const localEntries = await getLocalHerbariumEntries(userId);
  const localEntriesById = new Map(localEntries.map((entry) => [entry.id, entry]));

  for (const [entryId, remoteEntry] of Object.entries(remoteEntries)) {
    const localEntry = localEntriesById.get(remoteEntry.id ?? entryId);
    if (localEntry && !localEntry.is_synced) {
      continue;
    }

    let capturedImageUrl = localEntry?.captured_image_url ?? remoteEntry.captured_image_url ?? '';
    if (typeof remoteEntry.captured_image_url === 'string' && /^https?:\/\//.test(remoteEntry.captured_image_url)) {
      try {
        capturedImageUrl = await cacheRemotePhoto(userId, remoteEntry.id ?? entryId, remoteEntry.captured_image_url);
      } catch (error) {
        console.error(`Unable to cache herbarium photo ${entryId}:`, error);
        capturedImageUrl = remoteEntry.captured_image_url;
      }
    }

    await saveLocalHerbariumEntry({
      ...remoteEntry,
      id: remoteEntry.id ?? entryId,
      user_id: userId,
      captured_image_url: capturedImageUrl,
      organ_type: remoteEntry.organ_type ?? 'entire_plant',
      scanned_at: remoteEntry.scanned_at ?? new Date().toISOString(),
      is_synced: true,
    });
  }
}

async function uploadObservationPhoto(userId: string, entryId: string, localUri: unknown): Promise<string | null> {
  if (typeof localUri !== 'string' || /^https?:\/\//.test(localUri)) {
    return typeof localUri === 'string' ? localUri : null;
  }
  if (!storage) {
    throw new Error('Photo storage is not configured.');
  }

  const extension = localUri.split('.').pop()?.split(/[?#]/)[0]?.toLowerCase();
  const safeExtension = extension && /^[a-z0-9]{1,5}$/.test(extension) ? extension : 'jpg';
  const contentType = safeExtension === 'png'
    ? 'image/png'
    : safeExtension === 'webp'
      ? 'image/webp'
      : 'image/jpeg';
  const response = await fetch(localUri);
  if (!response.ok) {
    throw new Error(`Unable to read observation photo (${response.status}).`);
  }
  const photo = await response.blob();
  const remotePhotoRef = storageRef(storage, `herbarium_images/${userId}/${entryId}.${safeExtension}`);
  await uploadBytes(remotePhotoRef, photo, { contentType });
  return getDownloadURL(remotePhotoRef);
}

async function cacheRemotePhoto(userId: string, entryId: string, remoteUrl: string): Promise<string> {
  if (!FileSystem.documentDirectory) {
    throw new Error('Local photo storage is unavailable.');
  }

  const photoDirectory = `${FileSystem.documentDirectory}observations/`;
  await FileSystem.makeDirectoryAsync(photoDirectory, { intermediates: true });
  const encodedName = encodeURIComponent(`${userId}_${entryId}`);
  const urlPath = remoteUrl.split('?')[0];
  const extension = urlPath.split('.').pop()?.toLowerCase();
  const safeExtension = extension && /^[a-z0-9]{1,5}$/.test(extension) ? extension : 'jpg';
  const localUri = `${photoDirectory}${encodedName}.${safeExtension}`;
  const fileInfo = await FileSystem.getInfoAsync(localUri);
  if (!fileInfo.exists) {
    const result = await FileSystem.downloadAsync(remoteUrl, localUri);
    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Unable to download herbarium photo (${result.status}).`);
    }
  }
  return localUri;
}
