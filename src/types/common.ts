export type LocationType = "physical" | "virtual";
export type AssessmentStatus = "upcoming" | "completed" | "cancelled";
export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type LearningTopicStatus = "backlog" | "started" | "in_progress" | "completed";
export type EntityType = "subject" | "task" | "event" | "assessment" | "note" | "note_folder";
export type LinkedEntityType = Exclude<EntityType, "note_folder">;

/** 0 = Monday ... 6 = Sunday */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** 1 (highest) to 5 (lowest) */
export type Priority = 1 | 2 | 3 | 4 | 5;
