import { useEffect, useMemo, useRef, useState } from "react";
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
  SideMenuController,
  SuggestionMenuController,
  TextAlignButton,
  getDefaultReactSlashMenuItems,
  useCreateBlockNote,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useTheme } from "../../hooks/useTheme";
import { useTranslation } from "react-i18next";
import { PenLinear } from "../ui/appIcons";
import { SolarIcon } from "../ui/SolarIcon";
import { noteSchema } from "./noteSchema";
import { DIAGRAM_TEMPLATES, type DiagramTemplate } from "./DiagramBlock";
import { dispatchSourceReveal } from "./sourceReveal";
import { createSpellcheckExtension, setEditorSpellers } from "./spellcheckExtension";
import { useIgnoredWords, useSpellcheckers } from "../../hooks/useSpellcheck";
import { SpellcheckMenu, type SpellcheckMenuTarget } from "../ui/SpellcheckMenu";
import { notify } from "../ui";
import { CodeLanguageSelects } from "./CodeLanguageSelects";
import { EntropiBlockSideMenu } from "./EntropiBlockSideMenu";

const spellcheckExtension = createSpellcheckExtension();

const SOURCE_BLOCK_TYPES = new Set(["math", "diagram"]);

// No server to upload to in a local-first app — files are embedded as base64 data URLs directly
// in the note's own JSON, so pasting a copied image or picking one from disk works fully offline
// with nothing to keep in sync or clean up. Capped well under SQLite's practical row-size comfort
// zone so one huge photo can't bloat a note (and, downstream, its PDF export) unreasonably.
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("file read failed"));
    reader.readAsDataURL(file);
  });
}

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
  const editor = useCreateBlockNote({
    schema: noteSchema,
    initialContent: initialContent as any,
    dictionary: i18n.resolvedLanguage?.startsWith("es") ? es : en,
    uploadFile: async (file: File) => {
      if (file.size > MAX_UPLOAD_BYTES) {
        notify.error(t("notes.upload.tooLarge"));
        throw new Error("file too large");
      }
      return readFileAsDataUrl(file);
    },
    _tiptapOptions: {
      extensions: [spellcheckExtension],
      editorProps: { attributes: { spellcheck: "false" } },
    },
    // Recreate the editor when the app's language changes — BlockNote's slash-menu titles/aliases
    // (e.g. "Heading" vs "Título") come from the `dictionary` passed at construction time, so an
    // empty dependency array here left it permanently stuck on whatever language was active the
    // moment this note was first opened, even after switching the app to another language.
  }, [i18n.resolvedLanguage]);
  const activeBlockId = useRef<string | null>(null);
  const isSyncingMath = useRef(false);
  const spellers = useSpellcheckers();
  const { ignoredWords, ignoreWord } = useIgnoredWords();
  const [spellcheckMenu, setSpellcheckMenu] = useState<SpellcheckMenuTarget | null>(null);
  const editorRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditorSpellers((editor as any)._tiptapEditor, spellers, ignoredWords);
  }, [editor, spellers, ignoredWords]);

  function handleContextMenu(event: React.MouseEvent) {
    const target = (event.target as HTMLElement).closest?.(".entropi-misspelled");
    if (!target?.textContent) return;
    event.preventDefault();
    setSpellcheckMenu({ word: target.textContent, x: event.clientX, y: event.clientY });
  }

  function serialize() {
    onChange(JSON.stringify(editor.document));
  }

  function handleEditorChange() {
    serialize();
    if (isSyncingMath.current) return;
    // Text input does not consistently emit BlockNote's selection-change event. Run the live
    // conversion after the document update as well, so the space typed after a closing `$`
    // reliably turns the source into an inline formula.
    queueMicrotask(() => {
      if (isSyncingMath.current) return;
      try { convertCompletedInlineMath(editor.getTextCursorPosition().block.id); } catch { /* Custom blocks may not expose a text cursor. */ }
    });
  }

  function renderMathInBlock(blockId: string | null) {
    if (!blockId) return;
    isSyncingMath.current = true;
    try { renderMathInBlockInner(blockId); } finally { isSyncingMath.current = false; }
  }

  function renderMathInBlockInner(blockId: string) {
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

  function caretOffsetInBlock(blockId: string): number | null {
    const container = document.querySelector(`[data-id="${blockId}"] .bn-inline-content`);
    const selection = window.getSelection();
    if (!container || !selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    if (!container.contains(range.startContainer)) return null;
    const preRange = range.cloneRange();
    preRange.selectNodeContents(container);
    preRange.setEnd(range.startContainer, range.startOffset);
    return preRange.toString().length;
  }

  // Convert an inline $..$ formula (or promote a whole-line $$..$$ into a display math block) the
  // moment the caret moves past its closing $, without waiting for the user to leave the block —
  // mirrors Obsidian's live-preview behavior.
  function convertCompletedInlineMath(blockId: string) {
    const caret = caretOffsetInBlock(blockId);
    if (caret === null) return;
    const block = editor.getBlock(blockId) as any;
    if (!block || !Array.isArray(block.content) || !block.content.every((item: any) => item.type === "text")) return;

    const fullText = block.content.map((item: any) => item.text).join("");
    const trimmed = fullText.trim();
    if (trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length > 4) {
      if (caret > fullText.trimEnd().length) {
        isSyncingMath.current = true;
        editor.updateBlock(block, { type: "math", props: { latex: trimmed } } as any);
        isSyncingMath.current = false;
      }
      return;
    }

    const content: any[] = [];
    let changed = false;
    let cursor = 0;
    for (const item of block.content) {
      const text: string = item.text;
      if (!text.includes("$")) { content.push(item); cursor += text.length; continue; }
      const pattern = /\$\$[^$]*\$\$|\$[^$\n]+\$/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text))) {
        const matchEnd = cursor + match.index + match[0].length;
        // Some browser/ProseMirror combinations report the caret immediately before a trailing
        // collapsible space even though that space has already been inserted into the document.
        const followedByWhitespace = /\s/.test(fullText.charAt(matchEnd));
        if (matchEnd > caret || (matchEnd === caret && !followedByWhitespace)) continue;
        if (match.index > lastIndex) content.push({ ...item, text: text.slice(lastIndex, match.index) });
        if (match[0].startsWith("$$")) content.push({ ...item, text: match[0] });
        else { content.push({ type: "inlineMath", props: { latex: match[0].slice(1, -1) } }); changed = true; }
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < text.length) content.push({ ...item, text: text.slice(lastIndex) });
      cursor += text.length;
    }
    if (changed) {
      isSyncingMath.current = true;
      editor.updateBlock(block, { content } as any);
      isSyncingMath.current = false;
    }
  }

  // If the caret lands right next to an already-rendered inline formula (arrow-key navigation,
  // not just clicking), swap that single node back to raw "$latex$" text so its source is visible —
  // mirrors Obsidian. Returns true if something was revealed, so the caller can skip the
  // convert-on-detach pass for this same selection event.
  function revealInlineMathAtCaret(): boolean {
    const pmEditor = (editor as any)._tiptapEditor;
    const selection = pmEditor?.state?.selection;
    if (!selection || !selection.empty) return false;
    const { $from } = selection;
    const isInlineMath = (node: any) => node?.type?.name === "inlineMath";
    let target: any = null;
    let pos = -1;
    if (isInlineMath($from.nodeBefore)) { target = $from.nodeBefore; pos = $from.pos - $from.nodeBefore.nodeSize; }
    else if (isInlineMath($from.nodeAfter)) { target = $from.nodeAfter; pos = $from.pos; }
    if (!target) return false;
    const textNode = pmEditor.state.schema.text(`$${target.attrs.latex}$`);
    const tr = pmEditor.state.tr.replaceWith(pos, pos + target.nodeSize, textNode);
    pmEditor.view.dispatch(tr);
    return true;
  }

  function handleSelectionChange() {
    if (isSyncingMath.current) return;
    let current: any;
    try { current = editor.getTextCursorPosition().block; } catch { return; }
    if (activeBlockId.current === current.id) {
      isSyncingMath.current = true;
      const revealed = revealInlineMathAtCaret();
      isSyncingMath.current = false;
      if (!revealed) convertCompletedInlineMath(current.id);
      return;
    }
    renderMathInBlock(activeBlockId.current);
    activeBlockId.current = current.id;
    if (SOURCE_BLOCK_TYPES.has(current.type)) dispatchSourceReveal(current.id);
  }

  function handleFocus() {
    if (activeBlockId.current !== null) return;
    try {
      activeBlockId.current = editor.getTextCursorPosition().block.id;
    } catch { /* Custom blocks do not always expose a text cursor. */ }
  }

  // BlockNote's onSelectionChange subscribes/unsubscribes via a useEffect keyed on the callback's
  // identity, and every keystroke that mutates the doc re-renders this component (onChange -> parent
  // setState -> new props), producing a fresh handleSelectionChange each time. That resubscription
  // window can silently swallow the selection-change event for that very keystroke. Route the
  // subscription through a stable wrapper so it never needs to resubscribe.
  const handleSelectionChangeRef = useRef(handleSelectionChange);
  handleSelectionChangeRef.current = handleSelectionChange;
  const stableHandleSelectionChange = useRef(() => handleSelectionChangeRef.current()).current;

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
      aliases: ["canvas", "dibujo", "lienzo", "draw"],
      group: t("notes.slashGroup"),
      icon: <PenLinear size={18} />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "drawing" }),
    },
    ...(Object.keys(DIAGRAM_TEMPLATES) as DiagramTemplate[]).map((template) => ({
      title: t(`notes.diagram.templates.${template}.title`),
      subtext: t(`notes.diagram.templates.${template}.description`),
      aliases: ["diagram", "diagrama", "mermaid", template],
      group: t("notes.slashGroup"),
      icon: <SolarIcon name="RoutingLinear" size={18} />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "diagram", props: { code: DIAGRAM_TEMPLATES[template] } }),
    })),
  ], [editor, t]);
  return (
    <div
      ref={editorRootRef}
      className={fullPage ? "entropi-note-page min-h-[60vh] bg-transparent" : "vida-blocknote min-h-52 overflow-hidden rounded-2xl border border-border bg-control"}
      onContextMenu={handleContextMenu}
    >
      <MantineProvider forceColorScheme={mode}>
        <BlockNoteView editor={editor} theme={mode} onChange={handleEditorChange} onFocus={handleFocus} onSelectionChange={stableHandleSelectionChange} onBlur={(event) => { if (event.currentTarget.contains(event.relatedTarget as Node | null)) return; renderMathInBlock(activeBlockId.current); activeBlockId.current = null; queueMicrotask(serialize); }} slashMenu={false} formattingToolbar={false} sideMenu={false}>
          <FormattingToolbarController formattingToolbar={EntropiFormattingToolbar} portalElement={document.body} />
          <SideMenuController sideMenu={EntropiBlockSideMenu} portalElement={document.body} />
          <SuggestionMenuController triggerCharacter="/" getItems={async (query) => filterSuggestionItems(slashMenuItems, query)} />
        </BlockNoteView>
      </MantineProvider>
      <CodeLanguageSelects editorRootRef={editorRootRef} />
      {spellcheckMenu && (
        <SpellcheckMenu
          word={spellcheckMenu.word}
          x={spellcheckMenu.x}
          y={spellcheckMenu.y}
          onIgnore={() => {
            void ignoreWord(spellcheckMenu.word);
            setSpellcheckMenu(null);
          }}
          onClose={() => setSpellcheckMenu(null)}
        />
      )}
    </div>
  );
}
