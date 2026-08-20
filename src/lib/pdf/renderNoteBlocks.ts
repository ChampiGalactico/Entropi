import type jsPDF from "jspdf";
import { svg2pdf } from "svg2pdf.js";
import html2canvas from "html2canvas";
import { PdfCursor, type InlineToken, type TextStyle } from "./layout";
import { renderLatexToSvg } from "./latexToSvg";
import { renderMermaid } from "../mermaidRenderer";

const BODY_FONT_SIZE = 10.5;
const HEADING_SIZES: Record<number, number> = { 1: 19, 2: 16, 3: 13.5, 4: 12, 5: 11, 6: 10.5 };
const CODE_FONT_SIZE = 9.5;
const PARAGRAPH_GAP = 6;
const BLOCK_GAP = 10;
const LIST_INDENT = 16;
const DEFAULT_TEXT_COLOR: [number, number, number] = [26, 26, 26];
const MUTED_TEXT_COLOR: [number, number, number] = [110, 110, 110];
const CODE_BG: [number, number, number] = [242, 242, 244];
const RULE_COLOR: [number, number, number] = [200, 200, 205];
// Images/diagrams/drawings are drawn as one unbreakable block (unlike paragraphs or code, they
// can't split across a page boundary), so they're capped well under a full Letter page's content
// height — anything taller is scaled down to fit, guaranteeing ensureSpace() can always find room
// for it on a fresh page instead of it being clipped mid-block by the physical page edge.
const MAX_BLOCK_HEIGHT = 560;
// Diagrams and drawings default to a page-filling size if only capped by MAX_BLOCK_HEIGHT — most
// mermaid diagrams and canvas sketches read better as a modestly-sized inline figure, not a
// full-page illustration, so they get their own smaller caps.
const MAX_DIAGRAM_WIDTH_RATIO = 0.5;
const MAX_DIAGRAM_HEIGHT = 200;
const MAX_DRAWING_WIDTH_RATIO = 0.55;
const MAX_DRAWING_HEIGHT = 220;
const DRAWING_BG: [number, number, number] = [212, 212, 216];
const DRAWING_BORDER: [number, number, number] = [163, 163, 170];
const DRAWING_PADDING = 12;

type AnyBlock = Record<string, any>;

export interface RenderNoteOptions {
  pdf: jsPDF;
  cursor: PdfCursor;
  domRoot: HTMLElement | null;
  theme: "light" | "dark";
}

function textColorFromProp(color: string | undefined): [number, number, number] | undefined {
  if (!color || color === "default") return undefined;
  // BlockNote's built-in palette resolves to CSS custom properties at runtime; a fixed best-effort
  // mapping is used here since the PDF has no access to the live --bn-colors-* values.
  const palette: Record<string, [number, number, number]> = {
    gray: [155, 154, 151], brown: [100, 71, 58], red: [212, 76, 71], orange: [217, 115, 13],
    yellow: [203, 145, 47], green: [68, 131, 97], blue: [51, 126, 169], purple: [144, 101, 176], pink: [193, 76, 138],
  };
  return palette[color] ?? undefined;
}

async function tokenizeInline(content: AnyBlock[] | undefined, baseStyle: TextStyle, fontSize: number): Promise<InlineToken[]> {
  if (!content) return [];
  const tokens: InlineToken[] = [];
  for (const item of content) {
    if (item.type === "text") {
      const style: TextStyle = {
        ...baseStyle,
        bold: baseStyle.bold || !!item.styles?.bold,
        italic: baseStyle.italic || !!item.styles?.italic,
        code: baseStyle.code || !!item.styles?.code,
        underline: baseStyle.underline || !!item.styles?.underline,
        strike: baseStyle.strike || !!item.styles?.strike,
        color: textColorFromProp(item.styles?.textColor) ?? baseStyle.color,
      };
      for (const word of String(item.text).split(/(\s+)/).filter((part) => part.length > 0)) {
        tokens.push({ kind: "text", text: word, style, fontSize });
      }
    } else if (item.type === "link") {
      const linkStyle: TextStyle = { ...baseStyle, underline: true, color: [51, 102, 204] };
      for (const inner of item.content ?? []) {
        for (const word of String(inner.text ?? "").split(/(\s+)/).filter((part) => part.length > 0)) {
          tokens.push({ kind: "text", text: word, style: linkStyle, fontSize, href: item.href });
        }
      }
    } else if (item.type === "inlineMath") {
      // eslint-disable-next-line no-await-in-loop
      const rendered = await renderLatexToSvg(item.props?.latex ?? "", false, fontSize);
      if (rendered) tokens.push({ kind: "math", ...rendered });
      tokens.push({ kind: "text", text: " ", style: baseStyle, fontSize });
    }
  }
  return tokens;
}

