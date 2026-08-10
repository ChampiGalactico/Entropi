import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { LatexPreview } from "./MathBlocks";
import { renderMermaid } from "../../lib/mermaidRenderer";
import { useTheme } from "../../hooks/useTheme";
import { Modal, Tabs, notify, SolarIcon } from "../ui";

type HelpTab = "basic" | "latex" | "mermaid";

const MERMAID_DOCS_URL = "https://mermaid.js.org/intro/syntax-reference.html";
const MATHJAX_DOCS_URL = "https://docs.mathjax.org/en/latest/input/tex/macros/index.html";

function DocLink({ url, label }: { url: string; label: string }) {
  return (
    <button
      type="button"
      onClick={() => void openUrl(url)}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
    >
      <SolarIcon name="GlobalLinear" size={14} />
      {label}
    </button>
  );
}

async function copyToClipboard(text: string, onSuccess: () => void, onError: () => void) {
  try {
    await navigator.clipboard.writeText(text);
    onSuccess();
  } catch {
    onError();
  }
}

function CopyCard({ code, children }: { code: string; children?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      title={t("notes.help.copyHint")}
      onClick={() => void copyToClipboard(code, () => notify.success(t("notes.help.copied")), () => notify.error(t("notes.help.copyError")))}
      className="group block w-full overflow-hidden rounded-xl border border-border bg-surface-hover/70 text-left transition-colors hover:border-accent"
    >
      {children && <div className="min-h-12 overflow-x-auto border-b border-border px-3 py-2 text-center">{children}</div>}
      <div className="relative">
        <code className="block overflow-x-auto whitespace-pre px-3 py-2 pr-8 font-mono text-[11px] leading-relaxed text-text-secondary">{code}</code>
        <SolarIcon name="CopyLinear" size={13} className="pointer-events-none absolute right-2 top-2 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </button>
  );
}

function LatexExample({ latex }: { latex: string }) {
  return <CopyCard code={latex}><LatexPreview latex={latex} display={latex.includes("\\begin") || latex.includes("\n")} /></CopyCard>;
}

