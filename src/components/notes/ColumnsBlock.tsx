import { createReactBlockSpec } from "@blocknote/react";
import { useTranslation } from "react-i18next";
import { Fragment, useContext, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { BlockNoteEditor } from "./BlockNoteEditor";
import { NoteEditorFeaturesContext } from "./NoteEditorFeaturesContext";
import { EMPTY_NOTE_COLUMN, readNoteColumnDocuments } from "../../lib/noteColumns";

function parseWidths(value: unknown, count: number): number[] {
  const parsed = String(value || "").split(",").map(Number);
  return Array.from({ length: count }, (_, index) => Number.isFinite(parsed[index]) && parsed[index] > 0 ? parsed[index] : 1);
}

function removeNestedBlock(blocks: any[], blockId: string): { blocks: any[]; removed: any | null } {
  let removed: any | null = null;
  const next = blocks.flatMap((item) => {
    if (item?.id === blockId) {
      removed = item;
      return [];
    }
    if (!removed && Array.isArray(item?.children)) {
      const nested = removeNestedBlock(item.children, blockId);
      if (nested.removed) {
        removed = nested.removed;
        return [{ ...item, children: nested.blocks }];
      }
    }
    return [item];
  });
  return { blocks: next, removed };
}

function hasMeaningfulBlocks(blocks: any[]): boolean {
  return blocks.some((item) => {
    if (!item || typeof item !== "object") return false;
    if (item.type !== "paragraph") return true;
    const text = Array.isArray(item.content) ? item.content.map((part: any) => part?.text ?? "").join("") : String(item.content ?? "");
    return !!text.trim() || (Array.isArray(item.children) && hasMeaningfulBlocks(item.children));
  });
}

function Columns({ block, editor }: { block: any; editor: any }) {
  const { t } = useTranslation();
  const features = useContext(NoteEditorFeaturesContext);
  const columnDocuments = readNoteColumnDocuments(block.props as Record<string, unknown>);
  const count = columnDocuments.length;
  const editable = editor.isEditable !== false;
  const [widths, setWidths] = useState(() => parseWidths(block.props.widths, count));
  const widthsRef = useRef(widths);
  const dragCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const next = parseWidths(block.props.widths, count);
    widthsRef.current = next;
    setWidths(next);
  }, [block.props.widths, count]);

  useEffect(() => () => dragCleanupRef.current?.(), []);

  function updateColumn(index: number, value: string) {
    if (columnDocuments[index] === value) return;
    const next = [...columnDocuments];
    next[index] = value;
    editor.updateBlock(block, { props: { columns: next.length, data: JSON.stringify(next) } });
  }

  function extractFromColumn(index: number, selectedBlock: any) {
    let parsed: any[];
    try { parsed = JSON.parse(columnDocuments[index]); } catch { return; }
    if (!Array.isArray(parsed)) return;
    const result = removeNestedBlock(parsed, selectedBlock.id);
    if (!result.removed) return;
    const nextDocuments = [...columnDocuments];
    const nextWidths = parseWidths(block.props.widths, count);
    if (hasMeaningfulBlocks(result.blocks)) {
      nextDocuments[index] = JSON.stringify(result.blocks);
    } else {
      nextDocuments.splice(index, 1);
      nextWidths.splice(index, 1);
    }

    if (nextDocuments.length <= 1) {
      let remaining: any[] = [];
      try { remaining = nextDocuments.length ? JSON.parse(nextDocuments[0]) : []; } catch { /* Keep only the extracted block. */ }
      const meaningfulRemaining = Array.isArray(remaining) && hasMeaningfulBlocks(remaining) ? remaining : [];
      editor.replaceBlocks([block], [...meaningfulRemaining, result.removed]);
      return;
    }

    editor.updateBlock(block, { props: { columns: nextDocuments.length, data: JSON.stringify(nextDocuments), widths: nextWidths.join(",") } });
    editor.insertBlocks([result.removed], block, "after");
  }

  function persistWidths(next: number[]) {
    editor.updateBlock(block, { props: { widths: next.map((value) => Number(value.toFixed(4))).join(",") } });
  }

  function resizePair(index: number, delta: number) {
    const current = widthsRef.current;
    const total = current[index] + current[index + 1];
    const minimum = total * 0.12;
    const left = Math.max(minimum, Math.min(total - minimum, current[index] + delta));
    const next = [...current];
    next[index] = left;
    next[index + 1] = total - left;
    widthsRef.current = next;
    setWidths(next);
    return next;
  }

  function startResize(index: number, event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    const grid = event.currentTarget.parentElement;
    if (!grid) return;
    dragCleanupRef.current?.();
    const startX = event.clientX;
    const initial = [...widthsRef.current];
    const activeTotal = initial.slice(0, count).reduce((sum, value) => sum + value, 0);
    const availableWidth = Math.max(1, grid.getBoundingClientRect().width - (count - 1) * 12);
    const pixelsPerUnit = availableWidth / activeTotal;
    document.body.classList.add("entropi-resizing-columns");

    const onMove = (moveEvent: PointerEvent) => {
      widthsRef.current = initial;
      resizePair(index, (moveEvent.clientX - startX) / pixelsPerUnit);
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      document.body.classList.remove("entropi-resizing-columns");
      dragCleanupRef.current = null;
    };
    const onEnd = () => {
      const finalWidths = widthsRef.current;
      cleanup();
      persistWidths(finalWidths);
    };
    dragCleanupRef.current = cleanup;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd, { once: true });
    window.addEventListener("pointercancel", onEnd, { once: true });
  }

  function resizeWithKeyboard(index: number, event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const total = widthsRef.current[index] + widthsRef.current[index + 1];
    persistWidths(resizePair(index, (event.key === "ArrowLeft" ? -1 : 1) * total * 0.05));
  }

  return <section
    className="entropi-columns relative my-3 w-full"
    contentEditable={false}
    onMouseDown={(event) => event.stopPropagation()}
    onClick={(event) => event.stopPropagation()}
    onDoubleClick={(event) => event.stopPropagation()}
  >
    <div className="entropi-columns-grid" style={{ gridTemplateColumns: widths.slice(0, count).flatMap((width, index) => index < count - 1 ? [`minmax(0, ${width}fr)`, "12px"] : [`minmax(0, ${width}fr)`]).join(" ") }}>
      {Array.from({ length: count }, (_, index) => <Fragment key={index}>
        <div className="entropi-column min-w-0">
          <BlockNoteEditor
            value={columnDocuments[index] || EMPTY_NOTE_COLUMN}
            onChange={(value) => updateColumn(index, value)}
            embedded
            editable={editable}
            onAddToGlossary={features.onAddToGlossary}
            onBookmarkBlock={features.onBookmarkBlock}
            onExtractFromColumn={(selectedBlock) => extractFromColumn(index, selectedBlock)}
            acceptedWords={features.acceptedWords}
          />
        </div>
        {index < count - 1 && (editable ? <button
            type="button"
            className="entropi-column-resizer"
            aria-label={t("notes.columns.resize")}
            title={t("notes.columns.resize")}
            onPointerDown={(event) => startResize(index, event)}
            onKeyDown={(event) => resizeWithKeyboard(index, event)}
          ><span /></button>
          : <span className="entropi-column-resizer" aria-hidden="true" />)}
      </Fragment>)}
    </div>
  </section>;
}

export const ColumnsBlock = createReactBlockSpec(
  {
    type: "columns",
    propSchema: {
      columns: { default: 2 },
      data: { default: "" },
      column1: { default: EMPTY_NOTE_COLUMN },
      column2: { default: EMPTY_NOTE_COLUMN },
      column3: { default: EMPTY_NOTE_COLUMN },
      column4: { default: EMPTY_NOTE_COLUMN },
      widths: { default: "1,1" },
    },
    content: "none",
  },
  { render: (props) => <Columns block={props.block} editor={props.editor} /> },
)();
