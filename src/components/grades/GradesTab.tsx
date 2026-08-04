import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AddCircleLinear, PenLinear, TrashBinTrashLinear } from "../ui/appIcons";
import { Badge, Button, Combobox, DatePicker, EmptyState, IconButton, Input, Modal, NumberInput, ProgressBar, Textarea, notify } from "../ui";
import { listAssessmentsBySubject } from "../../db/queries/assessments";
import {
  createGradeComponent,
  createGradeEntry,
  deleteGradeComponent,
  deleteGradeEntry,
  listGradeComponents,
  listGradeEntriesForSubject,
  updateGradeComponent,
  updateGradeEntry,
} from "../../db/queries/grades";
import { getGradingConfig } from "../../db/queries/config";
import { calculateGrades } from "../../lib/gradeCalculator";
import type { Assessment, GradeComponent, GradeEntry, GradingConfig, Subject } from "../../types";

const todayIso = () => new Date().toLocaleDateString("en-CA");
const DEFAULT_CONFIG: GradingConfig = { id: 1, scale_min: 0, scale_max: 5, min_passing_grade: 3, decimal_places_display: 2 };

interface ComponentForm { name: string; weight: string }
interface EntryForm { name: string; grade: string; weight: string; date: string; assessmentId: string; notes: string }

