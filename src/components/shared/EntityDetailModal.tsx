import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Badge, Button, Combobox, DatePicker, Input, Modal, Switch, Textarea, TimePicker, notify,
} from "../ui";
import { SolarIcon } from "../ui/SolarIcon";
import { PenLinear } from "../ui/appIcons";
import { useEntityDetailStore } from "../../stores/entityDetailStore";
import { getTask } from "../../db/queries/tasks";
import { getAssessment, updateAssessment } from "../../db/queries/assessments";
import { getEvent, updateEvent } from "../../db/queries/events";
import { listAllClassSessions, listAllSubjects, getSubject } from "../../db/queries/subjects";
import { listLocations } from "../../db/queries/locations";
import { listLookupRows } from "../../db/queries/lookups";
import { listNotesForEntity } from "../../db/queries/notes";
import { TaskFormModal } from "../tasks/TaskFormModal";
import type {
  Assessment, AssessmentStatus, AssessmentType, ClassSession, Event, EventType, Location, Note,
  Subject, SessionType, Task, TaskType,
} from "../../types";

type Loaded =
  | { kind: "task"; task: Task; subject: Subject | null; type: TaskType | null }
  | { kind: "assessment"; assessment: Assessment; subject: Subject | null; type: AssessmentType | null; location: Location | null }
  | { kind: "event"; event: Event; type: EventType | null; location: Location | null }
  | { kind: "session"; session: ClassSession; subject: Subject | null; type: SessionType | null; location: Location | null };

function NotesSection({ notes }: { notes: Note[] }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return <div className="rounded-2xl bg-control p-3">
    <div className="mb-1.5 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-text-muted"><SolarIcon name="NotebookLinear" size={14} />{t("entityDetail.notes")}</div>
    {notes.length === 0 ? <p className="text-sm text-text-muted">{t("entityDetail.noNotes")}</p> : <div className="flex flex-wrap gap-1.5">
      {notes.map((note) => <button key={note.id} type="button" onClick={() => { useEntityDetailStore.getState().close(); navigate(`/notes/${note.id}`); }} className="rounded-full bg-surface-hover px-2.5 py-1 text-xs font-medium text-accent hover:bg-elevated">{note.title}</button>)}
    </div>}
  </div>;
}

