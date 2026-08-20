import { createReactBlockSpec } from "@blocknote/react";
import { useTranslation } from "react-i18next";
import type { CSSProperties } from "react";
import { useContext } from "react";
import { BlockNoteEditor } from "./BlockNoteEditor";
import { NoteEditorFeaturesContext } from "./NoteEditorFeaturesContext";

const EMPTY_COLUMN = JSON.stringify([{ type: "paragraph", content: "" }]);
const COLUMN_COUNTS = [2, 3, 4] as const;

function Columns({ block, editor }: { block: any; editor: any }) {
  const { t } = useTranslation();
  const features = useContext(NoteEditorFeaturesContext);
  const count = Math.max(2, Math.min(4, Number(block.props.columns) || 2));
  const editable = editor.isEditable !== false;

  function updateColumn(index: number, value: string) {
    const key = `column${index + 1}`;
    if (block.props[key] === value) return;
    editor.updateBlock(block, { props: { [key]: value } });
  }

  return <section className="entropi-columns relative my-3 w-full" contentEditable={false} style={{ "--entropi-column-count": count } as CSSProperties}>
    {editable && <div className="entropi-columns-toolbar mb-2 flex items-center justify-end gap-1">
      <span className="mr-1 text-[10px] font-medium uppercase tracking-wider text-text-muted">{t("notes.columns.count")}</span>
      {COLUMN_COUNTS.map((item) => <button key={item} type="button" aria-label={t("notes.columns.useCount", { count: item })} onClick={() => editor.updateBlock(block, { props: { columns: item } })} className={`h-7 min-w-7 rounded-lg px-2 text-xs font-semibold transition-colors ${count === item ? "bg-accent text-white" : "bg-control text-text-secondary hover:bg-surface-hover hover:text-text-primary"}`}>{item}</button>)}
    </div>}
    <div className="entropi-columns-grid">
      {Array.from({ length: count }, (_, index) => <div key={index} className="entropi-column min-w-0">
        <BlockNoteEditor
          value={String(block.props[`column${index + 1}`] || EMPTY_COLUMN)}
          onChange={(value) => updateColumn(index, value)}
          embedded
          editable={editable}
          onAddToGlossary={features.onAddToGlossary}
          onBookmarkBlock={features.onBookmarkBlock}
          acceptedWords={features.acceptedWords}
        />
      </div>)}
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
    },
    content: "none",
  },
  { render: (props) => <Columns block={props.block} editor={props.editor} /> },
)();
