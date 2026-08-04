import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  AltArrowLeftLinear,
  AltArrowRightLinear,
  CalendarLinear,
  CloseCircleLinear,
} from "./appIcons";

export interface DateRangeValue {
  start: string;
  end: string;
}

export interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  startLabel: string;
  endLabel: string;
  min?: string;
  max?: string;
}

export interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  min?: string;
  max?: string;
  trigger?: ReactNode;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function fromIso(value: string): Date | null {
  if (!ISO_DATE.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function sameDay(a: Date | null, b: Date): boolean {
  return Boolean(a && toIso(a) === toIso(b));
}

function daysForMonth(month: Date): Array<Date | null> {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const leading = (first.getDay() + 6) % 7;
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return [
    ...Array.from<null>({ length: leading }).fill(null),
    ...Array.from({ length: count }, (_, index) =>
      new Date(month.getFullYear(), month.getMonth(), index + 1),
    ),
  ];
}

function displayDate(value: string, locale: string): string {
  const date = fromIso(value);
  return date
    ? new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(date)
    : "—";
}

interface MonthProps {
  month: Date;
  start: Date | null;
  end: Date | null;
  min: Date | null;
  max: Date | null;
  locale: string;
  onSelect: (date: Date) => void;
  onTitleClick?: () => void;
}

function CalendarMonth({ month, start, end, min, max, locale, onSelect, onTitleClick }: MonthProps) {
  const days = daysForMonth(month);
  const weekdays = Array.from({ length: 7 }, (_, index) => {
    const monday = new Date(2024, 0, 1 + index);
    return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(monday).slice(0, 2);
  });

  return (
    <section className="w-[272px]">
      <button type="button" onClick={onTitleClick} className="mb-4 w-full rounded-xl py-1 text-center text-sm font-semibold capitalize text-text-primary transition-colors hover:bg-control hover:text-accent">
        {new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(month)}
      </button>
      <div className="mb-2 grid grid-cols-7 text-center text-[11px] font-medium text-text-muted">
        {weekdays.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((date, index) => {
          if (!date) return <span key={`empty-${index}`} className="h-9" />;
          const selectedStart = sameDay(start, date);
          const selectedEnd = sameDay(end, date);
          const inRange = Boolean(start && end && date > start && date < end);
          const hasRange = Boolean(start && end && start < end);
          const column = index % 7;
          const rangeClass = inRange
            ? `${column === 0 ? "rounded-l-xl" : ""} ${column === 6 ? "rounded-r-xl" : ""} bg-accent/10 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--accent)_5%,transparent),inset_0_-1px_0_color-mix(in_srgb,var(--accent)_5%,transparent)]`
            : selectedStart && hasRange && column < 6
              ? "bg-[linear-gradient(to_right,transparent_0,transparent_50%,color-mix(in_srgb,var(--accent)_10%,transparent)_50%)]"
              : selectedEnd && hasRange && column > 0
                ? "bg-[linear-gradient(to_right,color-mix(in_srgb,var(--accent)_10%,transparent)_0,color-mix(in_srgb,var(--accent)_10%,transparent)_50%,transparent_50%)]"
                : "";
          const disabled = Boolean((min && date < min) || (max && date > max));
          return (
            <span key={toIso(date)} className={`relative flex h-9 items-center justify-center ${rangeClass}`}>
              <button type="button" disabled={disabled} onClick={() => onSelect(date)} className={`relative flex h-9 w-9 items-center justify-center text-xs transition-all disabled:pointer-events-none disabled:opacity-25 ${selectedStart || selectedEnd ? "z-10 rounded-xl bg-accent font-semibold text-white shadow-sm" : "rounded-xl text-text-secondary hover:bg-control hover:text-text-primary"}`}>{date.getDate()}</button>
            </span>
          );
        })}
      </div>
    </section>
  );
}

function MonthYearSelector({ value, locale, onChange, onDone }: { value: Date; locale: string; onChange: (value: Date) => void; onDone: () => void }) {
  const { t } = useTranslation();
  const [yearStart, setYearStart] = useState(() => value.getFullYear() - 5);
  const months = Array.from({ length: 12 }, (_, month) => new Date(2024, month, 1));
  const years = Array.from({ length: 12 }, (_, index) => yearStart + index);
  return <div className="w-[420px] max-w-[calc(100vw-3rem)]">
    <div className="mb-4 flex items-center justify-between"><button type="button" onClick={onDone} className="rounded-full bg-control p-2 text-text-secondary hover:bg-surface-hover hover:text-text-primary"><AltArrowLeftLinear size={17} /></button><p className="text-sm font-semibold capitalize text-text-primary">{new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(value)}</p><span className="w-9" /></div>
    <div className="grid grid-cols-[120px_1fr] gap-4">
      <section className="border-r border-border pr-4"><p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-muted">{t("datePicker.month")}</p><div className="max-h-72 space-y-1 overflow-y-auto pr-1">{months.map((date, month) => <button key={month} type="button" onClick={() => onChange(new Date(value.getFullYear(), month, 1))} className={`w-full rounded-xl px-3 py-2 text-left text-xs capitalize transition-colors ${month === value.getMonth() ? "bg-accent/15 font-semibold text-accent" : "text-text-secondary hover:bg-control hover:text-text-primary"}`}>{new Intl.DateTimeFormat(locale, { month: "short" }).format(date)}</button>)}</div></section>
      <section><div className="mb-2 flex items-center justify-between"><button type="button" onClick={() => setYearStart((current) => current - 12)} className="rounded-full p-1.5 text-text-muted hover:bg-control hover:text-text-primary"><AltArrowLeftLinear size={14} /></button><p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">{t("datePicker.year")}</p><button type="button" onClick={() => setYearStart((current) => current + 12)} className="rounded-full p-1.5 text-text-muted hover:bg-control hover:text-text-primary"><AltArrowRightLinear size={14} /></button></div><div className="grid grid-cols-3 gap-2">{years.map((year) => <button key={year} type="button" onClick={() => onChange(new Date(year, value.getMonth(), 1))} className={`rounded-xl px-2 py-3 text-xs tabular-nums transition-colors ${year === value.getFullYear() ? "bg-accent/15 font-semibold text-accent" : "bg-control/50 text-text-secondary hover:bg-control hover:text-text-primary"}`}>{year}</button>)}</div><button type="button" onClick={onDone} className="vida-accent-fill mt-4 w-full rounded-full px-4 py-2 text-sm font-medium text-white">{t("datePicker.viewCalendar")}</button></section>
    </div>
  </div>;
}

export function DateRangePicker({ value, onChange, startLabel, endLabel, min, max }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [selectingEnd, setSelectingEnd] = useState(false);
  const [monthYearOpen, setMonthYearOpen] = useState(false);
  const locale = document.documentElement.lang || navigator.language || "es";
  const selectedStart = fromIso(value.start);
  const selectedEnd = fromIso(value.end);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date((selectedStart ?? new Date()).getFullYear(), (selectedStart ?? new Date()).getMonth(), 1),
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const constraints = useMemo(() => ({ min: fromIso(min ?? ""), max: fromIso(max ?? "") }), [min, max]);

  function select(date: Date) {
    const iso = toIso(date);
    if (!selectingEnd) {
      onChange({ start: iso, end: "" });
      setSelectingEnd(true);
      return;
    }
    if (selectedStart && date < selectedStart) {
      onChange({ start: iso, end: value.start });
    } else {
      onChange({ start: value.start || iso, end: iso });
    }
    setSelectingEnd(false);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setVisibleMonth(new Date((selectedStart ?? new Date()).getFullYear(), (selectedStart ?? new Date()).getMonth(), 1));
          setSelectingEnd(false);
          setMonthYearOpen(false);
          setOpen(true);
        }}
        className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-border bg-control px-4 py-3 text-left transition-all hover:bg-elevated focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <span>
          <span className="block text-[10px] font-medium uppercase tracking-wider text-text-muted">{startLabel}</span>
          <span className="mt-0.5 block text-sm text-text-primary">{displayDate(value.start, locale)}</span>
        </span>
        <span className="h-8 w-px bg-border" />
        <span className="flex items-center justify-between gap-2">
          <span>
            <span className="block text-[10px] font-medium uppercase tracking-wider text-text-muted">{endLabel}</span>
            <span className="mt-0.5 block text-sm text-text-primary">{displayDate(value.end, locale)}</span>
          </span>
          <CalendarLinear size={18} className="text-accent" />
        </span>
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
          <div className="relative max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[2rem] border border-border bg-elevated p-5 shadow-modal backdrop-blur-3xl" onMouseDown={(event) => event.stopPropagation()}>
            {monthYearOpen ? <MonthYearSelector value={visibleMonth} locale={locale} onChange={setVisibleMonth} onDone={() => setMonthYearOpen(false)} /> : <><div className="mb-4 flex items-center justify-between">
              <button type="button" onClick={() => setVisibleMonth((month) => addMonths(month, -1))} className="rounded-full bg-control p-2 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary">
                <AltArrowLeftLinear size={17} />
              </button>
              <p className="text-xs font-medium text-text-muted">
                {selectingEnd ? endLabel : startLabel}
              </p>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setVisibleMonth((month) => addMonths(month, 1))} className="rounded-full bg-control p-2 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary">
                  <AltArrowRightLinear size={17} />
                </button>
                <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-text-muted transition-colors hover:bg-control hover:text-text-primary">
                  <CloseCircleLinear size={17} />
                </button>
              </div>
            </div>
            <div className="flex gap-7">
              <CalendarMonth month={visibleMonth} start={selectedStart} end={selectedEnd} min={constraints.min} max={constraints.max} locale={locale} onSelect={select} onTitleClick={() => setMonthYearOpen(true)} />
              <div className="hidden border-l border-border pl-7 sm:block">
                <CalendarMonth month={addMonths(visibleMonth, 1)} start={selectedStart} end={selectedEnd} min={constraints.min} max={constraints.max} locale={locale} onSelect={select} onTitleClick={() => { setVisibleMonth(addMonths(visibleMonth, 1)); setMonthYearOpen(true); }} />
              </div>
            </div></>}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

export function DatePicker({ value, onChange, label, min, max, trigger }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [monthYearOpen, setMonthYearOpen] = useState(false);
  const selected = fromIso(value);
  const locale = document.documentElement.lang || navigator.language || "es";
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date((selected ?? new Date()).getFullYear(), (selected ?? new Date()).getMonth(), 1),
  );

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setVisibleMonth(new Date((selected ?? new Date()).getFullYear(), (selected ?? new Date()).getMonth(), 1));
          setMonthYearOpen(false);
          setOpen(true);
        }}
        className={trigger ? "group flex items-center gap-2 rounded-xl px-2 py-1 text-left transition-colors hover:bg-control/60 focus:outline-none focus:ring-2 focus:ring-accent" : "flex w-full items-center justify-between rounded-xl border border-border bg-control px-4 py-2.5 text-left transition-all hover:bg-elevated focus:outline-none focus:ring-2 focus:ring-accent"}
      >
        {trigger ?? <span><span className="block text-[10px] font-medium uppercase tracking-wider text-text-muted">{label}</span><span className="mt-0.5 block text-sm text-text-primary">{displayDate(value, locale)}</span></span>}
        <CalendarLinear size={18} className={trigger ? "text-text-muted transition-colors group-hover:text-accent" : "text-accent"} />
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
          <div className="rounded-[2rem] border border-border bg-elevated p-5 shadow-modal backdrop-blur-3xl" onMouseDown={(event) => event.stopPropagation()}>
            {monthYearOpen ? <MonthYearSelector value={visibleMonth} locale={locale} onChange={setVisibleMonth} onDone={() => setMonthYearOpen(false)} /> : <><div className="mb-4 flex items-center justify-between">
              <button type="button" onClick={() => setVisibleMonth((month) => addMonths(month, -1))} className="rounded-full bg-control p-2 text-text-secondary hover:bg-surface-hover hover:text-text-primary"><AltArrowLeftLinear size={17} /></button>
              <p className="text-xs font-medium text-text-muted">{label}</p>
              <div className="flex gap-1"><button type="button" onClick={() => setVisibleMonth((month) => addMonths(month, 1))} className="rounded-full bg-control p-2 text-text-secondary hover:bg-surface-hover hover:text-text-primary"><AltArrowRightLinear size={17} /></button><button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-text-muted hover:bg-control hover:text-text-primary"><CloseCircleLinear size={17} /></button></div>
            </div>
            <CalendarMonth
              month={visibleMonth}
              start={selected}
              end={null}
              min={fromIso(min ?? "")}
              max={fromIso(max ?? "")}
              locale={locale}
              onSelect={(date) => { onChange(toIso(date)); setOpen(false); }}
              onTitleClick={() => setMonthYearOpen(true)}
            />
            </>}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
