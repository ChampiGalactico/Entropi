import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { addDays, entityIdFromCalendarItem, startOfWeek, toIsoDate, useCalendarItems, type CalendarItem } from "../components/calendar";
import { openEntityDetail } from "../stores/entityDetailStore";
import { AddCircleLinear, AltArrowLeftLinear, AltArrowRightLinear, CalendarLinear, LightbulbBoltLinear } from "../components/ui/appIcons";
import { Badge, Button, Card, Combobox, EmptyState, IconButton, Input, notify } from "../components/ui";
import { createLearningTopic, listLearningTopics, updateLearningTopic } from "../db/queries/learningTopics";
import { listTasks } from "../db/queries/tasks";
import { DEFAULT_CALENDAR_PREFERENCES, formatCalendarTime, getCalendarPreferences, type CalendarPreferences } from "../lib/calendarPreferences";
import type { LearningTopic, LearningTopicStatus, Task } from "../types";

const topicColors: Record<LearningTopicStatus, string> = {
  backlog: "var(--text-muted)",
  started: "var(--accent-secondary)",
  in_progress: "var(--accent)",
  completed: "var(--success)",
};

function fromIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);
  const todayIso = toIsoDate(today);
  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 6);
  const [dayOffset, setDayOffset] = useState(0);
  const selectedDay = addDays(today, dayOffset);
  const selectedDayIso = toIsoDate(selectedDay);
  const [rangeOffset, setRangeOffset] = useState(0);
  const rangeStart = addDays(today, rangeOffset * 7);
  const rangeEnd = addDays(rangeStart, 6);
  const weekItems = useCalendarItems(weekStart, weekEnd);
  const dayItems = useCalendarItems(selectedDay, selectedDay);
  const rangeItems = useCalendarItems(rangeStart, rangeEnd);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [topics, setTopics] = useState<LearningTopic[]>([]);
  const [newTopic, setNewTopic] = useState("");
  const [preferences, setPreferences] = useState<CalendarPreferences>(DEFAULT_CALENDAR_PREFERENCES);

  useEffect(() => {
    void Promise.all([
      listTasks({ dueDateFrom: toIsoDate(weekStart), dueDateTo: toIsoDate(weekEnd) }),
      listLearningTopics(),
      getCalendarPreferences(),
    ]).then(([weekTasks, learningTopics, calendarPreferences]) => {
      setTasks(weekTasks);
      setTopics(learningTopics);
      setPreferences(calendarPreferences);
    });
  }, []);

  const completed = tasks.filter((task) => task.status === "completed").length;
  const inProgress = tasks.filter((task) => task.status === "in_progress").length;
  const overdue = tasks.filter((task) => task.status === "pending" && task.due_date && new Date(`${task.due_date}T${task.due_time ?? "23:59"}`).getTime() < Date.now()).length;
  const todayItems = dayItems.filter((item) => item.date === selectedDayIso && !item.muted);
  const sessions = todayItems.filter((item) => item.kind === "session").sort(byTime);
  const looseTodayItems = todayItems.filter((item) => item.kind !== "session");
  const selectedDayLabel = new Intl.DateTimeFormat(i18n.language, { weekday: "long", day: "numeric", month: "long" }).format(selectedDay);
  const upcoming = rangeItems.filter((item) => item.kind !== "session" && !item.muted).sort(byDateTime);
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const activeTopics = topics.filter((topic) => topic.status !== "completed");

  const rangeLabel = `${new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short" }).format(rangeStart)} – ${new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short" }).format(rangeEnd)}`;
  const formatTime = (value: string | null) => value ? formatCalendarTime(value, preferences.timeFormat) : t("calendar.allDay");

  async function addTopic() {
    const title = newTopic.trim();
    if (!title) return;
    await createLearningTopic({ title, description: null, priority: 3, status: "backlog", notes_content: null, archived: 0 });
    notify.success(t("feedback.created"));
    setNewTopic("");
    setTopics(await listLearningTopics());
  }

  async function changeTopicStatus(topic: LearningTopic, status: LearningTopicStatus) {
    await updateLearningTopic(topic.id, { ...topic, status });
    setTopics(await listLearningTopics());
    notify.success(t("feedback.saved"));
  }

  const topicStatusOptions = (["backlog", "started", "in_progress", "completed"] as LearningTopicStatus[]).map((status) => ({
    value: status,
    label: t(`learningTopics.status.${status}`),
    color: topicColors[status],
  }));

  return <div className="flex h-full min-h-0 flex-col gap-2.5 overflow-hidden">
    <div className="flex shrink-0 items-center justify-between gap-4">
      <div><p className="text-xs capitalize text-text-muted">{new Intl.DateTimeFormat(i18n.language, { weekday: "long", day: "numeric", month: "long" }).format(today)}</p><h1 className="text-xl font-bold text-text-primary">{t("dashboard.title")}</h1></div>
      <Button className="py-1.5" variant="secondary" onClick={() => navigate("/planner")}>{t("dashboard.planWeek")}</Button>
    </div>

    <div className="grid shrink-0 gap-2" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
      <CompactStat label={t("dashboard.stats.completed")} value={completed} color="var(--success)" />
      <CompactStat label={t("dashboard.stats.total")} value={tasks.length} color="var(--accent)" />
      <CompactStat label={t("dashboard.stats.incomplete")} value={overdue} color="var(--danger)" />
      <CompactStat label={t("dashboard.stats.inProgress")} value={inProgress} color="var(--accent-secondary)" />
    </div>

    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <div className="grid min-h-0 flex-1 gap-2.5" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
      <Card className="flex min-h-0 flex-col overflow-hidden p-3.5">
        <div className="flex items-center justify-between gap-3">
          <PanelTitle icon={<CalendarLinear size={17} />} title={dayOffset === 0 ? t("dashboard.todayAgenda") : selectedDayLabel} subtitle={dayOffset === 0 ? t("dashboard.todayAgendaHint") : undefined} />
          <div className="flex shrink-0 gap-1"><IconButton label={t("dashboard.previousDay")} icon={<AltArrowLeftLinear size={15} />} onClick={() => setDayOffset((value) => value - 1)} />{dayOffset !== 0 && <Button className="px-3 py-1 text-xs" variant="ghost" onClick={() => setDayOffset(0)}>{t("calendar.today")}</Button>}<IconButton label={t("dashboard.nextDay")} icon={<AltArrowRightLinear size={15} />} onClick={() => setDayOffset((value) => value + 1)} /></div>
        </div>
        <div className="mt-2.5 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1" style={{ scrollbarGutter: "stable" }}>
          {sessions.length === 0 && looseTodayItems.length === 0 ? <EmptyState title={dayOffset === 0 ? t("dashboard.noAgenda") : t("dashboard.noAgendaDay")} /> : sessions.map((session, index) => {
            const children = index === sessions.findIndex((candidate) => candidate.subjectId === session.subjectId)
              ? looseTodayItems.filter((item) => item.subjectId === session.subjectId)
              : [];
            return <AgendaGroup key={session.id} session={session} children={children} formatTime={formatTime} kindLabel={(kind) => t(`calendar.kinds.${kind}`)} />;
          })}
          {looseTodayItems.filter((item) => !sessions.some((session) => session.subjectId === item.subjectId)).map((item) => <AgendaLooseItem key={item.id} item={item} formatTime={formatTime} />)}
        </div>
      </Card>

      <Card className="flex min-h-0 flex-col overflow-hidden p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="text-sm font-semibold text-text-primary">{rangeOffset === 0 ? t("dashboard.upcoming") : t("dashboard.eventsRange")}</h2><p className="text-[10px] text-text-muted">{rangeLabel}</p></div>
          <div className="flex gap-1"><IconButton label={t("dashboard.previousSevenDays")} icon={<AltArrowLeftLinear size={15} />} onClick={() => setRangeOffset((value) => value - 1)} /><Button className="px-3 py-1 text-xs" variant="ghost" onClick={() => setRangeOffset(0)}>{t("calendar.today")}</Button><IconButton label={t("dashboard.nextSevenDays")} icon={<AltArrowRightLinear size={15} />} onClick={() => setRangeOffset((value) => value + 1)} /></div>
        </div>
        <div className="mt-2.5 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1" style={{ scrollbarGutter: "stable" }}>
          {upcoming.length === 0 ? <EmptyState title={t("dashboard.noUpcoming")} /> : upcoming.map((item) => <div key={item.id} role="button" tabIndex={0} onClick={() => openEntityDetail(item.kind, entityIdFromCalendarItem(item))} className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-control px-2.5 py-2 transition-colors hover:bg-surface-hover">
            <span className="flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-lg text-[10px] font-semibold" style={{ color: item.color, background: `color-mix(in srgb, ${item.color} 13%, transparent)` }}><strong>{fromIso(item.date).getDate()}</strong><span className="text-[7px] uppercase">{new Intl.DateTimeFormat(i18n.language, { month: "short" }).format(fromIso(item.date))}</span></span>
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-text-primary">{item.title}</p><p className="truncate text-[10px] text-text-muted">{formatTime(item.startTime)} · {item.subtitle ?? t(`calendar.kinds.${item.kind}`)}</p></div>
            <Badge className="shrink-0 px-2 py-0.5 text-[9px]" color={item.color}>{t(`calendar.kinds.${item.kind}`)}</Badge>
          </div>)}
        </div>
      </Card>
      </div>

      <div className="grid min-h-0 flex-1 gap-2.5" style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}>
      <Card className="min-h-0 overflow-hidden p-3.5">
        <div className="mb-2 flex items-center justify-between"><div><h2 className="text-sm font-semibold text-text-primary">{t("dashboard.weekSchedule")}</h2><p className="text-[10px] text-text-muted">{t("dashboard.weekScheduleHint")}</p></div><Button className="px-3 py-1 text-xs" variant="ghost" onClick={() => navigate("/calendar")}>{t("dashboard.openCalendar")}</Button></div>
        <div className="grid h-[calc(100%-2.4rem)] grid-cols-7 gap-1.5">
          {weekDays.map((day) => { const iso = toIsoDate(day); const daySessions = weekItems.filter((item) => item.kind === "session" && item.date === iso).sort(byTime); return <div key={iso} className={`min-w-0 rounded-xl p-1.5 ${iso === todayIso ? "bg-accent/10" : "bg-control/60"}`}>
            <div className="mb-1.5 text-center"><span className={`text-[9px] font-semibold uppercase ${iso === todayIso ? "text-accent" : "text-text-muted"}`}>{new Intl.DateTimeFormat(i18n.language, { weekday: "short" }).format(day)}</span><strong className="ml-1 text-[10px] text-text-primary">{day.getDate()}</strong></div>
            <div className="space-y-1">{daySessions.slice(0, 4).map((session) => { const subjectColor = session.subjectColor ?? session.color; return <div key={session.id} className="min-w-0 rounded-lg px-1.5 py-1" style={{ background: `color-mix(in srgb, ${subjectColor} 14%, transparent)` }}><p className="truncate text-[8px] font-semibold" style={{ color: subjectColor }}>{formatTime(session.startTime)}</p><p className="truncate text-[9px] font-medium text-text-primary">{session.title}</p></div>; })}</div>
          </div>; })}
        </div>
      </Card>

      <Card className="flex min-h-0 flex-col overflow-hidden p-3.5">
        <div className="mb-2 flex items-center justify-between gap-2"><PanelTitle icon={<LightbulbBoltLinear size={17} />} title={t("dashboard.learningTopics")} subtitle={t("dashboard.learningTopicsHint")} /><Button className="shrink-0 px-3 py-1 text-xs" variant="ghost" onClick={() => navigate("/learning-topics")}>{t("dashboard.viewAll")}</Button></div>
        <div className="mb-2 flex gap-1.5"><Input className="h-8 min-w-0 py-1 text-xs" value={newTopic} placeholder={t("dashboard.newTopic")} onChange={(event) => setNewTopic(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void addTopic(); }} /><IconButton label={t("learningTopics.add")} icon={<AddCircleLinear size={16} />} onClick={() => void addTopic()} /></div>
        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1" style={{ scrollbarGutter: "stable" }}>{activeTopics.length === 0 ? <EmptyState title={t("learningTopics.empty")} /> : activeTopics.map((topic) => <div key={topic.id} className="flex min-w-0 items-center gap-2 rounded-xl bg-control px-3 py-1.5"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: topicColors[topic.status] }} /><p className="min-w-0 flex-1 truncate text-xs font-medium text-text-primary">{topic.title}</p><div className="w-28 shrink-0"><Combobox compact value={topic.status} options={topicStatusOptions} onChange={(status) => void changeTopicStatus(topic, status as LearningTopicStatus)} /></div></div>)}</div>
      </Card>
      </div>
    </div>
  </div>;
}

