import { createReactBlockSpec, createReactInlineContentSpec } from "@blocknote/react";
import { useState } from "react";

const commands: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", theta: "θ", lambda: "λ", mu: "μ", pi: "π", rho: "ρ", sigma: "σ", tau: "τ", phi: "φ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Pi: "Π", Sigma: "Σ", Phi: "Φ", Omega: "Ω",
  cdot: "·", times: "×", pm: "±", mp: "∓", le: "≤", ge: "≥", neq: "≠", approx: "≈", infty: "∞", partial: "∂", nabla: "∇", int: "∫", iint: "∬", iiint: "∭", sum: "∑", prod: "∏", degree: "°", vec: "→",
};
const escape = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]!));

function groupAt(source: string, start: number): { value: string; end: number } | null {
  if (source[start] !== "{") return null; let depth = 0;
  for (let index = start; index < source.length; index += 1) { if (source[index] === "{") depth += 1; else if (source[index] === "}") { depth -= 1; if (depth === 0) return { value: source.slice(start + 1, index), end: index + 1 }; } }
  return null;
}

export function latexToHtml(source: string): string {
  let html = ""; let index = 0;
  while (index < source.length) {
    if (source.startsWith("\\frac", index)) { const top = groupAt(source, index + 5); const bottom = top && groupAt(source, top.end); if (top && bottom) { html += `<span class="math-frac"><span>${latexToHtml(top.value)}</span><span>${latexToHtml(bottom.value)}</span></span>`; index = bottom.end; continue; } }
    if (source.startsWith("\\sqrt", index)) { const group = groupAt(source, index + 5); if (group) { html += `<span class="math-sqrt">√<span>${latexToHtml(group.value)}</span></span>`; index = group.end; continue; } }
    if (source[index] === "^" || source[index] === "_") { const tag = source[index] === "^" ? "sup" : "sub"; const group = groupAt(source, index + 1); const value = group?.value ?? source[index + 1] ?? ""; html += `<${tag}>${latexToHtml(value)}</${tag}>`; index = group?.end ?? index + 2; continue; }
    if (source[index] === "\\") { const match = source.slice(index + 1).match(/^[A-Za-z]+/); if (match) { const command = match[0]; if (command !== "left" && command !== "right") html += commands[command] ?? (/[a-z]+/.test(command) ? `<span class="math-function">${escape(command)}</span>` : escape(command)); index += command.length + 1; continue; } }
    if (source[index] === "{") { const group = groupAt(source, index); if (group) { html += latexToHtml(group.value); index = group.end; continue; } }
    html += escape(source[index]); index += 1;
  }
  return html;
}

function Formula({ latex, display = false }: { latex: string; display?: boolean }) {
  return <span className={display ? "entropi-math entropi-math-display" : "entropi-math entropi-math-inline"} dangerouslySetInnerHTML={{ __html: latexToHtml(latex || "x") }} />;
}

function InlineFormula({ inlineContent, updateInlineContent }: { inlineContent: any; updateInlineContent: (value: any) => void }) {
  const [editing, setEditing] = useState(false); const [draft, setDraft] = useState(inlineContent.props.latex);
  function commit() { if (draft.trim()) updateInlineContent({ type: "inlineMath", props: { latex: draft.trim() } }); setEditing(false); }
  if (editing) return <input contentEditable={false} autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") commit(); if (event.key === "Escape") setEditing(false); }} className="mx-1 w-40 rounded-lg border border-accent bg-elevated px-2 py-0.5 font-mono text-sm text-text-primary outline-none" />;
  return <span contentEditable={false} title={`$${inlineContent.props.latex}$`} onDoubleClick={() => { setDraft(inlineContent.props.latex); setEditing(true); }}><Formula latex={inlineContent.props.latex} /></span>;
}

export const InlineMath = createReactInlineContentSpec(
  { type: "inlineMath", propSchema: { latex: { default: "x" } }, content: "none" },
  { render: (props) => <InlineFormula inlineContent={props.inlineContent} updateInlineContent={props.updateInlineContent} /> },
);

export const MathBlock = createReactBlockSpec(
  { type: "math", propSchema: { latex: { default: "E = mc^2" } }, content: "none" },
  { render: ({ block, editor }) => <div contentEditable={false} className="my-3 rounded-[1.5rem] border border-border bg-control p-4"><Formula latex={block.props.latex} display /><input value={block.props.latex} onChange={(event) => editor.updateBlock(block, { props: { latex: event.target.value } })} spellCheck={false} placeholder="E = mc^2" className="mt-4 w-full rounded-xl border border-border bg-elevated px-4 py-2 font-mono text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent" /></div> },
)();
