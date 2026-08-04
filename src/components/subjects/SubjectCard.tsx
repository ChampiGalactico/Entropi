import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import type { Subject } from "../../types";

export interface SubjectCardProps {
  subject: Subject;
}

export function SubjectCard({ subject }: SubjectCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Card
      accentColor={subject.color}
      hoverLift
      className="flex cursor-pointer flex-col gap-2"
      onClick={() => navigate(`/subjects/${subject.id}`)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-text-primary">{subject.name}</span>
          {subject.code && <span className="text-xs text-text-muted">{subject.code}</span>}
        </div>
        {!subject.is_gradable && (
          <Badge color="var(--text-muted)">{t("subjects.card.nonGradable")}</Badge>
        )}
      </div>
      {subject.professor && (
        <span className="text-xs text-text-secondary">{subject.professor}</span>
      )}
      {subject.credits !== null && (
        <span className="text-xs text-text-muted">
          {t("subjects.card.credits", { count: subject.credits })}
        </span>
      )}
    </Card>
  );
}
