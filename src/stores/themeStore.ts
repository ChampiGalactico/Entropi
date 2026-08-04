import { create } from "zustand";
import type { ThemeMode } from "../types/theme";
import { getAppSetting, setAppSetting } from "../db/queries/appSettings";
import { DEFAULT_ACCENT_PRIMARY, DEFAULT_ACCENT_SECONDARY } from "../lib/accentColors";

const THEME_SETTING_KEY = "theme";
const THEME_MODE_CACHE_KEY = "entropi.theme-mode";
const ACCENT_PRIMARY_KEY = "accentPrimary";
const ACCENT_SECONDARY_KEY = "accentSecondary";
let hydrationPromise: Promise<void> | null = null;

interface ThemeState {
  mode: ThemeMode;
  accentPrimary: string;
  accentSecondary: string;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
  toggleMode: () => Promise<void>;
  setAccentPrimary: (hex: string) => Promise<void>;
  setAccentSecondary: (hex: string) => Promise<void>;
}

function applyToDocument(mode: ThemeMode, accentPrimary: string, accentSecondary: string) {
  const root = document.documentElement;
  root.setAttribute("data-theme", mode);
  root.style.colorScheme = mode;
  root.style.setProperty("--accent", accentPrimary);
  root.style.setProperty("--accent-secondary", accentSecondary);
  try {
    window.localStorage.setItem(THEME_MODE_CACHE_KEY, mode);
  } catch {
    // The cache only prevents a startup flash; SQLite remains the source of truth.
  }
}

function isThemeMode(value: string): value is ThemeMode {
  return value === "light" || value === "dark";
}

const prefersDark =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-color-scheme: dark)").matches;

function getCachedMode(): ThemeMode | null {
  try {
    const value = window.localStorage.getItem(THEME_MODE_CACHE_KEY);
    return value && isThemeMode(value) ? value : null;
  } catch {
    return null;
  }
}

const initialMode: ThemeMode = getCachedMode() ?? (prefersDark ? "dark" : "light");
applyToDocument(initialMode, DEFAULT_ACCENT_PRIMARY, DEFAULT_ACCENT_SECONDARY);

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: initialMode,
  accentPrimary: DEFAULT_ACCENT_PRIMARY,
  accentSecondary: DEFAULT_ACCENT_SECONDARY,
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return Promise.resolve();
    if (hydrationPromise) return hydrationPromise;

    hydrationPromise = (async () => {
      try {
        const [storedMode, storedPrimary, storedSecondary] = await Promise.all([
          getAppSetting(THEME_SETTING_KEY),
          getAppSetting(ACCENT_PRIMARY_KEY),
          getAppSetting(ACCENT_SECONDARY_KEY),
        ]);
        const mode = storedMode && isThemeMode(storedMode) ? storedMode : get().mode;
        const accentPrimary = storedPrimary ?? get().accentPrimary;
        const accentSecondary = storedSecondary ?? get().accentSecondary;
        applyToDocument(mode, accentPrimary, accentSecondary);
        set({ mode, accentPrimary, accentSecondary, hydrated: true });
      } catch {
        // No Tauri DB context available (e.g. plain browser preview) — keep the default.
        set({ hydrated: true });
      } finally {
        hydrationPromise = null;
      }
    })();

    return hydrationPromise;
  },

  setMode: async (mode) => {
    applyToDocument(mode, get().accentPrimary, get().accentSecondary);
    set({ mode });
    try {
      await setAppSetting(THEME_SETTING_KEY, mode);
    } catch {
      // Ignore persistence failures outside a Tauri context.
    }
  },

  toggleMode: async () => {
    const next: ThemeMode = get().mode === "dark" ? "light" : "dark";
    await get().setMode(next);
  },

  setAccentPrimary: async (hex) => {
    applyToDocument(get().mode, hex, get().accentSecondary);
    set({ accentPrimary: hex });
    try {
      await setAppSetting(ACCENT_PRIMARY_KEY, hex);
    } catch {
      // Ignore persistence failures outside a Tauri context.
    }
  },

  setAccentSecondary: async (hex) => {
    applyToDocument(get().mode, get().accentPrimary, hex);
    set({ accentSecondary: hex });
    try {
      await setAppSetting(ACCENT_SECONDARY_KEY, hex);
    } catch {
      // Ignore persistence failures outside a Tauri context.
    }
  },
}));
