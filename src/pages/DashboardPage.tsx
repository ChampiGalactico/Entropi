import { useTranslation } from "react-i18next";
import { DbConnectionStatus } from "../components/dashboard/DbConnectionStatus";

export function DashboardPage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{t("dashboard.title")}</h1>
        <p className="mt-1 text-sm text-text-muted">{t("dashboard.subtitle")}</p>
      </div>
      <div className="max-w-sm">
        <DbConnectionStatus />
      </div>
    </div>
  );
}
