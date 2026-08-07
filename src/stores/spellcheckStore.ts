import { create } from "zustand";
import { getAppSetting, setAppSetting } from "../db/queries/appSettings";
import { SPELLCHECK_LANGUAGES, isSpellcheckLanguage, type SpellcheckLanguage } from "../lib/spellcheck";

const SPELLCHECK_SETTING_KEY = "spellcheckLanguages";
const DEFAULT_LANGUAGES: SpellcheckLanguage[] = ["en", "es"];

function parseLanguages(value: string | null): SpellcheckLanguage[] {
  if (!value) return DEFAULT_LANGUAGES;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return DEFAULT_LANGUAGES;
    return parsed.filter((code): code is SpellcheckLanguage => typeof code === "string" && isSpellcheckLanguage(code));
  } catch {
    return DEFAULT_LANGUAGES;
  }
}

interface SpellcheckState {
  languages: SpellcheckLanguage[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  toggleLanguage: (code: SpellcheckLanguage) => Promise<void>;
}

export const useSpellcheckStore = create<SpellcheckState>((set, get) => ({
  languages: DEFAULT_LANGUAGES,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const stored = await getAppSetting(SPELLCHECK_SETTING_KEY);
      set({ languages: parseLanguages(stored), hydrated: true });
    } catch {
      // No Tauri DB context available (e.g. plain browser preview) — keep the default.
      set({ hydrated: true });
    }
  },

  toggleLanguage: async (code) => {
    const current = get().languages;
    const languages = current.includes(code)
      ? current.filter((entry) => entry !== code)
      : [...current, code];
    set({ languages });
    try {
      await setAppSetting(SPELLCHECK_SETTING_KEY, JSON.stringify(languages));
    } catch {
      // Ignore persistence failures outside a Tauri context.
    }
  },
}));

export { SPELLCHECK_LANGUAGES };
