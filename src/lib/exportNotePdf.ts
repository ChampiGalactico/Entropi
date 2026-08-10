import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

const PAGE_FORMAT = "letter";
const MARGIN_X = 40;
const MARGIN_TOP = 34;
const MARGIN_BOTTOM = 34;
const BAND_HEIGHT = 20;
const BAND_GAP = 10;
const BAND_COLOR: [number, number, number] = [107, 114, 128];

// Elements that only make sense on-screen (editing controls) or that exist purely for the
// @media print stylesheet (see index.css) — neither belongs in the rasterized capture, since the
// header/footer bands below are drawn by jsPDF itself, with full control over every page.
const IGNORED_SELECTORS = [
  ".entropi-print-band",
  ".bn-side-menu",
  ".bn-drag-handle",
  ".entropi-drawing-toolbar",
  ".entropi-diagram-toolbar",
];

function sanitizeFileName(title: string): string {
  const trimmed = title.trim().replace(/[\\/:*?"<>|]+/g, "-");
  return trimmed.length > 0 ? trimmed : "note";
}

export interface ExportNotePdfOptions {
  element: HTMLElement;
  title: string;
  lastEditedLabel: string;
  brand?: string;
}

export async function exportNoteToPdf({ element, title, lastEditedLabel, brand = "Entropi" }: ExportNotePdfOptions): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: Math.min(2, window.devicePixelRatio || 1.5),
    useCORS: true,
    backgroundColor: "#ffffff",
    ignoreElements: (candidate) => IGNORED_SELECTORS.some((selector) => candidate.matches?.(selector)),
  });

  const pdf = new jsPDF({ unit: "pt", format: PAGE_FORMAT });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const contentWidth = pageWidth - MARGIN_X * 2;
  const contentTop = MARGIN_TOP + BAND_HEIGHT + BAND_GAP;
  const contentBottom = pageHeight - MARGIN_BOTTOM - BAND_HEIGHT - BAND_GAP;
  const contentHeightPt = contentBottom - contentTop;

  const pxToPt = contentWidth / canvas.width;
  const pageSlicePx = Math.floor(contentHeightPt / pxToPt);
  const totalPages = Math.max(1, Math.ceil(canvas.height / pageSlicePx));

  const sliceCanvas = document.createElement("canvas");
  sliceCanvas.width = canvas.width;
  const sliceCtx = sliceCanvas.getContext("2d");
  if (!sliceCtx) throw new Error("2D canvas context unavailable");

  for (let page = 0; page < totalPages; page += 1) {
    if (page > 0) pdf.addPage();

    const sliceStartPx = page * pageSlicePx;
    const sliceHeightPx = Math.min(pageSlicePx, canvas.height - sliceStartPx);
    sliceCanvas.height = sliceHeightPx;
    sliceCtx.clearRect(0, 0, sliceCanvas.width, sliceHeightPx);
    sliceCtx.drawImage(canvas, 0, sliceStartPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

    pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", MARGIN_X, contentTop, contentWidth, sliceHeightPx * pxToPt);

    drawBand(pdf, pageWidth, MARGIN_TOP, [title, brand]);
    drawBand(pdf, pageWidth, pageHeight - MARGIN_BOTTOM - BAND_HEIGHT, [lastEditedLabel, `${page + 1} / ${totalPages}`]);
  }

  pdf.save(`${sanitizeFileName(title)}.pdf`);
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
