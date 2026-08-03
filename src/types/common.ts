export type LocationType = "physical" | "virtual";
export type AssessmentStatus = "upcoming" | "completed" | "cancelled";
export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type LearningTopicStatus = "backlog" | "in_progress" | "completed";
export type LinkedEntityType = "subject" | "task" | "event" | "assessment";

/** 0 = Monday ... 6 = Sunday */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** 1 (highest) to 5 (lowest) */
export type Priority = 1 | 2 | 3 | 4 | 5;
