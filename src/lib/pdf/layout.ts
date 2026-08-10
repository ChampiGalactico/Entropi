import type jsPDF from "jspdf";
import { svg2pdf } from "svg2pdf.js";

// Helvetica's built-in font metrics (ascent/descent as a fraction of font size) — jsPDF's default
// font, no embedded metrics API exposed, so these are the standard Adobe AFM values for Helvetica.
const ASCENT_RATIO = 0.718;
const DESCENT_RATIO = 0.207;
const LINE_SPACING = 1.32;

export interface TextStyle {
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: [number, number, number];
}

export interface TextToken {
  kind: "text";
  text: string;
  style: TextStyle;
  fontSize: number;
  href?: string;
}

export interface MathToken {
  kind: "math";
  svg: SVGSVGElement;
  widthPt: number;
  heightPt: number;
  belowBaselinePt: number;
}

export type InlineToken = TextToken | MathToken;

function fontNameFor(style: TextStyle): string {
  return style.code ? "courier" : "helvetica";
}

function fontStyleFor(style: TextStyle): string {
  if (style.bold && style.italic) return "bolditalic";
  if (style.bold) return "bold";
  if (style.italic) return "italic";
  return "normal";
}

function applyTextStyle(pdf: jsPDF, style: TextStyle, fontSize: number) {
  pdf.setFont(fontNameFor(style), fontStyleFor(style));
  pdf.setFontSize(fontSize);
  pdf.setTextColor(...(style.color ?? [26, 26, 26]));
}

export function measureTextToken(pdf: jsPDF, text: string, style: TextStyle, fontSize: number): number {
  applyTextStyle(pdf, style, fontSize);
  return pdf.getTextWidth(text);
}

/** Tracks page position and flushes wrapped lines of mixed text/inline-math tokens, adding pages
 * (and re-drawing the header/footer bands via onNewPage) whenever content runs out of room. */
export class PdfCursor {
  pdf: jsPDF;
  marginX: number;
  contentWidth: number;
  contentBottom: number;
  x: number;
  y: number;
  page = 0;
  private onNewPage: (cursor: PdfCursor) => void;

  constructor(pdf: jsPDF, opts: { marginX: number; contentWidth: number; startY: number; contentBottom: number; onNewPage: (cursor: PdfCursor) => void }) {
    this.pdf = pdf;
    this.marginX = opts.marginX;
    this.contentWidth = opts.contentWidth;
    this.contentBottom = opts.contentBottom;
    this.x = opts.marginX;
    this.y = opts.startY;
    this.onNewPage = opts.onNewPage;
  }

  /** Ensures at least `height` points remain before the footer band; adds a page otherwise. */
  ensureSpace(height: number) {
    if (this.y + height > this.contentBottom) this.newPage();
  }

  newPage() {
    this.pdf.addPage();
    this.page += 1;
    this.x = this.marginX;
    this.onNewPage(this);
  }

  newParagraphGap(gap: number) {
    this.y += gap;
    this.x = this.marginX;
  }

  /** Wraps and draws a run of tokens starting at the current x/y, indented by `indentX` from the
   * page margin, wrapping within `indentX`..contentWidth. Advances y past the last line. */
  async writeInlineFlow(tokens: InlineToken[], indentX = 0) {
    const startX = this.marginX + indentX;
    const availableWidth = this.contentWidth - indentX;
    this.x = startX;

    let line: { token: InlineToken; width: number }[] = [];
    let lineWidth = 0;

    const flush = async (isLast: boolean) => {
      if (line.length === 0) {
        if (!isLast) this.y += 12 * LINE_SPACING;
        return;
      }
      let ascent = 0;
      let descent = 0;
      for (const { token } of line) {
        if (token.kind === "text") {
          ascent = Math.max(ascent, token.fontSize * ASCENT_RATIO);
          descent = Math.max(descent, token.fontSize * DESCENT_RATIO);
        } else {
          ascent = Math.max(ascent, token.heightPt - token.belowBaselinePt);
          descent = Math.max(descent, token.belowBaselinePt);
        }
      }
      const lineHeight = (ascent + descent) * LINE_SPACING;
      this.ensureSpace(lineHeight);
      const baselineY = this.y + ascent;

      let cursorX = startX;
      for (const { token, width } of line) {
        if (token.kind === "text") {
          applyTextStyle(this.pdf, token.style, token.fontSize);
          if (token.href) {
            this.pdf.textWithLink(token.text, cursorX, baselineY, { url: token.href });
          } else {
            this.pdf.text(token.text, cursorX, baselineY);
          }
          if (token.style.underline || token.style.strike) {
            const lineY = token.style.strike ? baselineY - token.fontSize * 0.3 : baselineY + 1.5;
            this.pdf.setDrawColor(...(token.style.color ?? [26, 26, 26]));
            this.pdf.setLineWidth(0.5);
            this.pdf.line(cursorX, lineY, cursorX + width, lineY);
          }
        } else {
          const topY = baselineY - (token.heightPt - token.belowBaselinePt);
          // eslint-disable-next-line no-await-in-loop
          await svg2pdf(token.svg, this.pdf, { x: cursorX, y: topY, width: token.widthPt, height: token.heightPt });
        }
        cursorX += width;
      }
      this.y += lineHeight;
      this.x = startX;
    };

    for (const token of tokens) {
      const width = token.kind === "text" ? measureTextToken(this.pdf, token.text, token.style, token.fontSize) : token.widthPt;
      if (lineWidth + width > availableWidth && line.length > 0) {
        // eslint-disable-next-line no-await-in-loop
        await flush(false);
        line = [];
        lineWidth = 0;
      }
      line.push({ token, width });
      lineWidth += width;
    }
    await flush(true);
  }
}
