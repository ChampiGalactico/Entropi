import { useEffect } from "react";
import { useLanguageStore } from "../stores/languageStore";
import { SUPPORTED_LOCALES } from "../i18n/locales";

export function useLanguage() {
  const language = useLanguageStore((s) => s.language);
  const hydrated = useLanguageStore((s) => s.hydrated);
  const hydrate = useLanguageStore((s) => s.hydrate);
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return { language, hydrated, setLanguage, locales: SUPPORTED_LOCALES };
}
