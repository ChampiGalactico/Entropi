import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formatCalendarTime, timeToMinutes, type CalendarPreferences } from "../../lib/calendarPreferences";
import { useCalendarItems } from "./useCalendarItems";
import { addDays, toIsoDate } from "./dateUtils";

const HOUR_HEIGHT = 64;
const TOP_GUTTER = 14;
const BOTTOM_GUTTER = 30;
const pad = (value: number) => String(value).padStart(2, "0");

export function WeekView({ weekStart, preferences }: { weekStart: Date; preferences: CalendarPreferences }) {
  const { t, i18n } = useTranslation();
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const items = useCalendarItems(days[0], days[6]);
  const startMinute = timeToMinutes(preferences.dayStart);
  const endMinute = timeToMinutes(preferences.dayEnd);
  const gridHeight = (endMinute - startMinute) / 60 * HOUR_HEIGHT;
  const hourMarks = Array.from({ length: Math.floor((endMinute - startMinute) / 60) + 1 }, (_, index) => startMinute + index * 60);
  const today = toIsoDate(new Date());

  return <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.75rem] border border-border bg-elevated shadow-card backdrop-blur-2xl">
    <div className="mr-[11px] grid grid-cols-[58px_repeat(7,minmax(0,1fr))] border-b border-border bg-control">
      <div />{days.map((day) => { const iso = toIsoDate(day); return <div key={iso} className={`min-w-0 border-l border-border px-2 py-3 text-center ${iso === today ? "text-accent" : "text-text-secondary"}`}><p className="text-[10px] font-semibold uppercase tracking-wider">{new Intl.DateTimeFormat(i18n.language, { weekday: "short" }).format(day)}</p><span className={`mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${iso === today ? "bg-accent text-white" : "text-text-primary"}`}>{day.getDate()}</span></div>; })}
    </div>
    <div className="mr-[11px] grid grid-cols-[58px_repeat(7,minmax(0,1fr))] border-b border-border bg-surface/50">
      <div className="flex items-center justify-center px-1 py-2 text-center text-[9px] uppercase text-text-muted">{t("calendar.allDay")}</div>{days.map((day) => { const iso = toIsoDate(day); const allDay = items.filter((item) => item.date === iso && item.startTime === null); return <div key={iso} className="min-h-12 min-w-0 space-y-1 border-l border-border p-1.5">{allDay.map((item) => <div key={item.id} title={item.title} className={`truncate rounded-lg px-2 py-1 text-[10px] font-medium ${item.muted ? "opacity-50" : ""}`} style={{ color: item.color, background: `color-mix(in srgb, ${item.color} 14%, transparent)` }}>{item.title}</div>)}</div>; })}
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
      <div className="grid grid-cols-[58px_repeat(7,minmax(0,1fr))]" style={{ height: gridHeight + TOP_GUTTER + BOTTOM_GUTTER }}>
        <div className="relative">{hourMarks.map((mark) => <span key={mark} className="absolute right-2 -translate-y-1/2 whitespace-nowrap text-[10px] text-text-muted" style={{ top: TOP_GUTTER + (mark - startMinute) / 60 * HOUR_HEIGHT }}>{formatCalendarTime(`${pad(Math.floor(mark / 60))}:${pad(mark % 60)}`, preferences.timeFormat)}</span>)}</div>
        {days.map((day) => { const iso = toIsoDate(day); const timed = items.filter((item) => item.date === iso && item.startTime !== null && timeToMinutes(item.startTime) < endMinute && timeToMinutes(item.endTime ?? item.startTime) >= startMinute); return <div key={iso} className="relative min-w-0 overflow-hidden border-l border-border" style={{ backgroundPositionY: TOP_GUTTER, backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${HOUR_HEIGHT - 1}px, var(--border-subtle) ${HOUR_HEIGHT - 1}px, var(--border-subtle) ${HOUR_HEIGHT}px)` }}>{timed.map((item) => { const rawStart = timeToMinutes(item.startTime!); const rawEnd = item.endTime ? timeToMinutes(item.endTime) : rawStart + 35; const start = Math.max(startMinute, rawStart); const end = Math.min(endMinute, rawEnd); const top = TOP_GUTTER + (start - startMinute) / 60 * HOUR_HEIGHT; const height = Math.max(28, (end - start) / 60 * HOUR_HEIGHT); return <article key={item.id} className={`absolute left-1 right-1 z-10 overflow-hidden rounded-xl border p-2 shadow-sm transition-all hover:z-20 hover:scale-[1.02] hover:shadow-card ${item.muted ? "opacity-50" : ""}`} style={{ top, height, borderColor: `color-mix(in srgb, ${item.color} 42%, transparent)`, background: `color-mix(in srgb, ${item.color} 16%, var(--bg-elevated))` }}><p className="truncate text-[10px] font-semibold" style={{ color: item.color }}>{formatCalendarTime(item.startTime!, preferences.timeFormat)} · {t(`calendar.kinds.${item.kind}`)}</p><h4 className="truncate text-xs font-semibold text-text-primary">{item.title}</h4>{height > 44 && item.subtitle && <p className="truncate text-[10px] text-text-muted">{item.subtitle}</p>}</article>; })}</div>; })}
      </div>
    </div>
  </div>;
}
