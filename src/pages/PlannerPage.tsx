import { useTranslation } from "react-i18next";

export function PlannerPage() {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary">{t("planner.title")}</h1>
      <p className="mt-1 text-sm text-text-muted">{t("planner.subtitle")}</p>
    </div>
  );
}
