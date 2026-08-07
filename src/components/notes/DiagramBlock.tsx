import { useEffect, useRef, useState } from "react";
import { createReactBlockSpec } from "@blocknote/react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../hooks/useTheme";
import { renderMermaid } from "../../lib/mermaidRenderer";

export const DIAGRAM_TEMPLATES = {
  flowchart: "flowchart TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Do this]\n    B -->|No| D[Do that]",
  sequence: "sequenceDiagram\n    participant A as Alice\n    participant B as Bob\n    A->>B: Hello Bob!\n    B-->>A: Hi Alice!",
  class: "classDiagram\n    class Animal {\n      +String name\n      +makeSound()\n    }\n    Animal <|-- Dog",
  state: "stateDiagram-v2\n    [*] --> Idle\n    Idle --> Running: start\n    Running --> Idle: stop",
  gantt: "gantt\n    title Project plan\n    dateFormat YYYY-MM-DD\n    section Phase 1\n    Task A :a1, 2024-01-01, 5d\n    Task B :after a1, 3d",
} as const;

export type DiagramTemplate = keyof typeof DIAGRAM_TEMPLATES;

function DiagramCanvas({ block, editor }: { block: any; editor: any }) {
  const { t } = useTranslation();
  const { mode } = useTheme();
  const [editing, setEditing] = useState(!block.props.code);
  const [draft, setDraft] = useState(block.props.code);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!editing) setDraft(block.props.code); }, [block.props.code, editing]);

  useEffect(() => {
    if (editing) return;
    let active = true;
    setError(null);
    renderMermaid(block.props.code, mode === "dark" ? "dark" : "light")
      .then((markup) => { if (active) setSvg(markup); })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : String(err)); });
    return () => { active = false; };
  }, [editing, block.props.code, mode]);

  function commit() {
    const next = draft.trim();
    if (next !== block.props.code) editor.updateBlock(block, { props: { code: next } });
    setEditing(false);
  }

  if (editing) {
    return <div contentEditable={false} className="my-3 w-full min-w-0 max-w-full rounded-[1.5rem] border border-border bg-control shadow-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">{t("notes.diagram.slashTitle")}</span>
        <button type="button" onClick={commit} className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-white">{t("notes.diagram.done")}</button>
      </div>
      <textarea autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} spellCheck={false} rows={Math.max(6, Math.min(20, draft.split("\n").length + 1))} className="block w-full resize-y bg-transparent px-4 py-3 font-mono text-sm leading-6 text-text-primary outline-none" />
    </div>;
  }

  return <div contentEditable={false} onClick={() => setEditing(true)} className="my-3 w-full min-w-0 max-w-full cursor-text overflow-x-auto rounded-[1.5rem] border border-border bg-control p-4 text-center shadow-card">
    {error ? <p className="text-xs text-danger">{t("notes.diagram.error")}: {error}</p> : <div ref={containerRef} className="inline-block max-w-full [&_svg]:mx-auto [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg ?? "" }} />}
  </div>;
}

export const DiagramBlock = createReactBlockSpec(
  { type: "diagram", propSchema: { code: { default: DIAGRAM_TEMPLATES.flowchart } }, content: "none" },
  { render: (props) => <DiagramCanvas block={props.block} editor={props.editor} /> },
)();
