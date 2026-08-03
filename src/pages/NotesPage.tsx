import { useTranslation } from "react-i18next";

export function NotesPage() {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary">{t("notes.title")}</h1>
      <p className="mt-1 text-sm text-text-muted">{t("notes.subtitle")}</p>
    </div>
  );
}
