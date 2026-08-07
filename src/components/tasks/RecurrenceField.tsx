import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Combobox } from "../ui/Combobox";
import { DatePicker } from "../ui/DateRangePicker";
import { NumberInput } from "../ui/NumberInput";
import { weekdaysRule, type RecurrenceFreq, type TaskRecurrence } from "../../lib/taskRecurrence";

type Preset = "none" | "daily" | "weekdays" | "weekly" | "monthly" | "custom";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function dayOfWeek(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return (new Date(year, month - 1, day).getDay() + 6) % 7;
}

function presetFromRule(rule: TaskRecurrence | null, dueDate: string): Preset {
  if (!rule) return "none";
  if (rule.until) return "custom";
  if (rule.interval !== 1) return "custom";
  if (rule.freq === "daily") return "daily";
  if (rule.freq === "monthly") return "monthly";
  if (rule.freq === "weekly") {
    const byDay = rule.byDay ?? [];
    if (byDay.length === 5 && [0, 1, 2, 3, 4].every((day) => byDay.includes(day))) return "weekdays";
    if (byDay.length <= 1 && (byDay.length === 0 || byDay[0] === dayOfWeek(dueDate))) return "weekly";
  }
  return "custom";
}

export function RecurrenceField({ value, dueDate, onChange }: { value: TaskRecurrence | null; dueDate: string; onChange: (next: TaskRecurrence | null) => void }) {
  const { t } = useTranslation();
  const [preset, setPreset] = useState<Preset>(() => presetFromRule(value, dueDate));
  const [customInterval, setCustomInterval] = useState(value?.interval ?? 1);
  const [customUnit, setCustomUnit] = useState<RecurrenceFreq>(value?.freq ?? "weekly");
  const [customByDay, setCustomByDay] = useState<number[]>(value?.byDay ?? [dayOfWeek(dueDate)]);
  const [endMode, setEndMode] = useState<"never" | "date">(value?.until ? "date" : "never");
  const [endDate, setEndDate] = useState(value?.until ?? dueDate);

  function applyPreset(next: Preset) {
    setPreset(next);
    if (next === "none") { onChange(null); return; }
    if (next === "daily") { onChange({ freq: "daily", interval: 1 }); return; }
    if (next === "weekdays") { onChange(weekdaysRule()); return; }
    if (next === "weekly") { onChange({ freq: "weekly", interval: 1, byDay: [dayOfWeek(dueDate)] }); return; }
    if (next === "monthly") { onChange({ freq: "monthly", interval: 1 }); return; }
    emitCustom(customInterval, customUnit, customByDay, endMode, endDate);
  }

  function emitCustom(interval: number, unit: RecurrenceFreq, byDay: number[], mode: "never" | "date", until: string) {
    onChange({
      freq: unit,
      interval: interval > 0 ? interval : 1,
      byDay: unit === "weekly" ? (byDay.length > 0 ? byDay : [dayOfWeek(dueDate)]) : undefined,
      until: mode === "date" ? until : null,
    });
  }

  function toggleDay(day: number) {
    const next = customByDay.includes(day) ? customByDay.filter((d) => d !== day) : [...customByDay, day].sort((a, b) => a - b);
    setCustomByDay(next);
    emitCustom(customInterval, customUnit, next, endMode, endDate);
  }

  return <div className="flex flex-col gap-3">
    <label className="text-xs text-text-secondary">{t("tasks.form.repeat")}<div className="mt-1"><Combobox
      value={preset}
      onChange={(v) => applyPreset(v as Preset)}
      options={[
        { value: "none", label: t("tasks.form.repeatNone") },
        { value: "daily", label: t("tasks.form.repeatDaily") },
        { value: "weekdays", label: t("tasks.form.repeatWeekdays") },
        { value: "weekly", label: t("tasks.form.repeatWeekly") },
        { value: "monthly", label: t("tasks.form.repeatMonthly") },
        { value: "custom", label: t("tasks.form.repeatCustom") },
      ]}
    /></div></label>

    {preset === "custom" && <div className="rounded-2xl bg-surface-hover p-3">
      <div className="flex items-center gap-2 text-xs text-text-secondary">
        <span>{t("tasks.form.repeatEveryLabel")}</span>
        <div className="w-16"><NumberInput min={1} value={String(customInterval)} onValueChange={(v) => { const n = Math.max(1, Number(v) || 1); setCustomInterval(n); emitCustom(n, customUnit, customByDay, endMode, endDate); }} /></div>
        <div className="min-w-32 flex-1"><Combobox value={customUnit} onChange={(v) => { const unit = v as RecurrenceFreq; setCustomUnit(unit); emitCustom(customInterval, unit, customByDay, endMode, endDate); }} options={[{ value: "daily", label: t("tasks.form.unitDays") }, { value: "weekly", label: t("tasks.form.unitWeeks") }, { value: "monthly", label: t("tasks.form.unitMonths") }]} /></div>
      </div>

      {customUnit === "weekly" && <div className="mt-3">
        <p className="mb-1.5 text-xs text-text-secondary">{t("tasks.form.repeatOn")}</p>
        <div className="flex flex-wrap gap-1.5">
          {DAY_KEYS.map((key, day) => <button key={key} type="button" onClick={() => toggleDay(day)} className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold transition-colors ${customByDay.includes(day) ? "bg-accent text-white" : "bg-control text-text-secondary hover:bg-elevated"}`}>{t(`common.daysShort.${key}`).slice(0, 2)}</button>)}
        </div>
      </div>}

      <div className="mt-3">
        <p className="mb-1.5 text-xs text-text-secondary">{t("tasks.form.repeatEnds")}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => { setEndMode("never"); emitCustom(customInterval, customUnit, customByDay, "never", endDate); }} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${endMode === "never" ? "bg-accent text-white" : "bg-control text-text-secondary hover:bg-elevated"}`}>{t("tasks.form.repeatNever")}</button>
          <button type="button" onClick={() => { setEndMode("date"); emitCustom(customInterval, customUnit, customByDay, "date", endDate); }} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${endMode === "date" ? "bg-accent text-white" : "bg-control text-text-secondary hover:bg-elevated"}`}>{t("tasks.form.repeatOnDate")}</button>
          {endMode === "date" && <div className="min-w-40"><DatePicker label={t("tasks.form.repeatEndDate")} value={endDate} onChange={(next) => { setEndDate(next); emitCustom(customInterval, customUnit, customByDay, "date", next); }} /></div>}
        </div>
      </div>
    </div>}
  </div>;
}

export { presetFromRule };
