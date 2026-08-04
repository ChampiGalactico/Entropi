import { useTranslation } from "react-i18next";
import { formatCalendarTime, timeToMinutes, type CalendarPreferences } from "../../lib/calendarPreferences";
import { toIsoDate } from "./dateUtils";
import { useCalendarItems } from "./useCalendarItems";

const HOUR_HEIGHT = 72;
const TOP_GUTTER = 14;
const BOTTOM_GUTTER = 30;
const pad = (value: number) => String(value).padStart(2, "0");

export function DayView({ date, preferences }: { date: Date; preferences: CalendarPreferences }) {
  const { t, i18n } = useTranslation();
  const items = useCalendarItems(date, date);
  const iso = toIsoDate(date);
  const allDay = items.filter((item) => item.date === iso && item.startTime === null);
  const startMinute = timeToMinutes(preferences.dayStart);
  const endMinute = timeToMinutes(preferences.dayEnd);
  const gridHeight = (endMinute - startMinute) / 60 * HOUR_HEIGHT;
  const hourMarks = Array.from(
    { length: Math.floor((endMinute - startMinute) / 60) + 1 },
    (_, index) => startMinute + index * 60,
  );
  const timed = items.filter(
    (item) => item.date === iso && item.startTime && timeToMinutes(item.startTime) < endMinute,
  );

  return <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.75rem] border border-border bg-elevated shadow-card backdrop-blur-2xl">
    <div className="border-b border-border bg-control px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-accent">
        {new Intl.DateTimeFormat(i18n.language, { weekday: "long" }).format(date)}
      </p>
      <p className="mt-1 text-lg font-semibold capitalize text-text-primary">
        {new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "long", year: "numeric" }).format(date)}
      </p>
    </div>
    <div className="mr-[11px] grid grid-cols-[74px_minmax(0,1fr)] border-b border-border bg-surface/50">
      <div className="flex items-center justify-center px-2 py-3 text-[9px] uppercase text-text-muted">{t("calendar.allDay")}</div>
      <div className="min-h-14 space-y-1 border-l border-border p-2">
        {allDay.map((item) => <div key={item.id} className="rounded-xl px-3 py-1.5 text-xs font-medium" style={{ color: item.color, background: `color-mix(in srgb, ${item.color} 14%, transparent)` }}>{item.title}</div>)}
      </div>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
      <div className="grid grid-cols-[74px_minmax(0,1fr)]" style={{ height: gridHeight + TOP_GUTTER + BOTTOM_GUTTER }}>
        <div className="relative">
          {hourMarks.map((mark) => <span key={mark} className="absolute right-3 -translate-y-1/2 whitespace-nowrap text-[10px] text-text-muted" style={{ top: TOP_GUTTER + (mark - startMinute) / 60 * HOUR_HEIGHT }}>{formatCalendarTime(`${pad(Math.floor(mark / 60))}:${pad(mark % 60)}`, preferences.timeFormat)}</span>)}
        </div>
        <div className="relative overflow-hidden border-l border-border" style={{ backgroundPositionY: TOP_GUTTER, backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${HOUR_HEIGHT - 1}px, var(--border-subtle) ${HOUR_HEIGHT - 1}px, var(--border-subtle) ${HOUR_HEIGHT}px)` }}>
          {timed.map((item) => {
            const rawStart = timeToMinutes(item.startTime!);
            const rawEnd = item.endTime ? timeToMinutes(item.endTime) : rawStart + 35;
            const start = Math.max(startMinute, rawStart);
            const end = Math.min(endMinute, rawEnd);
            if (end <= start) return null;
            const top = TOP_GUTTER + (start - startMinute) / 60 * HOUR_HEIGHT;
            const height = Math.max(36, (end - start) / 60 * HOUR_HEIGHT);
            return <article key={item.id} className={`absolute left-3 right-3 overflow-hidden rounded-2xl border p-3 shadow-sm ${item.muted ? "opacity-50" : ""}`} style={{ top, height, borderColor: `color-mix(in srgb, ${item.color} 45%, transparent)`, background: `color-mix(in srgb, ${item.color} 15%, var(--bg-elevated))` }}>
              <p className="text-[10px] font-semibold" style={{ color: item.color }}>{formatCalendarTime(item.startTime!, preferences.timeFormat)} · {t(`calendar.kinds.${item.kind}`)}</p>
              <h4 className="mt-0.5 truncate text-sm font-semibold text-text-primary">{item.title}</h4>
              {item.subtitle && <p className="truncate text-xs text-text-muted">{item.subtitle}</p>}
            </article>;
          })}
        </div>
      </div>
    </div>
  </div>;
}
