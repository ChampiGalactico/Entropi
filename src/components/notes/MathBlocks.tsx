import { createReactBlockSpec, createReactInlineContentSpec } from "@blocknote/react";
import { useEffect, useRef, useState } from "react";
import { ensureMathJax } from "../../lib/mathJax";

const symbols: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", varepsilon: "ϵ", zeta: "ζ", eta: "η", theta: "θ", vartheta: "ϑ", iota: "ι", kappa: "κ", lambda: "λ", mu: "μ", nu: "ν", xi: "ξ", omicron: "ο", pi: "π", varpi: "ϖ", rho: "ρ", varrho: "ϱ", sigma: "σ", varsigma: "ς", tau: "τ", upsilon: "υ", phi: "φ", varphi: "ϕ", chi: "χ", psi: "ψ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ", Pi: "Π", Sigma: "Σ", Upsilon: "Υ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
  cdot: "·", times: "×", div: "÷", pm: "±", mp: "∓", ast: "∗", star: "⋆", circ: "∘", bullet: "•",
  le: "≤", leq: "≤", ge: "≥", geq: "≥", neq: "≠", ne: "≠", approx: "≈", equiv: "≡", sim: "∼", simeq: "≃", propto: "∝",
  in: "∈", notin: "∉", ni: "∋", subset: "⊂", subseteq: "⊆", supset: "⊃", supseteq: "⊇", cup: "∪", cap: "∩", emptyset: "∅",
  infty: "∞", partial: "∂", nabla: "∇", ell: "ℓ", hbar: "ℏ", Re: "ℜ", Im: "ℑ",
  int: "∫", iint: "∬", iiint: "∭", oint: "∮", sum: "∑", prod: "∏", coprod: "∐", lim: "lim", min: "min", max: "max", sup: "sup", inf: "inf",
  to: "→", rightarrow: "→", leftarrow: "←", leftrightarrow: "↔", Rightarrow: "⇒", Leftarrow: "⇐", Leftrightarrow: "⇔", mapsto: "↦",
  langle: "⟨", rangle: "⟩", lbrace: "{", rbrace: "}", lvert: "|", rvert: "|", vert: "|", lVert: "‖", rVert: "‖", Vert: "‖", lfloor: "⌊", rfloor: "⌋", lceil: "⌈", rceil: "⌉", lgroup: "⟮", rgroup: "⟯",
  degree: "°", angle: "∠", perpendicular: "⊥", parallel: "∥", therefore: "∴", because: "∵", forall: "∀", exists: "∃", neg: "¬",
  ldots: "…", cdots: "⋯", vdots: "⋮", ddots: "⋱",
};

const escape = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]!));
const DEFAULT_DISPLAY_FORMULA = "$$\n\n$$";

type DelimiterKind = "none" | "paren" | "bracket" | "brace" | "bar" | "double-bar" | "angle" | "floor" | "ceil" | "group";

function readDelimiter(source: string, start: number): { kind: DelimiterKind; end: number } {
  let index = start;
  while (/\s/.test(source[index] ?? "")) index += 1;
  if (source[index] === ".") return { kind: "none", end: index + 1 };
  const literal: Record<string, DelimiterKind> = { "(": "paren", ")": "paren", "[": "bracket", "]": "bracket", "{": "brace", "}": "brace", "|": "bar" };
  if (literal[source[index]]) return { kind: literal[source[index]], end: index + 1 };
  if (source[index] === "\\") {
    if (source[index + 1] === "{" || source[index + 1] === "}") return { kind: "brace", end: index + 2 };
    const match = source.slice(index + 1).match(/^[A-Za-z]+/);
    if (match) {
      const kinds: Record<string, DelimiterKind> = { langle: "angle", rangle: "angle", lbrace: "brace", rbrace: "brace", lvert: "bar", rvert: "bar", vert: "bar", lVert: "double-bar", rVert: "double-bar", Vert: "double-bar", lfloor: "floor", rfloor: "floor", lceil: "ceil", rceil: "ceil", lgroup: "group", rgroup: "group" };
      return { kind: kinds[match[0]] ?? "none", end: index + match[0].length + 1 };
    }
  }
  return { kind: "none", end: Math.min(source.length, index + 1) };
}

