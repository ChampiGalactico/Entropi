export interface BookmarkCollection {
  id: number;
  name: string;
  icon: string | null;
  color: string;
  scope_folder_id: number | null;
  scope_folder_name: string | null;
  scope_depth: number;
  bookmark_count: number;
  created_at: string;
  updated_at: string;
}

export interface NoteBookmark {
  id: number;
  collection_id: number;
  note_id: number;
  note_title: string;
  folder_name: string | null;
  block_id: string;
  block_type: string;
  block_snapshot: string;
  plain_text: string;
  created_at: string;
}

export interface BookmarkCollectionInput {
  name: string;
  icon?: string | null;
  color: string;
  scope_folder_id: number | null;
}

export interface BookmarkScopeOption {
  folder_id: number | null;
  name: string;
  depth: number;
}

export interface BookmarkDraft {
  noteId: number;
  blockId: string;
  blockType: string;
  blockSnapshot: string;
  plainText: string;
}
