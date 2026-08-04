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
import { SolarIcon } from "../ui/SolarIcon";
import { Switch } from "../ui/Switch";
import { Textarea } from "../ui/Textarea";
import { TimePicker } from "../ui/TimePicker";
import { createAssessment, deleteAssessment, listAssessmentsBySubject, updateAssessment } from "../../db/queries/assessments";
import { createLocation, listLocations } from "../../db/queries/locations";
import { createLookupRow, listLookupRows } from "../../db/queries/lookups";
import { ACCENT_PRESETS } from "../../lib/accentColors";
import type { Assessment, AssessmentStatus, AssessmentType, Location } from "../../types";

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
};

export function AssessmentsTab({ subjectId }: { subjectId: number }) {
  const { t } = useTranslation();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [types, setTypes] = useState<AssessmentType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AssessmentForm>(EMPTY_FORM);

  async function reloadAssessments() { setAssessments(await listAssessmentsBySubject(subjectId)); }
  async function reloadTypes() { const data = await listLookupRows<AssessmentType>("assessment_types"); setTypes(data); return data; }
  async function reloadLocations() { const data = await listLocations(); setLocations(data); return data; }

  useEffect(() => {
    void Promise.all([reloadAssessments(), reloadTypes(), reloadLocations()]);
  }, [subjectId]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, date: todayIso(), assessment_type_id: types[0]?.id ?? null });
    setOpen(true);
  }

  function openEdit(assessment: Assessment) {
    setEditingId(assessment.id);
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
    if (editingId === null) await createAssessment(values);
    else await updateAssessment(editingId, values);
    setOpen(false);
    await reloadAssessments();
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
                  <div className="flex opacity-60 transition-opacity group-hover:opacity-100"><IconButton label={t("settings.lookup.edit")} icon={<PenLinear size={15} />} onClick={() => openEdit(assessment)} /><IconButton label={t("settings.lookup.delete")} icon={<TrashBinTrashLinear size={15} />} onClick={() => void deleteAssessment(assessment.id).then(reloadAssessments)} /></div>
                </div>
                <div className="mt-4 space-y-1.5 text-xs text-text-secondary">
                  <p>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(`${assessment.date}T12:00:00`))}{assessment.start_time ? ` · ${assessment.start_time}${assessment.end_time ? `–${assessment.end_time}` : ""}` : ""}</p>
                  {location && <p>{location.name}</p>}
                </div>
                <div className="mt-4 flex items-center justify-between"><Badge color={assessment.status === "completed" ? "var(--success)" : assessment.status === "cancelled" ? "var(--danger)" : "var(--accent)"} dot>{t(`subjects.assessments.statuses.${assessment.status}`)}</Badge>{assessment.grade !== null && <span className="text-sm font-semibold text-text-primary">{assessment.grade}</span>}</div>
              </article>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editingId === null ? t("subjects.assessments.addTitle") : t("subjects.assessments.editTitle")}>
        <div className="flex flex-col gap-4">
          <label className="text-xs text-text-secondary">{t("subjects.assessments.name")}<Input className="mt-1" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} autoFocus /></label>
          <label className="text-xs text-text-secondary">{t("subjects.assessments.type")}<div className="mt-1"><Combobox value={form.assessment_type_id === null ? null : String(form.assessment_type_id)} onChange={(value) => setForm((current) => ({ ...current, assessment_type_id: Number(value) }))} options={types.map((type) => ({ value: String(type.id), label: type.name, color: type.icon ? undefined : type.color, icon: type.icon ? <SolarIcon name={type.icon} size={14} color={type.color} /> : undefined }))} searchable creatable onCreate={(name) => void createType(name)} createLabel={(name) => t("subjects.assessments.createType", { name })} /></div></label>
          <DatePicker value={form.date} onChange={(date) => setForm((current) => ({ ...current, date }))} label={t("subjects.assessments.date")} />
          <div className="flex items-center justify-between"><span className="text-sm text-text-primary">{t("subjects.assessments.hasTime")}</span><Switch checked={form.has_time} onChange={(checked) => setForm((current) => ({ ...current, has_time: checked }))} /></div>
          {form.has_time && <div className="grid grid-cols-2 gap-3"><label className="text-xs text-text-secondary">{t("subjects.assessments.startTime")}<div className="mt-1"><TimePicker value={form.start_time} onChange={(value) => setForm((current) => ({ ...current, start_time: value }))} /></div></label><label className="text-xs text-text-secondary">{t("subjects.assessments.endTime")}<div className="mt-1"><TimePicker value={form.end_time} onChange={(value) => setForm((current) => ({ ...current, end_time: value }))} /></div></label></div>}
          <label className="text-xs text-text-secondary">{t("subjects.assessments.location")}<div className="mt-1"><Combobox value={form.location_id === null ? "" : String(form.location_id)} onChange={(value) => setForm((current) => ({ ...current, location_id: value ? Number(value) : null }))} options={[{ value: "", label: t("subjects.schedule.noLocation") }, ...locations.map((location) => ({ value: String(location.id), label: location.name }))]} searchable creatable onCreate={(name) => void createNewLocation(name)} /></div></label>
          <label className="text-xs text-text-secondary">{t("subjects.assessments.status")}<div className="mt-1"><Combobox value={form.status} onChange={(value) => setForm((current) => ({ ...current, status: value as AssessmentStatus }))} options={(["upcoming", "completed", "cancelled"] as AssessmentStatus[]).map((status) => ({ value: status, label: t(`subjects.assessments.statuses.${status}`) }))} /></div></label>
          {form.status === "completed" && <label className="text-xs text-text-secondary">{t("subjects.assessments.grade")}<Input className="mt-1" type="number" step="any" value={form.grade} onChange={(event) => setForm((current) => ({ ...current, grade: event.target.value }))} /></label>}
          <label className="text-xs text-text-secondary">{t("subjects.assessments.notes")}<Textarea className="mt-1" rows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></label>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setOpen(false)}>{t("settings.lookup.cancel")}</Button><Button onClick={() => void save()}>{t("settings.lookup.save")}</Button></div>
        </div>
      </Modal>
    </div>
  );
}
