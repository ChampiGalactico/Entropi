import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AddCircleLinear } from "../ui/appIcons";
import { Button } from "../ui/Button";
import { Combobox } from "../ui/Combobox";
import { EmptyState } from "../ui/EmptyState";
import { Input } from "../ui/Input";
import { listLookupRows } from "../../db/queries/lookups";
import { listAllSubjects } from "../../db/queries/subjects";
import { deleteTask, listTasks, setTaskStatus } from "../../db/queries/tasks";
import type { Subject, Task, TaskStatus, TaskType } from "../../types";
import { TaskCard } from "./TaskCard";
import { TaskFormModal } from "./TaskFormModal";
import { notify } from "../ui/Toast";
import { confirmDelete } from "../ui/ConfirmDialog";
import { listNoteReferencesForEntityType, type EntityNoteReference } from "../../db/queries/notes";

export function TaskList({ subjectId, initialDraft = null }: { subjectId?: number; initialDraft?: { title: string; subjectId: number | null } | null }) {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [types, setTypes] = useState<TaskType[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TaskStatus | "all">("all");
  const [typeId, setTypeId] = useState<number | null>(null);
  const [priority, setPriority] = useState<number | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<number | "personal" | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [noteReferences, setNoteReferences] = useState<EntityNoteReference[]>([]);
  const [commandDraft, setCommandDraft] = useState(initialDraft);

  useEffect(() => {
    if (!initialDraft) return;
    setCommandDraft(initialDraft);
    setEditing(null);
    setOpen(true);
  }, [initialDraft]);

  async function reload() { setTasks(await listTasks(subjectId === undefined ? {} : { subjectId })); }
  useEffect(() => { void Promise.all([reload(), listLookupRows<TaskType>("task_types").then(setTypes), listAllSubjects().then(setSubjects), listNoteReferencesForEntityType("task").then(setNoteReferences)]); }, [subjectId]);

  const visible = useMemo(() => tasks.filter((task) => {
    const matchesQuery = !query.trim() || `${task.title} ${task.description ?? ""}`.toLowerCase().includes(query.toLowerCase());
    const matchesSubject = subjectFilter === null || (subjectFilter === "personal" ? task.subject_id === null : task.subject_id === subjectFilter);
    return matchesQuery && (status === "all" || task.status === status) && (typeId === null || task.task_type_id === typeId) && (priority === null || task.priority === priority) && matchesSubject;
  }), [tasks, query, status, typeId, priority, subjectFilter]);

  async function removeTask(task: Task) {
    if (!(await confirmDelete({ itemName: task.title }))) return;
    await deleteTask(task.id);
    notify.success(t("feedback.deleted"));
    await reload();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold text-text-primary">{t("tasks.listTitle")}</h3><p className="mt-1 text-xs text-text-muted">{t("tasks.listDescription")}</p></div><Button variant="secondary" className="flex items-center gap-1.5" onClick={() => { setEditing(null); setOpen(true); }}><AddCircleLinear size={16} />{t("tasks.add")}</Button></div>
      <div className={`grid gap-2 rounded-[1.5rem] border border-border bg-surface p-3 sm:grid-cols-2 ${subjectId === undefined ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("tasks.filters.search")} />
        <Combobox value={status} onChange={(value) => setStatus(value as TaskStatus | "all")} options={[{ value: "all", label: t("tasks.filters.allStatuses") }, ...(["pending", "in_progress", "completed", "cancelled"] as TaskStatus[]).map((item) => ({ value: item, label: t(`tasks.statuses.${item}`) }))]} />
        <Combobox value={typeId === null ? "" : String(typeId)} onChange={(value) => setTypeId(value ? Number(value) : null)} options={[{ value: "", label: t("tasks.filters.allTypes") }, ...types.map((type) => ({ value: String(type.id), label: type.name, color: type.color }))]} />
        <Combobox value={priority === null ? "" : String(priority)} onChange={(value) => setPriority(value ? Number(value) : null)} options={[{ value: "", label: t("tasks.filters.allPriorities") }, ...[1,2,3,4,5].map((item) => ({ value: String(item), label: t(`tasks.priorities.${item}`) }))]} />
        {subjectId === undefined && <Combobox value={subjectFilter === null ? "" : String(subjectFilter)} onChange={(value) => setSubjectFilter(value === "personal" ? "personal" : value ? Number(value) : null)} options={[{ value: "", label: t("tasks.filters.allSubjects") }, { value: "personal", label: t("tasks.form.personal") }, ...subjects.map((subject) => ({ value: String(subject.id), label: subject.name, color: subject.color }))]} searchable />}
      </div>
      {visible.length === 0 ? <EmptyState title={t("tasks.empty")} /> : <div className="grid gap-3 lg:grid-cols-2">{visible.map((task) => <TaskCard key={task.id} task={task} type={types.find((type) => type.id === task.task_type_id) ?? null} subject={subjects.find((subject) => subject.id === task.subject_id) ?? null} noteReferences={noteReferences.filter((reference) => reference.entity_id === task.id)} onToggle={() => void setTaskStatus(task.id, task.status === "completed" ? "pending" : "completed").then(reload)} onEdit={() => { setEditing(task); setOpen(true); }} onDelete={() => void removeTask(task)} />)}</div>}
      <TaskFormModal open={open} onClose={() => { setOpen(false); setCommandDraft(null); }} onSaved={() => void Promise.all([reload(), listLookupRows<TaskType>("task_types").then(setTypes)])} subjects={subjects} task={editing} lockedSubjectId={subjectId} draft={editing ? null : commandDraft} />
    </div>
  );
}
