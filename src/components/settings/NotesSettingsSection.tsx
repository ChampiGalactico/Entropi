import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DEFAULT_NOTE_AUTOSAVE_SECONDS, getNoteAutosaveSeconds, saveNoteAutosaveSeconds } from "../../lib/notePreferences";
import { Button, NumberInput, notify } from "../ui";
import { SettingsRow } from "./SettingsRow";

export function NotesSettingsSection() {
  const { t } = useTranslation();
  const [seconds, setSeconds] = useState(String(DEFAULT_NOTE_AUTOSAVE_SECONDS));

  useEffect(() => { void getNoteAutosaveSeconds().then((value) => setSeconds(String(value))); }, []);

  function normalizedSeconds() {
    const parsed = Number(seconds);
    return Number.isFinite(parsed) ? Math.max(2, Math.min(120, Math.round(parsed))) : DEFAULT_NOTE_AUTOSAVE_SECONDS;
  }

  async function save() {
    const value = normalizedSeconds();
    setSeconds(String(value));
    await saveNoteAutosaveSeconds(value);
    notify.success(t("settings.savedToast"));
  }

  return <div className="flex flex-col" onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); void save(); } }}>
    <h3 className="pb-1 text-sm font-semibold text-text-primary">{t("settings.notes.title")}</h3>
    <SettingsRow label={t("settings.notes.autosaveDelay")} description={t("settings.notes.autosaveDelayHint")}>
      <div className="flex items-center gap-2"><NumberInput className="w-28" min={2} max={120} step={1} value={seconds} onValueChange={setSeconds} onBlur={() => setSeconds(String(normalizedSeconds()))} /><span className="text-xs text-text-muted">{t("settings.notes.seconds")}</span><Button className="px-3 py-1.5 text-xs" variant="secondary" onClick={() => void save()}>{t("settings.lookup.save")}</Button></div>
    </SettingsRow>
  </div>;
}
