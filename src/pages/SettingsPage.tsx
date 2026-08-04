import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TuningLinear, Widget2Linear, MapPointLinear, CalendarLinear, UserIdLinear } from "../components/ui/appIcons";
import { SettingsNav, type SettingsNavItem } from "../components/settings/SettingsNav";
import {
  GeneralSettingsSection,
  LookupTableEditor,
  LocationsManager,
  SemestersManager,
  ProfessorsManager,
  TeachingRolesManager,
} from "../components/settings";

type SectionId = "general" | "lookups" | "locations" | "professors" | "semesters";

export function SettingsPage() {
  const { t } = useTranslation();
  const [section, setSection] = useState<SectionId>("general");

  const items: SettingsNavItem[] = [
    { id: "general", label: t("settings.tabs.general"), icon: <TuningLinear size={18} /> },
    { id: "lookups", label: t("settings.tabs.lookups"), icon: <Widget2Linear size={18} /> },
    { id: "locations", label: t("settings.tabs.locations"), icon: <MapPointLinear size={18} /> },
    { id: "professors", label: t("settings.tabs.professors"), icon: <UserIdLinear size={18} /> },
    { id: "semesters", label: t("settings.tabs.semesters"), icon: <CalendarLinear size={18} /> },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{t("settings.title")}</h1>
        <p className="mt-1 text-sm text-text-muted">{t("settings.subtitle")}</p>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-[2rem] border border-border bg-surface shadow-card backdrop-blur-2xl">
        <SettingsNav items={items} activeId={section} onChange={(id) => setSection(id as SectionId)} />
        <div key={section} className="vida-tab-enter min-w-0 flex-1 overflow-y-auto border-l border-border p-6 pr-4" style={{ scrollbarGutter: "stable" }}>
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
          {section === "professors" && <div className="flex flex-col gap-8"><TeachingRolesManager /><div className="border-t border-border pt-8"><ProfessorsManager /></div></div>}
          {section === "semesters" && <SemestersManager />}
        </div>
      </div>
    </div>
  );
}
