export const EMPTY_NOTE_COLUMN = JSON.stringify([{ type: "paragraph", content: "" }]);

export function readNoteColumnDocuments(props: Record<string, unknown> | undefined): string[] {
  if (!props) return [EMPTY_NOTE_COLUMN, EMPTY_NOTE_COLUMN];
  if (typeof props.data === "string" && props.data) {
    try {
      const parsed = JSON.parse(props.data);
      if (Array.isArray(parsed) && parsed.length >= 2 && parsed.every((value) => typeof value === "string")) return parsed;
    } catch { /* Fall through to the legacy four-column representation. */ }
  }
  const legacyCount = Math.max(2, Math.min(4, Number(props.columns) || 2));
  return Array.from({ length: legacyCount }, (_, index) => typeof props[`column${index + 1}`] === "string" ? String(props[`column${index + 1}`]) : EMPTY_NOTE_COLUMN);
}
