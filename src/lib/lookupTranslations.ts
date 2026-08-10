import type { TFunction } from "i18next";

// session_types/assessment_types/task_types/event_types are free-text rows the user can rename or
// add to via Settings, so the data model can't store an i18n key — only the literal default values
// seeded in 0002_seed_defaults.sql are translated here (by exact match); anything the user has
// renamed, or added themselves, is shown exactly as they typed it.
const DEFAULT_NAME_KEYS: Record<string, string> = {
  Magistral: "calendar.lookupDefaults.magistral",
  Complementaria: "calendar.lookupDefaults.complementaria",
  Laboratorio: "calendar.lookupDefaults.laboratorio",
  Quiz: "calendar.lookupDefaults.quiz",
  Parcial: "calendar.lookupDefaults.parcial",
  Final: "calendar.lookupDefaults.final",
  "Sustentación": "calendar.lookupDefaults.sustentacion",
  "Class Prep": "calendar.lookupDefaults.classPrep",
  Homework: "calendar.lookupDefaults.homework",
  Project: "calendar.lookupDefaults.project",
  Personal: "calendar.lookupDefaults.personal",
  Meeting: "calendar.lookupDefaults.meeting",
  Webinar: "calendar.lookupDefaults.webinar",
};

export function translateLookupName<T extends string | undefined>(name: T, t: TFunction): T {
  if (!name) return name;
  const key = DEFAULT_NAME_KEYS[name];
  return (key ? t(key) : name) as T;
}
