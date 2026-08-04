import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AltArrowLeftLinear, AltArrowRightLinear } from "../components/ui/appIcons";
import { Button, DatePicker, IconButton } from "../components/ui";
import { addDays, DayView, MonthView, startOfWeek, toIsoDate, WeekView } from "../components/calendar";
import { DEFAULT_CALENDAR_PREFERENCES, getCalendarPreferences, type CalendarPreferences } from "../lib/calendarPreferences";

type CalendarView = "month" | "week" | "day";

function fromIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function CalendarPage() {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState<CalendarView>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [preferences, setPreferences] = useState<CalendarPreferences>(DEFAULT_CALENDAR_PREFERENCES);
  useEffect(() => { void getCalendarPreferences().then(setPreferences); }, []);

  const week = startOfWeek(anchor);
  const weekEnd = addDays(week, 6);
  const weekLabel = `${new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short" }).format(week)} – ${new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short" }).format(weekEnd)}`;
  const title = view === "month"
    ? new Intl.DateTimeFormat(i18n.language, { month: "long", year: "numeric" }).format(anchor)
    : view === "week" ? weekLabel
      : new Intl.DateTimeFormat(i18n.language, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(anchor);

  function move(direction: -1 | 1) {
    setAnchor((current) => {
      if (view === "day") return addDays(current, direction);
      if (view === "week") return addDays(current, direction * 7);
      return new Date(current.getFullYear(), current.getMonth() + direction, 1);
    });
  }

  const folders: Array<{ id: CalendarView; label: string; subtitle?: string }> = [
    { id: "month", label: t("calendar.views.month") },
    { id: "week", label: t("calendar.views.week"), subtitle: weekLabel },
    { id: "day", label: t("calendar.views.day") },
  ];

  return <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3"><DatePicker value={toIsoDate(anchor)} onChange={(value) => setAnchor(fromIsoDate(value))} label={t("calendar.selectDate")} trigger={<span className="text-xl font-bold capitalize text-text-primary">{title}</span>} /><div className="flex items-center gap-2"><Button variant="secondary" onClick={() => setAnchor(new Date())}>{t("calendar.today")}</Button><IconButton label={t("calendar.previousPeriod")} icon={<AltArrowLeftLinear size={17} />} onClick={() => move(-1)} /><IconButton label={t("calendar.nextPeriod")} icon={<AltArrowRightLinear size={17} />} onClick={() => move(1)} /></div></div>
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative z-10 flex items-end gap-2 px-16">
        {folders.map((folder) => { const active = view === folder.id; return <button key={folder.id} type="button" onClick={() => setView(folder.id)} className={`entropi-calendar-folder-tab relative min-w-40 rounded-t-[1.4rem] px-6 text-center transition-all duration-300 ${active ? "is-active z-10 h-16 pb-2 pt-2 text-accent" : "h-11 bg-control/55 pb-2 pt-2 text-text-secondary hover:bg-control/80 hover:text-text-primary"}`}><span className="block text-sm font-semibold">{folder.label}</span>{active && folder.subtitle && <span className="mt-0.5 block text-[10px] capitalize text-text-muted">{folder.subtitle}</span>}</button>; })}
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[2rem] bg-surface p-3 shadow-card backdrop-blur-2xl">
        {view === "month" && <MonthView month={anchor} preferences={preferences} />}
        {view === "week" && <WeekView weekStart={week} preferences={preferences} />}
        {view === "day" && <DayView date={anchor} preferences={preferences} />}
      </div>
    </div>
  </div>;
}
