import { ensureMathJax } from "../mathJax";

// MathJax's SVG output expresses width/height/vertical-align in "ex" units. There's no exact,
// font-independent conversion to points without asking the browser to lay out real text — 0.5em
// per ex is the same approximation browsers themselves fall back to for the CSS `ex` unit, and is
// close enough for print-quality placement without needing a live DOM measurement.
const EX_TO_EM = 0.5;

function parseEx(value: string | null | undefined): number {
  if (!value) return 0;
  const match = /(-?[\d.]+)\s*ex/.exec(value);
  return match ? parseFloat(match[1]) : 0;
}

export interface RenderedLatex {
  svg: SVGSVGElement;
  /** Rendered width/height in PDF points, at the given fontSize. */
  widthPt: number;
  heightPt: number;
  /** How far the glyph extends below the text baseline, in points (0 or positive). */
  belowBaselinePt: number;
}

/** Strips the "$$…$$" / "$…$" delimiters BlockNote's own LatexPreview also strips before handing
 * a formula to MathJax — tex2svgPromise expects bare LaTeX, not delimited text. Some stored
 * formulas keep the delimiters as part of their `latex` prop, and without this MathJax renders
 * the literal "$$" characters as part of the equation instead of stripping them. */
function stripDelimiters(latex: string): string {
  const source = latex.trim() || "x";
  if (source.startsWith("$$") && source.endsWith("$$")) return source.slice(2, -2).trim() || "x";
  if (source.startsWith("$") && source.endsWith("$")) return source.slice(1, -1).trim() || "x";
  return source;
}

/** Renders a LaTeX source to SVG via MathJax and converts its intrinsic ex-based metrics to
 * points scaled to `fontSize`. Returns null if MathJax fails to load or produces no SVG. */
export async function renderLatexToSvg(latex: string, display: boolean, fontSize: number): Promise<RenderedLatex | null> {
  try {
    await ensureMathJax();
    const container = await window.MathJax?.tex2svgPromise?.(stripDelimiters(latex), { display });
    const svg = container?.querySelector("svg");
    if (!svg) return null;

    const widthEx = parseEx(svg.getAttribute("width"));
    const heightEx = parseEx(svg.getAttribute("height"));
    const styleAttr = (container as HTMLElement).getAttribute("style") ?? svg.getAttribute("style");
    const vAlignEx = parseEx(/vertical-align:\s*(-?[\d.]+ex)/.exec(styleAttr ?? "")?.[1]);

    const ptPerEx = EX_TO_EM * fontSize;
    const widthPt = Math.max(widthEx * ptPerEx, 1);
    const heightPt = Math.max(heightEx * ptPerEx, 1);
    // vAlignEx is typically <= 0 (CSS vertical-align shifts the box down when negative), i.e. how
    // far the SVG extends below the text baseline.
    const belowBaselinePt = Math.max(-vAlignEx * ptPerEx, 0);

    return { svg, widthPt, heightPt, belowBaselinePt };
  } catch {
    return null;
  }
}
