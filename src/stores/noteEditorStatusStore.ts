import { create } from "zustand";

interface NoteEditorStatusState {
  activeNoteId: number | null;
  saved: boolean;
  setStatus: (noteId: number, saved: boolean) => void;
  clearStatus: (noteId: number) => void;
}

export const useNoteEditorStatusStore = create<NoteEditorStatusState>((set) => ({
  activeNoteId: null,
  saved: true,
  setStatus: (activeNoteId, saved) => set({ activeNoteId, saved }),
  clearStatus: (noteId) => set((current) => current.activeNoteId === noteId ? { activeNoteId: null, saved: true } : current),
}));
