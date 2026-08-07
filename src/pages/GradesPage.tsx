import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { EmptyState, ProgressBar } from "../components/ui";
import { listGradeComponents, listGradeEntriesForSubject } from "../db/queries/grades";
import { listAllSubjects } from "../db/queries/subjects";
import { calculateGrades } from "../lib/gradeCalculator";
import type { Subject } from "../types";

interface SubjectGrade { subject: Subject; grade: number | null; weight: number; gradedWeight: number; componentCount: number }

export function GradesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [rows, setRows] = useState<SubjectGrade[]>([]);

  useEffect(() => {
    void listAllSubjects().then(async (subjects) => {
      const gradable = subjects.filter((subject) => subject.is_gradable);
      setRows(await Promise.all(gradable.map(async (subject) => {
        const [components, entries] = await Promise.all([listGradeComponents(subject.id), listGradeEntriesForSubject(subject.id)]);
        const summary = calculateGrades(components, entries);
        return { subject, grade: summary.subjectGrade, weight: summary.configuredWeight, gradedWeight: summary.gradedWeight, componentCount: components.length };
      })));
    });
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div><h1 className="text-2xl font-bold text-text-primary">{t("grades.title")}</h1><p className="mt-1 text-sm text-text-muted">{t("grades.subtitle")}</p></div>
      {rows.length === 0 ? <EmptyState title={t("grades.overviewEmpty")} /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map(({ subject, grade, weight, gradedWeight, componentCount }) => {
        const scaleMax = subject.scale_max_override ?? 5;
        return <button key={subject.id} type="button" onClick={() => navigate(`/subjects/${subject.id}`)} className="group rounded-[1.75rem] border border-border bg-elevated p-5 text-left shadow-card backdrop-blur-2xl transition-all hover:-translate-y-0.5 hover:bg-control"><div className="flex items-start justify-between gap-3"><div><span className="mb-3 block h-3 w-3 rounded-full" style={{ backgroundColor: subject.color }} /><h2 className="font-semibold text-text-primary">{subject.name}</h2><p className="mt-1 text-xs text-text-muted">{t("grades.componentCount", { count: componentCount })}</p></div><div className="text-right"><span className="text-2xl font-bold text-text-primary">{grade === null ? "—" : grade.toFixed(2)}</span><span className="text-xs text-text-muted"> / {scaleMax}</span></div></div><div className="mt-5"><div className="mb-2 flex justify-between text-xs text-text-muted"><span>{t("grades.configuredWeight")}</span><span>{weight}%</span></div><ProgressBar value={gradedWeight} max={weight || 100} color={subject.color} /></div></button>;
      })}</div>}
    </div>
  );
}
