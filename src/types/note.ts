import type { LinkedEntityType } from "./common";

export interface Note {
  id: number;
  title: string;
  content: string | null;
  linked_entity_type: LinkedEntityType | null;
  linked_entity_id: number | null;
  folder_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface NoteFolder {
  id: number;
  name: string;
  color: string;
  parent_id: number | null;
  created_at: string;
}

export interface NoteLink {
  note_id: number;
  entity_type: LinkedEntityType;
  entity_id: number;
}
