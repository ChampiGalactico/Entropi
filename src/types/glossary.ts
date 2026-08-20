export type GlossarySectionType = "example" | "note" | "formula" | "source" | "custom";

export interface GlossaryEntry {
  id: number;
  term: string;
  normalized_term: string;
  definition: string;
  scope_folder_id: number | null;
  scope_folder_name: string | null;
  scope_depth: number;
  source_note_id: number | null;
  source_block_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GlossaryAlias {
  id: number;
  entry_id: number;
  alias: string;
  normalized_alias: string;
}

export interface GlossarySection {
  id: number;
  entry_id: number;
  section_type: GlossarySectionType;
  title: string | null;
  content: string;
  sort_order: number;
}

export interface GlossaryEntryDetail extends GlossaryEntry {
  aliases: GlossaryAlias[];
  sections: GlossarySection[];
}

export interface GlossaryScopeOption {
  folder_id: number | null;
  name: string;
  depth: number;
}

export interface GlossaryOccurrence {
  id: number;
  entry_id: number;
  note_id: number;
  note_title: string;
  folder_name: string | null;
  block_id: string;
  matched_text: string;
  start_offset: number;
  context_excerpt: string;
  indexed_at: string;
}

export interface GlossaryEntryInput {
  term: string;
  definition: string;
  scope_folder_id: number | null;
  source_note_id?: number | null;
  source_block_id?: string | null;
  aliases: string[];
  sections: Array<{
    section_type: GlossarySectionType;
    title?: string | null;
    content: string;
  }>;
}
