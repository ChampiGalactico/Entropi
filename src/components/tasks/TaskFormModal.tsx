import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import { Combobox } from "../ui/Combobox";
import { DatePicker } from "../ui/DateRangePicker";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { SolarIcon } from "../ui/SolarIcon";
import { Switch } from "../ui/Switch";
import { Textarea } from "../ui/Textarea";
import { TimePicker } from "../ui/TimePicker";
import { createLookupRow, listLookupRows } from "../../db/queries/lookups";
import { createTask, updateTask } from "../../db/queries/tasks";
import { ACCENT_PRESETS } from "../../lib/accentColors";
import { parseTaskRecurrence, serializeTaskRecurrence, type TaskRecurrence } from "../../lib/taskRecurrence";
import type { Subject, Task, TaskStatus, TaskType } from "../../types";
import { notify } from "../ui/Toast";
import { RecurrenceField } from "./RecurrenceField";

interface TaskFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  subjects: Subject[];
  task?: Task | null;
  lockedSubjectId?: number;
  draft?: { title: string; subjectId: number | null } | null;
}

interface FormState {
  title: string;
  description: string;
  subject_id: number | null;
  task_type_id: number | null;
  has_due_date: boolean;
  due_date: string;
  has_due_time: boolean;
  due_time: string;
  priority: number;
  status: TaskStatus;
  recurrence: TaskRecurrence | null;
}

function todayIso() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function emptyForm(lockedSubjectId?: number): FormState {
  return { title: "", description: "", subject_id: lockedSubjectId ?? null, task_type_id: null, has_due_date: true, due_date: todayIso(), has_due_time: false, due_time: "18:00", priority: 3, status: "pending", recurrence: null };
}

export function TaskFormModal({ open, onClose, onSaved, subjects, task = null, lockedSubjectId, draft = null }: TaskFormModalProps) {
  const { t } = useTranslation();
  const [types, setTypes] = useState<TaskType[]>([]);
  const [form, setForm] = useState<FormState>(() => emptyForm(lockedSubjectId));

  async function reloadTypes() { const data = await listLookupRows<TaskType>("task_types"); setTypes(data); setForm((current) => ({ ...current, task_type_id: current.task_type_id ?? data[0]?.id ?? null })); return data; }

  useEffect(() => { void reloadTypes(); }, []);
  useEffect(() => {
    if (!open) return;
    setForm(task ? {
      title: task.title,
      description: task.description ?? "",
      subject_id: lockedSubjectId ?? task.subject_id,
      task_type_id: task.task_type_id,
      has_due_date: task.due_date !== null,
      due_date: task.due_date ?? todayIso(),
      has_due_time: task.due_time !== null,
      due_time: task.due_time ?? "18:00",
      priority: task.priority,
      status: task.status,
      recurrence: parseTaskRecurrence(task.recurrence_rule),
    } : {
      ...emptyForm(lockedSubjectId),
      title: draft?.title ?? "",
      subject_id: lockedSubjectId ?? draft?.subjectId ?? null,
      task_type_id: types[0]?.id ?? null,
    });
    // Types are intentionally excluded so creating a type does not reset the rest of the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task, lockedSubjectId, draft]);

  async function createType(name: string) {
    const color = ACCENT_PRESETS[Math.floor(Math.random() * ACCENT_PRESETS.length)].hex;
    const id = await createLookupRow("task_types", { name, color, icon: null });
    notify.success(t("feedback.created"));
    await reloadTypes();
    setForm((current) => ({ ...current, task_type_id: id }));
  }

  async function save() {
    if (!form.title.trim() || form.task_type_id === null) return;
    const values = {
      subject_id: lockedSubjectId ?? form.subject_id,
      task_type_id: form.task_type_id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      due_date: form.has_due_date ? form.due_date : null,
      due_time: form.has_due_date && form.has_due_time ? form.due_time : null,
      priority: form.priority,
      status: form.status,
      recurrence_rule: form.has_due_date ? serializeTaskRecurrence(form.recurrence) : null,
      recurrence_parent_id: task?.recurrence_parent_id ?? null,
    };
    if (task) await updateTask(task.id, values);
    else await createTask(values);
    notify.success(t(task ? "feedback.saved" : "feedback.created"));
    onClose();
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} onSave={() => void save()} title={task ? t("tasks.form.editTitle") : t("tasks.form.addTitle")}>
      <div className="flex flex-col gap-4">
        <label className="text-xs text-text-secondary">{t("tasks.form.title")}<Input className="mt-1" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} autoFocus /></label>
        <label className="text-xs text-text-secondary">{t("tasks.form.type")}<div className="mt-1"><Combobox value={form.task_type_id === null ? null : String(form.task_type_id)} onChange={(value) => setForm((current) => ({ ...current, task_type_id: Number(value) }))} options={types.map((type) => ({ value: String(type.id), label: type.name, color: type.icon ? undefined : type.color, icon: type.icon ? <SolarIcon name={type.icon} size={14} color={type.color} /> : undefined }))} searchable creatable onCreate={(name) => void createType(name)} createLabel={(name) => t("tasks.form.createType", { name })} /></div></label>
        {lockedSubjectId === undefined && <label className="text-xs text-text-secondary">{t("tasks.form.subject")}<div className="mt-1"><Combobox value={form.subject_id === null ? "" : String(form.subject_id)} onChange={(value) => setForm((current) => ({ ...current, subject_id: value ? Number(value) : null }))} options={[{ value: "", label: t("tasks.form.personal") }, ...subjects.map((subject) => ({ value: String(subject.id), label: subject.name, color: subject.color }))]} searchable /></div></label>}
        <label className="text-xs text-text-secondary">{t("tasks.form.description")}<Textarea className="mt-1" rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label>
        <div className="flex items-center justify-between"><span className="text-sm text-text-primary">{t("tasks.form.hasDueDate")}</span><Switch checked={form.has_due_date} onChange={(checked) => setForm((current) => ({ ...current, has_due_date: checked }))} /></div>
        {form.has_due_date && <><DatePicker value={form.due_date} onChange={(due_date) => setForm((current) => ({ ...current, due_date }))} label={t("tasks.form.dueDate")} /><div className="flex items-center justify-between"><span className="text-sm text-text-primary">{t("tasks.form.hasDueTime")}</span><Switch checked={form.has_due_time} onChange={(checked) => setForm((current) => ({ ...current, has_due_time: checked }))} /></div>{form.has_due_time && <TimePicker value={form.due_time} onChange={(due_time) => setForm((current) => ({ ...current, due_time }))} />}
          <RecurrenceField key={task?.id ?? "new"} value={form.recurrence} dueDate={form.due_date} onChange={(recurrence) => setForm((current) => ({ ...current, recurrence }))} /></>}
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-text-secondary">{t("tasks.form.priority")}<div className="mt-1"><Combobox value={String(form.priority)} onChange={(value) => setForm((current) => ({ ...current, priority: Number(value) }))} options={[1,2,3,4,5].map((priority) => ({ value: String(priority), label: t(`tasks.priorities.${priority}`) }))} /></div></label>
          <label className="text-xs text-text-secondary">{t("tasks.form.status")}<div className="mt-1"><Combobox value={form.status} onChange={(value) => setForm((current) => ({ ...current, status: value as TaskStatus }))} options={(["pending", "in_progress", "completed", "cancelled"] as TaskStatus[]).map((status) => ({ value: status, label: t(`tasks.statuses.${status}`) }))} /></div></label>
        </div>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>{t("settings.lookup.cancel")}</Button><Button onClick={() => void save()}>{t("settings.lookup.save")}</Button></div>
      </div>
    </Modal>
  );
}
