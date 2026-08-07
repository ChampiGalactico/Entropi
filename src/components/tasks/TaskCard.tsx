import { useTranslation } from "react-i18next";
import { PenLinear, TrashBinTrashLinear } from "../ui/appIcons";
import { Badge } from "../ui/Badge";
import { Checkbox } from "../ui/Checkbox";
import { IconButton } from "../ui/IconButton";
import { SolarIcon } from "../ui/SolarIcon";
import type { Subject, Task, TaskType } from "../../types";
import type { EntityNoteReference } from "../../db/queries/notes";
import { useNavigate } from "react-router-dom";
import { openEntityDetail } from "../../stores/entityDetailStore";
import { describeRecurrence, parseTaskRecurrence } from "../../lib/taskRecurrence";

export function TaskCard({ task, type, subject, noteReferences, onToggle, onEdit, onDelete }: { task: Task; type: TaskType | null; subject: Subject | null; noteReferences: EntityNoteReference[]; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const recurrence = parseTaskRecurrence(task.recurrence_rule);
  const completed = task.status === "completed";
  const overdue = !completed && task.status !== "cancelled" && task.due_date !== null &&
    new Date(`${task.due_date}T${task.due_time ?? "23:59:59"}`).getTime() < Date.now();
  return (
    <article onClick={() => openEntityDetail("task", task.id)} className={`group cursor-pointer rounded-[1.4rem] border border-border bg-control p-4 transition-all hover:-translate-y-0.5 hover:bg-elevated hover:shadow-card ${completed ? "opacity-65" : ""}`} style={{ borderLeftColor: subject?.color ?? type?.color, borderLeftWidth: 3 }}>
      <div className="flex items-start gap-3">
        <div className="pt-0.5" onClick={(event) => event.stopPropagation()}><Checkbox checked={completed} onChange={onToggle} disabled={task.status === "cancelled"} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2"><div><h4 className={`font-medium text-text-primary ${completed ? "line-through" : ""}`}>{task.title}</h4><div className="mt-2 flex flex-wrap gap-1.5"><Badge color={type?.color} icon={type?.icon ? <SolarIcon name={type.icon} size={13} color={type.color} /> : undefined}>{type?.name ?? "—"}</Badge>{subject && <Badge color={subject.color}>{subject.name}</Badge>}<Badge color={task.priority <= 2 ? "var(--danger)" : task.priority === 3 ? "var(--warning)" : "var(--text-muted)"}>{t(`tasks.priorities.${task.priority}`)}</Badge>{recurrence && <Badge color="var(--accent-secondary)" icon={<SolarIcon name="RefreshLinear" size={12} />}>{describeRecurrence(recurrence, t)}</Badge>}</div></div><div className="flex opacity-50 transition-opacity group-hover:opacity-100" onClick={(event) => event.stopPropagation()}><IconButton label={t("settings.lookup.edit")} icon={<PenLinear size={15} />} onClick={onEdit} /><IconButton label={t("settings.lookup.delete")} icon={<TrashBinTrashLinear size={15} />} onClick={onDelete} /></div></div>
          {task.description && <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-text-muted">{task.description}</p>}
          {noteReferences.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-1 text-[10px] text-text-muted"><span>{t("notes.references.details")}</span>{noteReferences.map((reference) => <button key={reference.note_id} type="button" onClick={(event) => { event.stopPropagation(); navigate(`/notes/${reference.note_id}`); }} className="rounded-full bg-surface-hover px-2 py-1 font-medium text-accent hover:bg-elevated">{reference.title}</button>)}</div>}
          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-text-secondary"><span>{task.due_date ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(`${task.due_date}T12:00:00`)) : t("tasks.noDueDate")}{task.due_time ? ` · ${task.due_time}` : ""}</span><Badge color={overdue ? "var(--danger)" : task.status === "completed" ? "var(--success)" : task.status === "cancelled" ? "var(--text-muted)" : "var(--accent)"} dot>{overdue ? t("tasks.statuses.overdue") : t(`tasks.statuses.${task.status}`)}</Badge></div>
        </div>
      </div>
    </article>
  );
}
