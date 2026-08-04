import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AddCircleLinear } from "../components/ui/appIcons";
import { Button } from "../components/ui/Button";
import { Combobox } from "../components/ui/Combobox";
import { EmptyState } from "../components/ui/EmptyState";
import { SubjectCard, SubjectFormModal } from "../components/subjects";
import { listSemesters } from "../db/queries/semesters";
import { listSubjectsBySemester } from "../db/queries/subjects";
import type { Semester, Subject } from "../types";

export function SubjectsPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [commandDraft, setCommandDraft] = useState(() => (location.state as { commandDraft?: { name: string; semesterId: number; professorId: number | null } } | null)?.commandDraft ?? null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [semesterId, setSemesterId] = useState<number | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    void listSemesters().then((data) => {
      setSemesters(data);
      if (data.length > 0) setSemesterId(data[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!commandDraft || semesters.length === 0) return;
    setSemesterId(commandDraft.semesterId);
  }, [commandDraft, semesters.length]);

  useEffect(() => {
    if (!commandDraft || semesterId !== commandDraft.semesterId) return;
    setFormOpen(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [commandDraft, semesterId, location.pathname, navigate]);

  async function reloadSubjects() {
    if (semesterId === null) return;
    const data = await listSubjectsBySemester(semesterId);
    setSubjects(data);
  }

  useEffect(() => {
    void reloadSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semesterId]);

  const activeSemester = semesters.find((s) => s.id === semesterId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t("subjects.title")}</h1>
          <p className="mt-1 text-sm text-text-muted">{t("subjects.subtitle")}</p>
        </div>
        {activeSemester && (
          <Button onClick={() => setFormOpen(true)} className="flex items-center gap-1.5">
            <AddCircleLinear size={16} />
            {t("subjects.add")}
          </Button>
        )}
      </div>

      {!loading && semesters.length === 0 && (
        <EmptyState
          title={t("subjects.noSemesters.title")}
          description={t("subjects.noSemesters.description")}
          action={
            <Link to="/settings">
              <Button variant="secondary">{t("subjects.noSemesters.goToSettings")}</Button>
            </Link>
          }
        />
      )}

      {semesters.length > 0 && (
        <div className="w-64">
          <Combobox
            value={semesterId !== null ? String(semesterId) : null}
            onChange={(v) => setSemesterId(Number(v))}
            options={semesters.map((s) => ({ value: String(s.id), label: s.name }))}
          />
        </div>
      )}

      {activeSemester && subjects.length === 0 && (
        <EmptyState title={t("subjects.empty")} />
      )}

      {subjects.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {subjects.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} />
          ))}
        </div>
      )}

      {activeSemester && (
        <SubjectFormModal
          open={formOpen}
          onClose={() => { setFormOpen(false); setCommandDraft(null); }}
          onSaved={() => void reloadSubjects()}
          semester={activeSemester}
          draft={commandDraft ? { name: commandDraft.name, professorId: commandDraft.professorId } : null}
        />
      )}
    </div>
  );
}
