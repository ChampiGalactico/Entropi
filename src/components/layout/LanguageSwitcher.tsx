import { useLanguage } from "../../hooks/useLanguage";

export function LanguageSwitcher() {
  const { language, setLanguage, locales } = useLanguage();

  return (
    <select
      aria-label="Language"
      value={language}
      onChange={(e) => void setLanguage(e.target.value)}
      className="rounded-full border border-border bg-surface px-3 py-1 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
    >
      {locales.map((locale) => (
        <option key={locale.code} value={locale.code}>
          {locale.nativeLabel}
        </option>
      ))}
    </select>
  );
}
