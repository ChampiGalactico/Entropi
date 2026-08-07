import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { Combobox } from "../ui/Combobox";
import { Switch } from "../ui/Switch";
import { ColorPickerPopover } from "../ui/ColorPickerPopover";
import { SettingsRow } from "./SettingsRow";
import { GradingConfigSection } from "./GradingConfigSection";
import { useTheme } from "../../hooks/useTheme";
import { useLanguage } from "../../hooks/useLanguage";
import { CalendarSettingsSection } from "./CalendarSettingsSection";
import { NotesSettingsSection } from "./NotesSettingsSection";
import { SpellcheckSettingsSection } from "./SpellcheckSettingsSection";
import { Button } from "../ui/Button";
import { notify } from "../ui/Toast";
import { useUpdateStore } from "../../stores/updateStore";

export function GeneralSettingsSection() {
  const { t } = useTranslation();
  const { mode, setMode, accentPrimary, accentSecondary, setAccentPrimary, setAccentSecondary } =
    useTheme();
  const { language, setLanguage, locales } = useLanguage();
  const [autostartEnabled, setAutostartEnabled] = useState(false);
  const [autostartBusy, setAutostartBusy] = useState(true);
  const [autostartAvailable, setAutostartAvailable] = useState(true);
  const updateStatus = useUpdateStore((state) => state.status);
  const checkForUpdates = useUpdateStore((state) => state.check);

  useEffect(() => {
    void isEnabled()
      .then((enabled) => setAutostartEnabled(enabled))
      .catch(() => setAutostartAvailable(false))
      .finally(() => setAutostartBusy(false));
  }, []);

  async function handleCheckForUpdates() {
    await checkForUpdates();
    const status = useUpdateStore.getState().status;
    if (status === "up-to-date") notify.info(t("update.upToDate"));
    else if (status === "error") notify.error(t("update.checkError"));
  }

  async function changeAutostart(checked: boolean) {
    setAutostartBusy(true);
    try {
      if (checked) await enable();
      else await disable();

      const enabled = await isEnabled();
      setAutostartEnabled(enabled);
      notify.success(
        t(enabled ? "settings.general.autostartEnabled" : "settings.general.autostartDisabled"),
      );
    } catch {
      notify.error(t("settings.general.autostartError"));
    } finally {
      setAutostartBusy(false);
    }
  }

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

      <div className="flex flex-col">
        <h3 className="pb-1 text-sm font-semibold text-text-primary">
          {t("settings.general.system")}
        </h3>

        <SettingsRow
          label={t("settings.general.autostart")}
          description={t(
            autostartAvailable
              ? "settings.general.autostartHint"
              : "settings.general.autostartDesktopOnly",
          )}
        >
          <Switch
            checked={autostartEnabled}
            disabled={autostartBusy || !autostartAvailable}
            onChange={(checked) => void changeAutostart(checked)}
          />
        </SettingsRow>

        <SettingsRow
          label={t("settings.general.checkForUpdates")}
          description={t("settings.general.checkForUpdatesHint")}
        >
          <Button
            variant="secondary"
            disabled={updateStatus === "checking"}
            onClick={() => void handleCheckForUpdates()}
          >
            {t(updateStatus === "checking" ? "settings.general.checkingForUpdates" : "settings.general.checkForUpdatesAction")}
          </Button>
        </SettingsRow>
      </div>

      <CalendarSettingsSection />
      <SpellcheckSettingsSection />
      <NotesSettingsSection />
      <GradingConfigSection />
    </div>
  );
}
