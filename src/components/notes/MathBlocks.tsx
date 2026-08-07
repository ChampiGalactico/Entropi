import { createReactBlockSpec, createReactInlineContentSpec } from "@blocknote/react";
import { useEffect, useRef, useState } from "react";
import { ensureMathJax } from "../../lib/mathJax";

const DEFAULT_DISPLAY_FORMULA = "$$\n\n$$";

export function LatexPreview({ latex, display = false }: { latex: string; display?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let active = true;
    let source = latex.trim() || "x";
    if (source.startsWith("$$") && source.endsWith("$$")) source = source.slice(2, -2).trim();
    else if (source.startsWith("$") && source.endsWith("$")) source = source.slice(1, -1).trim();
    element.textContent = source;
    void ensureMathJax().then(async () => {
      if (!active || !ref.current) return;
      const output = await window.MathJax?.tex2svgPromise?.(source, { display });
      if (!active || !ref.current || !output) return;
      ref.current.replaceChildren(output);
    }).catch(() => {
      // Preserve the source as a readable fallback if the renderer cannot load.
      if (active && ref.current) ref.current.textContent = source;
    });
    return () => { active = false; };
  }, [display, latex]);
  return <span ref={ref} className={display ? "entropi-math entropi-math-display" : "entropi-math entropi-math-inline"} />;
}

function InlineFormula({ inlineContent, updateInlineContent }: { inlineContent: any; updateInlineContent: (value: any) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(inlineContent.props.latex);
  function commit() { if (draft.trim()) updateInlineContent({ type: "inlineMath", props: { latex: draft.trim() } }); setEditing(false); }
  if (editing) return <input contentEditable={false} autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") commit(); if (event.key === "Escape") setEditing(false); }} className="mx-1 w-40 rounded-lg border border-accent bg-elevated px-2 py-0.5 font-mono text-sm text-text-primary outline-none" />;
  return <span contentEditable={false} title={`$${inlineContent.props.latex}$`} className="cursor-text" onClick={() => { setDraft(inlineContent.props.latex); setEditing(true); }}><LatexPreview latex={inlineContent.props.latex} /></span>;
}

export const InlineMath = createReactInlineContentSpec(
  { type: "inlineMath", propSchema: { latex: { default: "x" } }, content: "none" },
  { render: (props) => <InlineFormula inlineContent={props.inlineContent} updateInlineContent={props.updateInlineContent} /> },
);

export const MathBlock = createReactBlockSpec(
  { type: "math", propSchema: { latex: { default: DEFAULT_DISPLAY_FORMULA } }, content: "none" },
  { render: ({ block, editor }) => {
    function ObsidianFormula() {
      const [editing, setEditing] = useState(false);
      const [draft, setDraft] = useState(block.props.latex);
      useEffect(() => { if (!editing) setDraft(block.props.latex); }, [block.props.latex, editing]);
      function commit() {
        const next = draft.trim() || DEFAULT_DISPLAY_FORMULA;
        if (next !== block.props.latex) editor.updateBlock(block, { props: { latex: next } });
        setEditing(false);
      }
      function exitFormula() {
        commit();
        const inserted = (editor as any).insertBlocks([{ type: "paragraph" }], block, "after");
        queueMicrotask(() => (editor as any).setTextCursorPosition(inserted[0], "start"));
      }
      if (editing) return <textarea contentEditable={false} autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); exitFormula(); } if (event.key === "Escape") { event.preventDefault(); setEditing(false); } }} spellCheck={false} rows={Math.max(3, Math.min(16, draft.split("\n").length + 1))} className="my-1 w-full resize-y bg-transparent px-1 py-2 font-mono text-sm leading-6 text-text-primary outline-none" />;
      return <button type="button" contentEditable={false} onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); setEditing(true); }} className="my-1 block w-full cursor-text bg-transparent px-1 py-0.5 text-center text-text-primary"><LatexPreview latex={block.props.latex} display /></button>;
    }
    return <ObsidianFormula />;
  } },
)();