function plainTextFromInline(content: AnyBlock[] | undefined): string {
  if (!content) return "";
  return content
    .map((item) => (item.type === "text" ? item.text : item.type === "link" ? (item.content ?? []).map((c: AnyBlock) => c.text).join("") : ""))
    .join("");
}

async function drawHeading(opts: RenderNoteOptions, block: AnyBlock) {
  const level = Math.min(6, Math.max(1, Number(block.props?.level) || 1));
  const fontSize = HEADING_SIZES[level];
  const tokens = await tokenizeInline(block.content, { bold: true }, fontSize);
  opts.cursor.ensureSpace(fontSize * 1.6);
  await opts.cursor.writeInlineFlow(tokens);
  opts.cursor.newParagraphGap(BLOCK_GAP - PARAGRAPH_GAP);
}

async function drawParagraph(opts: RenderNoteOptions, block: AnyBlock, indentX = 0) {
  const tokens = await tokenizeInline(block.content, {}, BODY_FONT_SIZE);
  if (tokens.length === 0) {
    opts.cursor.y += BODY_FONT_SIZE * 1.4;
    return;
  }
  await opts.cursor.writeInlineFlow(tokens, indentX);
}

// jsPDF's standard (non-embedded) fonts only reliably support the ASCII range — bullet/checkbox/
// triangle Unicode glyphs (•, ☐, ☑, ▸) came out as mojibake ("&", garbled bytes) when drawn as
// text. Vector shapes sidestep font/encoding entirely and render identically everywhere.
function drawBulletMarker(opts: RenderNoteOptions, indentX: number, depth: number) {
  const cx = opts.cursor.marginX + indentX - 9;
  const cy = opts.cursor.y + BODY_FONT_SIZE * 0.42;
  const radius = 1.7;
  opts.pdf.setDrawColor(...DEFAULT_TEXT_COLOR);
  opts.pdf.setLineWidth(0.6);
  if (depth % 2 === 0) {
    opts.pdf.setFillColor(...DEFAULT_TEXT_COLOR);
    opts.pdf.circle(cx, cy, radius, "F");
  } else {
    opts.pdf.circle(cx, cy, radius, "S");
  }
}

function drawCheckboxMarker(opts: RenderNoteOptions, indentX: number, checked: boolean) {
  const size = 7.5;
  const x = opts.cursor.marginX + indentX - 13;
  const y = opts.cursor.y + 1.5;
  opts.pdf.setDrawColor(...DEFAULT_TEXT_COLOR);
  opts.pdf.setLineWidth(0.8);
  if (checked) {
    opts.pdf.setFillColor(...DEFAULT_TEXT_COLOR);
    opts.pdf.roundedRect(x, y, size, size, 1.5, 1.5, "FD");
    opts.pdf.setDrawColor(255, 255, 255);
    opts.pdf.setLineWidth(1);
    opts.pdf.line(x + size * 0.18, y + size * 0.52, x + size * 0.4, y + size * 0.76);
    opts.pdf.line(x + size * 0.4, y + size * 0.76, x + size * 0.82, y + size * 0.22);
  } else {
    opts.pdf.roundedRect(x, y, size, size, 1.5, 1.5, "S");
  }
}

