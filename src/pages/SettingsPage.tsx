import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TuningLinear, Widget2Linear, MapPointLinear, CalendarLinear } from "solar-icon-set";
import { SettingsNav, type SettingsNavItem } from "../components/settings/SettingsNav";
import {
  GeneralSettingsSection,
  LookupTableEditor,
  LocationsManager,
  SemestersManager,
} from "../components/settings";

type SectionId = "general" | "lookups" | "locations" | "semesters";

export function SettingsPage() {
  const { t } = useTranslation();
  const [section, setSection] = useState<SectionId>("general");

  const items: SettingsNavItem[] = [
    { id: "general", label: t("settings.tabs.general"), icon: <TuningLinear size={18} /> },
    { id: "lookups", label: t("settings.tabs.lookups"), icon: <Widget2Linear size={18} /> },
    { id: "locations", label: t("settings.tabs.locations"), icon: <MapPointLinear size={18} /> },
    { id: "semesters", label: t("settings.tabs.semesters"), icon: <CalendarLinear size={18} /> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{t("settings.title")}</h1>
        <p className="mt-1 text-sm text-text-muted">{t("settings.subtitle")}</p>
      </div>

      <div className="flex overflow-hidden rounded-3xl border border-border bg-surface shadow-card backdrop-blur-2xl">
        <SettingsNav items={items} activeId={section} onChange={(id) => setSection(id as SectionId)} />
        <div className="flex-1 border-l border-border p-6">
          {section === "general" && <GeneralSettingsSection />}

          {section === "lookups" && (
            <div className="flex flex-col gap-8">
              <LookupTableEditor table="session_types" title={t("settings.lookup.sessionTypes")} />
              <LookupTableEditor table="assessment_types" title={t("settings.lookup.assessmentTypes")} />
              <LookupTableEditor table="task_types" title={t("settings.lookup.taskTypes")} />
              <LookupTableEditor table="event_types" title={t("settings.lookup.eventTypes")} />
            </div>
          )}

          {section === "locations" && <LocationsManager />}
          {section === "semesters" && <SemestersManager />}
        </div>
      </div>
    </div>
  );
}
