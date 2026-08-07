import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "../ui/EmptyState";
import { addDays, startOfWeek, toIsoDate } from "../calendar/dateUtils";
import { openEntityDetail } from "../../stores/entityDetailStore";
import type { Subject, Task, TaskType } from "../../types";

export type TaskCalendarMode = "day" | "week" | "month";

function TaskChip({ task, type, subject, compact = false }: { task: Task; type: TaskType | null; subject: Subject | null; compact?: boolean }) {
  const color = subject?.color ?? type?.color ?? "var(--accent)";
  return (
    <button
      type="button"
      onClick={() => openEntityDetail("task", task.id)}
      title={task.title}
      className={`flex w-full min-w-0 items-center gap-1.5 truncate rounded-lg border-l-2 px-2 py-1 text-left transition-colors hover:bg-surface-hover ${compact ? "text-[9px]" : "text-xs"} ${task.status === "completed" ? "opacity-50 line-through" : ""}`}
      style={{ borderColor: color, background: `color-mix(in srgb, ${color} 10%, transparent)` }}
    >
      {task.due_time && <span className="shrink-0 tabular-nums text-text-muted">{task.due_time}</span>}
      <span className="truncate text-text-primary">{task.title}</span>
    </button>
  );
}

function tasksByDate(tasks: Task[]) {
  const map = new Map<string, Task[]>();
  for (const task of tasks) {
    if (!task.due_date) continue;
    const list = map.get(task.due_date) ?? [];
    list.push(task);
    map.set(task.due_date, list);
  }
  for (const list of map.values()) list.sort((a, b) => (a.due_time ?? "23:59").localeCompare(b.due_time ?? "23:59"));
  return map;
}

export function TaskCalendarView({ mode, anchor, tasks, types, subjects }: {
  mode: TaskCalendarMode;
  anchor: Date;
  tasks: Task[];
  types: TaskType[];
  subjects: Subject[];
}) {
  const { t, i18n } = useTranslation();
  const grouped = useMemo(() => tasksByDate(tasks), [tasks]);
  const typeFor = (task: Task) => types.find((type) => type.id === task.task_type_id) ?? null;
  const subjectFor = (task: Task) => subjects.find((subject) => subject.id === task.subject_id) ?? null;
  const today = toIsoDate(new Date());

  if (mode === "day") {
    const iso = toIsoDate(anchor);
    const dayTasks = grouped.get(iso) ?? [];
    return <div className="rounded-[1.5rem] border border-border bg-surface p-4">
      <p className="mb-3 text-sm font-semibold capitalize text-text-primary">{new Intl.DateTimeFormat(i18n.language, { weekday: "long", day: "numeric", month: "long" }).format(anchor)}</p>
      {dayTasks.length === 0 ? <EmptyState title={t("tasks.empty")} /> : <div className="space-y-1.5">{dayTasks.map((task) => <TaskChip key={task.id} task={task} type={typeFor(task)} subject={subjectFor(task)} />)}</div>}
    </div>;
  }

  if (mode === "week") {
    const start = startOfWeek(anchor);
    const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
    return <div className="grid grid-cols-7 gap-2 rounded-[1.5rem] border border-border bg-surface p-3">
      {days.map((day) => {
        const iso = toIsoDate(day);
        const dayTasks = grouped.get(iso) ?? [];
        return <div key={iso} className={`min-h-40 min-w-0 rounded-2xl p-2 ${iso === today ? "bg-accent/10" : "bg-control/60"}`}>
          <div className="mb-1.5 text-center"><span className={`text-[9px] font-semibold uppercase ${iso === today ? "text-accent" : "text-text-muted"}`}>{new Intl.DateTimeFormat(i18n.language, { weekday: "short" }).format(day)}</span><strong className="ml-1 text-[11px] text-text-primary">{day.getDate()}</strong></div>
          <div className="space-y-1">{dayTasks.map((task) => <TaskChip key={task.id} task={task} type={typeFor(task)} subject={subjectFor(task)} compact />)}</div>
        </div>;
      })}
    </div>;
  }

  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  return <div className="overflow-hidden rounded-[1.5rem] border border-border bg-surface">
    <div className="grid grid-cols-7 border-b border-border bg-control">
      {days.slice(0, 7).map((day) => <div key={day.getDay()} className="border-l border-border px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-text-secondary first:border-l-0">{new Intl.DateTimeFormat(i18n.language, { weekday: "short" }).format(day)}</div>)}
    </div>
    <div className="grid grid-cols-7 grid-rows-6">
      {days.map((day, index) => {
        const iso = toIsoDate(day);
        const dayTasks = grouped.get(iso) ?? [];
        const currentMonth = day.getMonth() === anchor.getMonth();
        return <div key={iso} className={`min-h-24 min-w-0 border-border p-1 ${index % 7 ? "border-l" : ""} ${index >= 7 ? "border-t" : ""} ${currentMonth ? "bg-elevated" : "bg-surface/40"}`}>
          <span className={`mb-1 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold ${iso === today ? "bg-accent text-white" : currentMonth ? "text-text-primary" : "text-text-muted"}`}>{day.getDate()}</span>
          <div className="space-y-0.5">
            {dayTasks.slice(0, 3).map((task) => <TaskChip key={task.id} task={task} type={typeFor(task)} subject={subjectFor(task)} compact />)}
            {dayTasks.length > 3 && <p className="px-1 text-[8px] font-semibold text-accent">+{dayTasks.length - 3} {t("calendar.more")}</p>}
          </div>
        </div>;
      })}
    </div>
  </div>;
}

export function TaskCalendarHeader({ mode, anchor, onNavigate }: { mode: TaskCalendarMode; anchor: Date; onNavigate: (direction: -1 | 1 | 0) => void }) {
  const { t, i18n } = useTranslation();
  const label = mode === "month"
    ? new Intl.DateTimeFormat(i18n.language, { month: "long", year: "numeric" }).format(anchor)
    : mode === "week"
      ? `${new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short" }).format(startOfWeek(anchor))} – ${new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short" }).format(addDays(startOfWeek(anchor), 6))}`
      : new Intl.DateTimeFormat(i18n.language, { weekday: "long", day: "numeric", month: "long" }).format(anchor);
  return <div className="flex items-center gap-2">
    <button type="button" onClick={() => onNavigate(-1)} className="rounded-full bg-control px-2.5 py-1 text-xs text-text-secondary hover:bg-elevated">‹</button>
    <span className="min-w-32 text-center text-xs font-semibold capitalize text-text-primary">{label}</span>
    <button type="button" onClick={() => onNavigate(1)} className="rounded-full bg-control px-2.5 py-1 text-xs text-text-secondary hover:bg-elevated">›</button>
    <button type="button" onClick={() => onNavigate(0)} className="rounded-full bg-control px-2.5 py-1 text-xs text-text-secondary hover:bg-elevated">{t("calendar.today")}</button>
  </div>;
}
