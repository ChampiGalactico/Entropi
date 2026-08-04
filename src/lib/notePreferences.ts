import { getAppSetting, setAppSetting } from "../db/queries/appSettings";

const AUTOSAVE_KEY = "notes_autosave_seconds";
export const DEFAULT_NOTE_AUTOSAVE_SECONDS = 10;

export async function getNoteAutosaveSeconds(): Promise<number> {
  const raw = await getAppSetting(AUTOSAVE_KEY);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(2, Math.min(120, parsed)) : DEFAULT_NOTE_AUTOSAVE_SECONDS;
}

export async function saveNoteAutosaveSeconds(seconds: number): Promise<void> {
  await setAppSetting(AUTOSAVE_KEY, String(Math.max(2, Math.min(120, Math.round(seconds)))));
}
