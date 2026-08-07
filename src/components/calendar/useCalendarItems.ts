import { useEffect, useState } from "react";
import { listAssessmentsInRange } from "../../db/queries/assessments";
import { listEventsInRange } from "../../db/queries/events";
import { listLookupRows } from "../../db/queries/lookups";
import { listAllClassSessions, listAllSubjects } from "../../db/queries/subjects";
import { listTasks } from "../../db/queries/tasks";
import { listLocations } from "../../db/queries/locations";
import type { AssessmentType, EventType, SessionType, TaskType } from "../../types";
import { addDays, toIsoDate } from "./dateUtils";

export type CalendarItemKind = "session" | "assessment" | "task" | "event";

export interface CalendarItem {
  id: string;
  kind: CalendarItemKind;
  date: string;
  title: string;
  subtitle?: string;
  startTime: string | null;
  endTime: string | null;
  color: string;
  muted?: boolean;
  subjectId?: number;
  subjectColor?: string;
  sessionType?: string;
  location?: string;
}

/** CalendarItem.id encodes "<kind>-<entityId>[-<date>]" (sessions repeat, so they append the date). */
export function entityIdFromCalendarItem(item: CalendarItem): number {
  return Number(item.id.split("-")[1]);
}

export function useCalendarItems(startDate: Date, endDate: Date, refreshKey = 0) {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const startIso = toIsoDate(startDate);
  const endIso = toIsoDate(endDate);

  useEffect(() => {
    void Promise.all([
      listAllSubjects(), listAllClassSessions(), listLocations(), listAssessmentsInRange(startIso, endIso),
      listTasks({ dueDateFrom: startIso, dueDateTo: endIso }), listEventsInRange(startIso, endIso),
      listLookupRows<SessionType>("session_types"), listLookupRows<AssessmentType>("assessment_types"),
      listLookupRows<TaskType>("task_types"), listLookupRows<EventType>("event_types"),
    ]).then(([subjects, sessions, locations, assessments, tasks, events, sessionTypes, assessmentTypes, taskTypes, eventTypes]) => {
      const subjectMap = new Map(subjects.map((subject) => [subject.id, subject]));
      const locationMap = new Map(locations.map((location) => [location.id, location]));
      const rows: CalendarItem[] = [];
      const rangeDays: Date[] = [];
      for (let date = startDate; date <= endDate; date = addDays(date, 1)) rangeDays.push(date);

      for (const session of sessions) {
        const subject = subjectMap.get(session.subject_id);
        if (!subject) continue;
        const type = sessionTypes.find((item) => item.id === session.session_type_id);
        for (const date of rangeDays) {
          if ((date.getDay() + 6) % 7 !== session.day_of_week) continue;
          const dateIso = toIsoDate(date);
          if (dateIso < subject.start_date || dateIso > subject.end_date) continue;
          rows.push({ id: `session-${session.id}-${dateIso}`, kind: "session", date: dateIso, title: subject.name, subtitle: type?.name, startTime: session.start_time, endTime: session.end_time, color: subject.color, subjectId: subject.id, subjectColor: subject.color, sessionType: type?.name, location: session.location_id ? locationMap.get(session.location_id)?.name : undefined });
        }
      }
      assessments.forEach((assessment) => { const subject = subjectMap.get(assessment.subject_id); const type = assessmentTypes.find((item) => item.id === assessment.assessment_type_id); rows.push({ id: `assessment-${assessment.id}`, kind: "assessment", date: assessment.date, title: assessment.title, subtitle: subject?.name ?? type?.name, startTime: assessment.start_time, endTime: assessment.end_time, color: subject?.color ?? type?.color ?? "var(--accent)", muted: assessment.status !== "upcoming", subjectId: assessment.subject_id, subjectColor: subject?.color, location: assessment.location_id ? locationMap.get(assessment.location_id)?.name : undefined }); });
      tasks.filter((task) => task.due_date).forEach((task) => { const subject = task.subject_id ? subjectMap.get(task.subject_id) : null; const type = taskTypes.find((item) => item.id === task.task_type_id); rows.push({ id: `task-${task.id}`, kind: "task", date: task.due_date!, title: task.title, subtitle: subject?.name ?? type?.name, startTime: task.due_time, endTime: null, color: subject?.color ?? type?.color ?? "var(--accent-secondary)", muted: task.status === "completed" || task.status === "cancelled", subjectId: task.subject_id ?? undefined, subjectColor: subject?.color }); });
      events.forEach((event) => { const type = eventTypes.find((item) => item.id === event.event_type_id); rows.push({ id: `event-${event.id}`, kind: "event", date: event.date, title: event.title, subtitle: type?.name, startTime: event.start_time, endTime: event.end_time, color: type?.color ?? "var(--accent-secondary)", location: event.location_id ? locationMap.get(event.location_id)?.name : undefined }); });
      setItems(rows);
    });
  }, [startIso, endIso, refreshKey]);

  return items;
}