function drawToggleMarker(opts: RenderNoteOptions, indentX: number) {
  const x = opts.cursor.marginX + indentX - 11;
  const cy = opts.cursor.y + BODY_FONT_SIZE * 0.5;
  opts.pdf.setFillColor(...DEFAULT_TEXT_COLOR);
  opts.pdf.triangle(x, cy - 3, x, cy + 3, x + 5, cy, "F");
}

async function drawQuote(opts: RenderNoteOptions, block: AnyBlock) {
  const tokens = await tokenizeInline(block.content, { italic: true, color: MUTED_TEXT_COLOR }, BODY_FONT_SIZE);
  const startY = opts.cursor.y;
  await opts.cursor.writeInlineFlow(tokens, LIST_INDENT);
  opts.pdf.setDrawColor(...RULE_COLOR);
  opts.pdf.setLineWidth(2);
  opts.pdf.line(opts.cursor.marginX + 3, startY, opts.cursor.marginX + 3, opts.cursor.y - 4);
}

async function drawCodeBlock(opts: RenderNoteOptions, block: AnyBlock) {
  const code = typeof block.content === "string" ? block.content : "";
  const lines = code.split("\n");
  const lineHeight = CODE_FONT_SIZE * 1.45;
  const blockHeight = lines.length * lineHeight + 16;
  opts.cursor.ensureSpace(Math.min(blockHeight, opts.cursor.contentBottom - opts.cursor.y - 4));

  let remaining = lines.slice();
  while (remaining.length > 0) {
    const availableLines = Math.max(1, Math.floor((opts.cursor.contentBottom - opts.cursor.y - 16) / lineHeight));
    const chunk = remaining.slice(0, availableLines);
    remaining = remaining.slice(availableLines);
    const chunkHeight = chunk.length * lineHeight + 16;
    opts.pdf.setFillColor(...CODE_BG);
    opts.pdf.roundedRect(opts.cursor.marginX, opts.cursor.y, opts.cursor.contentWidth, chunkHeight, 4, 4, "F");
    opts.pdf.setFont("courier", "normal");
    opts.pdf.setFontSize(CODE_FONT_SIZE);
    opts.pdf.setTextColor(...DEFAULT_TEXT_COLOR);
    let lineY = opts.cursor.y + 12 + CODE_FONT_SIZE * 0.75;
    for (const line of chunk) {
      opts.pdf.text(line, opts.cursor.marginX + 10, lineY, { maxWidth: opts.cursor.contentWidth - 20 });
      lineY += lineHeight;
    }
    opts.cursor.y += chunkHeight;
    if (remaining.length > 0) opts.cursor.newPage();
  }
}

