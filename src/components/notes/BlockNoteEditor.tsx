import { useMemo } from "react";
import type { PartialBlock } from "@blocknote/core";
import { filterSuggestionItems, insertOrUpdateBlockForSlashMenu } from "@blocknote/core/extensions";
import { getDefaultReactSlashMenuItems, SuggestionMenuController, useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useTheme } from "../../hooks/useTheme";
import { useTranslation } from "react-i18next";
import { AddCircleLinear, PenLinear } from "../ui/appIcons";
import { Button } from "../ui/Button";
import { SolarIcon } from "../ui/SolarIcon";
import { noteSchema } from "./noteSchema";

function parseBlocks(value: string | null): PartialBlock[] | undefined {
  if (!value) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as PartialBlock[] : [{ type: "paragraph", content: value }];
  } catch {
    // Keep notes created before BlockNote was introduced editable.
    return [{ type: "paragraph", content: value }];
  }
}

export function BlockNoteEditor({ value, onChange, fullPage = false }: { value: string | null; onChange: (value: string) => void; fullPage?: boolean }) {
  const { mode } = useTheme();
  const { t } = useTranslation();
  const initialContent = useMemo(() => parseBlocks(value), [value]);
  const editor = useCreateBlockNote({ schema: noteSchema, initialContent: initialContent as any }, []);
  function insertionAnchor() {
    try { return editor.getTextCursorPosition().block; }
    catch { return editor.document[editor.document.length - 1]; }
  }
  function addDrawing() {
    const anchor = insertionAnchor(); if (!anchor) return;
    editor.insertBlocks([{ type: "drawing" }], anchor, "after");
  }
  function addFormula() {
    const anchor = insertionAnchor(); if (!anchor) return;
    editor.insertBlocks([{ type: "math" }], anchor, "after");
  }
  function serializeWithInlineMath() {
    let converted = false;
    for (const block of editor.document as any[]) {
      if (!Array.isArray(block.content)) continue;
      const next: any[] = [];
      let blockConverted = false;
      for (const item of block.content) {
        if (item.type !== "text" || !item.text.includes("$")) { next.push(item); continue; }
        const parts = item.text.split(/(\$[^$\n]+\$)/g).filter(Boolean);
        if (parts.length === 1) { next.push(item); continue; }
        converted = true; blockConverted = true;
        for (const part of parts) next.push(part.startsWith("$") && part.endsWith("$") ? { type: "inlineMath", props: { latex: part.slice(1, -1) } } : { ...item, text: part });
      }
      if (blockConverted) editor.updateBlock(block, { content: next } as any);
    }
    if (!converted) onChange(JSON.stringify(editor.document));
  }
  const slashMenuItems = useMemo(() => [
    ...getDefaultReactSlashMenuItems(editor),
    {
      title: t("notes.math.slashTitle"),
      subtext: t("notes.math.slashDescription"),
      aliases: ["formula", "latex", "math", "ecuacion", "matematicas"],
      group: t("notes.slashGroup"),
      icon: <SolarIcon name="CalculatorLinear" size={18} />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "math" }),
    },
    {
      title: t("notes.drawing.slashTitle"),
      subtext: t("notes.drawing.slashDescription"),
      aliases: ["canvas", "dibujo", "lienzo", "draw", "diagram"],
      group: t("notes.slashGroup"),
      icon: <PenLinear size={18} />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "drawing" }),
    },
  ], [editor, t]);
  return (
    <div className={fullPage ? "entropi-note-page min-h-[60vh] bg-transparent" : "vida-blocknote min-h-52 overflow-hidden rounded-2xl border border-border bg-control"}>
      {fullPage && <div className="mb-3 flex justify-end gap-2"><Button variant="secondary" className="flex items-center gap-1.5 px-3 py-1.5 text-xs" onClick={addFormula}><AddCircleLinear size={14} />{t("notes.math.add")}</Button><Button variant="secondary" className="flex items-center gap-1.5 px-3 py-1.5 text-xs" onClick={addDrawing}><AddCircleLinear size={14} />{t("notes.drawing.add")}</Button></div>}
      <BlockNoteView editor={editor} theme={mode} onChange={serializeWithInlineMath} slashMenu={false}>
        <SuggestionMenuController triggerCharacter="/" getItems={async (query) => filterSuggestionItems(slashMenuItems, query)} />
      </BlockNoteView>
    </div>
  );
}
