import { useTranslation } from "react-i18next";
import { useSpellcheckLanguages } from "../../hooks/useSpellcheck";
import { SPELLCHECK_LANGUAGES, type SpellcheckLanguage } from "../../lib/spellcheck";
import { Checkbox } from "../ui/Checkbox";
import { SettingsRow } from "./SettingsRow";

const LANGUAGE_LABELS: Record<SpellcheckLanguage, string> = {
  en: "English",
  es: "Español",
  de: "Deutsch",
};

export function SpellcheckSettingsSection() {
  const { t } = useTranslation();
  const { languages, toggleLanguage } = useSpellcheckLanguages();

  return (
    <div className="flex flex-col">
      <h3 className="pb-1 text-sm font-semibold text-text-primary">{t("settings.spellcheck.title")}</h3>
      <SettingsRow label={t("settings.spellcheck.languages")} description={t("settings.spellcheck.languagesHint")}>
        <div className="flex items-center gap-4">
          {SPELLCHECK_LANGUAGES.map((code) => (
            <Checkbox
              key={code}
              checked={languages.includes(code)}
              onChange={() => void toggleLanguage(code)}
              label={LANGUAGE_LABELS[code]}
            />
          ))}
        </div>
      </SettingsRow>
    </div>
  );
}
