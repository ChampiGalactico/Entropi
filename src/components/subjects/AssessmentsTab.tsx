import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AddCircleLinear, PenLinear, TrashBinTrashLinear } from "../ui/appIcons";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Combobox } from "../ui/Combobox";
import { DatePicker } from "../ui/DateRangePicker";
import { EmptyState } from "../ui/EmptyState";
import { IconButton } from "../ui/IconButton";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { NumberInput } from "../ui/NumberInput";
import { SolarIcon } from "../ui/SolarIcon";
import { Switch } from "../ui/Switch";
import { Textarea } from "../ui/Textarea";
import { TimePicker } from "../ui/TimePicker";
import { createAssessment, deleteAssessment, listAssessmentsBySubject, updateAssessment } from "../../db/queries/assessments";
import { createLocation, listLocations } from "../../db/queries/locations";
import { createLookupRow, listLookupRows } from "../../db/queries/lookups";
import { ACCENT_PRESETS } from "../../lib/accentColors";
import type { Assessment, AssessmentStatus, AssessmentType, Location } from "../../types";
import { listNoteReferencesForEntityType, type EntityNoteReference } from "../../db/queries/notes";
import { useNavigate } from "react-router-dom";
import { notify } from "../ui/Toast";
import { confirmDelete } from "../ui/ConfirmDialog";
import { listClassSessions } from "../../db/queries/subjects";
import { clearAssessmentGradeLinks, createGradeComponent, listGradeComponents, updateGradeComponent } from "../../db/queries/grades";
import type { ClassSession, GradeComponent, SessionType } from "../../types";

interface AssessmentForm {
  assessment_type_id: number | null;
  title: string;
  date: string;
  has_time: boolean;
  start_time: string;
  end_time: string;
  location_id: number | null;
  notes: string;
  status: AssessmentStatus;
  grade: string;
  grade_target: string;
  grade_weight: string;
  parent_name: string;
  parent_weight: string;
}

function todayIso() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const EMPTY_FORM: AssessmentForm = {
  assessment_type_id: null,
  title: "",
  date: todayIso(),
  has_time: false,
  start_time: "09:00",
  end_time: "10:00",
  location_id: null,
  notes: "",
  status: "upcoming",
  grade: "",
  grade_target: "",
  grade_weight: "",
  parent_name: "",
  parent_weight: "",
};

