import { useTranslation } from "react-i18next";
import { Combobox } from "../ui/Combobox";
import { Switch } from "../ui/Switch";
import { ColorPickerPopover } from "../ui/ColorPickerPopover";
import { SettingsRow } from "./SettingsRow";
import { GradingConfigSection } from "./GradingConfigSection";
import { useTheme } from "../../hooks/useTheme";
import { useLanguage } from "../../hooks/useLanguage";
import { CalendarSettingsSection } from "./CalendarSettingsSection";

export function GeneralSettingsSection() {
  const { t } = useTranslation();
  const { mode, setMode, accentPrimary, accentSecondary, setAccentPrimary, setAccentSecondary } =
    useTheme();
  const { language, setLanguage, locales } = useLanguage();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col">
        <h3 className="pb-1 text-sm font-semibold text-text-primary">
          {t("settings.general.appearance")}
        </h3>

        <SettingsRow label={t("topbar.language")}>
          <Combobox
            value={language}
            onChange={(v) => void setLanguage(v)}
            options={locales.map((l) => ({ value: l.code, label: l.nativeLabel }))}
          />
        </SettingsRow>

        <SettingsRow label={t("settings.general.darkMode")}>
          <Switch
            checked={mode === "dark"}
            onChange={(checked) => void setMode(checked ? "dark" : "light")}
          />
        </SettingsRow>

        <SettingsRow
          label={t("settings.general.accentPrimary")}
          description={t("settings.general.accentPrimaryHint")}
        >
          <ColorPickerPopover value={accentPrimary} onChange={(hex) => void setAccentPrimary(hex)} />
        </SettingsRow>

        <SettingsRow
          label={t("settings.general.accentSecondary")}
          description={t("settings.general.accentSecondaryHint")}
        >
          <ColorPickerPopover
            value={accentSecondary}
            onChange={(hex) => void setAccentSecondary(hex)}
          />
        </SettingsRow>
      </div>

      <CalendarSettingsSection />
      <GradingConfigSection />
    </div>
  );
}
