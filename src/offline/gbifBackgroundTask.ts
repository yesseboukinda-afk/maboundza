import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { syncGbifSpeciesToLocal } from '@/services/gbif';

export const GBIF_BACKGROUND_TASK = 'maboundza-gbif-cache-sync';

TaskManager.defineTask(GBIF_BACKGROUND_TASK, async () => {
  try {
    await syncGbifSpeciesToLocal();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.error('La synchronisation GBIF en arrière-plan a échoué:', error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerGbifBackgroundTask(): Promise<void> {
  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) {
    return;
  }

  await BackgroundTask.registerTaskAsync(GBIF_BACKGROUND_TASK, {
    minimumInterval: 60,
  });
}
