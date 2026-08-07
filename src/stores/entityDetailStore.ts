import { create } from "zustand";
import type { CalendarItemKind } from "../components/calendar";

interface EntityDetailRequest {
  kind: CalendarItemKind;
  id: number;
}

interface EntityDetailState {
  request: EntityDetailRequest | null;
  open: (kind: CalendarItemKind, id: number) => void;
  close: () => void;
}

export const useEntityDetailStore = create<EntityDetailState>((set) => ({
  request: null,
  open: (kind, id) => set({ request: { kind, id } }),
  close: () => set({ request: null }),
}));

export function openEntityDetail(kind: CalendarItemKind, id: number) {
  useEntityDetailStore.getState().open(kind, id);
}
