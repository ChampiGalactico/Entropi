import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge, Modal } from "../ui";
import { formatCalendarTime, type CalendarPreferences } from "../../lib/calendarPreferences";
import { addDays, startOfWeek, toIsoDate } from "./dateUtils";
import { entityIdFromCalendarItem, useCalendarItems, type CalendarItem } from "./useCalendarItems";
import { openEntityDetail } from "../../stores/entityDetailStore";

function fromIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function MonthView({ month, preferences }: { month: Date; preferences: CalendarPreferences }) {
  const { t, i18n } = useTranslation();
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const days = useMemo(() => Array.from({ length: 42 }, (_, index) => addDays(gridStart, index)), [gridStart.getTime()]);
  const items = useCalendarItems(days[0], days[41]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const today = toIsoDate(new Date());
  const selectedItems = selectedDate ? items.filter((item) => item.date === selectedDate).sort((a, b) => (a.startTime ?? "23:59").localeCompare(b.startTime ?? "23:59")) : [];
  const selectedTitle = selectedDate ? new Intl.DateTimeFormat(i18n.language, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(fromIso(selectedDate)) : "";
  const formatTime = (value: string | null) => value ? formatCalendarTime(value, preferences.timeFormat) : t("calendar.allDay");

  const agendaRows = useMemo(() => {
    const sessions = selectedItems.filter((item) => item.kind === "session");
    const assessments = selectedItems.filter((item) => item.kind === "assessment");
    const attached = new Set<string>();
    const rows: Array<{ item: CalendarItem; child: boolean }> = [];
    for (const session of sessions) {
      rows.push({ item: session, child: false });
      for (const assessment of assessments) {
        if (attached.has(assessment.id) || assessment.subjectId !== session.subjectId) continue;
        const sameTime = assessment.startTime === null || assessment.startTime === session.startTime;
        if (sameTime) {
          rows.push({ item: assessment, child: true });
          attached.add(assessment.id);
        }
      }
    }
    for (const item of selectedItems) if (item.kind !== "session" && !attached.has(item.id)) rows.push({ item, child: false });
    return rows;
  }, [selectedItems]);

  return <>
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.75rem] border border-border bg-elevated shadow-card backdrop-blur-2xl">
      <div className="grid shrink-0 grid-cols-7 border-b border-border bg-control">
        {Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(new Date()), index)).map((day) => <div key={day.getDay()} className="border-l border-border px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-text-secondary first:border-l-0">{new Intl.DateTimeFormat(i18n.language, { weekday: "short" }).format(day)}</div>)}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 overflow-hidden">
        {days.map((day, index) => {
          const iso = toIsoDate(day);
          const dayItems = items.filter((item) => item.date === iso);
          const currentMonth = day.getMonth() === month.getMonth();
          return <button type="button" key={iso} onClick={() => setSelectedDate(iso)} className={`relative flex min-h-0 min-w-0 flex-col items-stretch justify-start overflow-hidden border-border p-1 text-left transition-colors hover:bg-surface-hover ${index % 7 ? "border-l" : ""} ${index >= 7 ? "border-t" : ""} ${currentMonth ? "bg-elevated" : "bg-surface/40"}`}>
            <span className={`absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold ${iso === today ? "bg-accent text-white" : currentMonth ? "text-text-primary" : "text-text-muted"}`}>{day.getDate()}</span>
            <div className="min-h-0 space-y-0.5 pt-6">{dayItems.slice(0, 2).map((item) => <div key={item.id} title={item.title} className={`truncate rounded-md border-l-2 px-1.5 py-0 text-[8px] font-medium leading-4 text-text-primary ${item.muted ? "opacity-50" : ""}`} style={{ borderColor: item.color, background: `color-mix(in srgb, ${item.color} 14%, transparent)` }}>{item.title}</div>)}{dayItems.length > 2 && <p className="h-3 px-1 text-[8px] font-semibold leading-3 text-accent">+{dayItems.length - 2} {t("calendar.more")}</p>}</div>
          </button>;
        })}
      </div>
    </div>

    <Modal open={selectedDate !== null} onClose={() => setSelectedDate(null)} title={selectedTitle}>
      {agendaRows.length === 0 ? <p className="py-8 text-center text-sm text-text-muted">{t("calendar.noItemsForDay")}</p> : <div className="space-y-2">{agendaRows.map(({ item, child }) => <div key={item.id} className={child ? "relative ml-8 before:absolute before:-left-4 before:-top-2 before:h-7 before:w-4 before:rounded-bl-xl before:border-b before:border-l before:border-border" : ""}><article role="button" tabIndex={0} onClick={() => openEntityDetail(item.kind, entityIdFromCalendarItem(item))} className={`flex cursor-pointer items-center gap-3 rounded-2xl bg-control p-3 transition-colors hover:bg-surface-hover ${item.muted ? "opacity-55" : ""}`}><span className="h-10 w-1 shrink-0 rounded-full" style={{ background: item.color }} /><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold" style={{ color: item.color }}>{formatTime(item.startTime)}{item.endTime ? ` – ${formatTime(item.endTime)}` : ""}</p><h3 className="truncate text-sm font-semibold text-text-primary">{item.title}</h3><p className="truncate text-xs text-text-muted">{item.subtitle}{item.location ? ` · ${item.location}` : ""}</p></div><Badge className="shrink-0" color={item.color}>{t(`calendar.kinds.${item.kind}`)}</Badge></article></div>)}</div>}
    </Modal>
  </>;
}
