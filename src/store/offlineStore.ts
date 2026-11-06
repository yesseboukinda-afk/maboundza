import { create } from 'zustand';

interface OfflineState {
  isOnline: boolean;
  pendingSyncQueueCount: number;
  setIsOnline: (online: boolean) => void;
  setPendingSyncQueueCount: (count: number) => void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  isOnline: true,
  pendingSyncQueueCount: 0,

  setIsOnline: (isOnline) => set({ isOnline }),
  setPendingSyncQueueCount: (pendingSyncQueueCount) => set({ pendingSyncQueueCount }),
}));