function MermaidExample({ code }: { code: string }) {
  const { mode } = useTheme();
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setSvg(null);
    setError(false);
    renderMermaid(code, mode === "dark" ? "dark" : "light")
      .then((markup) => { if (active) setSvg(markup); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [code, mode]);

  return <CopyCard code={code}>
    {error ? <p className="text-xs text-danger">{"\u26a0"}</p> : <div className="[&_svg]:mx-auto [&_svg]:max-h-40 [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg ?? "" }} />}
  </CopyCard>;
}

function Section({ title, description, children, wide = false }: { title: string; description?: string; children: ReactNode; wide?: boolean }) {
  return <section className={`rounded-2xl bg-control p-4 ${wide ? "lg:col-span-2" : ""}`}>
    <h3 className="font-semibold text-text-primary">{title}</h3>
    {description && <p className="mb-3 mt-1 text-xs leading-relaxed text-text-muted">{description}</p>}
    <div className={description ? "" : "mt-3"}>{children}</div>
  </section>;
}

const BLOCK_SHORTCUTS = [
  { shortcut: "# ", key: "heading1" },
  { shortcut: "## ", key: "heading2" },
  { shortcut: "### ", key: "heading3" },
  { shortcut: "- ", key: "bulletList" },
  { shortcut: "1. ", key: "numberedList" },
  { shortcut: "[] ", key: "checklist" },
  { shortcut: "> ", key: "quote" },
  { shortcut: "```", key: "codeBlock" },
  { shortcut: "---", key: "divider" },
] as const;

const MERMAID_EXAMPLES = [
  { key: "flowchart", code: "flowchart TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Do this]\n    B -->|No| D[Do that]" },
  { key: "flowchartLR", code: "flowchart LR\n    A[Inicio] --> B{¿Cumple?}\n    B -->|Sí| C[Continuar]\n    B -->|No| D[Corregir]\n    D --> A" },
  { key: "sequence", code: "sequenceDiagram\n    participant A as Alice\n    participant B as Bob\n    A->>B: Hello Bob!\n    B-->>A: Hi Alice!\n    A-)B: See you later!" },
  { key: "classDiagram", code: "classDiagram\n    class Animal {\n      +String name\n      +makeSound()\n    }\n    Animal <|-- Dog\n    Animal <|-- Cat\n    Animal *-- Heart" },
  { key: "erDiagram", code: "erDiagram\n    UNIVERSIDAD ||--o{ RECURSO : posee\n    RECURSO ||--o{ EJEMPLAR : tiene\n    EJEMPLAR }o--|| PRESTAMO : genera\n    USUARIO ||--o{ PRESTAMO : realiza" },
  { key: "state", code: "stateDiagram-v2\n    [*] --> Idle\n    Idle --> Running: start\n    Running --> Paused: pause\n    Paused --> Running: resume\n    Running --> [*]: stop" },
  { key: "gantt", code: "gantt\n    title Project plan\n    dateFormat YYYY-MM-DD\n    section Phase 1\n    Task A :a1, 2024-01-01, 5d\n    Task B :after a1, 3d" },
  { key: "pie", code: "pie title Distribución\n    \"Estudio\" : 45\n    \"Trabajo\" : 35\n    \"Ocio\" : 20" },
] as const;

const MERMAID_SYNTAX_NOTES = [
  { key: "flowchartShapes", code: "A[Rectángulo]\nB(Bordes redondeados)\nC{Rombo / decisión}\nD((Círculo))" },
  { key: "flowchartArrows", code: "A --> B\nA -.-> B\nA ==> B\nA -->|etiqueta| B" },
  { key: "classRelations", code: "A <|-- B  %% herencia\nA *-- B   %% composición\nA o-- B   %% agregación\nA --> B   %% asociación" },
] as const;

function BasicTab() {
  const { t } = useTranslation();
  return <div className="grid gap-4 lg:grid-cols-2">
    <Section title={t("notes.help.basic.intro.title")} description={t("notes.help.basic.intro.description")} wide>
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs text-text-secondary">
        <code className="font-mono text-accent">/</code><span>{t("notes.help.libraryCommand")}</span>
        <code className="font-mono text-accent">/formula</code><span>{t("notes.help.formulaCommand")}</span>
        <code className="font-mono text-accent">/canvas</code><span>{t("notes.help.canvasCommand")}</span>
        <code className="font-mono text-accent">/diagrama</code><span>{t("notes.help.basic.diagramCommand")}</span>
      </div>
    </Section>

    <Section title={t("notes.help.basic.blocksTitle")} description={t("notes.help.basic.blocksDescription")} wide>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {BLOCK_SHORTCUTS.map(({ shortcut, key }) => (
          <div key={key} className="rounded-xl border border-border bg-surface-hover/70 p-3">
            <p className="text-xs font-semibold text-text-primary">{t(`notes.help.basic.blocks.${key}.title`)}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-text-muted">{t(`notes.help.basic.blocks.${key}.description`)}</p>
            <code className="mt-2 inline-block rounded-md border border-border bg-elevated px-2 py-1 font-mono text-accent-secondary">{shortcut}</code>
          </div>
        ))}
      </div>
    </Section>

    <Section title={t("notes.help.formattingTitle")} description={t("notes.help.formattingDescription")} wide>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface-hover/70 p-3"><p className="text-xs font-semibold text-text-primary">{t("notes.help.emphasisTitle")}</p><p className="mt-2 text-sm"><strong>Bold</strong> · <em>Italic</em> · <u className="decoration-accent underline-offset-4">Underline</u> · <s>Strike</s></p></div>
        <div className="rounded-xl border border-border bg-surface-hover/70 p-3"><p className="text-xs font-semibold text-text-primary">{t("notes.help.colorTitle")}</p><p className="mt-2 text-xs leading-relaxed text-text-muted">{t("notes.help.colorDescription")}</p></div>
        <div className="rounded-xl border border-border bg-surface-hover/70 p-3"><p className="text-xs font-semibold text-text-primary">{t("notes.help.inlineCodeTitle")}</p><p className="mt-2 text-xs leading-relaxed text-text-muted">{t("notes.help.inlineCodeDescription")}</p><code className="mt-2 inline-block rounded-md border border-border bg-elevated px-2 py-1 font-mono text-accent-secondary">const x = 42</code></div>
      </div>
    </Section>

    <Section title={t("notes.help.shortcutsTitle")} wide>
      <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
        <span className="flex items-center gap-2"><kbd className="rounded-md border border-border bg-surface-hover px-2 py-1 font-mono">Ctrl + S</kbd>{t("notes.help.saveShortcut")}</span>
        <span className="flex items-center gap-2"><kbd className="rounded-md border border-border bg-surface-hover px-2 py-1 font-mono">{t("notes.help.doubleClick")}</kbd>{t("notes.help.editInline")}</span>
      </div>
    </Section>
  </div>;
}

function LatexTab() {
  const { t } = useTranslation();
  return <div className="grid gap-4 lg:grid-cols-2">
    <div className="lg:col-span-2 rounded-2xl bg-[color-mix(in_srgb,var(--accent)_9%,transparent)] p-4 text-sm leading-relaxed text-text-secondary">
      <p>{t("notes.help.blockHint")}</p>
      <p className="mt-2 text-xs text-text-muted">{t("notes.help.copyHint")}</p>
      <div className="mt-3"><DocLink url={MATHJAX_DOCS_URL} label={t("notes.help.docsLink")} /></div>
    </div>

    <Section title={t("notes.help.startTitle")} description={t("notes.help.startDescription")}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{t("notes.help.inlineLabel")}</p><LatexExample latex={"$E = mc^2$"} /></div>
        <div><p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{t("notes.help.blockLabel")}</p><LatexExample latex={"\\begin{equation}\nE = mc^2\n\\end{equation}"} /></div>
      </div>
    </Section>

    <Section title={t("notes.help.structureTitle")} description={t("notes.help.structureDescription")}>
      <div className="grid gap-2 sm:grid-cols-2">
        <LatexExample latex={"\\frac{a+b}{c-d}"} />
        <LatexExample latex={"\\sqrt[n]{x} + \\sqrt{x^2+y^2}"} />
        <LatexExample latex={"x^{n+1} + a_{ij}"} />
        <LatexExample latex={"\\left( \\frac{x}{y} \\right)"} />
        <LatexExample latex={"\\binom{n}{k}"} />
        <LatexExample latex={"\\boxed{F = ma}"} />
      </div>
    </Section>

    <Section title={t("notes.help.calculusTitle")} description={t("notes.help.calculusDescription")} wide>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        <LatexExample latex={"\\frac{dy}{dx} = \\frac{d}{dx} f(x)"} />
        <LatexExample latex={"\\frac{\\partial f}{\\partial x} + \\frac{\\partial f}{\\partial y}"} />
        <LatexExample latex={"\\int_{a}^{b} f(x)\\,dx \\quad \\iint_{D} f(x,y)\\,dA"} />
        <LatexExample latex={"\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1"} />
        <LatexExample latex={"\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}"} />
      </div>
    </Section>

    <Section title={t("notes.help.linearAlgebraTitle")} description={t("notes.help.linearAlgebraDescription")} wide>
      <div className="grid gap-2 md:grid-cols-2">
        <LatexExample latex={"\\vec{v} = \\begin{pmatrix} v_x \\\\ v_y \\\\ v_z \\end{pmatrix}"} />
        <LatexExample latex={"\\begin{matrix} 1 & 2 & 3 \\\\ a & b & c \\end{matrix}"} />
        <LatexExample latex={"\\begin{pmatrix} 1 & 2 & 3 \\\\ a & b & c \\end{pmatrix}"} />
        <LatexExample latex={"A = \\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}"} />
        <LatexExample latex={"\\begin{Bmatrix} 1 & 2 & 3 \\\\ a & b & c \\end{Bmatrix}"} />
        <LatexExample latex={"\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix} = ad-bc"} />
        <LatexExample latex={"\\begin{Vmatrix} 1 & 2 & 3 \\\\ a & b & c \\end{Vmatrix}"} />
        <LatexExample latex={"\\left\\langle \\begin{matrix} 1 & 2 & 3 \\\\ a & b & c \\end{matrix} \\right|"} />
        <LatexExample latex={"\\left\\langle \\begin{matrix} 1 & 2 & 3 \\\\ a & b & c \\end{matrix} \\right\\rangle"} />
        <LatexExample latex={"\\mathbf{A}\\vec{x} = \\vec{b}"} />
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-text-muted">{t("notes.help.matrixTypes")}</p>
    </Section>

    <Section title={t("notes.help.vectorNotationTitle")} description={t("notes.help.vectorNotationDescription")} wide>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        <LatexExample latex={"\\lVert \\vec{v} \\rVert = \\sqrt{v_x^2 + v_y^2 + v_z^2}"} />
        <LatexExample latex={"\\|\\vec{v}\\|_2"} />
        <LatexExample latex={"\\langle a, b \\rangle = \\sum_{i} a_i b_i"} />
        <LatexExample latex={"\\vec{a} \\cdot \\vec{b} = \\|\\vec{a}\\|\\,\\|\\vec{b}\\|\\cos\\theta"} />
        <LatexExample latex={"\\vec{a} \\times \\vec{b}"} />
        <LatexExample latex={"\\hat{u} = \\frac{\\vec{v}}{\\|\\vec{v}\\|}"} />
      </div>
    </Section>

    <Section title={t("notes.help.alignmentTitle")} description={t("notes.help.alignmentDescription")} wide>
      <div className="grid gap-3 lg:grid-cols-2">
        <LatexExample latex={"\\begin{aligned}\nF &= ma \\\\nE &= mc^2 \\\\np &= mv\n\\end{aligned}"} />
        <LatexExample latex={"f(x) = \\begin{cases}\nx^2 & x \\ge 0 \\\\n-x & x < 0\n\\end{cases}"} />
        <LatexExample latex={"\\left\\{\\begin{aligned}\n2x + y &= 5 \\\\nx - y &= 1\n\\end{aligned}\\right."} />
        <LatexExample latex={"\\left[\\begin{array}{cc|c}\n2 & 1 & 5 \\\\n1 & -1 & 1\n\\end{array}\\right]"} />
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-text-muted">{t("notes.help.alignmentMarkers")} {t("notes.help.systemHint")}</p>
    </Section>

    <Section title={t("notes.help.textSpacingTitle")} description={t("notes.help.textSpacingDescription")}>
      <div className="grid gap-2">
        <LatexExample latex={"v = 20\\,\\mathrm{m}\\!/\\mathrm{s}"} />
        <LatexExample latex={"x = 0 \\quad \\text{si} \\quad t < 0"} />
        <LatexExample latex={"a\\,b \\; c \\quad d \\qquad e"} />
        <LatexExample latex={"\\operatorname{sen}(x) + \\operatorname{det}(A)"} />
      </div>
      <p className="mt-2 text-[11px] text-text-muted"><code>\,</code> · <code>\:</code> · <code>\;</code> · <code>\quad</code> · <code>\qquad</code> · <code>\!</code></p>
    </Section>

    <Section title={t("notes.help.symbolsTitle")} description={t("notes.help.symbolsDescription")}>
      <div className="space-y-2">
        <LatexExample latex={"\\alpha \\beta \\gamma \\theta \\lambda \\mu \\pi \\sigma \\phi \\omega"} />
        <LatexExample latex={"\\Gamma \\Delta \\Theta \\Lambda \\Xi \\Pi \\Sigma \\Phi \\Psi \\Omega"} />
        <LatexExample latex={"\\le \\ge \\neq \\approx \\equiv \\propto \\infty"} />
        <LatexExample latex={"\\in \\notin \\subset \\subseteq \\cup \\cap \\emptyset"} />
        <LatexExample latex={"\\to \\Rightarrow \\Leftrightarrow \\forall \\exists \\nabla"} />
      </div>
    </Section>
  </div>;
}

function MermaidTab() {
  const { t } = useTranslation();
  return <div className="grid gap-4 lg:grid-cols-2">
    <div className="lg:col-span-2 rounded-2xl bg-[color-mix(in_srgb,var(--accent)_9%,transparent)] p-4 text-sm leading-relaxed text-text-secondary">
      <p>{t("notes.help.mermaid.intro")}</p>
      <p className="mt-2 text-xs text-text-muted">{t("notes.help.copyHint")}</p>
      <div className="mt-3"><DocLink url={MERMAID_DOCS_URL} label={t("notes.help.docsLink")} /></div>
    </div>

    {MERMAID_EXAMPLES.map(({ key, code }) => (
      <Section key={key} title={t(`notes.help.mermaid.${key}.title`)} description={t(`notes.help.mermaid.${key}.description`)}>
        <MermaidExample code={code} />
      </Section>
    ))}

    <Section title={t("notes.help.mermaid.syntaxTitle")} description={t("notes.help.mermaid.syntaxDescription")} wide>
      <div className="grid gap-2 md:grid-cols-3">
        {MERMAID_SYNTAX_NOTES.map(({ key, code }) => (
          <div key={key}>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{t(`notes.help.mermaid.notes.${key}`)}</p>
            <CopyCard code={code} />
          </div>
        ))}
      </div>
    </Section>
  </div>;
}

export function NoteHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<HelpTab>("basic");

  return <Modal open={open} onClose={onClose} title={t("notes.help.title")} maxWidthClass="max-w-6xl">
    <div className="mb-5 flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-text-secondary">{t("notes.help.intro")}</p>
      <Tabs
        tabs={[
          { id: "basic", label: t("notes.help.tabs.basic") },
          { id: "latex", label: t("notes.help.tabs.latex") },
          { id: "mermaid", label: t("notes.help.tabs.mermaid") },
        ]}
        activeId={tab}
        onChange={(id) => setTab(id as HelpTab)}
      />
    </div>

    {tab === "basic" && <BasicTab />}
    {tab === "latex" && <LatexTab />}
    {tab === "mermaid" && <MermaidTab />}
  </Modal>;
}
