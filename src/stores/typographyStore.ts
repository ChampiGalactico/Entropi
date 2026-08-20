import { create } from "zustand";
import { getAppSetting, setAppSetting } from "../db/queries/appSettings";

const FONT_LIBRARY_KEY = "typography.fontLibrary";
const FONT_PREFERENCES_KEY = "typography.preferences";
export const DEFAULT_SANS_FONT_ID = "default-sans";
export const DEFAULT_MONO_FONT_ID = "default-mono";

export interface StoredFont {
  id: string;
  name: string;
  fileName: string;
  dataUrl: string;
}

export interface TypographyPreferences {
  sansFontId: string;
  monoFontId: string;
  useMonoForApp: boolean;
}

const defaultPreferences: TypographyPreferences = {
  sansFontId: DEFAULT_SANS_FONT_ID,
  monoFontId: DEFAULT_MONO_FONT_ID,
  useMonoForApp: false,
};

const registeredFaces = new Map<string, FontFace>();
let hydrationPromise: Promise<void> | null = null;

function familyFor(fontId: string, fonts: StoredFont[], fallback: "sans" | "mono") {
  const font = fonts.find((item) => item.id === fontId);
  if (font) return `"EntropiCustom-${font.id}"`;
  return fallback === "mono"
    ? '"Cascadia Code", "SFMono-Regular", Consolas, ui-monospace, monospace'
    : '"Inter", system-ui, sans-serif';
}

function applyTypography(fonts: StoredFont[], preferences: TypographyPreferences) {
  for (const font of fonts) {
    if (registeredFaces.has(font.id)) continue;
    const face = new FontFace(`EntropiCustom-${font.id}`, `url(${JSON.stringify(font.dataUrl)})`);
    document.fonts.add(face);
    registeredFaces.set(font.id, face);
    void face.load().catch(() => undefined);
  }

  const root = document.documentElement;
  root.style.setProperty("--font-sans", familyFor(preferences.sansFontId, fonts, "sans"));
  root.style.setProperty("--font-mono", familyFor(preferences.monoFontId, fonts, "mono"));
  root.style.setProperty("--font-app", preferences.useMonoForApp ? "var(--font-mono)" : "var(--font-sans)");
}

function parseFonts(value: string | null): StoredFont[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as StoredFont[];
    return Array.isArray(parsed) ? parsed.filter((font) => font.id && font.name && font.dataUrl) : [];
  } catch {
    return [];
  }
}

function parsePreferences(value: string | null): TypographyPreferences {
  if (!value) return defaultPreferences;
  try {
    return { ...defaultPreferences, ...JSON.parse(value) };
  } catch {
    return defaultPreferences;
  }
}

interface TypographyState {
  fonts: StoredFont[];
  preferences: TypographyPreferences;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addFonts: (fonts: StoredFont[]) => Promise<void>;
  removeFont: (id: string) => Promise<void>;
  setPreferences: (preferences: Partial<TypographyPreferences>) => Promise<void>;
}

applyTypography([], defaultPreferences);

export const useTypographyStore = create<TypographyState>((set, get) => ({
  fonts: [],
  preferences: defaultPreferences,
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return Promise.resolve();
    if (hydrationPromise) return hydrationPromise;
    hydrationPromise = (async () => {
      try {
        const [libraryValue, preferencesValue] = await Promise.all([
          getAppSetting(FONT_LIBRARY_KEY),
          getAppSetting(FONT_PREFERENCES_KEY),
        ]);
        const fonts = parseFonts(libraryValue);
        const preferences = parsePreferences(preferencesValue);
        applyTypography(fonts, preferences);
        set({ fonts, preferences, hydrated: true });
      } catch {
        set({ hydrated: true });
      } finally {
        hydrationPromise = null;
      }
    })();
    return hydrationPromise;
  },
  addFonts: async (incoming) => {
    const fonts = [...get().fonts, ...incoming];
    applyTypography(fonts, get().preferences);
    set({ fonts });
    await setAppSetting(FONT_LIBRARY_KEY, JSON.stringify(fonts));
  },
  removeFont: async (id) => {
    const fonts = get().fonts.filter((font) => font.id !== id);
    const current = get().preferences;
    const preferences = {
      ...current,
      sansFontId: current.sansFontId === id ? DEFAULT_SANS_FONT_ID : current.sansFontId,
      monoFontId: current.monoFontId === id ? DEFAULT_MONO_FONT_ID : current.monoFontId,
    };
    const face = registeredFaces.get(id);
    if (face) document.fonts.delete(face);
    registeredFaces.delete(id);
    applyTypography(fonts, preferences);
    set({ fonts, preferences });
    await Promise.all([
      setAppSetting(FONT_LIBRARY_KEY, JSON.stringify(fonts)),
      setAppSetting(FONT_PREFERENCES_KEY, JSON.stringify(preferences)),
    ]);
  },
  setPreferences: async (changes) => {
    const preferences = { ...get().preferences, ...changes };
    applyTypography(get().fonts, preferences);
    set({ preferences });
    await setAppSetting(FONT_PREFERENCES_KEY, JSON.stringify(preferences));
  },
}));
