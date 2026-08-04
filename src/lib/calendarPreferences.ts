import { getAppSetting, setAppSetting } from "../db/queries/appSettings";

export type TimeFormat = "12h" | "24h";

export interface CalendarPreferences {
  dayStart: string;
  dayEnd: string;
  timeFormat: TimeFormat;
}

export const DEFAULT_CALENDAR_PREFERENCES: CalendarPreferences = {
  dayStart: "07:00",
  dayEnd: "22:00",
  timeFormat: "24h",
};

const KEYS = {
  dayStart: "calendar_day_start",
  dayEnd: "calendar_day_end",
  timeFormat: "calendar_time_format",
} as const;

export async function getCalendarPreferences(): Promise<CalendarPreferences> {
  const [dayStart, dayEnd, timeFormat] = await Promise.all([
    getAppSetting(KEYS.dayStart),
    getAppSetting(KEYS.dayEnd),
    getAppSetting(KEYS.timeFormat),
  ]);
  return {
    dayStart: dayStart ?? DEFAULT_CALENDAR_PREFERENCES.dayStart,
    dayEnd: dayEnd ?? DEFAULT_CALENDAR_PREFERENCES.dayEnd,
    timeFormat: timeFormat === "12h" ? "12h" : "24h",
  };
}

export async function saveCalendarPreferences(preferences: CalendarPreferences): Promise<void> {
  await Promise.all([
    setAppSetting(KEYS.dayStart, preferences.dayStart),
    setAppSetting(KEYS.dayEnd, preferences.dayEnd),
    setAppSetting(KEYS.timeFormat, preferences.timeFormat),
  ]);
}

export function timeToMinutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

export function formatCalendarTime(value: string, format: TimeFormat): string {
  const [hour, minute] = value.split(":").map(Number);
  if (format === "24h") return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const suffix = hour < 12 ? "a. m." : "p. m.";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}