export function AssessmentsTab({ subjectId, initialDraftTitle = "" }: { subjectId: number; initialDraftTitle?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [types, setTypes] = useState<AssessmentType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AssessmentForm>(EMPTY_FORM);
  const [noteReferences, setNoteReferences] = useState<EntityNoteReference[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
  const [gradeComponents, setGradeComponents] = useState<GradeComponent[]>([]);

  async function reloadAssessments() { setAssessments(await listAssessmentsBySubject(subjectId)); }
  async function reloadTypes() { const data = await listLookupRows<AssessmentType>("assessment_types"); setTypes(data); setForm((current) => ({ ...current, assessment_type_id: current.assessment_type_id ?? data[0]?.id ?? null })); return data; }
  async function reloadLocations() { const data = await listLocations(); setLocations(data); return data; }

  useEffect(() => {
    void Promise.all([
      reloadAssessments(), reloadTypes(), reloadLocations(),
      listClassSessions(subjectId).then(setSessions),
      listLookupRows<SessionType>("session_types").then(setSessionTypes),
      listGradeComponents(subjectId).then(setGradeComponents),
      listNoteReferencesForEntityType("assessment").then(setNoteReferences),
    ]);
  }, [subjectId]);

  useEffect(() => {
    if (!initialDraftTitle) return;
    const date = todayIso();
    setEditingId(null);
    setForm(applyDate(date, { ...EMPTY_FORM, title: initialDraftTitle, date, assessment_type_id: types[0]?.id ?? null }));
    setOpen(true);
    // Opening the command draft must not reset when lookup types finish loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDraftTitle]);

  useEffect(() => {
    if (!open || editingId !== null || sessions.length === 0 || sessionTypes.length === 0) return;
    setForm((current) => current.location_id === null ? applyDate(current.date, current) : current);
    // Default suggestions are applied once lookup/session data becomes available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingId, sessions, sessionTypes]);

  function sessionContextForDate(date: string) {
    const localDate = new Date(`${date}T12:00:00`);
    const dayOfWeek = (localDate.getDay() + 6) % 7;
    const lectureTypeIds = new Set(sessionTypes.filter((type) => /magistral|lecture/i.test(type.name)).map((type) => type.id));
    const sameDay = sessions.filter((session) => session.day_of_week === dayOfWeek);
    const magistralSameDay = sameDay.find((session) => lectureTypeIds.has(session.session_type_id)) ?? null;
    const timedSession = magistralSameDay ?? sameDay[0] ?? null;
    const locationSession = magistralSameDay ?? sessions.find((session) => lectureTypeIds.has(session.session_type_id)) ?? timedSession;
    return { timedSession, locationSession };
  }

  async function removeAssessment(assessment: Assessment) {
    if (!(await confirmDelete({ itemName: assessment.title }))) return;
    await deleteAssessment(assessment.id);
    notify.success(t("feedback.deleted"));
    await reloadAssessments();
  }

  function applyDate(date: string, current: AssessmentForm) {
    const { timedSession, locationSession } = sessionContextForDate(date);
    return {
      ...current,
      date,
      has_time: timedSession ? true : current.has_time,
      start_time: timedSession?.start_time ?? current.start_time,
      end_time: timedSession?.end_time ?? current.end_time,
      location_id: locationSession?.location_id ?? current.location_id,
    };
  }

  function openCreate() {
    setEditingId(null);
    const date = todayIso();
    setForm(applyDate(date, { ...EMPTY_FORM, date, assessment_type_id: types[0]?.id ?? null }));
    setOpen(true);
  }

  function openEdit(assessment: Assessment) {
    setEditingId(assessment.id);
    const linkedGrade = gradeComponents.find((component) => component.assessment_id === assessment.id);
    setForm({
      assessment_type_id: assessment.assessment_type_id,
      title: assessment.title,
      date: assessment.date,
      has_time: assessment.start_time !== null,
      start_time: assessment.start_time ?? "09:00",
      end_time: assessment.end_time ?? "10:00",
      location_id: assessment.location_id,
      notes: assessment.notes_content ?? "",
      status: assessment.status,
      grade: assessment.grade?.toString() ?? "",
      grade_target: linkedGrade ? String(linkedGrade.id) : "",
      grade_weight: linkedGrade?.weight?.toString() ?? "",
      parent_name: "",
      parent_weight: "",
    });
    setOpen(true);
  }

  async function save() {
    if (!form.title.trim() || !form.date || form.assessment_type_id === null) return;
    const values = {
      subject_id: subjectId,
      assessment_type_id: form.assessment_type_id,
      title: form.title.trim(),
      date: form.date,
      start_time: form.has_time ? form.start_time : null,
      end_time: form.has_time ? form.end_time : null,
      location_id: form.location_id,
      notes_content: form.notes.trim() || null,
      status: form.status,
      grade: form.grade.trim() ? Number(form.grade) : null,
    };
    const requiresWeight = form.grade_target === "__new_direct__" || form.grade_target === "__new_parent__" || Boolean(gradeComponents.find((component) => String(component.id) === form.grade_target && (component.is_group || gradeComponents.some((child) => child.parent_id === component.id))));
    const gradeWeight = Number(form.grade_weight);
    if (requiresWeight && (!form.grade_weight.trim() || !Number.isFinite(gradeWeight) || gradeWeight < 0 || gradeWeight > 100)) {
      notify.error(t("subjects.assessments.gradeWeightRequired"));
      return;
    }
    const parentWeight = Number(form.parent_weight);
    if (form.grade_target === "__new_parent__" && (!form.parent_name.trim() || !form.parent_weight.trim() || !Number.isFinite(parentWeight) || parentWeight < 0 || parentWeight > 100)) {
      notify.error(t("subjects.assessments.parentRequired"));
      return;
    }

    const assessmentId = editingId === null ? await createAssessment(values) : editingId;
    if (editingId !== null) await updateAssessment(editingId, values);
    await clearAssessmentGradeLinks(assessmentId);

    if (form.grade_target === "__new_direct__") {
      await createGradeComponent({ subject_id: subjectId, parent_id: null, name: values.title, weight: gradeWeight, sort_order: gradeComponents.filter((component) => component.parent_id === null).length, is_group: 0, grade: values.grade, date: values.date, assessment_id: assessmentId, notes: null });
    } else if (form.grade_target === "__new_parent__") {
      const parentId = await createGradeComponent({ subject_id: subjectId, parent_id: null, name: form.parent_name.trim(), weight: parentWeight, sort_order: gradeComponents.filter((component) => component.parent_id === null).length, is_group: 1, grade: null, date: null, assessment_id: null, notes: null });
      await createGradeComponent({ subject_id: subjectId, parent_id: parentId, name: values.title, weight: gradeWeight, sort_order: 0, is_group: 0, grade: values.grade, date: values.date, assessment_id: assessmentId, notes: null });
    } else if (form.grade_target) {
      const target = gradeComponents.find((component) => component.id === Number(form.grade_target));
      if (target) {
        const targetIsGroup = Boolean(target.is_group) || gradeComponents.some((component) => component.parent_id === target.id);
        if (targetIsGroup) {
          await createGradeComponent({ subject_id: subjectId, parent_id: target.id, name: values.title, weight: gradeWeight, sort_order: gradeComponents.filter((component) => component.parent_id === target.id).length, is_group: 0, grade: values.grade, date: values.date, assessment_id: assessmentId, notes: null });
        } else {
          const { id, ...targetValues } = target;
          await updateGradeComponent(id, { ...targetValues, date: values.date, assessment_id: assessmentId, grade: values.grade ?? target.grade });
        }
      }
    }
    notify.success(t(editingId === null ? "feedback.created" : "feedback.saved"));
    setOpen(false);
    await Promise.all([reloadAssessments(), listGradeComponents(subjectId).then(setGradeComponents)]);
  }

  async function createType(name: string) {
    const color = ACCENT_PRESETS[Math.floor(Math.random() * ACCENT_PRESETS.length)].hex;
    const id = await createLookupRow("assessment_types", { name, color, icon: null });
    await reloadTypes();
    setForm((current) => ({ ...current, assessment_type_id: id }));
  }

  async function createNewLocation(name: string) {
    const id = await createLocation({ name, building: null, room: null, type: "physical", link: null, notes: null });
    await reloadLocations();
    setForm((current) => ({ ...current, location_id: id }));
  }

  function typeFor(id: number) { return types.find((type) => type.id === id) ?? null; }
  function locationFor(id: number | null) { return locations.find((location) => location.id === id) ?? null; }
  const selectedGradeTarget = gradeComponents.find((component) => String(component.id) === form.grade_target);
  const selectedTargetIsGroup = Boolean(selectedGradeTarget && (selectedGradeTarget.is_group || gradeComponents.some((component) => component.parent_id === selectedGradeTarget.id)));
  const availableGradeComponents = gradeComponents.filter((component) => component.assessment_id === null || component.assessment_id === editingId || component.is_group);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div><h3 className="text-sm font-semibold text-text-primary">{t("subjects.assessments.title")}</h3><p className="mt-1 text-xs text-text-muted">{t("subjects.assessments.description")}</p></div>
        <Button variant="secondary" onClick={openCreate} className="flex items-center gap-1.5"><AddCircleLinear size={16} />{t("subjects.assessments.add")}</Button>
      </div>

      {assessments.length === 0 ? <EmptyState title={t("subjects.assessments.empty")} /> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {assessments.map((assessment) => {
            const type = typeFor(assessment.assessment_type_id);
            const location = locationFor(assessment.location_id);
            return (
              <article key={assessment.id} className="group rounded-[1.5rem] border border-border bg-control p-4 transition-all hover:-translate-y-0.5 hover:bg-elevated hover:shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><Badge color={type?.color} icon={type?.icon ? <SolarIcon name={type.icon} size={14} color={type.color} /> : undefined}>{type?.name ?? "—"}</Badge><h4 className="mt-3 truncate font-semibold text-text-primary">{assessment.title}</h4></div>
                  <div className="flex opacity-60 transition-opacity group-hover:opacity-100"><IconButton label={t("settings.lookup.edit")} icon={<PenLinear size={15} />} onClick={() => openEdit(assessment)} /><IconButton label={t("settings.lookup.delete")} icon={<TrashBinTrashLinear size={15} />} onClick={() => void removeAssessment(assessment)} /></div>
                </div>
                <div className="mt-4 space-y-1.5 text-xs text-text-secondary">
                  <p>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(`${assessment.date}T12:00:00`))}{assessment.start_time ? ` · ${assessment.start_time}${assessment.end_time ? `–${assessment.end_time}` : ""}` : ""}</p>
                  {location && <p>{location.name}</p>}
                </div>
                {noteReferences.some((reference) => reference.entity_id === assessment.id) && <div className="mt-3 flex flex-wrap items-center gap-1 text-[10px] text-text-muted"><span>{t("notes.references.details")}</span>{noteReferences.filter((reference) => reference.entity_id === assessment.id).map((reference) => <button key={reference.note_id} type="button" onClick={() => navigate(`/notes/${reference.note_id}`)} className="rounded-full bg-surface-hover px-2 py-1 font-medium text-accent hover:bg-elevated">{reference.title}</button>)}</div>}
                <div className="mt-4 flex items-center justify-between"><Badge color={assessment.status === "completed" ? "var(--success)" : assessment.status === "cancelled" ? "var(--danger)" : "var(--accent)"} dot>{t(`subjects.assessments.statuses.${assessment.status}`)}</Badge>{assessment.grade !== null && <span className="text-sm font-semibold text-text-primary">{assessment.grade}</span>}</div>
              </article>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} onSave={() => void save()} title={editingId === null ? t("subjects.assessments.addTitle") : t("subjects.assessments.editTitle")}>
        <div className="flex flex-col gap-4">
          <label className="text-xs text-text-secondary">{t("subjects.assessments.name")}<Input className="mt-1" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} autoFocus /></label>
          <label className="text-xs text-text-secondary">{t("subjects.assessments.type")}<div className="mt-1"><Combobox value={form.assessment_type_id === null ? null : String(form.assessment_type_id)} onChange={(value) => setForm((current) => ({ ...current, assessment_type_id: Number(value) }))} options={types.map((type) => ({ value: String(type.id), label: type.name, color: type.icon ? undefined : type.color, icon: type.icon ? <SolarIcon name={type.icon} size={14} color={type.color} /> : undefined }))} searchable creatable onCreate={(name) => void createType(name)} createLabel={(name) => t("subjects.assessments.createType", { name })} /></div></label>
          <DatePicker value={form.date} onChange={(date) => setForm((current) => applyDate(date, current))} label={t("subjects.assessments.date")} />
          <div className="flex items-center justify-between"><span className="text-sm text-text-primary">{t("subjects.assessments.hasTime")}</span><Switch checked={form.has_time} onChange={(checked) => setForm((current) => ({ ...current, has_time: checked }))} /></div>
          {form.has_time && <div className="grid grid-cols-2 gap-3"><label className="text-xs text-text-secondary">{t("subjects.assessments.startTime")}<div className="mt-1"><TimePicker value={form.start_time} onChange={(value) => setForm((current) => ({ ...current, start_time: value }))} /></div></label><label className="text-xs text-text-secondary">{t("subjects.assessments.endTime")}<div className="mt-1"><TimePicker value={form.end_time} onChange={(value) => setForm((current) => ({ ...current, end_time: value }))} /></div></label></div>}
          <label className="text-xs text-text-secondary">{t("subjects.assessments.location")}<div className="mt-1"><Combobox value={form.location_id === null ? "" : String(form.location_id)} onChange={(value) => setForm((current) => ({ ...current, location_id: value ? Number(value) : null }))} options={[{ value: "", label: t("subjects.schedule.noLocation") }, ...locations.map((location) => ({ value: String(location.id), label: location.name }))]} searchable creatable onCreate={(name) => void createNewLocation(name)} /></div></label>
          <label className="text-xs text-text-secondary">{t("subjects.assessments.status")}<div className="mt-1"><Combobox value={form.status} onChange={(value) => setForm((current) => ({ ...current, status: value as AssessmentStatus }))} options={(["upcoming", "completed", "cancelled"] as AssessmentStatus[]).map((status) => ({ value: status, label: t(`subjects.assessments.statuses.${status}`) }))} /></div></label>
          {form.status === "completed" && <label className="text-xs text-text-secondary">{t("subjects.assessments.grade")}<NumberInput className="mt-1" step={0.1} value={form.grade} onValueChange={(grade) => setForm((current) => ({ ...current, grade }))} /></label>}
          <div className="rounded-2xl bg-surface-hover p-4">
            <label className="text-xs text-text-secondary">{t("subjects.assessments.gradeRelation")}<div className="mt-1"><Combobox value={form.grade_target} onChange={(grade_target) => setForm((current) => ({ ...current, grade_target }))} options={[
              { value: "", label: t("subjects.assessments.noGradeRelation") },
              { value: "__new_direct__", label: t("subjects.assessments.createDirectGrade") },
              { value: "__new_parent__", label: t("subjects.assessments.createParentAndChild") },
              ...availableGradeComponents.map((component) => ({ value: String(component.id), label: `${component.name}${component.is_group || gradeComponents.some((child) => child.parent_id === component.id) ? ` · ${t("subjects.assessments.parentComponent")}` : ""}` })),
            ]} searchable /></div></label>
            {form.grade_target === "__new_parent__" && <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs text-text-secondary">{t("subjects.assessments.parentName")}<Input className="mt-1" value={form.parent_name} onChange={(event) => setForm((current) => ({ ...current, parent_name: event.target.value }))} /></label><label className="text-xs text-text-secondary">{t("subjects.assessments.parentWeight")}<NumberInput className="mt-1" min={0} max={100} step={0.01} value={form.parent_weight} onValueChange={(parent_weight) => setForm((current) => ({ ...current, parent_weight }))} /></label></div>}
            {(form.grade_target === "__new_direct__" || form.grade_target === "__new_parent__" || selectedTargetIsGroup) && <label className="mt-3 block text-xs text-text-secondary">{selectedTargetIsGroup || form.grade_target === "__new_parent__" ? t("subjects.assessments.childWeight") : t("subjects.assessments.gradeWeight")}<NumberInput className="mt-1" min={0} max={100} step={0.01} value={form.grade_weight} onValueChange={(grade_weight) => setForm((current) => ({ ...current, grade_weight }))} /></label>}
            {form.grade_target && <p className="mt-2 text-[10px] leading-relaxed text-text-muted">{selectedTargetIsGroup || form.grade_target === "__new_parent__" ? t("subjects.assessments.childRelationHint") : t("subjects.assessments.gradeRelationHint")}</p>}
          </div>
          <label className="text-xs text-text-secondary">{t("subjects.assessments.notes")}<Textarea className="mt-1" rows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></label>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setOpen(false)}>{t("settings.lookup.cancel")}</Button><Button onClick={() => void save()}>{t("settings.lookup.save")}</Button></div>
        </div>
      </Modal>
    </div>
  );
}
