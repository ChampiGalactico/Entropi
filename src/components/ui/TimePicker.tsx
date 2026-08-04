import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { formatCalendarTime, getCalendarPreferences, type TimeFormat } from "../../lib/calendarPreferences";
import { ClockCircleLinear, CloseCircleLinear } from "./appIcons";

export interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  format?: TimeFormat;
  minuteStep?: number;
}

function splitTime(value: string): [number, number] {
  const [hour, minute] = value.split(":").map(Number);
  return [Number.isFinite(hour) ? hour : 9, Number.isFinite(minute) ? minute : 0];
}

const pad = (value: number) => String(value).padStart(2, "0");

export function TimePicker({ value, onChange, format }: TimePickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [savedFormat, setSavedFormat] = useState<TimeFormat>("24h");
  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);
  const [hour, minute] = splitTime(value);
  const activeFormat = format ?? savedFormat;
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  useEffect(() => {
    if (format === undefined) void getCalendarPreferences().then((preferences) => setSavedFormat(preferences.timeFormat));
  }, [format]);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    window.requestAnimationFrame(() => {
      hourListRef.current?.querySelector<HTMLElement>("[data-selected='true']")?.scrollIntoView({ block: "center" });
      minuteListRef.current?.querySelector<HTMLElement>("[data-selected='true']")?.scrollIntoView({ block: "center" });
    });
    return () => window.removeEventListener("keydown", close);
  }, [open, activeFormat]);

  function choose(nextHour: number, nextMinute: number) {
    onChange(`${pad(nextHour)}:${pad(nextMinute)}`);
  }

  function chooseDisplayHour(nextDisplayHour: number) {
    if (activeFormat === "24h") choose(nextDisplayHour, minute);
    else choose((nextDisplayHour % 12) + (period === "PM" ? 12 : 0), minute);
  }

  function choosePeriod(nextPeriod: "AM" | "PM") {
    choose((hour % 12) + (nextPeriod === "PM" ? 12 : 0), minute);
  }

  const hours = activeFormat === "12h" ? Array.from({ length: 12 }, (_, index) => index + 1) : Array.from({ length: 24 }, (_, index) => index);

  return <>
    <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center justify-between rounded-xl border border-border bg-control px-4 py-2.5 text-sm text-text-primary outline-none transition-all hover:bg-elevated focus:ring-2 focus:ring-accent">
      <span className="font-medium tabular-nums">{value ? formatCalendarTime(value, activeFormat) : "--:--"}</span>
      <ClockCircleLinear size={18} className="text-accent" />
    </button>

    {open && createPortal(
      <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
        <div className="w-full max-w-xs rounded-[2rem] border border-border bg-elevated p-5 shadow-modal backdrop-blur-3xl" onMouseDown={(event) => event.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-medium uppercase tracking-wider text-text-muted">{t("timePicker.title")}</p><p className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">{formatCalendarTime(`${pad(hour)}:${pad(minute)}`, activeFormat)}</p></div><button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-text-muted hover:bg-control hover:text-text-primary"><CloseCircleLinear size={18} /></button></div>
          <div className={`grid gap-2 ${activeFormat === "12h" ? "grid-cols-[1fr_1fr_72px]" : "grid-cols-2"}`}>
            <div><p className="mb-2 text-center text-[10px] font-medium uppercase tracking-wider text-text-muted">{t("timePicker.hours")}</p><div ref={hourListRef} className="h-56 snap-y snap-mandatory overflow-y-auto rounded-2xl bg-control p-1.5">{hours.map((item) => { const selected = activeFormat === "12h" ? item === displayHour : item === hour; return <button key={item} type="button" data-selected={selected} onClick={() => chooseDisplayHour(item)} className={`mb-1 flex w-full snap-center items-center justify-center rounded-xl py-2.5 text-sm tabular-nums transition-colors last:mb-0 ${selected ? "bg-accent font-semibold text-white" : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"}`}>{activeFormat === "12h" ? item : pad(item)}</button>; })}</div></div>
            <div><p className="mb-2 text-center text-[10px] font-medium uppercase tracking-wider text-text-muted">{t("timePicker.minutes")}</p><div ref={minuteListRef} className="h-56 snap-y snap-mandatory overflow-y-auto rounded-2xl bg-control p-1.5">{Array.from({ length: 60 }, (_, item) => <button key={item} type="button" data-selected={item === minute} onClick={() => choose(hour, item)} className={`mb-1 flex w-full snap-center items-center justify-center rounded-xl py-2.5 text-sm tabular-nums transition-colors last:mb-0 ${item === minute ? "bg-accent font-semibold text-white" : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"}`}>{pad(item)}</button>)}</div></div>
            {activeFormat === "12h" && <div><p className="mb-2 text-center text-[10px] font-medium uppercase tracking-wider text-text-muted">{t("timePicker.period")}</p><div className="flex h-56 flex-col justify-center gap-2 rounded-2xl bg-control p-1.5">{(["AM", "PM"] as const).map((item) => <button key={item} type="button" onClick={() => choosePeriod(item)} className={`rounded-xl py-3 text-xs font-semibold transition-colors ${item === period ? "bg-accent text-white" : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"}`}>{item}</button>)}</div></div>}
          </div>
          <button type="button" onClick={() => setOpen(false)} className="vida-accent-fill mt-5 w-full rounded-full px-4 py-2.5 text-sm font-medium text-white">{t("timePicker.done")}</button>
        </div>
      </div>, document.body,
    )}
  </>;
}
