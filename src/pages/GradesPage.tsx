import { useTranslation } from "react-i18next";

export function GradesPage() {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary">{t("grades.title")}</h1>
      <p className="mt-1 text-sm text-text-muted">{t("grades.subtitle")}</p>
    </div>
  );
}
