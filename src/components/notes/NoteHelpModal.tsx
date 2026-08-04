import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { LatexPreview } from "./MathBlocks";
import { Modal } from "../ui/Modal";

function Example({ latex, preview = true }: { latex: string; preview?: boolean }) {
  return <div className="overflow-hidden rounded-xl border border-border bg-surface-hover/70">
    {preview && <div className="min-h-12 overflow-x-auto border-b border-border px-3 py-2 text-center"><LatexPreview latex={latex} display={latex.includes("\\begin") || latex.includes("\n")} /></div>}
    <code className="block overflow-x-auto whitespace-pre px-3 py-2 font-mono text-[11px] leading-relaxed text-text-secondary">{latex}</code>
  </div>;
}

function Section({ title, description, children, wide = false }: { title: string; description?: string; children: ReactNode; wide?: boolean }) {
  return <section className={`rounded-2xl bg-control p-4 ${wide ? "lg:col-span-2" : ""}`}>
    <h3 className="font-semibold text-text-primary">{title}</h3>
    {description && <p className="mb-3 mt-1 text-xs leading-relaxed text-text-muted">{description}</p>}
    <div className={description ? "" : "mt-3"}>{children}</div>
  </section>;
}

export function NoteHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  return <Modal open={open} onClose={onClose} title={t("notes.help.title")} maxWidthClass="max-w-6xl">
    <div className="mb-5 rounded-2xl bg-[color-mix(in_srgb,var(--accent)_9%,transparent)] p-4 text-sm leading-relaxed text-text-secondary">
      <p>{t("notes.help.intro")}</p>
      <p className="mt-2 text-xs text-text-muted">{t("notes.help.blockHint")}</p>
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <Section title={t("notes.help.formattingTitle")} description={t("notes.help.formattingDescription")} wide>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface-hover/70 p-3"><p className="text-xs font-semibold text-text-primary">{t("notes.help.emphasisTitle")}</p><p className="mt-2 text-sm"><strong>Bold</strong> · <em>Italic</em> · <u className="decoration-accent underline-offset-4">Underline</u> · <s>Strike</s></p></div>
          <div className="rounded-xl border border-border bg-surface-hover/70 p-3"><p className="text-xs font-semibold text-text-primary">{t("notes.help.colorTitle")}</p><p className="mt-2 text-xs leading-relaxed text-text-muted">{t("notes.help.colorDescription")}</p></div>
          <div className="rounded-xl border border-border bg-surface-hover/70 p-3"><p className="text-xs font-semibold text-text-primary">{t("notes.help.inlineCodeTitle")}</p><p className="mt-2 text-xs leading-relaxed text-text-muted">{t("notes.help.inlineCodeDescription")}</p><code className="mt-2 inline-block rounded-md border border-border bg-elevated px-2 py-1 font-mono text-accent-secondary">const x = 42</code></div>
        </div>
      </Section>

      <Section title={t("notes.help.startTitle")} description={t("notes.help.startDescription")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{t("notes.help.inlineLabel")}</p><Example latex={"$E = mc^2$"} /></div>
          <div><p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{t("notes.help.blockLabel")}</p><Example latex={"\\begin{equation}\nE = mc^2\n\\end{equation}"} /></div>
        </div>
        <div className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs text-text-secondary">
          <code className="font-mono text-accent">/formula</code><span>{t("notes.help.formulaCommand")}</span>
          <code className="font-mono text-accent">/canvas</code><span>{t("notes.help.canvasCommand")}</span>
          <code className="font-mono text-accent">/</code><span>{t("notes.help.libraryCommand")}</span>
        </div>
      </Section>

      <Section title={t("notes.help.structureTitle")} description={t("notes.help.structureDescription")}>
        <div className="grid gap-2 sm:grid-cols-2">
          <Example latex={"\\frac{a+b}{c-d}"} />
          <Example latex={"\\sqrt[n]{x} + \\sqrt{x^2+y^2}"} />
          <Example latex={"x^{n+1} + a_{ij}"} />
          <Example latex={"\\left( \\frac{x}{y} \\right)"} />
          <Example latex={"\\binom{n}{k}"} />
          <Example latex={"\\boxed{F = ma}"} />
        </div>
      </Section>

      <Section title={t("notes.help.calculusTitle")} description={t("notes.help.calculusDescription")} wide>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          <Example latex={"\\frac{dy}{dx} = \\frac{d}{dx} f(x)"} />
          <Example latex={"\\frac{\\partial f}{\\partial x} + \\frac{\\partial f}{\\partial y}"} />
          <Example latex={"\\int_{a}^{b} f(x)\\,dx \\quad \\iint_{D} f(x,y)\\,dA"} />
          <Example latex={"\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1"} />
          <Example latex={"\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}"} />
        </div>
      </Section>

      <Section title={t("notes.help.linearAlgebraTitle")} description={t("notes.help.linearAlgebraDescription")} wide>
        <div className="grid gap-2 md:grid-cols-2">
          <Example latex={"\\vec{v} = \\begin{pmatrix} v_x \\\\ v_y \\\\ v_z \\end{pmatrix}"} />
          <Example latex={"\\begin{matrix} 1 & 2 & 3 \\\\ a & b & c \\end{matrix}"} />
          <Example latex={"\\begin{pmatrix} 1 & 2 & 3 \\\\ a & b & c \\end{pmatrix}"} />
          <Example latex={"A = \\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}"} />
          <Example latex={"\\begin{Bmatrix} 1 & 2 & 3 \\\\ a & b & c \\end{Bmatrix}"} />
          <Example latex={"\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix} = ad-bc"} />
          <Example latex={"\\begin{Vmatrix} 1 & 2 & 3 \\\\ a & b & c \\end{Vmatrix}"} />
          <Example latex={"\\left\\langle \\begin{matrix} 1 & 2 & 3 \\\\ a & b & c \\end{matrix} \\right|"} />
          <Example latex={"\\left\\langle \\begin{matrix} 1 & 2 & 3 \\\\ a & b & c \\end{matrix} \\right\\rangle"} />
          <Example latex={"\\mathbf{A}\\vec{x} = \\vec{b}"} />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-text-muted">{t("notes.help.matrixTypes")}</p>
      </Section>

      <Section title={t("notes.help.alignmentTitle")} description={t("notes.help.alignmentDescription")} wide>
        <div className="grid gap-3 lg:grid-cols-2">
          <Example latex={"\\begin{aligned}\nF &= ma \\\\nE &= mc^2 \\\\np &= mv\n\\end{aligned}"} />
          <Example latex={"f(x) = \\begin{cases}\nx^2 & x \\ge 0 \\\\n-x & x < 0\n\\end{cases}"} />
          <Example latex={"\\left\\{\\begin{aligned}\n2x + y &= 5 \\\\nx - y &= 1\n\\end{aligned}\\right."} />
          <Example latex={"\\left[\\begin{array}{cc|c}\n2 & 1 & 5 \\\\n1 & -1 & 1\n\\end{array}\\right]"} />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-text-muted">{t("notes.help.alignmentMarkers")} {t("notes.help.systemHint")}</p>
      </Section>

      <Section title={t("notes.help.textSpacingTitle")} description={t("notes.help.textSpacingDescription")}>
        <div className="grid gap-2">
          <Example latex={"v = 20\\,\\mathrm{m}\\!/\\mathrm{s}"} />
          <Example latex={"x = 0 \\quad \\text{si} \\quad t < 0"} />
          <Example latex={"a\\,b \\; c \\quad d \\qquad e"} />
          <Example latex={"\\operatorname{sen}(x) + \\operatorname{det}(A)"} />
        </div>
        <p className="mt-2 text-[11px] text-text-muted"><code>\,</code> · <code>\:</code> · <code>\;</code> · <code>\quad</code> · <code>\qquad</code> · <code>\!</code></p>
      </Section>

      <Section title={t("notes.help.symbolsTitle")} description={t("notes.help.symbolsDescription")}>
        <div className="space-y-2">
          <Example latex={"\\alpha \\beta \\gamma \\theta \\lambda \\mu \\pi \\sigma \\phi \\omega"} />
          <Example latex={"\\le \\ge \\neq \\approx \\equiv \\propto \\infty"} />
          <Example latex={"\\in \\notin \\subset \\subseteq \\cup \\cap \\emptyset"} />
          <Example latex={"\\to \\Rightarrow \\Leftrightarrow \\forall \\exists \\nabla"} />
        </div>
      </Section>

      <Section title={t("notes.help.shortcutsTitle")} wide>
        <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
          <span className="flex items-center gap-2"><kbd className="rounded-md border border-border bg-surface-hover px-2 py-1 font-mono">Ctrl + S</kbd>{t("notes.help.saveShortcut")}</span>
          <span className="flex items-center gap-2"><kbd className="rounded-md border border-border bg-surface-hover px-2 py-1 font-mono">{t("notes.help.doubleClick")}</kbd>{t("notes.help.editInline")}</span>
        </div>
      </Section>
    </div>
  </Modal>;
}
