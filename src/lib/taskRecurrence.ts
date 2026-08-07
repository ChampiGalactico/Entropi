import type { TFunction } from "i18next";

export type RecurrenceFreq = "daily" | "weekly" | "monthly";

/** byDay uses the app-wide convention: 0 = Monday ... 6 = Sunday. */
export interface TaskRecurrence {
  freq: RecurrenceFreq;
  interval: number;
  byDay?: number[];
  until?: string | null;
}

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export function parseTaskRecurrence(raw: string | null): TaskRecurrence | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as TaskRecurrence;
    if (!parsed || typeof parsed !== "object" || !parsed.freq) return null;
    return { freq: parsed.freq, interval: parsed.interval && parsed.interval > 0 ? parsed.interval : 1, byDay: parsed.byDay, until: parsed.until ?? null };
  } catch {
    return null;
  }
}

export function serializeTaskRecurrence(rule: TaskRecurrence | null): string | null {
  if (!rule) return null;
  return JSON.stringify(rule);
}

function toIso(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** 0 = Monday ... 6 = Sunday, matching the app-wide DayOfWeek convention. */
function dayOfWeek(date: Date) {
  return (date.getDay() + 6) % 7;
}

function mondayOf(date: Date) {
  const result = new Date(date);
  result.setDate(result.getDate() - dayOfWeek(result));
  return result;
}

export function weekdaysRule(): TaskRecurrence {
  return { freq: "weekly", interval: 1, byDay: [0, 1, 2, 3, 4] };
}

/**
 * Computes the next occurrence's due date, or null if the recurrence has ended
 * (past `until`). `anchorDate` is the first due date of the series and only
 * matters for weekly rules with an interval greater than 1, where it fixes
 * which weeks count as "active".
 */
export function computeNextDueDate(rule: TaskRecurrence, lastDueDate: string, anchorDate: string): string | null {
  const interval = rule.interval > 0 ? rule.interval : 1;
  let next: Date;

  if (rule.freq === "daily") {
    next = fromIso(lastDueDate);
    next.setDate(next.getDate() + interval);
  } else if (rule.freq === "monthly") {
    next = fromIso(lastDueDate);
    next.setMonth(next.getMonth() + interval);
  } else {
    const byDay = rule.byDay && rule.byDay.length > 0 ? [...rule.byDay].sort((a, b) => a - b) : [dayOfWeek(fromIso(lastDueDate))];
    const anchorMonday = mondayOf(fromIso(anchorDate));
    const cursor = fromIso(lastDueDate);
    next = cursor;
    // Bounded scan: enough to cover multi-year custom intervals without risking an infinite loop.
    for (let i = 0; i < 3660; i++) {
      next = new Date(next);
      next.setDate(next.getDate() + 1);
      const weeksSinceAnchor = Math.round((mondayOf(next).getTime() - anchorMonday.getTime()) / (7 * 86400000));
      if (weeksSinceAnchor % interval !== 0) continue;
      if (byDay.includes(dayOfWeek(next))) break;
    }
  }

  const isoNext = toIso(next);
  if (rule.until && isoNext > rule.until) return null;
  return isoNext;
}

export function describeRecurrence(rule: TaskRecurrence | null, t: TFunction): string {
  if (!rule) return "";
  const dayLabels = (rule.byDay ?? []).map((day) => t(`common.daysShort.${DAY_KEYS[day]}`)).join(", ");
  if (rule.freq === "weekly" && rule.byDay?.length === 5 && [0, 1, 2, 3, 4].every((day) => rule.byDay!.includes(day)) && rule.interval === 1) {
    return t("tasks.form.repeatWeekdays");
  }
  if (rule.interval === 1) {
    if (rule.freq === "daily") return t("tasks.form.repeatDaily");
    if (rule.freq === "monthly") return t("tasks.form.repeatMonthly");
    return dayLabels ? t("tasks.form.repeatWeeklyOn", { days: dayLabels }) : t("tasks.form.repeatWeekly");
  }
  const unit = rule.freq === "daily" ? t("tasks.form.unitDays") : rule.freq === "monthly" ? t("tasks.form.unitMonths") : t("tasks.form.unitWeeks");
  const base = t("tasks.form.repeatEvery", { count: rule.interval, unit });
  return rule.freq === "weekly" && dayLabels ? `${base} (${dayLabels})` : base;
}
