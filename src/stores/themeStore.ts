import { create } from "zustand";
import type { ThemeMode } from "../types/theme";

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

function applyModeToDocument(mode: ThemeMode) {
  document.documentElement.setAttribute("data-theme", mode);
}

const prefersDark =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-color-scheme: dark)").matches;

const initialMode: ThemeMode = prefersDark ? "dark" : "light";
applyModeToDocument(initialMode);

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: initialMode,
  setMode: (mode) => {
    applyModeToDocument(mode);
    set({ mode });
  },
  toggleMode: () => {
    const next: ThemeMode = get().mode === "dark" ? "light" : "dark";
    applyModeToDocument(next);
    set({ mode: next });
  },
}));