function Detail({ icon, label, value }: { icon: string; label: string; value: string }) {
  return <div className="rounded-2xl bg-control p-3">
    <div className="mb-1 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-text-muted"><SolarIcon name={icon} size={14} />{label}</div>
    <p className="whitespace-pre-wrap text-sm text-text-primary">{value}</p>
  </div>;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00`));
}

export function EntityDetailModal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const request = useEntityDetailStore((state) => state.request);
  const close = useEntityDetailStore((state) => state.close);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [taskEditOpen, setTaskEditOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!request) { setLoaded(null); setNotes([]); setEditing(false); return; }
    let cancelled = false;
    void (async () => {
      if (request.kind === "task") {
        const [task, allSubjects, taskNotes] = await Promise.all([getTask(request.id), listAllSubjects(), listNotesForEntity("task", request.id)]);
        if (cancelled || !task) return;
        const types = await listLookupRows<TaskType>("task_types");
        setSubjects(allSubjects);
        setLoaded({ kind: "task", task, subject: allSubjects.find((s) => s.id === task.subject_id) ?? null, type: types.find((tt) => tt.id === task.task_type_id) ?? null });
        setNotes(taskNotes);
      } else if (request.kind === "assessment") {
        const [assessment, assessmentNotes] = await Promise.all([getAssessment(request.id), listNotesForEntity("assessment", request.id)]);
        if (cancelled || !assessment) return;
        const [subject, types, locations] = await Promise.all([getSubject(assessment.subject_id), listLookupRows<AssessmentType>("assessment_types"), listLocations()]);
        if (cancelled) return;
        setLoaded({ kind: "assessment", assessment, subject, type: types.find((tt) => tt.id === assessment.assessment_type_id) ?? null, location: locations.find((l) => l.id === assessment.location_id) ?? null });
        setNotes(assessmentNotes);
      } else if (request.kind === "event") {
        const [event, eventNotes] = await Promise.all([getEvent(request.id), listNotesForEntity("event", request.id)]);
        if (cancelled || !event) return;
        const [types, locations] = await Promise.all([listLookupRows<EventType>("event_types"), listLocations()]);
        if (cancelled) return;
        setLoaded({ kind: "event", event, type: types.find((tt) => tt.id === event.event_type_id) ?? null, location: locations.find((l) => l.id === event.location_id) ?? null });
        setNotes(eventNotes);
      } else if (request.kind === "session") {
        const sessions = await listAllClassSessions();
        const session = sessions.find((s) => s.id === request.id);
        if (cancelled || !session) return;
        const [subject, types, locations] = await Promise.all([getSubject(session.subject_id), listLookupRows<SessionType>("session_types"), listLocations()]);
        if (cancelled) return;
        setLoaded({ kind: "session", session, subject, type: types.find((tt) => tt.id === session.session_type_id) ?? null, location: locations.find((l) => l.id === session.location_id) ?? null });
        setNotes([]);
      }
    })();
    return () => { cancelled = true; };
  }, [request]);

  function handleClose() {
    setEditing(false);
    close();
  }

  const open = request !== null;
  const kindLabel = request ? t(`calendar.kinds.${request.kind}`) : "";

  return <>
    <Modal open={open && !taskEditOpen} onClose={handleClose} title={loaded ? (editing ? t("entityDetail.editTitle", { kind: kindLabel }) : kindLabel) : kindLabel} maxWidthClass="max-w-xl">
      {!loaded ? <div className="py-10 text-center text-sm text-text-muted">{t("entityDetail.loading")}</div> : loaded.kind === "task"
        ? <TaskReadView task={loaded.task} subject={loaded.subject} type={loaded.type} notes={notes} onEdit={() => setTaskEditOpen(true)} />
        : loaded.kind === "assessment"
          ? <AssessmentReadOrEdit key={loaded.assessment.id} assessment={loaded.assessment} subject={loaded.subject} type={loaded.type} location={loaded.location} notes={notes} editing={editing} onEditToggle={setEditing} onSaved={() => close()} />
          : loaded.kind === "event"
            ? <EventReadOrEdit key={loaded.event.id} event={loaded.event} type={loaded.type} location={loaded.location} notes={notes} editing={editing} onEditToggle={setEditing} onSaved={() => close()} />
            : <SessionReadView session={loaded.session} subject={loaded.subject} type={loaded.type} location={loaded.location} onOpenSubject={() => { close(); navigate(`/subjects/${loaded.subject?.id}`); }} />}
    </Modal>
    {loaded?.kind === "task" && <TaskFormModal open={taskEditOpen} onClose={() => setTaskEditOpen(false)} onSaved={() => { setTaskEditOpen(false); close(); }} subjects={subjects} task={loaded.task} />}
  </>;
}

function TaskReadView({ task, subject, type, notes, onEdit }: { task: Task; subject: Subject | null; type: TaskType | null; notes: Note[]; onEdit: () => void }) {
  const { t } = useTranslation();
  return <div className="space-y-3">
    <div className="flex items-start justify-between gap-3 rounded-[1.4rem] bg-control p-4">
      <div className="min-w-0"><h3 className="text-lg font-bold text-text-primary">{task.title}</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {type && <Badge color={type.color} icon={type.icon ? <SolarIcon name={type.icon} size={13} color={type.color} /> : undefined}>{type.name}</Badge>}
          {subject && <Badge color={subject.color}>{subject.name}</Badge>}
          <Badge color={task.status === "completed" ? "var(--success)" : task.status === "cancelled" ? "var(--text-muted)" : "var(--accent)"} dot>{t(`tasks.statuses.${task.status}`)}</Badge>
          <Badge color={task.priority <= 2 ? "var(--danger)" : task.priority === 3 ? "var(--warning)" : "var(--text-muted)"}>{t(`tasks.priorities.${task.priority}`)}</Badge>
        </div>
      </div>
      <Button variant="secondary" className="flex shrink-0 items-center gap-2" onClick={onEdit}><PenLinear size={16} />{t("entityDetail.edit")}</Button>
    </div>
    <Detail icon="CalendarLinear" label={t("entityDetail.date")} value={task.due_date ? `${formatDate(task.due_date)}${task.due_time ? ` · ${task.due_time}` : ""}` : t("tasks.noDueDate")} />
    <Detail icon="NotesLinear" label={t("entityDetail.description")} value={task.description || t("entityDetail.noDescription")} />
    <NotesSection notes={notes} />
  </div>;
}

function SessionReadView({ session, subject, type, location, onOpenSubject }: { session: ClassSession; subject: Subject | null; type: SessionType | null; location: Location | null; onOpenSubject: () => void }) {
  const { t } = useTranslation();
  const dayLabel = new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(new Date(2024, 0, 1 + session.day_of_week));
  return <div className="space-y-3">
    <div className="flex items-start justify-between gap-3 rounded-[1.4rem] bg-control p-4">
      <div className="min-w-0"><h3 className="text-lg font-bold text-text-primary">{subject?.name ?? "—"}</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">{type && <Badge color={subject?.color}>{type.name}</Badge>}</div>
      </div>
      <Button variant="secondary" className="shrink-0" onClick={onOpenSubject}>{t("entityDetail.openSubject")}</Button>
    </div>
    <Detail icon="CalendarLinear" label={t("entityDetail.date")} value={`${dayLabel} · ${session.start_time}–${session.end_time}`} />
    {location && <Detail icon="MapPointLinear" label={t("entityDetail.location")} value={location.name} />}
  </div>;
}

function AssessmentReadOrEdit({ assessment, subject, type, location, notes, editing, onEditToggle, onSaved }: {
  assessment: Assessment; subject: Subject | null; type: AssessmentType | null; location: Location | null; notes: Note[];
  editing: boolean; onEditToggle: (value: boolean) => void; onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [types, setTypes] = useState<AssessmentType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [form, setForm] = useState(() => ({
    title: assessment.title, assessment_type_id: assessment.assessment_type_id, date: assessment.date,
    start_time: assessment.start_time ?? "09:00", end_time: assessment.end_time ?? "10:00", has_time: assessment.start_time !== null,
    location_id: assessment.location_id, status: assessment.status, notes_content: assessment.notes_content ?? "",
  }));

  useEffect(() => { if (editing) void Promise.all([listLookupRows<AssessmentType>("assessment_types").then(setTypes), listLocations().then(setLocations)]); }, [editing]);

  async function save() {
    if (!form.title.trim() || form.assessment_type_id === null) return;
    await updateAssessment(assessment.id, {
      subject_id: assessment.subject_id, assessment_type_id: form.assessment_type_id, title: form.title.trim(), date: form.date,
      start_time: form.has_time ? form.start_time : null, end_time: form.has_time ? form.end_time : null,
      location_id: form.location_id, notes_content: form.notes_content.trim() || null, status: form.status as AssessmentStatus, grade: assessment.grade,
    });
    notify.success(t("feedback.saved"));
    onSaved();
  }

  if (editing) return <div className="flex flex-col gap-4">
    <label className="text-xs text-text-secondary">{t("subjects.assessments.name")}<Input className="mt-1" value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} autoFocus /></label>
    <label className="text-xs text-text-secondary">{t("subjects.assessments.type")}<div className="mt-1"><Combobox value={form.assessment_type_id === null ? null : String(form.assessment_type_id)} onChange={(v) => setForm((c) => ({ ...c, assessment_type_id: Number(v) }))} options={types.map((tt) => ({ value: String(tt.id), label: tt.name, color: tt.color }))} /></div></label>
    <DatePicker label={t("subjects.assessments.date")} value={form.date} onChange={(date) => setForm((c) => ({ ...c, date }))} />
    <div className="flex items-center justify-between"><span className="text-sm text-text-primary">{t("subjects.assessments.hasTime")}</span><Switch checked={form.has_time} onChange={(checked) => setForm((c) => ({ ...c, has_time: checked }))} /></div>
    {form.has_time && <div className="grid grid-cols-2 gap-2"><TimePicker value={form.start_time} onChange={(start_time) => setForm((c) => ({ ...c, start_time }))} /><TimePicker value={form.end_time} onChange={(end_time) => setForm((c) => ({ ...c, end_time }))} /></div>}
    <label className="text-xs text-text-secondary">{t("subjects.assessments.location")}<div className="mt-1"><Combobox value={form.location_id === null ? "" : String(form.location_id)} onChange={(v) => setForm((c) => ({ ...c, location_id: v ? Number(v) : null }))} options={[{ value: "", label: t("subjects.schedule.noLocation") }, ...locations.map((l) => ({ value: String(l.id), label: l.name }))]} searchable /></div></label>
    <label className="text-xs text-text-secondary">{t("subjects.assessments.status")}<div className="mt-1"><Combobox value={form.status} onChange={(status) => setForm((c) => ({ ...c, status: status as AssessmentStatus }))} options={(["upcoming", "completed", "cancelled"] as AssessmentStatus[]).map((status) => ({ value: status, label: t(`subjects.assessments.statuses.${status}`) }))} /></div></label>
    <label className="text-xs text-text-secondary">{t("grades.entryNotes")}<Textarea className="mt-1" rows={3} value={form.notes_content} onChange={(e) => setForm((c) => ({ ...c, notes_content: e.target.value }))} /></label>
    <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => onEditToggle(false)}>{t("settings.lookup.cancel")}</Button><Button onClick={() => void save()}>{t("settings.lookup.save")}</Button></div>
  </div>;

  return <div className="space-y-3">
    <div className="flex items-start justify-between gap-3 rounded-[1.4rem] bg-control p-4">
      <div className="min-w-0"><h3 className="text-lg font-bold text-text-primary">{assessment.title}</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {type && <Badge color={type.color}>{type.name}</Badge>}
          {subject && <Badge color={subject.color}>{subject.name}</Badge>}
          <Badge color={assessment.status === "completed" ? "var(--success)" : assessment.status === "cancelled" ? "var(--text-muted)" : "var(--accent)"} dot>{t(`subjects.assessments.statuses.${assessment.status}`)}</Badge>
        </div>
      </div>
      <Button variant="secondary" className="flex shrink-0 items-center gap-2" onClick={() => onEditToggle(true)}><PenLinear size={16} />{t("entityDetail.edit")}</Button>
    </div>
    <Detail icon="CalendarLinear" label={t("entityDetail.date")} value={`${formatDate(assessment.date)}${assessment.start_time ? ` · ${assessment.start_time}–${assessment.end_time ?? ""}` : ""}`} />
    {location && <Detail icon="MapPointLinear" label={t("entityDetail.location")} value={location.name} />}
    {assessment.notes_content && <Detail icon="NotesLinear" label={t("entityDetail.description")} value={assessment.notes_content} />}
    <NotesSection notes={notes} />
  </div>;
}

function EventReadOrEdit({ event, type, location, notes, editing, onEditToggle, onSaved }: {
  event: Event; type: EventType | null; location: Location | null; notes: Note[];
  editing: boolean; onEditToggle: (value: boolean) => void; onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [types, setTypes] = useState<EventType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [form, setForm] = useState(() => ({
    title: event.title, event_type_id: event.event_type_id, date: event.date,
    start_time: event.start_time, end_time: event.end_time ?? event.start_time,
    location_id: event.location_id, description: event.description ?? "", notes_content: event.notes_content ?? "",
    is_recurring: event.is_recurring === 1,
  }));

  useEffect(() => { if (editing) void Promise.all([listLookupRows<EventType>("event_types").then(setTypes), listLocations().then(setLocations)]); }, [editing]);

  async function save() {
    if (!form.title.trim() || form.event_type_id === null) return;
    await updateEvent(event.id, {
      event_type_id: form.event_type_id, title: form.title.trim(), description: form.description.trim() || null, date: form.date,
      start_time: form.start_time, end_time: form.end_time || null, location_id: form.location_id,
      notes_content: form.notes_content.trim() || null, is_recurring: form.is_recurring ? 1 : 0, recurrence_rule: event.recurrence_rule,
    });
    notify.success(t("feedback.saved"));
    onSaved();
  }

  if (editing) return <div className="flex flex-col gap-4">
    <label className="text-xs text-text-secondary">{t("tasks.form.title")}<Input className="mt-1" value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} autoFocus /></label>
    <label className="text-xs text-text-secondary">{t("entityDetail.eventType")}<div className="mt-1"><Combobox value={form.event_type_id === null ? null : String(form.event_type_id)} onChange={(v) => setForm((c) => ({ ...c, event_type_id: Number(v) }))} options={types.map((tt) => ({ value: String(tt.id), label: tt.name, color: tt.color }))} /></div></label>
    <DatePicker label={t("subjects.assessments.date")} value={form.date} onChange={(date) => setForm((c) => ({ ...c, date }))} />
    <div className="grid grid-cols-2 gap-2"><TimePicker value={form.start_time} onChange={(start_time) => setForm((c) => ({ ...c, start_time }))} /><TimePicker value={form.end_time} onChange={(end_time) => setForm((c) => ({ ...c, end_time }))} /></div>
    <label className="text-xs text-text-secondary">{t("subjects.assessments.location")}<div className="mt-1"><Combobox value={form.location_id === null ? "" : String(form.location_id)} onChange={(v) => setForm((c) => ({ ...c, location_id: v ? Number(v) : null }))} options={[{ value: "", label: t("subjects.schedule.noLocation") }, ...locations.map((l) => ({ value: String(l.id), label: l.name }))]} searchable /></div></label>
    <div className="flex items-center justify-between"><span className="text-sm text-text-primary">{t("entityDetail.recurring")}</span><Switch checked={form.is_recurring} onChange={(is_recurring) => setForm((c) => ({ ...c, is_recurring }))} /></div>
    <label className="text-xs text-text-secondary">{t("tasks.form.description")}<Textarea className="mt-1" rows={3} value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} /></label>
    <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => onEditToggle(false)}>{t("settings.lookup.cancel")}</Button><Button onClick={() => void save()}>{t("settings.lookup.save")}</Button></div>
  </div>;

  return <div className="space-y-3">
    <div className="flex items-start justify-between gap-3 rounded-[1.4rem] bg-control p-4">
      <div className="min-w-0"><h3 className="text-lg font-bold text-text-primary">{event.title}</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">{type && <Badge color={type.color}>{type.name}</Badge>}{event.is_recurring === 1 && <Badge color="var(--accent-secondary)">{t("entityDetail.recurring")}</Badge>}</div>
      </div>
      <Button variant="secondary" className="flex shrink-0 items-center gap-2" onClick={() => onEditToggle(true)}><PenLinear size={16} />{t("entityDetail.edit")}</Button>
    </div>
    <Detail icon="CalendarLinear" label={t("entityDetail.date")} value={`${formatDate(event.date)} · ${event.start_time}${event.end_time ? `–${event.end_time}` : ""}`} />
    {location && <Detail icon="MapPointLinear" label={t("entityDetail.location")} value={location.name} />}
    <Detail icon="NotesLinear" label={t("entityDetail.description")} value={event.description || t("entityDetail.noDescription")} />
    <NotesSection notes={notes} />
  </div>;
}