async function drawDivider(opts: RenderNoteOptions) {
  opts.cursor.ensureSpace(16);
  opts.pdf.setDrawColor(...RULE_COLOR);
  opts.pdf.setLineWidth(0.75);
  const y = opts.cursor.y + 8;
  opts.pdf.line(opts.cursor.marginX, y, opts.cursor.marginX + opts.cursor.contentWidth, y);
  opts.cursor.y += 16;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function drawImageBlock(opts: RenderNoteOptions, block: AnyBlock) {
  const url = block.props?.url as string | undefined;
  if (!url) return;
  const img = await loadImage(url);
  if (!img || !img.naturalWidth) {
    await drawFallbackLine(opts, `[${block.type}: ${block.props?.name || url}]`);
    return;
  }
  const ratio = img.naturalHeight / img.naturalWidth;
  let width = Math.min(opts.cursor.contentWidth, img.naturalWidth);
  let height = width * ratio;
  if (height > MAX_BLOCK_HEIGHT) {
    height = MAX_BLOCK_HEIGHT;
    width = height / ratio;
  }
  opts.cursor.ensureSpace(height);
  const x = opts.cursor.marginX + (opts.cursor.contentWidth - width) / 2;
  opts.pdf.addImage(img, "PNG", x, opts.cursor.y, width, height);
  opts.cursor.y += height;
}

async function drawFallbackLine(opts: RenderNoteOptions, text: string) {
  opts.pdf.setFont("helvetica", "italic");
  opts.pdf.setFontSize(BODY_FONT_SIZE);
  opts.pdf.setTextColor(...MUTED_TEXT_COLOR);
  opts.cursor.ensureSpace(BODY_FONT_SIZE * 1.6);
  opts.pdf.text(text, opts.cursor.marginX, opts.cursor.y + BODY_FONT_SIZE);
  opts.cursor.y += BODY_FONT_SIZE * 1.6;
}

async function drawMathBlock(opts: RenderNoteOptions, block: AnyBlock) {
  const rendered = await renderLatexToSvg(block.props?.latex ?? "", true, 15);
  if (!rendered) {
    await drawFallbackLine(opts, "[formula]");
    return;
  }
  const maxWidth = opts.cursor.contentWidth * 0.85;
  const scale = rendered.widthPt > maxWidth ? maxWidth / rendered.widthPt : 1;
  const width = rendered.widthPt * scale;
  const height = rendered.heightPt * scale;
  opts.cursor.ensureSpace(height + 8);
  const x = opts.cursor.marginX + (opts.cursor.contentWidth - width) / 2;
  await svg2pdf(rendered.svg, opts.pdf, { x, y: opts.cursor.y, width, height });
  opts.cursor.y += height + 8;
}

// Mermaid renders node/edge labels for several diagram types (flowchart, class, state, gantt…)
// as <foreignObject> containing real XHTML. Two things that DON'T work for that: svg2pdf.js (a
// pure SVG-path vectorizer, draws nothing for it) and loading the SVG through a plain <img src>
// (browsers refuse to decode an "SVG as image" containing foreignObject content at all — the image
// just fails to load). html2canvas sidesteps both: it walks the actual mounted DOM node itself
// (so foreignObject's HTML is just... HTML to it) rather than asking the browser to decode an SVG
// image, which is why the diagram is temporarily mounted off-screen instead of turned into a blob.
async function rasterizeMarkup(markup: string, widthPx: number, heightPx: number, scale = 3): Promise<string> {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  container.style.width = `${widthPx}px`;
  container.style.height = `${heightPx}px`;
  container.style.background = "#ffffff";
  container.innerHTML = markup;
  document.body.appendChild(container);
  try {
    const canvas = await html2canvas(container, {
      scale,
      backgroundColor: "#ffffff",
      width: widthPx,
      height: heightPx,
      windowWidth: widthPx,
      windowHeight: heightPx,
    });
    return canvas.toDataURL("image/png");
  } finally {
    document.body.removeChild(container);
  }
}

async function drawDiagramBlock(opts: RenderNoteOptions, block: AnyBlock) {
  try {
    const markup = await renderMermaid(block.props?.code ?? "", opts.theme);
    const svg = new DOMParser().parseFromString(markup, "image/svg+xml").querySelector("svg");
    if (!svg) throw new Error("no svg");
    const viewBox = svg.getAttribute("viewBox")?.split(/\s+/).map(Number);
    const naturalWidth = viewBox?.[2] || parseFloat(svg.getAttribute("width") ?? "400") || 400;
    const naturalHeight = viewBox?.[3] || parseFloat(svg.getAttribute("height") ?? "200") || 200;
    const maxWidth = opts.cursor.contentWidth * MAX_DIAGRAM_WIDTH_RATIO;
    const scale = Math.min(maxWidth / naturalWidth, MAX_DIAGRAM_HEIGHT / naturalHeight, 1);
    const width = naturalWidth * scale;
    const height = naturalHeight * scale;
    opts.cursor.ensureSpace(height + 8);
    const x = opts.cursor.marginX + (opts.cursor.contentWidth - width) / 2;
    const dataUrl = await rasterizeMarkup(markup, naturalWidth, naturalHeight);
    opts.pdf.addImage(dataUrl, "PNG", x, opts.cursor.y, width, height);
    opts.cursor.y += height + 8;
  } catch (error) {
    await drawFallbackLine(opts, `[diagrama: ${error instanceof Error ? error.message : String(error)}]`);
  }
}

async function drawDrawingBlock(opts: RenderNoteOptions, block: AnyBlock) {
  const canvas = opts.domRoot?.querySelector<HTMLCanvasElement>(`[data-id="${block.id}"] canvas`);
  if (!canvas || canvas.width === 0) {
    await drawFallbackLine(opts, "[dibujo]");
    return;
  }
  const dataUrl = canvas.toDataURL("image/png");
  let width = opts.cursor.contentWidth * MAX_DRAWING_WIDTH_RATIO - DRAWING_PADDING * 2;
  let height = width * (canvas.height / canvas.width);
  if (height > MAX_DRAWING_HEIGHT) {
    height = MAX_DRAWING_HEIGHT;
    width = height * (canvas.width / canvas.height);
  }
  const boxWidth = width + DRAWING_PADDING * 2;
  const boxHeight = height + DRAWING_PADDING * 2;
  opts.cursor.ensureSpace(boxHeight);

  const boxX = opts.cursor.marginX + (opts.cursor.contentWidth - boxWidth) / 2;
  // The canvas itself only paints its own strokes onto a transparent background — ink colors that
  // adapt to the app's (possibly dark) theme, like a literal white pen color, would otherwise
  // vanish against the PDF's white page. A light card background, like the drawing's own on-screen
  // frame, keeps every ink color visible regardless of what theme it was drawn in.
  opts.pdf.setFillColor(...DRAWING_BG);
  opts.pdf.setDrawColor(...DRAWING_BORDER);
  opts.pdf.setLineWidth(0.75);
  opts.pdf.roundedRect(boxX, opts.cursor.y, boxWidth, boxHeight, 6, 6, "FD");
  opts.pdf.addImage(dataUrl, "PNG", boxX + DRAWING_PADDING, opts.cursor.y + DRAWING_PADDING, width, height);
  opts.cursor.y += boxHeight + 8;
}

async function drawTable(opts: RenderNoteOptions, block: AnyBlock) {
  const rows: AnyBlock[] = block.content?.rows ?? [];
  if (rows.length === 0) return;
  const columnCount = Math.max(...rows.map((row) => row.cells?.length ?? 0));
  if (columnCount === 0) return;
  const colWidth = opts.cursor.contentWidth / columnCount;
  const rowHeight = BODY_FONT_SIZE * 1.8;

  for (const row of rows) {
    opts.cursor.ensureSpace(rowHeight);
    const y = opts.cursor.y;
    opts.pdf.setDrawColor(...RULE_COLOR);
    opts.pdf.setLineWidth(0.5);
    opts.pdf.setFont("helvetica", "normal");
    opts.pdf.setFontSize(BODY_FONT_SIZE - 0.5);
    opts.pdf.setTextColor(...DEFAULT_TEXT_COLOR);
    const cells: AnyBlock[] = row.cells ?? [];
    for (let col = 0; col < columnCount; col += 1) {
      const cellX = opts.cursor.marginX + col * colWidth;
      opts.pdf.rect(cellX, y, colWidth, rowHeight);
      const cell = cells[col];
      const cellContent = Array.isArray(cell) ? cell : cell?.content;
      const text = plainTextFromInline(cellContent);
      if (text) opts.pdf.text(text, cellX + 5, y + rowHeight / 2 + 3, { maxWidth: colWidth - 10 });
    }
    opts.cursor.y += rowHeight;
  }
  opts.cursor.y += 4;
}

const LIST_MARKER_TYPES = new Set(["bulletListItem", "numberedListItem", "checkListItem", "toggleListItem"]);

async function dispatchBlock(opts: RenderNoteOptions, block: AnyBlock, depth: number, indentX: number, numberedCounters: Map<number, number>) {
  switch (block.type) {
    case "heading":
      await drawHeading(opts, block);
      break;
    case "quote":
      await drawQuote(opts, block);
      break;
    case "codeBlock":
      await drawCodeBlock(opts, block);
      break;
    case "divider":
      await drawDivider(opts);
      break;
    case "table":
      await drawTable(opts, block);
      break;
    case "image":
    case "file":
    case "video":
    case "audio":
      await drawImageBlock(opts, block);
      break;
    case "math":
      await drawMathBlock(opts, block);
      break;
    case "diagram":
      await drawDiagramBlock(opts, block);
      break;
    case "drawing":
      await drawDrawingBlock(opts, block);
      break;
    case "columns": {
      const count = Math.max(2, Math.min(4, Number(block.props?.columns) || 2));
      for (let index = 1; index <= count; index += 1) {
        let nested: AnyBlock[] = [];
        try {
          const parsed = JSON.parse(String(block.props?.[`column${index}`] ?? "[]"));
          if (Array.isArray(parsed)) nested = parsed;
        } catch { /* A malformed column should not prevent the other columns from exporting. */ }
        for (const child of nested) {
          // PDF pages use a readable stacked layout, matching the responsive single-column view.
          // eslint-disable-next-line no-await-in-loop
          await renderBlock(opts, child, depth, new Map());
        }
      }
      break;
    }
    case "bulletListItem": {
      drawBulletMarker(opts, indentX + LIST_INDENT, depth);
      await drawParagraph(opts, block, indentX + LIST_INDENT);
      break;
    }
    case "numberedListItem": {
      const n = (numberedCounters.get(depth) ?? (Number(block.props?.start) || 1) - 1) + 1;
      numberedCounters.set(depth, n);
      opts.pdf.setFont("helvetica", "normal");
      opts.pdf.setFontSize(BODY_FONT_SIZE);
      opts.pdf.setTextColor(...DEFAULT_TEXT_COLOR);
      opts.pdf.text(`${n}.`, opts.cursor.marginX + indentX + LIST_INDENT - 14, opts.cursor.y + BODY_FONT_SIZE * 0.75);
      await drawParagraph(opts, block, indentX + LIST_INDENT);
      break;
    }
    case "checkListItem": {
      drawCheckboxMarker(opts, indentX + LIST_INDENT, !!block.props?.checked);
      await drawParagraph(opts, block, indentX + LIST_INDENT);
      break;
    }
    case "toggleListItem":
      drawToggleMarker(opts, indentX + LIST_INDENT);
      await drawParagraph(opts, block, indentX + LIST_INDENT);
      break;
    case "paragraph":
    default:
      await drawParagraph(opts, block, indentX);
      break;
  }
}

export async function renderBlock(opts: RenderNoteOptions, block: AnyBlock, depth = 0, numberedCounters: Map<number, number> = new Map()) {
  const indentX = depth * LIST_INDENT;

  try {
    await dispatchBlock(opts, block, depth, indentX, numberedCounters);
  } catch (error) {
    // One malformed/unsupported block (a bad image URL, a mermaid syntax error, an exotic table
    // shape…) should never take down the whole export — fall back to a visible marker and keep
    // going, and log the real cause so it's actually diagnosable instead of a generic failure.
    console.error(`[exportNotePdf] failed to render block "${block.type}"`, error);
    await drawFallbackLine(opts, `[error al renderizar "${block.type}": ${error instanceof Error ? error.message : String(error)}]`);
  }

  opts.cursor.newParagraphGap(PARAGRAPH_GAP);

  if (Array.isArray(block.children) && block.children.length > 0) {
    const childCounters = block.type === "numberedListItem" || block.type === "bulletListItem" ? numberedCounters : new Map();
    for (const child of block.children) {
      // eslint-disable-next-line no-await-in-loop
      await renderBlock(opts, child, depth + (LIST_MARKER_TYPES.has(block.type) ? 1 : 0), childCounters);
    }
  }
}

export async function renderBlocksToPdf(opts: RenderNoteOptions, blocks: AnyBlock[]) {
  const numberedCounters = new Map<number, number>();
  let lastType: string | null = null;
  for (const block of blocks) {
    if (block.type !== "numberedListItem") numberedCounters.clear();
    lastType = block.type;
    // eslint-disable-next-line no-await-in-loop
    await renderBlock(opts, block, 0, numberedCounters);
  }
  void lastType;
}
