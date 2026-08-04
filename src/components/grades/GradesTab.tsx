import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AddCircleLinear, PenLinear, TrashBinTrashLinear } from "../ui/appIcons";
import { Badge, Button, Checkbox, Combobox, DatePicker, EmptyState, IconButton, Input, Modal, NumberInput, ProgressBar, Textarea, notify } from "../ui";
import { listAssessmentsBySubject } from "../../db/queries/assessments";
import { createGradeComponent, deleteGradeComponent, listGradeComponents, updateGradeComponent } from "../../db/queries/grades";
import { getGradingConfig } from "../../db/queries/config";
import { calculateGrades } from "../../lib/gradeCalculator";
import type { Assessment, GradeComponent, GradingConfig, Subject } from "../../types";

const todayIso = () => new Date().toLocaleDateString("en-CA");
const DEFAULT_CONFIG: GradingConfig = { id: 1, scale_min: 0, scale_max: 5, min_passing_grade: 3, decimal_places_display: 2 };
const invalidClass = "!border-danger !ring-2 !ring-danger/25";

interface ComponentForm {
  name: string;
  weight: string;
  isGroup: boolean;
  grade: string;
  date: string;
  assessmentId: string;
  notes: string;
}

function InlineGrade({ component, min, max, passing, decimals, onSave }: {
  component: GradeComponent;
  min: number;
  max: number;
  passing: number;
  decimals: number;
  onSave: (grade: number | null) => Promise<void>;
}) {
  const [value, setValue] = useState(component.grade?.toString() ?? "");
  const [invalid, setInvalid] = useState(false);
  useEffect(() => setValue(component.grade?.toString() ?? ""), [component.grade]);

  async function commit() {
    if (!value.trim()) { setInvalid(false); await onSave(null); return; }
    const grade = Number(value);
    if (!Number.isFinite(grade) || grade < min || grade > max) {
      setInvalid(true);
      notify.error(`La calificación debe estar entre ${min} y ${max}.`);
      return;
    }
    setInvalid(false);
    await onSave(grade);
  }

  return <div onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) void commit(); }} className={`w-28 rounded-xl ${invalid ? invalidClass : ""}`}>
    <NumberInput
      aria-label="Calificación"
      value={value}
      min={min}
      max={max}
      step={10 ** -decimals}
      onValueChange={(next) => { setValue(next); setInvalid(false); }}
      onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void commit(); } }}
      className={component.grade !== null && component.grade < passing ? "!border-danger" : ""}
      placeholder="—"
    />
  </div>;
}

