import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AddCircleLinear, PenLinear, TrashBinTrashLinear } from "../ui/appIcons";
import { Badge, Button, Combobox, DatePicker, EmptyState, IconButton, Input, Modal, NumberInput, ProgressBar, Textarea } from "../ui";
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

interface ComponentForm { name: string; parentId: string; weight: string }
interface EntryForm { grade: string; date: string; assessmentId: string; notes: string }

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
  const [componentForm, setComponentForm] = useState<ComponentForm>({ name: "", parentId: "", weight: "" });
  const [entryForm, setEntryForm] = useState<EntryForm>({ grade: "", date: todayIso(), assessmentId: "", notes: "" });

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

  function openComponent(component?: GradeComponent, parentId: number | null = null) {
    setEditingComponent(component ?? null);
    setComponentForm({ name: component?.name ?? "", parentId: String(component?.parent_id ?? parentId ?? ""), weight: component?.weight?.toString() ?? "" });
    setComponentOpen(true);
  }
  async function saveComponent() {
    if (!componentForm.name.trim()) return;
    const values = {
      subject_id: subject.id,
      parent_id: componentForm.parentId ? Number(componentForm.parentId) : null,
      name: componentForm.name.trim(),
      weight: componentForm.weight.trim() ? Number(componentForm.weight) : null,
      sort_order: editingComponent?.sort_order ?? components.length,
    };
    if (editingComponent) await updateGradeComponent(editingComponent.id, values); else await createGradeComponent(values);
    setComponentOpen(false); await reload();
  }

  function openEntry(componentId: number, entry?: GradeEntry) {
    setEntryComponentId(componentId); setEditingEntry(entry ?? null);
    setEntryForm({ grade: entry?.grade.toString() ?? "", date: entry?.date ?? todayIso(), assessmentId: String(entry?.assessment_id ?? ""), notes: entry?.notes ?? "" });
    setEntryOpen(true);
  }
  async function saveEntry() {
    if (entryComponentId === null || entryForm.grade.trim() === "") return;
    const grade = Number(entryForm.grade);
    if (!Number.isFinite(grade) || grade < config.scale_min || grade > scaleMax) return;
    const values = { grade_component_id: entryComponentId, grade, date: entryForm.date, assessment_id: entryForm.assessmentId ? Number(entryForm.assessmentId) : null, notes: entryForm.notes.trim() || null };
    if (editingEntry) await updateGradeEntry(editingEntry.id, values); else await createGradeEntry(values);
    setEntryOpen(false); await reload();
  }

  function renderComponent(component: GradeComponent, depth = 0) {
    const nested = components.filter((item) => item.parent_id === component.id);
    const ownEntries = entries.filter((entry) => entry.grade_component_id === component.id);
    const value = summary.values.get(component.id) ?? null;
    const isCategory = depth === 0;
    return <div key={component.id} className={depth ? "ml-4 border-l border-border pl-3" : ""}>
      <article className="rounded-[1.4rem] border border-border bg-control p-4 transition-colors hover:bg-elevated">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold text-text-primary">{component.name}</h4>{component.weight !== null && <Badge>{component.weight}%</Badge>}</div><p className="mt-1 text-xs text-text-muted">{isCategory || nested.length ? t("grades.itemCount", { count: nested.length }) : t("grades.entryCount", { count: ownEntries.length })}</p></div>
          <div className="flex flex-wrap items-center justify-end gap-1"><span className={`mr-2 text-lg font-bold ${value !== null && value < passing ? "text-danger" : "text-text-primary"}`}>{format(value)}</span>{isCategory ? <Button variant="ghost" className="flex items-center gap-1 px-3 py-1.5 text-xs" onClick={() => openComponent(undefined, component.id)}><AddCircleLinear size={14} />{t("grades.addItem")}</Button> : !nested.length && <Button variant="ghost" className="flex items-center gap-1 px-3 py-1.5 text-xs" onClick={() => openEntry(component.id)}><AddCircleLinear size={14} />{t("grades.addReceivedGrade")}</Button>}<IconButton label={t("settings.lookup.edit")} icon={<PenLinear size={15} />} onClick={() => openComponent(component)} /><IconButton label={t("settings.lookup.delete")} icon={<TrashBinTrashLinear size={15} />} onClick={() => void deleteGradeComponent(component.id).then(reload)} /></div>
        </div>
        {!nested.length && ownEntries.length > 0 && <div className="mt-3 space-y-2 border-t border-border pt-3">{ownEntries.map((entry) => { const assessment = assessments.find((item) => item.id === entry.assessment_id); return <div key={entry.id} className="flex items-center justify-between gap-2 text-sm"><button className="min-w-0 text-left" onClick={() => openEntry(component.id, entry)}><span className="font-medium text-text-primary">{format(entry.grade)}</span><span className="ml-2 text-xs text-text-muted">{assessment?.title ?? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(`${entry.date}T12:00:00`))}</span></button><IconButton label={t("settings.lookup.delete")} icon={<TrashBinTrashLinear size={14} />} onClick={() => void deleteGradeEntry(entry.id).then(reload)} /></div>; })}</div>}
      </article>
      {nested.length > 0 && <div className="mt-2 space-y-2">{nested.map((child) => renderComponent(child, depth + 1))}</div>}
    </div>;
  }

  const roots = components.filter((component) => component.parent_id === null);
  return <div className="flex flex-col gap-4">
    <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
      <div className="rounded-[1.6rem] border border-border bg-elevated p-5 shadow-card"><p className="text-xs font-medium uppercase tracking-wider text-text-muted">{t("grades.currentGrade")}</p><div className="mt-2 flex items-end gap-2"><span className="text-4xl font-bold text-text-primary">{format(summary.subjectGrade)}</span><span className="mb-1 text-sm text-text-muted">/ {scaleMax}</span></div><p className="mt-2 text-xs text-text-muted">{t("grades.passing", { grade: passing })}</p></div>
      <div className="rounded-[1.6rem] border border-border bg-control p-5"><div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold text-text-primary">{t("grades.breakdown")}</h3><p className="mt-1 text-xs text-text-muted">{t("grades.breakdownDescription")}</p></div><Button variant="secondary" className="flex items-center gap-1.5" onClick={() => openComponent()}><AddCircleLinear size={16} />{t("grades.addComponent")}</Button></div><div className="mt-4"><div className="mb-2 flex justify-between text-xs text-text-muted"><span>{t("grades.configuredWeight")}</span><span>{summary.configuredWeight}%</span></div><ProgressBar value={summary.configuredWeight} /></div></div>
    </div>
    {roots.length === 0 ? <EmptyState title={t("grades.empty")} description={t("grades.emptyDescription")} /> : <div className="space-y-3">{roots.map((component) => renderComponent(component))}</div>}

    <Modal open={componentOpen} onClose={() => setComponentOpen(false)} title={editingComponent ? t("grades.editComponent") : componentForm.parentId ? t("grades.addItem") : t("grades.addComponent")}><div className="flex flex-col gap-4"><label className="text-xs text-text-secondary">{t("grades.componentName")}<Input className="mt-1" value={componentForm.name} onChange={(event) => setComponentForm((current) => ({ ...current, name: event.target.value }))} autoFocus /></label><label className="text-xs text-text-secondary">{t("grades.parent")}<div className="mt-1"><Combobox value={componentForm.parentId} onChange={(value) => setComponentForm((current) => ({ ...current, parentId: value }))} options={[{ value: "", label: t("grades.noParent") }, ...components.filter((item) => item.id !== editingComponent?.id && item.parent_id === null).map((item) => ({ value: String(item.id), label: item.name }))]} /></div></label><label className="text-xs text-text-secondary">{t("grades.weight")}<NumberInput className="mt-1" min={0} max={100} step={1} value={componentForm.weight} onValueChange={(weight) => setComponentForm((current) => ({ ...current, weight }))} placeholder={t("grades.weightPlaceholder")} /></label><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setComponentOpen(false)}>{t("settings.lookup.cancel")}</Button><Button onClick={() => void saveComponent()}>{t("settings.lookup.save")}</Button></div></div></Modal>
    <Modal open={entryOpen} onClose={() => setEntryOpen(false)} title={editingEntry ? t("grades.editReceivedGrade") : t("grades.addReceivedGrade")}><div className="flex flex-col gap-4"><label className="text-xs text-text-secondary">{t("grades.grade")}<NumberInput className="mt-1" step={0.1} min={config.scale_min} max={scaleMax} value={entryForm.grade} onValueChange={(grade) => setEntryForm((current) => ({ ...current, grade }))} autoFocus /></label><DatePicker label={t("grades.date")} value={entryForm.date} onChange={(date) => setEntryForm((current) => ({ ...current, date }))} /><label className="text-xs text-text-secondary">{t("grades.assessment")}<div className="mt-1"><Combobox value={entryForm.assessmentId} onChange={(value) => setEntryForm((current) => ({ ...current, assessmentId: value }))} options={[{ value: "", label: t("grades.noAssessment") }, ...assessments.map((assessment) => ({ value: String(assessment.id), label: assessment.title }))]} searchable /></div></label><label className="text-xs text-text-secondary">{t("grades.entryNotes")}<Textarea className="mt-1" rows={3} value={entryForm.notes} onChange={(event) => setEntryForm((current) => ({ ...current, notes: event.target.value }))} /></label><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setEntryOpen(false)}>{t("settings.lookup.cancel")}</Button><Button onClick={() => void saveEntry()}>{t("settings.lookup.save")}</Button></div></div></Modal>
  </div>;
}