function delimiterSvg(kind: DelimiterKind, side: "left" | "right") {
  if (kind === "none") return '<span class="math-matrix-delimiter math-delimiter-none"></span>';
  const left = side === "left";
  const paths: Record<Exclude<DelimiterKind, "none">, string> = {
    paren: left ? "M10 2 C2 20 2 80 10 98" : "M2 2 C10 20 10 80 2 98",
    group: left ? "M10 2 C3 22 3 78 10 98" : "M2 2 C9 22 9 78 2 98",
    bracket: left ? "M10 2 H2 V98 H10" : "M2 2 H10 V98 H2",
    brace: left ? "M10 2 C4 2 5 35 2 42 C0 46 0 48 0 50 C0 52 0 54 2 58 C5 65 4 98 10 98" : "M2 2 C8 2 7 35 10 42 C12 46 12 48 12 50 C12 52 12 54 10 58 C7 65 8 98 2 98",
    bar: "M6 2 V98",
    "double-bar": "M3 2 V98 M9 2 V98",
    angle: left ? "M10 2 L2 50 L10 98" : "M2 2 L10 50 L2 98",
    floor: left ? "M2 2 V98 H10" : "M10 2 V98 H2",
    ceil: left ? "M10 2 H2 V98" : "M2 2 H10 V98",
  };
  return `<span class="math-matrix-delimiter"><svg class="math-delimiter-svg" viewBox="0 0 12 100" preserveAspectRatio="none" aria-hidden="true"><path d="${paths[kind]}" /></svg></span>`;
}

function renderDelimited(left: DelimiterKind, right: DelimiterKind, content: string) {
  return `<span class="math-delimited">${delimiterSvg(left, "left")}<span class="math-delimited-content">${latexToHtml(content)}</span>${delimiterSvg(right, "right")}</span>`;
}

function groupAt(source: string, start: number, open = "{", close = "}"): { value: string; end: number } | null {
  if (source[start] !== open) return null;
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === open) depth += 1;
    else if (source[index] === close) {
      depth -= 1;
      if (depth === 0) return { value: source.slice(start + 1, index), end: index + 1 };
    }
  }
  return null;
}

function stripDisplayWrappers(value: string) {
  let source = value.trim();
  if (source.startsWith("$$") && source.endsWith("$$")) source = source.slice(2, -2).trim();
  if (source.startsWith("\\[") && source.endsWith("\\]")) source = source.slice(2, -2).trim();
  for (const environment of ["equation", "equation*"]) {
    const start = `\\begin{${environment}}`;
    const end = `\\end{${environment}}`;
    if (source.startsWith(start) && source.endsWith(end)) source = source.slice(start.length, -end.length).trim();
  }
  return source;
}

function renderEnvironment(name: string, content: string) {
  const matrixNames = new Set(["matrix", "pmatrix", "bmatrix", "Bmatrix", "vmatrix", "Vmatrix", "smallmatrix", "array"]);
  if (matrixNames.has(name)) {
    const columnGroup = name === "array" ? groupAt(content.trim(), 0) : null;
    const columnSpec = columnGroup?.value ?? "";
    const matrixContent = columnGroup ? content.trim().slice(columnGroup.end) : content;
    const separatorAfter = columnSpec.includes("|") ? columnSpec.slice(0, columnSpec.indexOf("|")).replace(/[^clr]/g, "").length : -1;
    const rows = matrixContent.split(/\\\\(?:\[[^\]]*\])?/).map((row) => row.trim()).filter(Boolean);
    const body = rows.map((row) => `<span class="math-matrix-row">${row.split("&").map((cell, cellIndex) => `<span class="math-matrix-cell ${separatorAfter === cellIndex ? "math-matrix-separator" : ""}">${latexToHtml(cell.trim())}</span>`).join("")}</span>`).join("");
    const delimiters: Record<string, [DelimiterKind, DelimiterKind]> = { pmatrix: ["paren", "paren"], bmatrix: ["bracket", "bracket"], Bmatrix: ["brace", "brace"], vmatrix: ["bar", "bar"], Vmatrix: ["double-bar", "double-bar"] };
    const [left, right] = delimiters[name] ?? ["none", "none"];
    return `<span class="math-matrix-wrap">${delimiterSvg(left, "left")}<span class="math-matrix">${body}</span>${delimiterSvg(right, "right")}</span>`;
  }
  if (["aligned", "alignedat", "align", "align*", "split", "gather", "gathered", "cases"].includes(name)) {
    const rows = content.split(/\\\\(?:\[[^\]]*\])?/).map((row) => row.trim()).filter(Boolean);
    const body = rows.map((row) => `<span class="math-align-row">${row.split("&").map((cell, index) => `<span class="math-align-cell ${index % 2 === 0 ? "math-align-right" : "math-align-left"}">${latexToHtml(cell.trim())}</span>`).join("")}</span>`).join("");
    return `<span class="math-align-wrap">${name === "cases" ? delimiterSvg("brace", "left") : ""}<span class="math-align">${body}</span></span>`;
  }
  return latexToHtml(content);
}

