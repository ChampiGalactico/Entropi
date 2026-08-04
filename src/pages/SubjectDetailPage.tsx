import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PenLinear, TrashBinTrashLinear, AltArrowLeftLinear } from "../components/ui/appIcons";
import { IconButton } from "../components/ui/IconButton";
import { Badge } from "../components/ui/Badge";
import { Tabs, type TabItem } from "../components/ui/Tabs";
import { SubjectFormModal } from "../components/subjects";
import { ScheduleTab } from "../components/subjects/ScheduleTab";
import { StaffTab } from "../components/subjects/StaffTab";
import { AssessmentsTab } from "../components/subjects/AssessmentsTab";
import { TaskList } from "../components/tasks";
import { NotesPanel } from "../components/notes";
import { GradesTab } from "../components/grades";
import { getSubject, deleteSubject } from "../db/queries/subjects";
import { getSemester } from "../db/queries/semesters";
import type { Semester, Subject } from "../types";

type TabId = "schedule" | "staff" | "assessments" | "tasks" | "grades" | "notes";

export function SubjectDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const subjectId = Number(id);

  const [subject, setSubject] = useState<Subject | null>(null);
  const [semester, setSemester] = useState<Semester | null>(null);
  const [tab, setTab] = useState<TabId>("schedule");
  const [editOpen, setEditOpen] = useState(false);
  const [commandState] = useState(() => location.state as { tab?: TabId; assessmentDraftTitle?: string } | null);

  useEffect(() => {
    if (!commandState?.tab) return;
    setTab(commandState.tab);
    navigate(location.pathname, { replace: true, state: null });
  }, [commandState?.tab, location.pathname, navigate]);

  async function reload() {
    const data = await getSubject(subjectId);
    setSubject(data);
    if (data) {
      const sem = await getSemester(data.semester_id);
      setSemester(sem);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  async function handleDelete() {
    await deleteSubject(subjectId);
    navigate("/subjects");
  }

  if (!subject) return null;

  const tabs: TabItem[] = [
    { id: "schedule", label: t("subjects.tabs.schedule") },
    { id: "staff", label: t("subjects.tabs.staff") },
    { id: "assessments", label: t("subjects.tabs.assessments") },
    { id: "tasks", label: t("subjects.tabs.tasks") },
    { id: "grades", label: t("subjects.tabs.grades") },
    { id: "notes", label: t("subjects.tabs.notes") },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <IconButton
            label={t("subjects.detail.back")}
            icon={<AltArrowLeftLinear size={18} />}
            onClick={() => navigate("/subjects")}
          />
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 flex-shrink-0 rounded-full"
                style={{ backgroundColor: subject.color }}
              />
              <h1 className="text-2xl font-bold text-text-primary">{subject.name}</h1>
              {!subject.is_gradable && (
                <Badge color="var(--text-muted)">{t("subjects.card.nonGradable")}</Badge>
              )}
            </div>
            <span className="text-sm text-text-muted">
              {[subject.code, subject.professor, semester?.name].filter(Boolean).join(" · ")}
            </span>
            {subject.notes_content && (
              <p className="mt-2 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                {subject.notes_content}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            label={t("settings.lookup.edit")}
            icon={<PenLinear size={18} />}
            onClick={() => setEditOpen(true)}
          />
          <IconButton
            label={t("settings.lookup.delete")}
            icon={<TrashBinTrashLinear size={18} />}
            onClick={() => void handleDelete()}
          />
        </div>
      </div>

      <Tabs tabs={tabs} activeId={tab} onChange={(id) => setTab(id as TabId)} />

      {tab === "schedule" && <ScheduleTab subjectId={subject.id} />}
      {tab === "staff" && <StaffTab subjectId={subject.id} />}
      {tab === "assessments" && <AssessmentsTab subjectId={subject.id} initialDraftTitle={commandState?.assessmentDraftTitle} />}
      {tab === "tasks" && <TaskList subjectId={subject.id} />}
      {tab === "grades" && <GradesTab subject={subject} />}
      {tab === "notes" && <NotesPanel subjectId={subject.id} />}

      {semester && (
        <SubjectFormModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={() => void reload()}
          semester={semester}
          subject={subject}
        />
      )}
    </div>
  );
}
