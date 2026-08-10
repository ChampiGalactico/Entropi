import { create } from "zustand";
import { getAppSetting, setAppSetting } from "../db/queries/appSettings";
import { SPELLCHECK_LANGUAGES, isSpellcheckLanguage, type SpellcheckLanguage } from "../lib/spellcheck";

const SPELLCHECK_SETTING_KEY = "spellcheckLanguages";
const IGNORED_WORDS_SETTING_KEY = "spellcheckIgnoredWords";
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

function parseIgnoredWords(value: string | null): Set<string> {
  if (!value) return new Set();
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((word): word is string => typeof word === "string"));
  } catch {
    return new Set();
  }
}

interface SpellcheckState {
  languages: SpellcheckLanguage[];
  ignoredWords: Set<string>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  toggleLanguage: (code: SpellcheckLanguage) => Promise<void>;
  ignoreWord: (word: string) => Promise<void>;
}

export const useSpellcheckStore = create<SpellcheckState>((set, get) => ({
  languages: DEFAULT_LANGUAGES,
  ignoredWords: new Set(),
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const [storedLanguages, storedIgnoredWords] = await Promise.all([
        getAppSetting(SPELLCHECK_SETTING_KEY),
        getAppSetting(IGNORED_WORDS_SETTING_KEY),
      ]);
      set({
        languages: parseLanguages(storedLanguages),
        ignoredWords: parseIgnoredWords(storedIgnoredWords),
        hydrated: true,
      });
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

  ignoreWord: async (word) => {
    const normalized = word.toLowerCase();
    if (!normalized || get().ignoredWords.has(normalized)) return;
    const ignoredWords = new Set(get().ignoredWords);
    ignoredWords.add(normalized);
    set({ ignoredWords });
    try {
      await setAppSetting(IGNORED_WORDS_SETTING_KEY, JSON.stringify([...ignoredWords]));
    } catch {
      // Ignore persistence failures outside a Tauri context.
    }
  },
}));

export { SPELLCHECK_LANGUAGES };
