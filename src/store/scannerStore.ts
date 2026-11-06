import { create } from 'zustand';

interface ScannerState {
  capturedImageUri: string | null;
  isAnalyzing: boolean;
  setCapturedImageUri: (uri: string | null) => void;
  setIsAnalyzing: (analyzing: boolean) => void;
  resetScanner: () => void;
}

export const useScannerStore = create<ScannerState>((set) => ({
  capturedImageUri: null,
  isAnalyzing: false,

  setCapturedImageUri: (capturedImageUri) => set({ capturedImageUri }),
  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),

  resetScanner: () => set({
    capturedImageUri: null,
    isAnalyzing: false,
  }),
}));
