import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TaskList } from "../components/tasks";

export function TasksPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [draft] = useState(() => (location.state as { commandDraft?: { title: string; subjectId: number | null } } | null)?.commandDraft ?? null);
  useEffect(() => {
    if (draft) navigate(location.pathname, { replace: true, state: null });
  }, [draft, location.pathname, navigate]);
  return (
    <div className="flex flex-col gap-6">
      <div><h1 className="text-2xl font-bold text-text-primary">{t("tasks.title")}</h1><p className="mt-1 text-sm text-text-muted">{t("tasks.subtitle")}</p></div>
      <TaskList initialDraft={draft} />
    </div>
  );
}
