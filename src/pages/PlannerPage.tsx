import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AddCircleLinear, AltArrowDownLinear, AltArrowLeftLinear, AltArrowRightLinear, CheckCircleLinear } from "../components/ui/appIcons";
import { BlockNoteEditor } from "../components/notes";
import { addDays, startOfWeek, toIsoDate, useCalendarItems, type CalendarItem } from "../components/calendar";
import { Button, Card, Combobox, DatePicker, EmptyState, IconButton, Input, Modal, TimePicker, notify } from "../components/ui";
import { useSaveShortcut } from "../hooks/useSaveShortcut";
import { createTask, listTasks, setTaskStatus } from "../db/queries/tasks";
import { createAssessment } from "../db/queries/assessments";
import { listLookupRows } from "../db/queries/lookups";
import { createWeeklyPlan, getWeeklyPlanByWeekStart, updateWeeklyPlan } from "../db/queries/weeklyPlans";
import type { AssessmentType, Task, TaskType, WeeklyPlan } from "../types";

function fromIso(value: string) { const [year, month, day] = value.split("-").map(Number); return new Date(year, month - 1, day); }

export function PlannerPage() {
  const { t, i18n } = useTranslation();
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    return startOfWeek(today.getDay() === 0 ? addDays(today, 1) : today);
  });
  const weekEnd = addDays(weekStart, 6);
  const [calendarRefresh, setCalendarRefresh] = useState(0);
  const items = useCalendarItems(weekStart, weekEnd, calendarRefresh);
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [goals, setGoals] = useState<string | null>(null);
  const [reflection, setReflection] = useState<string | null>(null);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  const [assessmentTypes, setAssessmentTypes] = useState<AssessmentType[]>([]);
  const [planningSession, setPlanningSession] = useState<CalendarItem | null>(null);
  const [assessmentTitle, setAssessmentTitle] = useState("");
  const [assessmentTypeId, setAssessmentTypeId] = useState<number | null>(null);
  const [assessmentStart, setAssessmentStart] = useState("09:00");
  const [assessmentEnd, setAssessmentEnd] = useState("10:00");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskTypeId, setTaskTypeId] = useState<number | null>(null);
  const weekIso = toIsoDate(weekStart);
  const endIso = toIsoDate(weekEnd);

  async function loadWeek() {
    const [weeklyPlan, types, weekTasks, assessmentTypeRows] = await Promise.all([
      getWeeklyPlanByWeekStart(weekIso),
      listLookupRows<TaskType>("task_types"),
      listTasks({ dueDateFrom: weekIso, dueDateTo: endIso }),
      listLookupRows<AssessmentType>("assessment_types"),
    ]);
    setPlan(weeklyPlan); setGoals(weeklyPlan?.goals ?? null); setReflection(weeklyPlan?.reflection ?? null);
    setTaskTypes(types); setTasks(weekTasks); setDirty(false); setError(null); setCollapsedDays(new Set());
    setTaskTypeId((current) => current ?? types.find((type) => /prep|prepar/i.test(type.name))?.id ?? types[0]?.id ?? null);
    setAssessmentTypes(assessmentTypeRows); setAssessmentTypeId((current) => current ?? assessmentTypeRows[0]?.id ?? null);
  }

  useEffect(() => { void loadWeek(); }, [weekIso, endIso]);

  const sessions = useMemo(() => items.filter((item) => item.kind === "session").sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)), [items]);
  const sessionDays = useMemo(() => {
    const groups = new Map<string, CalendarItem[]>();
    for (const session of sessions) groups.set(session.date, [...(groups.get(session.date) ?? []), session]);
    return [...groups.entries()].map(([date, daySessions]) => ({ date, sessions: daySessions }));
  }, [sessions]);
  const assessments = useMemo(() => items.filter((item) => item.kind === "assessment").sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)), [items]);
  const prepType = taskTypes.find((type) => /prep|prepar/i.test(type.name)) ?? taskTypes[0] ?? null;
  const label = `${new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short" }).format(weekStart)} – ${new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short", year: "numeric" }).format(weekEnd)}`;

  function prepFor(item: CalendarItem) {
    return tasks.find((task) => task.task_type_id === prepType?.id && task.subject_id === item.subjectId && task.due_date === item.date && task.due_time === item.startTime) ?? null;
  }

  function isPrepared(item: CalendarItem) {
    return tasks.some((task) => task.task_type_id === prepType?.id && task.subject_id === item.subjectId && task.due_date === item.date && task.due_time === item.startTime && task.status === "completed");
  }

  function hasPlannedItem(item: CalendarItem) {
    const hasTask = tasks.some((task) => task.subject_id === item.subjectId && task.due_date === item.date && task.due_time === item.startTime);
    return hasTask || assessments.some((assessment) => assessment.subjectId === item.subjectId && assessment.date === item.date && assessment.startTime === item.startTime);
  }

  function openPrepare(item: CalendarItem) {
    setPlanningSession(item); setAssessmentTitle("");
    setTaskTitle(t("planner.prepTitle", { subject: item.title, session: item.subtitle ?? t("calendar.kinds.session") }));
    setTaskTypeId(prepType?.id ?? taskTypes[0]?.id ?? null);
    setAssessmentStart(item.startTime ?? "09:00"); setAssessmentEnd(item.endTime ?? item.startTime ?? "10:00");
  }

  async function createPlannedTask(item: CalendarItem) {
    if (taskTypeId === null || item.subjectId === undefined) { setError(t("planner.noTaskType")); return; }
    await createTask({ subject_id: item.subjectId, task_type_id: taskTypeId, title: taskTitle.trim() || t("planner.prepTitle", { subject: item.title, session: item.subtitle ?? t("calendar.kinds.session") }), description: t("planner.prepDescription"), due_date: item.date, due_time: item.startTime, priority: 3, status: "pending" });
    setTasks(await listTasks({ dueDateFrom: weekIso, dueDateTo: endIso }));
    setTaskTitle("");
    setError(null);
    notify.success(t("planner.taskCreated"));
  }

  async function markPrepared(item: CalendarItem) {
    if (!prepType || item.subjectId === undefined) { setError(t("planner.noTaskType")); return; }
    const existing = prepFor(item);
    if (existing) await setTaskStatus(existing.id, "completed");
    else await createTask({ subject_id: item.subjectId, task_type_id: prepType.id, title: t("planner.prepTitle", { subject: item.title, session: item.subtitle ?? t("calendar.kinds.session") }), description: t("planner.prepDescription"), due_date: item.date, due_time: item.startTime, priority: 3, status: "completed" });
    setTasks(await listTasks({ dueDateFrom: weekIso, dueDateTo: endIso }));
    setError(null);
    notify.success(t("planner.prepared"));
  }

  async function addAssessmentForSession() {
    if (!planningSession || planningSession.subjectId === undefined || assessmentTypeId === null || !assessmentTitle.trim()) return;
    await createAssessment({ subject_id: planningSession.subjectId, assessment_type_id: assessmentTypeId, title: assessmentTitle.trim(), date: planningSession.date, start_time: assessmentStart, end_time: assessmentEnd, location_id: null, notes_content: null, status: "upcoming", grade: null });
    setAssessmentTitle("");
    setCalendarRefresh((value) => value + 1);
    notify.success(t("planner.assessmentCreated"));
  }

  const savePlan = useCallback(async () => {
    const values = { week_start: weekIso, goals, reflection };
    if (plan) await updateWeeklyPlan(plan.id, values); else await createWeeklyPlan(values);
    setPlan(await getWeeklyPlanByWeekStart(weekIso)); setDirty(false);
    notify.success(t("planner.saved"));
  }, [goals, plan, reflection, t, weekIso]);

  useSaveShortcut(() => { void savePlan(); });

  function toggleDay(date: string) {
    setCollapsedDays((current) => {
      const next = new Set(current);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });
  }

  return <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-text-primary">{t("planner.title")}</h1><p className="mt-1 text-sm text-text-muted">{t("planner.description")}</p></div>
      <div className="flex flex-wrap items-center justify-end gap-2"><DatePicker value={weekIso} onChange={(value) => setWeekStart(startOfWeek(fromIso(value)))} label={t("planner.selectWeek")} trigger={<span className="font-semibold capitalize text-text-primary">{label}</span>} /><IconButton label={t("planner.previousWeek")} icon={<AltArrowLeftLinear size={17} />} onClick={() => setWeekStart((current) => addDays(current, -7))} /><IconButton label={t("planner.nextWeek")} icon={<AltArrowRightLinear size={17} />} onClick={() => setWeekStart((current) => addDays(current, 7))} />{dirty && <span className="ml-2 text-xs font-medium text-warning">{t("planner.unsaved")}</span>}<span className="hidden items-center gap-1 sm:flex"><kbd className="rounded-md border border-border bg-control px-1.5 py-1 text-[9px] text-text-muted">Ctrl</kbd><span className="text-[9px] text-text-muted">+</span><kbd className="rounded-md border border-border bg-control px-1.5 py-1 text-[9px] text-text-muted">S</kbd></span><Button className="ml-1" onClick={() => void savePlan()}>{t("planner.save")}</Button></div>
    </div>

    <div className="grid min-h-0 flex-1 grid-rows-2 gap-4 xl:grid-cols-[1.1fr_.9fr] xl:grid-rows-1">
      <div className="grid min-h-0 gap-4 grid-rows-[minmax(0,1.8fr)_minmax(0,1fr)]">
        <Card className="flex min-h-0 flex-col overflow-hidden">
          <div className="mb-4 shrink-0"><h2 className="text-sm font-semibold text-text-primary">{t("planner.weekSchedule")}</h2><p className="mt-1 text-xs text-text-muted">{t("planner.weekScheduleHint")}</p></div>
          {sessions.length === 0 ? <div className="min-h-0 flex-1 overflow-y-auto"><EmptyState title={t("planner.noClasses")} /></div> : <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1" style={{ scrollbarGutter: "stable" }}>
            {sessionDays.map((day) => {
              const collapsed = collapsedDays.has(day.date);
              return <section key={day.date} className="overflow-hidden rounded-2xl bg-control/70">
                <button type="button" onClick={() => toggleDay(day.date)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-surface-hover">
                  <span className="text-xs font-semibold capitalize text-text-primary">{new Intl.DateTimeFormat(i18n.language, { weekday: "long", day: "numeric", month: "short" }).format(fromIso(day.date))}</span>
                  <AltArrowDownLinear size={14} className={`text-text-muted transition-transform ${collapsed ? "-rotate-90" : ""}`} />
                </button>
                {!collapsed && <div className="space-y-1.5 border-t border-border/70 p-2">{day.sessions.map((item) => <div key={item.id} className="flex items-center gap-2 rounded-xl bg-elevated/65 p-2"><span className="h-8 w-1 shrink-0 rounded-full" style={{ background: item.color }} /><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-text-primary"><span className="mr-1.5 tabular-nums" style={{ color: item.color }}>{item.startTime}</span>{item.title}</p><p className="truncate text-[10px] text-text-muted">{item.subtitle}</p></div>{isPrepared(item) ? <span className="flex shrink-0 items-center gap-1 text-[10px] text-success"><CheckCircleLinear size={13} />✨ {t("planner.prepared")}</span> : <Button variant="secondary" className="flex shrink-0 items-center gap-1 px-2 py-1 text-[10px]" onClick={() => openPrepare(item)}><AddCircleLinear size={12} />{t("planner.createPrep")}</Button>}</div>)}</div>}
              </section>;
            })}
          </div>}
        </Card>

        <Card className="flex min-h-0 flex-col overflow-hidden">
          <div className="shrink-0"><h2 className="text-sm font-semibold text-text-primary">{t("planner.reflection")}</h2><p className="mb-3 mt-1 text-xs text-text-muted">{t("planner.reflectionHint")}</p></div><div className="min-h-0 flex-1 overflow-y-auto"><BlockNoteEditor key={`reflection-${weekIso}-${plan?.id ?? "new"}`} value={reflection} onChange={(value) => { setReflection(value); setDirty(true); }} /></div>
        </Card>
      </div>

      <div className="relative grid min-h-0 gap-4 grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="flex min-h-0 flex-col overflow-hidden"><div className="shrink-0"><h2 className="text-sm font-semibold text-text-primary">{t("planner.goals")}</h2><p className="mb-3 mt-1 text-xs text-text-muted">{t("planner.goalsHint")}</p></div><div className="min-h-0 flex-1 overflow-y-auto"><BlockNoteEditor key={`goals-${weekIso}-${plan?.id ?? "new"}`} value={goals} onChange={(value) => { setGoals(value); setDirty(true); }} /></div></Card>
        <Card className="flex min-h-0 flex-col overflow-hidden"><div className="mb-4 shrink-0"><h2 className="text-sm font-semibold text-text-primary">{t("planner.assessments")}</h2><p className="mt-1 text-xs text-text-muted">{t("planner.assessmentsHint")}</p></div>{assessments.length === 0 ? <div className="min-h-0 flex-1 overflow-y-auto"><EmptyState title={t("planner.noAssessments")} /></div> : <div className="grid min-h-0 flex-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2" style={{ scrollbarGutter: "stable" }}>{assessments.map((item) => <div key={item.id} className="h-fit rounded-xl bg-control p-2.5"><p className="text-[10px] capitalize" style={{ color: item.color }}>{new Intl.DateTimeFormat(i18n.language, { weekday: "short", day: "numeric", month: "short" }).format(fromIso(item.date))}</p><p className="mt-0.5 truncate text-xs font-semibold text-text-primary">{item.title}</p><p className="truncate text-[10px] text-text-muted">{item.subtitle}</p></div>)}</div>}</Card>
        {error && <p className="absolute bottom-2 right-4 text-xs text-danger">{error}</p>}
      </div>
    </div>

    <Modal open={planningSession !== null} onClose={() => setPlanningSession(null)} title={t("planner.prepareSession")} maxWidthClass="max-w-2xl">
      {planningSession && <div className="space-y-4">
        <div className="rounded-2xl bg-control p-3"><p className="text-sm font-semibold text-text-primary">{planningSession.title}</p><p className="mt-1 text-xs text-text-muted">{planningSession.date} · {planningSession.startTime}–{planningSession.endTime}</p><p className="mt-2 text-xs text-text-secondary">{t("planner.prepareSessionHint")}</p></div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col rounded-2xl bg-control p-4"><h3 className="text-sm font-semibold text-text-primary">{t("planner.addTask")}</h3><p className="mt-1 text-xs text-text-muted">{t("planner.prepDescription")}</p><label className="mt-3 text-xs text-text-secondary">{t("planner.taskType")}<div className="mt-1"><Combobox value={taskTypeId === null ? null : String(taskTypeId)} onChange={(value) => setTaskTypeId(Number(value))} options={taskTypes.map((type) => ({ value: String(type.id), label: type.name, color: type.color }))} /></div></label><Input className="mt-3" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder={t("planner.addTask")} /><Button className="mt-4" variant="secondary" onClick={() => void createPlannedTask(planningSession)} disabled={!taskTitle.trim() || taskTypeId === null}>{t("planner.addTask")}</Button></div>
          <div className="rounded-2xl bg-control p-4"><h3 className="text-sm font-semibold text-text-primary">{t("planner.addAssessment")}</h3><label className="mt-3 block text-xs text-text-secondary">{t("planner.assessmentName")}<Input className="mt-1" value={assessmentTitle} onChange={(event) => setAssessmentTitle(event.target.value)} /></label><label className="mt-3 block text-xs text-text-secondary">{t("planner.assessmentType")}<div className="mt-1"><Combobox value={assessmentTypeId === null ? null : String(assessmentTypeId)} onChange={(value) => setAssessmentTypeId(Number(value))} options={assessmentTypes.map((type) => ({ value: String(type.id), label: type.name, color: type.color }))} /></div></label><div className="mt-3 grid grid-cols-2 gap-2"><TimePicker value={assessmentStart} onChange={setAssessmentStart} /><TimePicker value={assessmentEnd} onChange={setAssessmentEnd} /></div><Button className="mt-4 w-full" variant="secondary" onClick={() => void addAssessmentForSession()} disabled={!assessmentTitle.trim() || assessmentTypeId === null}>{t("planner.addAssessment")}</Button></div>
        </div>
        <div className="flex justify-end"><Button className="flex items-center gap-2" disabled={!hasPlannedItem(planningSession)} onClick={() => void markPrepared(planningSession).then(() => setPlanningSession(null))}><CheckCircleLinear size={16} />{t("planner.markPrepared")}</Button></div>
      </div>}
    </Modal>
  </div>;
}
