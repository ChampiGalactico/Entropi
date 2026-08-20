interface TextBlock {
  id: string;
  text: string;
}

const NON_PROSE_BLOCKS = new Set(["codeBlock", "math", "diagram", "drawing", "image", "video", "audio", "file"]);

export function normalizeGlossaryTerm(value: string): string {
  return value
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[\s"'“”‘’.,;:!?¿¡()[\]{}]+|[\s"'“”‘’.,;:!?¿¡()[\]{}]+$/gu, "")
    .toLocaleLowerCase("es");
}

function inlineText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value.map((part) => {
    if (typeof part === "string") return part;
    if (!part || typeof part !== "object") return "";
    const item = part as Record<string, unknown>;
    if (typeof item.text === "string") return item.text;
    return inlineText(item.content);
  }).join("");
}

export function extractGlossaryTextBlocks(content: string | null): TextBlock[] {
  if (!content) return [];
  let document: unknown;
  try { document = JSON.parse(content); } catch { return [{ id: "legacy", text: content }]; }
  if (!Array.isArray(document)) return [];
  const result: TextBlock[] = [];
  function walk(blocks: unknown[]) {
    for (const raw of blocks) {
      if (!raw || typeof raw !== "object") continue;
      const block = raw as Record<string, unknown>;
      const type = typeof block.type === "string" ? block.type : "paragraph";
      const id = typeof block.id === "string" ? block.id : "";
      if (id && !NON_PROSE_BLOCKS.has(type)) {
        const text = inlineText(block.content).trim();
        if (text) result.push({ id, text });
      }
      if (type === "columns" && block.props && typeof block.props === "object") {
        for (const [key, value] of Object.entries(block.props as Record<string, unknown>)) {
          if (!/^column\d+$/.test(key) || typeof value !== "string") continue;
          try {
            const nested = JSON.parse(value);
            if (Array.isArray(nested)) walk(nested);
          } catch { /* Keep indexing the remaining columns if one serialized value is malformed. */ }
        }
      }
      if (Array.isArray(block.children)) walk(block.children);
    }
  }
  walk(document);
  return result;
}

export function escapeGlossaryPattern(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function glossaryContextExcerpt(text: string, start: number, length: number): string {
  const radius = 58;
  const from = Math.max(0, start - radius);
  const to = Math.min(text.length, start + length + radius);
  return `${from > 0 ? "…" : ""}${text.slice(from, to).trim()}${to < text.length ? "…" : ""}`;
}