export function GradesTab({ subject }: { subject: Subject }) {
  const { t } = useTranslation();
  const [components, setComponents] = useState<GradeComponent[]>([]);
  const [entries, setEntries] = useState<GradeEntry[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [componentOpen, setComponentOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<GradeComponent | null>(null);
  const [editingEntry, setEditingEntry] = useState<GradeEntry | null>(null);
  const [entryComponentId, setEntryComponentId] = useState<number | null>(null);
  const [componentForm, setComponentForm] = useState<ComponentForm>({ name: "", weight: "" });
  const [entryForm, setEntryForm] = useState<EntryForm>({ name: "", grade: "", weight: "", date: todayIso(), assessmentId: "", notes: "" });

  async function reload() {
    const [componentRows, entryRows, assessmentRows, gradingConfig] = await Promise.all([
      listGradeComponents(subject.id), listGradeEntriesForSubject(subject.id), listAssessmentsBySubject(subject.id), getGradingConfig(),
    ]);
    setComponents(componentRows); setEntries(entryRows); setAssessments(assessmentRows); setConfig(gradingConfig);
  }
  useEffect(() => { void reload(); }, [subject.id]);

  const summary = useMemo(() => calculateGrades(components, entries), [components, entries]);
  const scaleMax = subject.scale_max_override ?? config.scale_max;
  const passing = subject.min_passing_override ?? config.min_passing_grade;
  const format = (value: number | null) => value === null ? "—" : value.toFixed(config.decimal_places_display);

  function openComponent(component?: GradeComponent) {
    setEditingComponent(component ?? null);
    setComponentForm({ name: component?.name ?? "", weight: component?.weight?.toString() ?? "" });
    setComponentOpen(true);
  }
  async function saveComponent() {
    if (!componentForm.name.trim()) return;
    const values = {
      subject_id: subject.id,
      parent_id: null,
      name: componentForm.name.trim(),
      weight: componentForm.weight.trim() ? Number(componentForm.weight) : null,
      sort_order: editingComponent?.sort_order ?? components.length,
    };
    if (editingComponent) await updateGradeComponent(editingComponent.id, values); else await createGradeComponent(values);
    setComponentOpen(false); notify.success(t("feedback.saved")); await reload();
  }

  function openEntry(componentId: number, entry?: GradeEntry) {
    setEntryComponentId(componentId); setEditingEntry(entry ?? null);
    setEntryForm({ name: entry?.name ?? "", grade: entry?.grade.toString() ?? "", weight: entry?.weight?.toString() ?? "", date: entry?.date ?? todayIso(), assessmentId: String(entry?.assessment_id ?? ""), notes: entry?.notes ?? "" });
    setEntryOpen(true);
  }
  async function saveEntry() {
    if (entryComponentId === null || !entryForm.name.trim() || entryForm.grade.trim() === "" || entryForm.weight.trim() === "") return;
    const grade = Number(entryForm.grade);
    if (!Number.isFinite(grade) || grade < config.scale_min || grade > scaleMax) return;
    const values = { grade_component_id: entryComponentId, name: entryForm.name.trim(), grade, weight: Number(entryForm.weight), date: entryForm.date, assessment_id: entryForm.assessmentId ? Number(entryForm.assessmentId) : null, notes: entryForm.notes.trim() || null };
    if (editingEntry) await updateGradeEntry(editingEntry.id, values); else await createGradeEntry(values);
    setEntryOpen(false); notify.success(t("feedback.saved")); await reload();
  }

  useEffect(() => {
    if (!componentOpen && !entryOpen) return;
    function onSave(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") return;
      event.preventDefault();
      if (entryOpen) void saveEntry(); else if (componentOpen) void saveComponent();
    }
    window.addEventListener("keydown", onSave);
    return () => window.removeEventListener("keydown", onSave);
  }, [componentForm, componentOpen, editingComponent, editingEntry, entryComponentId, entryForm, entryOpen]);

  function renderComponent(component: GradeComponent) {
    const ownEntries = entries.filter((entry) => entry.grade_component_id === component.id);
    const value = summary.values.get(component.id) ?? null;
    const entryWeight = ownEntries.reduce((sum, entry) => sum + entry.weight, 0);
    const expectedWeight = component.weight ?? 0;
    const weightMatches = Math.abs(entryWeight - expectedWeight) < 0.001;
    return <article key={component.id} className="rounded-[1.4rem] border border-border bg-control px-4 py-3 transition-colors hover:bg-elevated">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold text-text-primary">{component.name}</h4>{component.weight !== null && <Badge>{component.weight}%</Badge>}</div><p className={`mt-1 text-xs ${weightMatches || ownEntries.length === 0 ? "text-text-muted" : "text-warning"}`}>{t("grades.entryCount", { count: ownEntries.length })} · {entryWeight.toFixed(2)}% / {expectedWeight.toFixed(2)}%</p></div>
          <div className="flex flex-wrap items-center justify-end gap-1"><span className={`mr-2 text-lg font-bold ${value !== null && value < passing ? "text-danger" : "text-text-primary"}`}>{format(value)}</span><Button variant="ghost" className="flex items-center gap-1 px-3 py-1.5 text-xs" onClick={() => openEntry(component.id)}><AddCircleLinear size={14} />{t("grades.addReceivedGrade")}</Button><IconButton label={t("settings.lookup.edit")} icon={<PenLinear size={15} />} onClick={() => openComponent(component)} /><IconButton label={t("settings.lookup.delete")} icon={<TrashBinTrashLinear size={15} />} onClick={() => void deleteGradeComponent(component.id).then(reload)} /></div>
        </div>
        {ownEntries.length > 0 && <div className="mt-3 divide-y divide-border border-t border-border">{ownEntries.map((entry) => <div key={entry.id} className="flex items-center gap-3 py-2 text-sm"><button className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 text-left" onClick={() => openEntry(component.id, entry)}><span className="truncate font-medium text-text-primary">{entry.name}</span><span className={`font-bold tabular-nums ${entry.grade < passing ? "text-danger" : "text-text-primary"}`}>{format(entry.grade)}</span><span className="text-xs tabular-nums text-text-muted">{entry.weight}% · {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(`${entry.date}T12:00:00`))}</span></button><IconButton label={t("settings.lookup.delete")} icon={<TrashBinTrashLinear size={14} />} onClick={() => void deleteGradeEntry(entry.id).then(reload)} /></div>)}</div>}
      </article>;
  }

  const roots = components.filter((component) => component.parent_id === null);
  return <div className="flex flex-col gap-4">
    <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
      <div className="rounded-[1.6rem] border border-border bg-elevated p-5 shadow-card"><p className="text-xs font-medium uppercase tracking-wider text-text-muted">{t("grades.currentGrade")}</p><div className="mt-2 flex items-end gap-2"><span className="text-4xl font-bold text-text-primary">{format(summary.subjectGrade)}</span><span className="mb-1 text-sm text-text-muted">/ {scaleMax}</span></div><p className="mt-2 text-xs text-text-muted">{t("grades.passing", { grade: passing })}</p></div>
      <div className="rounded-[1.6rem] border border-border bg-control p-5"><div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold text-text-primary">{t("grades.breakdown")}</h3><p className="mt-1 text-xs text-text-muted">{t("grades.breakdownDescription")}</p></div><Button variant="secondary" className="flex items-center gap-1.5" onClick={() => openComponent()}><AddCircleLinear size={16} />{t("grades.addComponent")}</Button></div><div className="mt-4"><div className="mb-2 flex justify-between text-xs text-text-muted"><span>{t("grades.configuredWeight")}</span><span>{summary.configuredWeight}%</span></div><ProgressBar value={summary.configuredWeight} /></div></div>
    </div>
    {roots.length === 0 ? <EmptyState title={t("grades.empty")} description={t("grades.emptyDescription")} /> : <div className="space-y-3">{roots.map((component) => renderComponent(component))}</div>}

    <Modal open={componentOpen} onClose={() => setComponentOpen(false)} title={editingComponent ? t("grades.editComponent") : t("grades.addComponent")}><div className="flex flex-col gap-4"><label className="text-xs text-text-secondary">{t("grades.componentName")}<Input className="mt-1" value={componentForm.name} onChange={(event) => setComponentForm((current) => ({ ...current, name: event.target.value }))} autoFocus /></label><label className="text-xs text-text-secondary">{t("grades.weight")}<NumberInput className="mt-1" min={0} max={100} step={0.01} value={componentForm.weight} onValueChange={(weight) => setComponentForm((current) => ({ ...current, weight }))} placeholder={t("grades.weightPlaceholder")} /></label><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setComponentOpen(false)}>{t("settings.lookup.cancel")}</Button><Button onClick={() => void saveComponent()}>{t("settings.lookup.save")}</Button></div></div></Modal>
    <Modal open={entryOpen} onClose={() => setEntryOpen(false)} title={editingEntry ? t("grades.editReceivedGrade") : t("grades.addReceivedGrade")}><div className="flex flex-col gap-4"><label className="text-xs text-text-secondary">{t("grades.entryName")}<Input className="mt-1" value={entryForm.name} onChange={(event) => setEntryForm((current) => ({ ...current, name: event.target.value }))} autoFocus /></label><div className="grid grid-cols-2 gap-3"><label className="text-xs text-text-secondary">{t("grades.grade")}<NumberInput className="mt-1" step={0.1} min={config.scale_min} max={scaleMax} value={entryForm.grade} onValueChange={(grade) => setEntryForm((current) => ({ ...current, grade }))} /></label><label className="text-xs text-text-secondary">{t("grades.entryWeight")}<NumberInput className="mt-1" min={0} max={100} step={0.01} value={entryForm.weight} onValueChange={(weight) => setEntryForm((current) => ({ ...current, weight }))} /></label></div><DatePicker label={t("grades.date")} value={entryForm.date} onChange={(date) => setEntryForm((current) => ({ ...current, date }))} /><label className="text-xs text-text-secondary">{t("grades.assessment")}<div className="mt-1"><Combobox value={entryForm.assessmentId} onChange={(value) => setEntryForm((current) => ({ ...current, assessmentId: value }))} options={[{ value: "", label: t("grades.noAssessment") }, ...assessments.map((assessment) => ({ value: String(assessment.id), label: assessment.title }))]} searchable /></div></label><label className="text-xs text-text-secondary">{t("grades.entryNotes")}<Textarea className="mt-1" rows={3} value={entryForm.notes} onChange={(event) => setEntryForm((current) => ({ ...current, notes: event.target.value }))} /></label><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setEntryOpen(false)}>{t("settings.lookup.cancel")}</Button><Button onClick={() => void saveEntry()}>{t("settings.lookup.save")}</Button></div></div></Modal>
  </div>;
}
