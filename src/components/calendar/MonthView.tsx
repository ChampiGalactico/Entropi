import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { addDays, startOfWeek, toIsoDate } from "./dateUtils";
import { useCalendarItems } from "./useCalendarItems";

export function MonthView({ month }: { month: Date }) {
  const { i18n } = useTranslation();
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const days = useMemo(() => Array.from({ length: 42 }, (_, index) => addDays(gridStart, index)), [gridStart.getTime()]);
  const items = useCalendarItems(days[0], days[41]);
  const today = toIsoDate(new Date());

  return <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.75rem] border border-border bg-elevated shadow-card backdrop-blur-2xl">
    <div className="mr-[11px] grid grid-cols-7 border-b border-border bg-control">
      {Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(new Date()), index)).map((day) => <div key={day.getDay()} className="border-l border-border px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-text-secondary first:border-l-0">{new Intl.DateTimeFormat(i18n.language, { weekday: "short" }).format(day)}</div>)}
    </div>
    <div className="grid min-h-0 flex-1 grid-cols-7 overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
      {days.map((day, index) => { const iso = toIsoDate(day); const dayItems = items.filter((item) => item.date === iso); const currentMonth = day.getMonth() === month.getMonth(); return <div key={iso} className={`min-h-28 min-w-0 border-border p-2 ${index % 7 ? "border-l" : ""} ${index >= 7 ? "border-t" : ""} ${currentMonth ? "bg-elevated" : "bg-surface/40"}`}><div className="mb-1.5 flex justify-end"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${iso === today ? "bg-accent text-white" : currentMonth ? "text-text-primary" : "text-text-muted"}`}>{day.getDate()}</span></div><div className="space-y-1">{dayItems.slice(0, 3).map((item) => <div key={item.id} title={item.title} className={`truncate rounded-lg border-l-2 px-1.5 py-1 text-[10px] font-medium text-text-primary ${item.muted ? "opacity-50" : ""}`} style={{ borderColor: item.color, background: `color-mix(in srgb, ${item.color} 12%, transparent)` }}>{item.title}</div>)}{dayItems.length > 3 && <p className="px-1 text-[10px] text-text-muted">+{dayItems.length - 3}</p>}</div></div>; })}
    </div>
  </div>;
}