function renderArgumentCommand(command: string, value: string) {
  if (command === "text" || command === "textrm") return `<span class="math-text">${escape(value).replace(/ /g, "&nbsp;")}</span>`;
  if (command === "operatorname") return `<span class="math-operator">${escape(value)}</span>`;
  const content = latexToHtml(value);
  const classes: Record<string, string> = { mathrm: "math-roman", mathbf: "math-bold", boldsymbol: "math-bold", mathit: "math-italic", vec: "math-vec", overrightarrow: "math-vec", hat: "math-hat", widehat: "math-hat", bar: "math-bar", overline: "math-bar", underline: "math-underline", boxed: "math-boxed", cancel: "math-cancel" };
  return `<span class="${classes[command] ?? ""}">${content}</span>`;
}

export function latexToHtml(value: string): string {
  const source = stripDisplayWrappers(value);
  let html = "";
  let index = 0;
  while (index < source.length) {
    if (source.startsWith("\\left", index)) {
      const leftDelimiter = readDelimiter(source, index + 5);
      let cursor = leftDelimiter.end;
      let depth = 1;
      let rightIndex = -1;
      while (cursor < source.length) {
        const nextLeft = source.indexOf("\\left", cursor);
        const nextRight = source.indexOf("\\right", cursor);
        if (nextRight < 0) break;
        if (nextLeft >= 0 && nextLeft < nextRight) { depth += 1; cursor = nextLeft + 5; continue; }
        depth -= 1;
        if (depth === 0) { rightIndex = nextRight; break; }
        cursor = nextRight + 6;
      }
      if (rightIndex >= 0) {
        const rightDelimiter = readDelimiter(source, rightIndex + 6);
        html += renderDelimited(leftDelimiter.kind, rightDelimiter.kind, source.slice(leftDelimiter.end, rightIndex));
        index = rightDelimiter.end;
        continue;
      }
    }
    if (source.startsWith("\\begin{", index)) {
      const nameGroup = groupAt(source, index + 6);
      if (nameGroup) {
        const endToken = `\\end{${nameGroup.value}}`;
        const endIndex = source.indexOf(endToken, nameGroup.end);
        if (endIndex >= 0) {
          html += renderEnvironment(nameGroup.value, source.slice(nameGroup.end, endIndex));
          index = endIndex + endToken.length;
          continue;
        }
      }
    }
    if (["\\frac", "\\dfrac", "\\tfrac", "\\binom"].some((command) => source.startsWith(command, index))) {
      const command = ["\\dfrac", "\\tfrac", "\\binom", "\\frac"].find((item) => source.startsWith(item, index))!;
      const top = groupAt(source, index + command.length);
      const bottom = top && groupAt(source, top.end);
      if (top && bottom) {
        html += command === "\\binom"
          ? `<span class="math-matrix-wrap"><span class="math-matrix-delimiter">(</span><span class="math-binomial"><span>${latexToHtml(top.value)}</span><span>${latexToHtml(bottom.value)}</span></span><span class="math-matrix-delimiter">)</span></span>`
          : `<span class="math-frac"><span>${latexToHtml(top.value)}</span><span>${latexToHtml(bottom.value)}</span></span>`;
        index = bottom.end; continue;
      }
    }
    if (source.startsWith("\\sqrt", index)) {
      const optional = groupAt(source, index + 5, "[", "]");
      const group = groupAt(source, optional?.end ?? index + 5);
      if (group) { html += `<span class="math-sqrt">${optional ? `<sup>${latexToHtml(optional.value)}</sup>` : ""}√<span>${latexToHtml(group.value)}</span></span>`; index = group.end; continue; }
    }
    if (source[index] === "^" || source[index] === "_") {
      const tag = source[index] === "^" ? "sup" : "sub";
      const group = groupAt(source, index + 1);
      const content = group?.value ?? source[index + 1] ?? "";
      html += `<${tag}>${latexToHtml(content)}</${tag}>`;
      index = group?.end ?? index + 2; continue;
    }
    if (source[index] === "\\") {
      if (source[index + 1] === "\\") { html += '<span class="math-line-break"></span>'; index += 2; continue; }
      const spacing: Record<string, string> = { ",": "math-space-thin", ":": "math-space-medium", ";": "math-space-thick", "!": "math-space-negative", " ": "math-space-normal" };
      if (spacing[source[index + 1]]) { html += `<span class="${spacing[source[index + 1]]}"></span>`; index += 2; continue; }
      const match = source.slice(index + 1).match(/^[A-Za-z]+\*?/);
      if (match) {
        const command = match[0];
        const commandEnd = index + command.length + 1;
        if (command === "left" || command === "right" || command === "middle") { index = source[commandEnd] === "." ? commandEnd + 1 : commandEnd; continue; }
        if (command === "quad" || command === "qquad") { html += `<span class="${command === "quad" ? "math-space-quad" : "math-space-qquad"}"></span>`; index = commandEnd; continue; }
        if (["text", "textrm", "operatorname", "mathrm", "mathbf", "boldsymbol", "mathit", "vec", "overrightarrow", "hat", "widehat", "bar", "overline", "underline", "boxed", "cancel"].includes(command)) {
          const group = groupAt(source, commandEnd);
          if (group) { html += renderArgumentCommand(command, group.value); index = group.end; continue; }
        }
        const rendered = symbols[command];
        html += rendered ? (/[A-Za-z]/.test(rendered) ? `<span class="math-operator">${rendered}</span>` : rendered) : `<span class="math-function">${escape(command.replace(/\*$/, ""))}</span>`;
        index = commandEnd; continue;
      }
      const escaped = source[index + 1];
      if (escaped) { html += escape(escaped); index += 2; continue; }
    }
    if (source[index] === "{") {
      const group = groupAt(source, index);
      if (group) { html += latexToHtml(group.value); index = group.end; continue; }
    }
    if (source[index] === "~") { html += "&nbsp;"; index += 1; continue; }
    if (source[index] === "\n") { html += '<span class="math-line-break"></span>'; index += 1; continue; }
    html += escape(source[index]); index += 1;
  }
  return html;
}

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
  return <span contentEditable={false} title={`$${inlineContent.props.latex}$`} onDoubleClick={() => { setDraft(inlineContent.props.latex); setEditing(true); }}><LatexPreview latex={inlineContent.props.latex} /></span>;
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
      if (editing) return <textarea contentEditable={false} autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter" && event.shiftKey) { event.preventDefault(); exitFormula(); } }} spellCheck={false} rows={Math.max(3, Math.min(16, draft.split("\n").length + 1))} className="my-1 w-full resize-y bg-transparent px-1 py-2 font-mono text-sm leading-6 text-text-primary outline-none" />;
      return <button type="button" contentEditable={false} onClick={() => setEditing(true)} className="my-1 block min-h-10 w-full cursor-text bg-transparent px-1 py-2 text-center text-text-primary"><LatexPreview latex={block.props.latex} display /></button>;
    }
    return <ObsidianFormula />;
  } },
)();
