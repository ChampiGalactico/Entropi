import { create } from "zustand";
import { check as checkForUpdate, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export type UpdateStatus = "idle" | "checking" | "up-to-date" | "available" | "downloading" | "ready" | "error";

interface UpdateStoreState {
  status: UpdateStatus;
  version: string | null;
  notes: string | null;
  progress: number;
  dismissed: boolean;
  check: (silent?: boolean) => Promise<void>;
  download: () => Promise<void>;
  restart: () => void;
  dismiss: () => void;
}

let pendingUpdate: Update | null = null;

export const useUpdateStore = create<UpdateStoreState>((set) => ({
  status: "idle",
  version: null,
  notes: null,
  progress: 0,
  dismissed: false,

  check: async (silent = false) => {
    if (!silent) set({ status: "checking" });
    try {
      const update = await checkForUpdate();
      if (update) {
        pendingUpdate = update;
        set({ status: "available", version: update.version, notes: update.body ?? null, dismissed: false });
      } else {
        set({ status: silent ? "idle" : "up-to-date" });
      }
    } catch {
      set({ status: silent ? "idle" : "error" });
    }
  },

  download: async () => {
    if (!pendingUpdate) return;
    set({ status: "downloading", progress: 0 });
    let totalBytes = 0;
    let downloadedBytes = 0;
    try {
      await pendingUpdate.downloadAndInstall((event) => {
        if (event.event === "Started") {
          totalBytes = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          downloadedBytes += event.data.chunkLength;
          set({ progress: totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0 });
        } else if (event.event === "Finished") {
          set({ progress: 100 });
        }
      });
      set({ status: "ready" });
    } catch {
      set({ status: "error" });
    }
  },

  restart: () => {
    void relaunch();
  },

  dismiss: () => set({ dismissed: true }),
}));
