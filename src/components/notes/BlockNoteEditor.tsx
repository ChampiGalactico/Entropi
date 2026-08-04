import { useEffect, useMemo, useRef } from "react";
import type { PartialBlock } from "@blocknote/core";
import { en, es } from "@blocknote/core/locales";
import { filterSuggestionItems, insertOrUpdateBlockForSlashMenu } from "@blocknote/core/extensions";
import {
  BasicTextStyleButton,
  BlockTypeSelect,
  ColorStyleButton,
  CreateLinkButton,
  FormattingToolbar,
  FormattingToolbarController,
  SuggestionMenuController,
  TextAlignButton,
  getDefaultReactSlashMenuItems,
  useCreateBlockNote,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useTheme } from "../../hooks/useTheme";
import { useTranslation } from "react-i18next";
import { PenLinear } from "../ui/appIcons";
import { SolarIcon } from "../ui/SolarIcon";
import { noteSchema } from "./noteSchema";

function EntropiFormattingToolbar() {
  return <FormattingToolbar>
    <BlockTypeSelect />
    <BasicTextStyleButton basicTextStyle="bold" />
    <BasicTextStyleButton basicTextStyle="italic" />
    <BasicTextStyleButton basicTextStyle="underline" />
    <BasicTextStyleButton basicTextStyle="strike" />
    <BasicTextStyleButton basicTextStyle="code" />
    <TextAlignButton textAlignment="left" />
    <TextAlignButton textAlignment="center" />
    <TextAlignButton textAlignment="right" />
    <ColorStyleButton />
    <CreateLinkButton />
  </FormattingToolbar>;
}

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
  const { t, i18n } = useTranslation();
  const initialContent = useMemo(() => parseBlocks(value), [value]);
  const editor = useCreateBlockNote({ schema: noteSchema, initialContent: initialContent as any, dictionary: i18n.resolvedLanguage?.startsWith("es") ? es : en }, []);
  const activeBlockId = useRef<string | null>(null);

  function serialize() {
    if (activeBlockId.current === null) {
      try { activeBlockId.current = editor.getTextCursorPosition().block.id; } catch { /* The editor may not have a text cursor yet. */ }
    }
    onChange(JSON.stringify(editor.document));
  }

  function revealInlineMath(block: any) {
    if (!Array.isArray(block?.content) || !block.content.some((item: any) => item.type === "inlineMath")) return;
    const content = block.content.map((item: any) => item.type === "inlineMath"
      ? { type: "text", text: `$${item.props.latex}$`, styles: {} }
      : item);
    editor.updateBlock(block, { content } as any);
  }

  function renderMathInBlock(blockId: string | null) {
    if (!blockId) return;
    const block = editor.getBlock(blockId) as any;
    if (!block || !Array.isArray(block.content)) return;
    const textOnly = block.content.every((item: any) => item.type === "text");
    const raw = textOnly ? block.content.map((item: any) => item.text).join("").trim() : "";
    if (raw.startsWith("$$") && raw.endsWith("$$") && raw.length > 4) {
      editor.updateBlock(block, { type: "math", props: { latex: raw } } as any);
      return;
    }
    const document = editor.document as any[];
    const blockIndex = document.findIndex((item) => item.id === blockId);
    const plainText = (item: any) => Array.isArray(item?.content) && item.content.every((part: any) => part.type === "text")
      ? item.content.map((part: any) => part.text).join("")
      : null;
    let displayStart = -1;
    for (let index = blockIndex; index >= 0; index -= 1) {
      const text = plainText(document[index]);
      if (text === null) break;
      if (index === blockIndex && text.trim() === "$$") continue;
      if (text.trimStart().startsWith("$$")) { displayStart = index; break; }
    }
    if (displayStart >= 0) {
      let displayEnd = -1;
      for (let index = displayStart; index < document.length; index += 1) {
        const text = plainText(document[index]);
        if (text === null) break;
        if (text.trimEnd().endsWith("$$") && (index > displayStart || text.trim().length > 4)) { displayEnd = index; break; }
      }
      if (displayEnd >= blockIndex && displayEnd >= displayStart) {
        const latex = document.slice(displayStart, displayEnd + 1).map((item) => plainText(item) ?? "").join("\n").trim();
        const anchor = document[displayStart];
        editor.updateBlock(anchor, { type: "math", props: { latex } } as any);
        const redundant = document.slice(displayStart + 1, displayEnd + 1).map((item) => item.id);
        if (redundant.length) editor.removeBlocks(redundant);
        return;
      }
    }
    let changed = false;
    const content: any[] = [];
    for (const item of block.content) {
      if (item.type !== "text" || !item.text.includes("$")) { content.push(item); continue; }
      const parts = item.text.split(/(\$\$[^$]*\$\$|\$[^$\n]+\$)/g).filter(Boolean);
      if (parts.length === 1) { content.push(item); continue; }
      for (const part of parts) {
        if (part.startsWith("$$")) content.push({ ...item, text: part });
        else if (part.startsWith("$") && part.endsWith("$")) { content.push({ type: "inlineMath", props: { latex: part.slice(1, -1) } }); changed = true; }
        else content.push({ ...item, text: part });
      }
    }
    if (changed) editor.updateBlock(block, { content } as any);
  }

  function handleSelectionChange() {
    let current: any;
    try { current = editor.getTextCursorPosition().block; } catch { return; }
    if (activeBlockId.current === current.id) return;
    renderMathInBlock(activeBlockId.current);
    activeBlockId.current = current.id;
    revealInlineMath(current);
  }

  function handleFocus() {
    if (activeBlockId.current !== null) return;
    try {
      const current = editor.getTextCursorPosition().block as any;
      activeBlockId.current = current.id;
      revealInlineMath(current);
    } catch { /* Custom blocks do not always expose a text cursor. */ }
  }

  useEffect(() => {
    const before = JSON.stringify(editor.document);
    const ids = (editor.document as any[]).map((block) => block.id);
    ids.forEach((id) => renderMathInBlock(id));
    const after = JSON.stringify(editor.document);
    if (after !== before) onChange(after);
    // Existing notes are normalized once when the editor opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
      <BlockNoteView editor={editor} theme={mode} onChange={serialize} onFocus={handleFocus} onSelectionChange={handleSelectionChange} onBlur={(event) => { if (event.currentTarget.contains(event.relatedTarget as Node | null)) return; renderMathInBlock(activeBlockId.current); queueMicrotask(serialize); }} slashMenu={false} formattingToolbar={false}>
        <FormattingToolbarController formattingToolbar={EntropiFormattingToolbar} portalElement={document.body} />
        <SuggestionMenuController triggerCharacter="/" getItems={async (query) => filterSuggestionItems(slashMenuItems, query)} />
      </BlockNoteView>
    </div>
  );
}
