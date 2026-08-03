export interface LocaleDefinition {
  code: string;
  label: string;
  nativeLabel: string;
}

/**
 * Registry of supported languages. Add a new entry here plus a matching
 * `locales/<code>.json` resource file (registered in `index.ts`) to add
 * a language — nothing else in the app needs to change.
 */
export const SUPPORTED_LOCALES: LocaleDefinition[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
];

export const DEFAULT_LOCALE = "en";

export const SUPPORTED_LOCALE_CODES = SUPPORTED_LOCALES.map((l) => l.code);

export function isSupportedLocale(code: string): boolean {
  return SUPPORTED_LOCALE_CODES.includes(code);
}
