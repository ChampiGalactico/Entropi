import { create } from "zustand";
import i18n from "../i18n";
import { DEFAULT_LOCALE, isSupportedLocale } from "../i18n/locales";
import { getAppSetting, setAppSetting } from "../db/queries/appSettings";

const LANGUAGE_SETTING_KEY = "language";

interface LanguageState {
  language: string;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setLanguage: (code: string) => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: DEFAULT_LOCALE,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const stored = await getAppSetting(LANGUAGE_SETTING_KEY);
      const code = stored && isSupportedLocale(stored) ? stored : DEFAULT_LOCALE;
      await i18n.changeLanguage(code);
      set({ language: code, hydrated: true });
    } catch {
      // No Tauri DB context available (e.g. plain browser preview) — keep the default.
      set({ hydrated: true });
    }
  },

  setLanguage: async (code: string) => {
    if (!isSupportedLocale(code)) return;
    await i18n.changeLanguage(code);
    set({ language: code });
    try {
      await setAppSetting(LANGUAGE_SETTING_KEY, code);
    } catch {
      // Ignore persistence failures outside a Tauri context.
    }
  },
}));