export function GradesTab({ subject }: { subject: Subject }) {
  const { t } = useTranslation();
  const [components, setComponents] = useState<GradeComponent[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [componentOpen, setComponentOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<GradeComponent | null>(null);
  const [parentId, setParentId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<ComponentForm>({ name: "", weight: "", isGroup: false, grade: "", date: todayIso(), assessmentId: "", notes: "" });

  async function reload() {
    const [componentRows, assessmentRows, gradingConfig] = await Promise.all([
      listGradeComponents(subject.id), listAssessmentsBySubject(subject.id), getGradingConfig(),
    ]);
    setComponents(componentRows); setAssessments(assessmentRows); setConfig(gradingConfig);
  }
  useEffect(() => { void reload(); }, [subject.id]);

  const summary = useMemo(() => calculateGrades(components, []), [components]);
  const scaleMax = subject.scale_max_override ?? config.scale_max;
  const passing = subject.min_passing_override ?? config.min_passing_grade;
  const format = (value: number | null) => value === null ? "—" : value.toFixed(config.decimal_places_display);
  const childrenOf = (id: number | null) => components.filter((component) => component.parent_id === id);

  function openComponent(component?: GradeComponent, nextParentId: number | null = null) {
    setEditingComponent(component ?? null);
    setParentId(component?.parent_id ?? nextParentId);
    setErrors(new Set());
    setForm({
      name: component?.name ?? "",
      weight: component?.weight?.toString() ?? "",
      isGroup: Boolean(component?.is_group),
      grade: component?.grade?.toString() ?? "",
      date: component?.date ?? todayIso(),
      assessmentId: String(component?.assessment_id ?? ""),
      notes: component?.notes ?? "",
    });
    setComponentOpen(true);
  }

  async function saveComponent() {
    const nextErrors = new Set<string>();
    if (!form.name.trim()) nextErrors.add("name");
    const weight = Number(form.weight);
    if (!form.weight.trim() || !Number.isFinite(weight) || weight < 0 || weight > 100) nextErrors.add("weight");
    const grade = form.grade.trim() ? Number(form.grade) : null;
    if (grade !== null && (!Number.isFinite(grade) || grade < config.scale_min || grade > scaleMax)) nextErrors.add("grade");
    if (nextErrors.size) {
      setErrors(nextErrors);
      notify.error(t("grades.requiredFeedback"));
      return;
    }
    const siblingCount = childrenOf(parentId).length;
    const values = {
      subject_id: subject.id,
      parent_id: parentId,
      name: form.name.trim(),
      weight,
      sort_order: editingComponent?.sort_order ?? siblingCount,
      is_group: form.isGroup ? 1 : 0,
      grade: form.isGroup ? null : grade,
      date: form.isGroup ? null : form.date,
      assessment_id: form.isGroup || !form.assessmentId ? null : Number(form.assessmentId),
      notes: form.isGroup ? null : form.notes.trim() || null,
    };
    if (editingComponent) await updateGradeComponent(editingComponent.id, values); else await createGradeComponent(values);
    setComponentOpen(false); notify.success(t("feedback.saved")); await reload();
  }

  async function saveInlineGrade(component: GradeComponent, grade: number | null) {
    if (component.grade === grade) return;
    const { id, ...values } = component;
    await updateGradeComponent(id, { ...values, grade });
    notify.success(t("grades.gradeSaved"));
    await reload();
  }

  useEffect(() => {
    if (!componentOpen) return;
    function onSave(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") return;
      event.preventDefault(); void saveComponent();
    }
    window.addEventListener("keydown", onSave);
    return () => window.removeEventListener("keydown", onSave);
  }, [componentOpen, editingComponent, form, parentId]);

  function renderComponent(component: GradeComponent, depth = 0) {
    const children = childrenOf(component.id);
    const isGroup = Boolean(component.is_group) || children.length > 0;
    const value = summary.values.get(component.id) ?? null;
    const childrenWeight = children.reduce((sum, child) => sum + (child.weight ?? 0), 0);
    const weightMatches = Math.abs(childrenWeight - (component.weight ?? 0)) < 0.001;
    const assessment = assessments.find((item) => item.id === component.assessment_id);
    return <article key={component.id} className={`${depth ? "ml-5 mt-2 border-l-2 border-border pl-3" : ""}`}>
      <div className="rounded-[1.4rem] border border-border bg-control px-4 py-3 transition-colors hover:bg-elevated">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold text-text-primary">{component.name}</h4>{component.weight !== null && <Badge>{component.weight}%</Badge>}{isGroup && <Badge color="var(--accent-secondary)">{t("grades.multiple")}</Badge>}</div>
            {isGroup
              ? <p className={`mt-1 text-xs ${weightMatches || children.length === 0 ? "text-text-muted" : "text-warning"}`}>{t("grades.childGradeCount", { count: children.length })} · {childrenWeight.toFixed(2)}% / {(component.weight ?? 0).toFixed(2)}%</p>
              : <p className="mt-1 text-xs text-text-muted">{[component.date ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(`${component.date}T12:00:00`)) : null, assessment?.title, component.notes].filter(Boolean).join(" · ") || t("grades.noDetails")}</p>}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1">
            {isGroup
              ? <><span className={`mr-2 text-lg font-bold ${value !== null && value < passing ? "text-danger" : "text-text-primary"}`}>{format(value)}</span><Button variant="ghost" className="flex items-center gap-1 px-3 py-1.5 text-xs" onClick={() => openComponent(undefined, component.id)}><AddCircleLinear size={14} />{t("grades.addGrade")}</Button></>
              : <InlineGrade component={component} min={config.scale_min} max={scaleMax} passing={passing} decimals={config.decimal_places_display} onSave={(grade) => saveInlineGrade(component, grade)} />}
            <IconButton label={t("settings.lookup.edit")} icon={<PenLinear size={15} />} onClick={() => openComponent(component)} />
            <IconButton label={t("settings.lookup.delete")} icon={<TrashBinTrashLinear size={15} />} onClick={() => void deleteGradeComponent(component.id).then(reload)} />
          </div>
        </div>
      </div>
      {children.map((child) => renderComponent(child, depth + 1))}
    </article>;
  }

  const roots = childrenOf(null);
  const groupLocked = editingComponent ? childrenOf(editingComponent.id).length > 0 : false;
  return <div className="flex flex-col gap-4">
    <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
      <div className="rounded-[1.6rem] border border-border bg-elevated p-5 shadow-card"><p className="text-xs font-medium uppercase tracking-wider text-text-muted">{t("grades.currentGrade")}</p><div className="mt-2 flex items-end gap-2"><span className="text-4xl font-bold text-text-primary">{format(summary.subjectGrade)}</span><span className="mb-1 text-sm text-text-muted">/ {scaleMax}</span></div><p className="mt-2 text-xs text-text-muted">{t("grades.passing", { grade: passing })}</p></div>
      <div className="rounded-[1.6rem] border border-border bg-control p-5"><div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold text-text-primary">{t("grades.breakdown")}</h3><p className="mt-1 text-xs text-text-muted">{t("grades.breakdownDescription")}</p></div><Button variant="secondary" className="flex items-center gap-1.5" onClick={() => openComponent()}><AddCircleLinear size={16} />{t("grades.addComponent")}</Button></div><div className="mt-4"><div className="mb-2 flex justify-between text-xs text-text-muted"><span>{t("grades.configuredWeight")}</span><span>{summary.configuredWeight}%</span></div><ProgressBar value={summary.configuredWeight} /></div></div>
    </div>
    {roots.length === 0 ? <EmptyState title={t("grades.empty")} description={t("grades.emptyDescription")} /> : <div className="space-y-3">{roots.map((component) => renderComponent(component))}</div>}

    <Modal open={componentOpen} onClose={() => setComponentOpen(false)} title={editingComponent ? t("grades.editComponent") : parentId === null ? t("grades.addComponent") : t("grades.addGrade")}>
      <div className="flex flex-col gap-4">
        <label className="text-xs text-text-secondary">{parentId === null ? t("grades.componentName") : t("grades.gradeName")}<Input aria-invalid={errors.has("name")} className={`mt-1 ${errors.has("name") ? invalidClass : ""}`} value={form.name} onChange={(event) => { setForm((current) => ({ ...current, name: event.target.value })); setErrors((current) => { const next = new Set(current); next.delete("name"); return next; }); }} autoFocus />{errors.has("name") && <span className="mt-1 block text-[10px] text-danger">{t("grades.requiredField")}</span>}</label>
        <label className="text-xs text-text-secondary">{t("grades.weight")}<NumberInput className={`mt-1 ${errors.has("weight") ? invalidClass : ""}`} min={0} max={100} step={0.01} value={form.weight} onValueChange={(weight) => { setForm((current) => ({ ...current, weight })); setErrors((current) => { const next = new Set(current); next.delete("weight"); return next; }); }} />{errors.has("weight") && <span className="mt-1 block text-[10px] text-danger">{t("grades.requiredPercentage")}</span>}</label>
        <div className="rounded-2xl bg-surface-hover p-3"><Checkbox checked={form.isGroup} disabled={groupLocked} onChange={(isGroup) => setForm((current) => ({ ...current, isGroup }))} label={t("grades.hasChildren")} /><p className="ml-6 mt-1 text-[10px] leading-relaxed text-text-muted">{groupLocked ? t("grades.groupLocked") : t("grades.hasChildrenHint")}</p></div>
        {!form.isGroup && <>
          <label className="text-xs text-text-secondary">{t("grades.gradeOptional")}<NumberInput className={`mt-1 ${errors.has("grade") ? invalidClass : ""}`} step={0.1} min={config.scale_min} max={scaleMax} value={form.grade} onValueChange={(grade) => { setForm((current) => ({ ...current, grade })); setErrors((current) => { const next = new Set(current); next.delete("grade"); return next; }); }} placeholder="—" /></label>
          <DatePicker label={t("grades.date")} value={form.date} onChange={(date) => setForm((current) => ({ ...current, date }))} />
          <label className="text-xs text-text-secondary">{t("grades.assessment")}<div className="mt-1"><Combobox value={form.assessmentId} onChange={(assessmentId) => setForm((current) => ({ ...current, assessmentId }))} options={[{ value: "", label: t("grades.noAssessment") }, ...assessments.map((assessment) => ({ value: String(assessment.id), label: assessment.title }))]} searchable /></div></label>
          <label className="text-xs text-text-secondary">{t("grades.entryNotes")}<Textarea className="mt-1" rows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></label>
        </>}
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setComponentOpen(false)}>{t("settings.lookup.cancel")}</Button><Button onClick={() => void saveComponent()}>{t("settings.lookup.save")}</Button></div>
      </div>
    </Modal>
  </div>;
}
