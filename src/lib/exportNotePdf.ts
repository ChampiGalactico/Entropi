import jsPDF from "jspdf";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { PdfCursor } from "./pdf/layout";
import { renderBlocksToPdf } from "./pdf/renderNoteBlocks";

const PAGE_FORMAT = "letter";
const MARGIN_X = 40;
const BAND_HEIGHT = 20;
const BAND_GAP = 10;
const BAND_COLOR: [number, number, number] = [107, 114, 128];
const TITLE_FONT_SIZE = 22;
const TITLE_LINE_HEIGHT = TITLE_FONT_SIZE * 1.22;
const TITLE_GAP_BELOW = 16;

function sanitizeFileName(title: string): string {
  const trimmed = title.trim().replace(/[\\/:*?"<>|]+/g, "-");
  return trimmed.length > 0 ? trimmed : "note";
}

function parseBlocks(json: string | null): Record<string, any>[] {
  if (!json) return [];
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as Record<string, any>[]) : [];
  } catch {
    return [];
  }
}

function drawBand(pdf: jsPDF, pageWidth: number, y: number, [left, right]: [string, string]) {
  pdf.setFillColor(...BAND_COLOR);
  pdf.setGState(new (pdf as any).GState({ opacity: 0.12 }));
  pdf.rect(0, y, pageWidth, BAND_HEIGHT, "F");
  pdf.setGState(new (pdf as any).GState({ opacity: 1 }));

  pdf.setTextColor(90, 97, 110);
  pdf.setFontSize(8.5);
  pdf.setFont("helvetica", "normal");
  const textY = y + BAND_HEIGHT / 2 + 3;
  pdf.text(left, MARGIN_X, textY);
  pdf.text(right, pageWidth - MARGIN_X, textY, { align: "right" });
}

export interface ExportNotePdfOptions {
  blocksJson: string | null;
  domRoot: HTMLElement;
  title: string;
  lastEditedLabel: string;
  brand?: string;
}

export interface ExportNotePdfResult {
  saved: boolean;
  path?: string;
}

export async function exportNoteToPdf({ blocksJson, domRoot, title, lastEditedLabel, brand = "Entropi" }: ExportNotePdfOptions): Promise<ExportNotePdfResult> {
  const theme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  const blocks = parseBlocks(blocksJson);

  const pdf = new jsPDF({ unit: "pt", format: PAGE_FORMAT });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN_X * 2;
  const contentTop = BAND_HEIGHT + BAND_GAP;
  const contentBottom = pageHeight - BAND_HEIGHT - BAND_GAP;

  // The title is native PDF text (selectable, crisp at any zoom), drawn once at the top of page 1;
  // the cursor for the note's own content starts below it.
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(TITLE_FONT_SIZE);
  const titleLines = pdf.splitTextToSize(title, contentWidth) as string[];
  const titleBlockHeight = titleLines.length * TITLE_LINE_HEIGHT + TITLE_GAP_BELOW;
  pdf.setTextColor(23, 23, 23);
  pdf.text(titleLines, MARGIN_X, contentTop + TITLE_FONT_SIZE, { lineHeightFactor: TITLE_LINE_HEIGHT / TITLE_FONT_SIZE });

  const cursor = new PdfCursor(pdf, {
    marginX: MARGIN_X,
    contentWidth,
    startY: contentTop + titleBlockHeight,
    contentBottom,
    onNewPage: (c) => {
      c.y = contentTop;
    },
  });

  await renderBlocksToPdf({ pdf, cursor, domRoot, theme }, blocks);

  // Header/footer bands are drawn in a final pass over every page now that the total page count
  // is known — content is rendered first, page count included, without a two-pass render.
  const totalPages = pdf.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    pdf.setPage(page);
    drawBand(pdf, pageWidth, 0, [title, brand]);
    drawBand(pdf, pageWidth, pageHeight - BAND_HEIGHT, [lastEditedLabel, `${page} / ${totalPages}`]);
  }

  const fileName = `${sanitizeFileName(title)}.pdf`;
  const targetPath = await save({
    title: "Guardar PDF",
    defaultPath: fileName,
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
  if (!targetPath) return { saved: false };

  const bytes = pdf.output("arraybuffer") as ArrayBuffer;
  await writeFile(targetPath, new Uint8Array(bytes));
  return { saved: true, path: targetPath };
}
