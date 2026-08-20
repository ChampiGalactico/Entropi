import { createReactBlockSpec } from "@blocknote/react";
import { useTranslation } from "react-i18next";
import { Fragment, useContext, useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { BlockNoteEditor } from "./BlockNoteEditor";
import { NoteEditorFeaturesContext } from "./NoteEditorFeaturesContext";

const EMPTY_COLUMN = JSON.stringify([{ type: "paragraph", content: "" }]);
const COLUMN_COUNTS = [2, 3, 4] as const;
const DEFAULT_WIDTHS = [1, 1, 1, 1];

function parseWidths(value: unknown): number[] {
  const parsed = String(value || "").split(",").map(Number);
  return DEFAULT_WIDTHS.map((fallback, index) => Number.isFinite(parsed[index]) && parsed[index] > 0 ? parsed[index] : fallback);
}

function Columns({ block, editor }: { block: any; editor: any }) {
  const { t } = useTranslation();
  const features = useContext(NoteEditorFeaturesContext);
  const count = Math.max(2, Math.min(4, Number(block.props.columns) || 2));
  const editable = editor.isEditable !== false;
  const [widths, setWidths] = useState(() => parseWidths(block.props.widths));
  const widthsRef = useRef(widths);
  const dragCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const next = parseWidths(block.props.widths);
    widthsRef.current = next;
    setWidths(next);
  }, [block.props.widths]);

  useEffect(() => () => dragCleanupRef.current?.(), []);

  function updateColumn(index: number, value: string) {
    const key = `column${index + 1}`;
    if (block.props[key] === value) return;
    editor.updateBlock(block, { props: { [key]: value } });
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

  return <section className="entropi-columns relative my-3 w-full" contentEditable={false} style={{ "--entropi-column-count": count } as CSSProperties}>
    <div className="entropi-columns-grid" style={{ gridTemplateColumns: widths.slice(0, count).flatMap((width, index) => index < count - 1 ? [`minmax(0, ${width}fr)`, "12px"] : [`minmax(0, ${width}fr)`]).join(" ") }}>
      {Array.from({ length: count }, (_, index) => <Fragment key={index}>
        <div className="entropi-column min-w-0">
          <BlockNoteEditor
            value={String(block.props[`column${index + 1}`] || EMPTY_COLUMN)}
            onChange={(value) => updateColumn(index, value)}
            embedded
            editable={editable}
            onAddToGlossary={features.onAddToGlossary}
            onBookmarkBlock={features.onBookmarkBlock}
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
      columns: { default: 2, values: [...COLUMN_COUNTS] },
      column1: { default: EMPTY_COLUMN },
      column2: { default: EMPTY_COLUMN },
      column3: { default: EMPTY_COLUMN },
      column4: { default: EMPTY_COLUMN },
      widths: { default: "1,1,1,1" },
    },
    content: "none",
  },
  { render: (props) => <Columns block={props.block} editor={props.editor} /> },
)();
