import type { LocationType } from "./common";

export interface Location {
  id: number;
  name: string;
  building: string | null;
  room: string | null;
  type: LocationType;
  link: string | null;
  notes: string | null;
}
