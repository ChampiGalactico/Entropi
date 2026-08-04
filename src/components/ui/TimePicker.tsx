import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { ClockCircleLinear, CloseCircleLinear } from "./appIcons";

export interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  minuteStep?: number;
}

function splitTime(value: string): [number, number] {
  const [hour, minute] = value.split(":").map(Number);
  return [Number.isFinite(hour) ? hour : 9, Number.isFinite(minute) ? minute : 0];
}

export function TimePicker({ value, onChange, minuteStep = 5 }: TimePickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [hour, minute] = splitTime(value);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  function choose(nextHour: number, nextMinute: number) {
    onChange(`${String(nextHour).padStart(2, "0")}:${String(nextMinute).padStart(2, "0")}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-xl border border-border bg-control px-4 py-2.5 text-sm text-text-primary outline-none transition-all hover:bg-elevated focus:ring-2 focus:ring-accent"
      >
        <span className="font-medium tabular-nums">{value || "--:--"}</span>
        <ClockCircleLinear size={18} className="text-accent" />
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-[2rem] border border-border bg-elevated p-5 shadow-modal backdrop-blur-3xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div><p className="text-xs font-medium uppercase tracking-wider text-text-muted">{t("timePicker.title")}</p><p className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">{String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")}</p></div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-text-muted hover:bg-control hover:text-text-primary"><CloseCircleLinear size={18} /></button>
            </div>
            <p className="mb-2 text-xs text-text-muted">{t("timePicker.hours")}</p>
            <div className="grid grid-cols-8 gap-1.5">
              {Array.from({ length: 24 }, (_, item) => (
                <button key={item} type="button" onClick={() => choose(item, minute)} className={`rounded-xl py-2 text-xs tabular-nums transition-colors ${item === hour ? "bg-accent text-white" : "bg-control text-text-secondary hover:bg-surface-hover hover:text-text-primary"}`}>{String(item).padStart(2, "0")}</button>
              ))}
            </div>
            <p className="mb-2 mt-4 text-xs text-text-muted">{t("timePicker.minutes")}</p>
            <div className="grid grid-cols-6 gap-1.5">
              {Array.from({ length: 60 / minuteStep }, (_, index) => index * minuteStep).map((item) => (
                <button key={item} type="button" onClick={() => choose(hour, item)} className={`rounded-xl py-2 text-xs tabular-nums transition-colors ${item === minute ? "bg-accent text-white" : "bg-control text-text-secondary hover:bg-surface-hover hover:text-text-primary"}`}>{String(item).padStart(2, "0")}</button>
              ))}
            </div>
            <button type="button" onClick={() => setOpen(false)} className="vida-accent-fill mt-5 w-full rounded-full px-4 py-2.5 text-sm font-medium text-white">{t("timePicker.done")}</button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