function CompactStat({ label, value, color }: { label: string; value: number; color: string }) {
  return <div className="flex h-11 items-center gap-2.5 rounded-2xl bg-elevated px-3 shadow-card backdrop-blur-2xl"><span className="h-5 w-1 rounded-full" style={{ background: color }} /><strong className="text-lg text-text-primary">{value}</strong><span className="truncate text-[10px] text-text-muted">{label}</span></div>;
}

function PanelTitle({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return <div className="flex items-center gap-2"><span className="text-accent">{icon}</span><div><h2 className="text-sm font-semibold text-text-primary">{title}</h2>{subtitle && <p className="text-[10px] text-text-muted">{subtitle}</p>}</div></div>;
}

function AgendaGroup({ session, children, formatTime, kindLabel }: { session: CalendarItem; children: CalendarItem[]; formatTime: (value: string | null) => string; kindLabel: (kind: CalendarItem["kind"]) => string }) {
  const subjectColor = session.subjectColor ?? session.color;
  return <div><div role="button" tabIndex={0} onClick={() => openEntityDetail(session.kind, entityIdFromCalendarItem(session))} className="flex cursor-pointer items-center gap-2 rounded-xl bg-control px-3 py-2 transition-colors hover:bg-surface-hover"><span className="h-7 w-1 rounded-full" style={{ background: subjectColor }} /><p className="shrink-0 text-[11px] font-semibold" style={{ color: subjectColor }}>{formatTime(session.startTime)} – {formatTime(session.endTime)}</p><p className="min-w-0 truncate text-xs font-semibold text-text-primary">{session.title}</p>{session.sessionType && <Badge className="shrink-0 px-2 py-0.5 text-[9px]" color={subjectColor}>{session.sessionType}</Badge>}{session.location && <Badge className="shrink-0 px-2 py-0.5 text-[9px]" color="var(--text-muted)">{session.location}</Badge>}</div>{children.map((item, index) => <div key={item.id} role="button" tabIndex={0} onClick={() => openEntityDetail(item.kind, entityIdFromCalendarItem(item))} className="ml-5 flex cursor-pointer items-center gap-2 py-0.5 text-[10px] text-text-secondary hover:text-text-primary"><span className="text-text-muted">{index === children.length - 1 ? "└─" : "├─"}</span><span className="truncate">{kindLabel(item.kind)} · {item.title}</span></div>)}</div>;
}

function AgendaLooseItem({ item, formatTime }: { item: CalendarItem; formatTime: (value: string | null) => string }) {
  return <div role="button" tabIndex={0} onClick={() => openEntityDetail(item.kind, entityIdFromCalendarItem(item))} className="flex cursor-pointer items-center gap-2 rounded-xl bg-control px-3 py-2 transition-colors hover:bg-surface-hover"><span className="text-[10px] font-semibold" style={{ color: item.color }}>{formatTime(item.startTime)}</span><p className="truncate text-xs text-text-primary">{item.title}</p></div>;
}

function byTime(a: CalendarItem, b: CalendarItem) { return (a.startTime ?? "23:59").localeCompare(b.startTime ?? "23:59"); }
function byDateTime(a: CalendarItem, b: CalendarItem) { return `${a.date}${a.startTime ?? "23:59"}`.localeCompare(`${b.date}${b.startTime ?? "23:59"}`); }
