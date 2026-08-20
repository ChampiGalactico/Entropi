import { createContext } from "react";
import type { BlockBookmarkDraft } from "./EntropiBlockSideMenu";

export interface NestedGlossaryDraft {
  term: string;
  blockId: string | null;
}

export interface NoteEditorFeatures {
  onAddToGlossary?: (draft: NestedGlossaryDraft) => void;
  onBookmarkBlock?: (draft: BlockBookmarkDraft) => void;
  acceptedWords: string[];
}

export const NoteEditorFeaturesContext = createContext<NoteEditorFeatures>({ acceptedWords: [] });
