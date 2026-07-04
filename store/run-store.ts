import { create } from "zustand";
import type { PipelineStatusResponse } from "@/types";

export interface ActiveRun {
  runId: string;
  label: string;          // pathogen name or "Custom sequence"
  inputType: string;
  status: PipelineStatusResponse["status"] | "pending" | "paused" | "cancelled";
  progress: number;
  currentNode: string | null;
  message: string | null;
  startedAt: string | null;
}

interface RunStore {
  activeRun: ActiveRun | null;
  setActiveRun: (run: ActiveRun) => void;
  updateActiveRun: (patch: Partial<ActiveRun>) => void;
  clearActiveRun: () => void;
}

export const useRunStore = create<RunStore>((set) => ({
  activeRun: null,

  setActiveRun: (run) => set({ activeRun: run }),

  updateActiveRun: (patch) =>
    set((state) =>
      state.activeRun
        ? { activeRun: { ...state.activeRun, ...patch } }
        : state
    ),

  clearActiveRun: () => set({ activeRun: null }),
}));