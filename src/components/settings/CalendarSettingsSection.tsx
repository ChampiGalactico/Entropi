import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import { Combobox } from "../ui/Combobox";
import { TimePicker } from "../ui/TimePicker";
import { notify } from "../ui/Toast";
import { SettingsRow } from "./SettingsRow";
import {
  DEFAULT_CALENDAR_PREFERENCES,
  getCalendarPreferences,
  saveCalendarPreferences,
  timeToMinutes,
  type CalendarPreferences,
} from "../../lib/calendarPreferences";

export function CalendarSettingsSection() {
  const { t } = useTranslation();
  const [form, setForm] = useState<CalendarPreferences>(DEFAULT_CALENDAR_PREFERENCES);
  const [loaded, setLoaded] = useState(false);
  const valid = timeToMinutes(form.dayEnd) > timeToMinutes(form.dayStart);

  useEffect(() => { void getCalendarPreferences().then((value) => { setForm(value); setLoaded(true); }); }, []);

  async function save() {
    if (!valid) return;
    await saveCalendarPreferences(form);
    notify.success(t("settings.savedToast"));
  }

  if (!loaded) return null;
  return <div className="flex flex-col" onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); void save(); } }}>
    <div><h3 className="text-sm font-semibold text-text-primary">{t("settings.calendar.title")}</h3><p className="mt-1 text-xs text-text-muted">{t("settings.calendar.description")}</p></div>
    <SettingsRow label={t("settings.calendar.dayStart")}><div className="w-40"><TimePicker value={form.dayStart} onChange={(dayStart) => setForm((current) => ({ ...current, dayStart }))} format={form.timeFormat} /></div></SettingsRow>
    <SettingsRow label={t("settings.calendar.dayEnd")}><div className="w-40"><TimePicker value={form.dayEnd} onChange={(dayEnd) => setForm((current) => ({ ...current, dayEnd }))} format={form.timeFormat} /></div></SettingsRow>
    <SettingsRow label={t("settings.calendar.timeFormat")}><div className="w-40"><Combobox value={form.timeFormat} onChange={(timeFormat) => setForm((current) => ({ ...current, timeFormat: timeFormat as CalendarPreferences["timeFormat"] }))} options={[{ value: "24h", label: t("settings.calendar.format24") }, { value: "12h", label: t("settings.calendar.format12") }]} /></div></SettingsRow>
    {!valid && <p className="pt-2 text-xs text-danger">{t("settings.calendar.invalidRange")}</p>}
    <div className="flex items-center gap-3 pt-4"><Button disabled={!valid} onClick={() => void save()}>{t("settings.lookup.save")}</Button></div>
  </div>;
}
