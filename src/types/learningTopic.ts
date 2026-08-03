import type { LearningTopicStatus } from "./common";

export interface LearningTopic {
  id: number;
  title: string;
  description: string | null;
  priority: number;
  status: LearningTopicStatus;
  notes_content: string | null;
  created_at: string;
}
