import type { EntityType, LinkedEntityType } from "./common";

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

export type RelationOrigin = "manual" | "system";

export interface EntityRelation {
  id: number;
  source_type: EntityType;
  source_id: number;
  target_type: EntityType;
  target_id: number;
  relation_kind: string;
  origin: RelationOrigin;
  created_at: string;
}

export interface ResolvedEntityRelation {
  entity_type: EntityType;
  entity_id: number;
  relation_kind: string;
  origin: "manual" | "inherited";
  relation_id: number;
  inherited_from_folder_id: number | null;
  inherited_from_folder_name: string | null;
}

export interface RelationCandidate {
  type: LinkedEntityType;
  id: number;
  label: string;
  subtitle: string | null;
  color: string | null;
  is_suggested: 0 | 1;
}
