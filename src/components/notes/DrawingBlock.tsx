import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { createReactBlockSpec } from "@blocknote/react";
import { ColorPickerPopover } from "../ui";
import { SolarIcon } from "../ui/SolarIcon";

type InkColor = string;
type DrawingTool = "pen" | "eraser" | "line" | "circle" | "rectangle" | "triangle" | "axes2d" | "axes3d";
type PenStyle = "pencil" | "marker" | "fountain";
interface Point { x: number; y: number }
interface Stroke { tool?: DrawingTool; penStyle?: PenStyle; color: InkColor; width: number; points: Point[] }

const PALETTE_KEY = "entropi_drawing_palette";
const DEFAULT_PALETTE = ["#111827", "#ef4444", "#f59e0b", "#10b981", "#3b82f6"];

function parseStrokes(value: string): Stroke[] {
  if (!value) return [];
  try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? parsed as Stroke[] : []; }
  catch { return []; }
}

function loadPalette(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PALETTE_KEY) ?? "null");
    if (Array.isArray(parsed) && parsed.length >= 5 && parsed.every((color) => typeof color === "string")) return parsed.slice(0, 5);
  } catch { /* Use the defaults when an old preference is malformed. */ }
  return DEFAULT_PALETTE;
}

function DrawingCanvas({ block, editor }: { block: any; editor: any }) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>(parseStrokes(block.props.drawing));
  const drawingRef = useRef(false);
  const [color, setColor] = useState<InkColor>("accent");
  const [tool, setTool] = useState<DrawingTool>("pen");
  const [penStyle, setPenStyle] = useState<PenStyle>("pencil");
  const [penMenuOpen, setPenMenuOpen] = useState(false);
  const [shapeMenuOpen, setShapeMenuOpen] = useState(false);
  const [eraserMenuOpen, setEraserMenuOpen] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(2.5);
  const [eraserSize, setEraserSize] = useState(28);
  const [palette, setPalette] = useState<string[]>(loadPalette);
  const [activeSlot, setActiveSlot] = useState(0);
  const [, setRevision] = useState(0);

  function resolveColor(ink: InkColor) {
    if (ink.startsWith("#") || ink.startsWith("rgb") || ink.startsWith("hsl")) return ink;
    const styles = getComputedStyle(document.documentElement);
    return styles.getPropertyValue(ink === "accent" ? "--accent" : ink === "secondary" ? "--accent-secondary" : "--text-primary").trim();
  }

  function drawArrow(context: CanvasRenderingContext2D, from: Point, to: Point) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    context.moveTo(to.x, to.y);
    context.lineTo(to.x - 9 * Math.cos(angle - Math.PI / 6), to.y - 9 * Math.sin(angle - Math.PI / 6));
    context.moveTo(to.x, to.y);
    context.lineTo(to.x - 9 * Math.cos(angle + Math.PI / 6), to.y - 9 * Math.sin(angle + Math.PI / 6));
  }

  function redraw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const height = Number(block.props.height);
    if (canvas.width !== Math.round(rect.width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, rect.width, height);
    context.lineCap = "round";
    context.lineJoin = "round";

    for (const stroke of strokesRef.current) {
      if (!stroke.points.length) continue;
      const points = stroke.points.map((point) => ({ x: point.x * rect.width, y: point.y * height }));
      const first = points[0];
      const last = points[points.length - 1];
      const selectedTool = stroke.tool ?? "pen";
      context.beginPath();
      context.setLineDash([]);
      context.globalCompositeOperation = selectedTool === "eraser" ? "destination-out" : "source-over";
      context.strokeStyle = resolveColor(stroke.color);
      context.globalAlpha = selectedTool === "eraser" ? 1 : stroke.penStyle === "marker" ? 0.34 : stroke.penStyle === "pencil" ? 0.78 : 1;
      context.lineWidth = selectedTool === "eraser" ? stroke.width : stroke.width * (stroke.penStyle === "marker" ? 2.8 : stroke.penStyle === "pencil" ? 0.72 : 1);

      if (selectedTool === "eraser" || (selectedTool === "pen" && stroke.penStyle !== "fountain")) points.forEach((point, index) => { if (index === 0) context.moveTo(point.x, point.y); else context.lineTo(point.x, point.y); });
      else if (selectedTool === "pen") {
        // A fountain pen has a calligraphic nib: its width changes with direction.
        for (let index = 1; index < points.length; index += 1) {
          const previous = points[index - 1];
          const point = points[index];
          const angle = Math.atan2(point.y - previous.y, point.x - previous.x);
          context.beginPath();
          context.lineWidth = stroke.width * (0.55 + Math.abs(Math.sin(angle - Math.PI / 4)) * 1.15);
          context.moveTo(previous.x, previous.y);
          context.lineTo(point.x, point.y);
          context.stroke();
        }
        context.globalAlpha = 1;
        context.globalCompositeOperation = "source-over";
        continue;
      }
      else if (selectedTool === "line") { context.moveTo(first.x, first.y); context.lineTo(last.x, last.y); }
      else if (selectedTool === "circle") context.ellipse((first.x + last.x) / 2, (first.y + last.y) / 2, Math.abs(last.x - first.x) / 2, Math.abs(last.y - first.y) / 2, 0, 0, Math.PI * 2);
      else if (selectedTool === "rectangle") context.rect(Math.min(first.x, last.x), Math.min(first.y, last.y), Math.abs(last.x - first.x), Math.abs(last.y - first.y));
      else if (selectedTool === "triangle") { context.moveTo((first.x + last.x) / 2, first.y); context.lineTo(last.x, last.y); context.lineTo(first.x, last.y); context.closePath(); }
      else {
        const left = Math.min(first.x, last.x);
        const right = Math.max(first.x, last.x);
        const top = Math.min(first.y, last.y);
        const bottom = Math.max(first.y, last.y);
        const cx = (left + right) / 2;
        const cy = (top + bottom) / 2;

        if (selectedTool === "axes2d") {
          context.moveTo(left, cy); context.lineTo(right, cy);
          context.moveTo(cx, bottom); context.lineTo(cx, top);
          drawArrow(context, { x: cx, y: cy }, { x: right, y: cy });
          drawArrow(context, { x: cx, y: cy }, { x: cx, y: top });
        } else {
          const zPositive = { x: left + 12, y: bottom - 12 };
          const zNegative = { x: right - 12, y: top + 12 };
          context.moveTo(cx, cy); context.lineTo(right, cy);
          context.moveTo(cx, cy); context.lineTo(cx, top);
          context.moveTo(cx, cy); context.lineTo(zPositive.x, zPositive.y);
          drawArrow(context, { x: cx, y: cy }, { x: right, y: cy });
          drawArrow(context, { x: cx, y: cy }, { x: cx, y: top });
          drawArrow(context, { x: cx, y: cy }, zPositive);
          context.stroke();

          context.beginPath();
          context.setLineDash([6, 6]);
          context.moveTo(cx, cy); context.lineTo(left, cy);
          context.moveTo(cx, cy); context.lineTo(cx, bottom);
          context.moveTo(cx, cy); context.lineTo(zNegative.x, zNegative.y);
          context.stroke();
          context.setLineDash([]);
          continue;
        }
      }
      if (points.length === 1) context.lineTo(first.x + 0.01, first.y + 0.01);
      context.stroke();
      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
    }
  }

  useEffect(() => {
    strokesRef.current = parseStrokes(block.props.drawing);
    redraw();
    const observer = new ResizeObserver(redraw);
    if (canvasRef.current) observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, [block.props.drawing, block.props.height]);

  function pointFrom(event: ReactPointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
  }

  function start(event: ReactPointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    event.stopPropagation();
    setPenMenuOpen(false);
    setShapeMenuOpen(false);
    setEraserMenuOpen(false);
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    const point = pointFrom(event);
    const pressureFactor = event.pointerType === "pen" ? Math.max(0.6, event.pressure * 1.5) : 1;
    strokesRef.current.push({ tool, penStyle: tool === "pen" ? penStyle : undefined, color, width: (tool === "eraser" ? eraserSize : strokeWidth) * pressureFactor, points: tool === "pen" || tool === "eraser" ? [point] : [point, point] });
    redraw();
  }

  function move(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const current = strokesRef.current[strokesRef.current.length - 1];
    if (!current) return;
    if ((current.tool ?? "pen") === "pen" || current.tool === "eraser") current.points.push(pointFrom(event));
    else current.points[1] = pointFrom(event);
    redraw();
  }

  function finish() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    editor.updateBlock(block, { props: { drawing: JSON.stringify(strokesRef.current) } });
    setRevision((value) => value + 1);
  }

  function commit(next: Stroke[]) {
    strokesRef.current = next;
    editor.updateBlock(block, { props: { drawing: JSON.stringify(next) } });
    redraw();
    setRevision((value) => value + 1);
  }

  function resize(amount: number) {
    const height = Math.max(240, Math.min(1200, Number(block.props.height) + amount));
    editor.updateBlock(block, { props: { height } });
  }

  function updatePaletteColor(nextColor: string) {
    const next = palette.map((current, index) => index === activeSlot ? nextColor : current);
    setPalette(next);
    setColor(nextColor);
    localStorage.setItem(PALETTE_KEY, JSON.stringify(next));
  }

  return <div contentEditable={false} className="my-3 w-full min-w-0 max-w-full overflow-visible rounded-[1.5rem] border border-border bg-control shadow-card">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
      <div className="flex flex-wrap items-center gap-1">
        <div className="relative">
          <button type="button" aria-label={t("notes.drawing.tools.pen")} onClick={() => { setPenMenuOpen((open) => !open); setShapeMenuOpen(false); setEraserMenuOpen(false); }} className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${tool === "pen" ? "bg-accent text-white" : "bg-surface-hover text-text-secondary"}`}><SolarIcon name={penStyle === "marker" ? "PenNewRoundLinear" : penStyle === "fountain" ? "Pen2Linear" : "PenLinear"} size={18} /></button>
          {penMenuOpen && <div className="absolute left-0 top-11 z-30 w-60 rounded-2xl border border-border bg-elevated p-3 shadow-modal">
            <div className="grid grid-cols-3 gap-2">{(["pencil", "marker", "fountain"] as PenStyle[]).map((style) => <button key={style} type="button" onClick={() => { setPenStyle(style); setTool("pen"); setPenMenuOpen(false); }} className={`flex flex-col items-center gap-1 rounded-xl p-2 text-[10px] ${penStyle === style && tool === "pen" ? "bg-accent text-white" : "bg-control text-text-secondary hover:text-text-primary"}`}><SolarIcon name={style === "marker" ? "PenNewRoundLinear" : style === "fountain" ? "Pen2Linear" : "PenLinear"} size={19} /><span>{style === "pencil" ? "Lápiz" : style === "marker" ? "Marcador" : "Pluma"}</span></button>)}</div>
            <label className="mt-3 block text-[10px] text-text-muted">{t("notes.drawing.thickness")} · {strokeWidth.toFixed(1)}<input type="range" draggable={false} min="0.5" max="16" step="0.5" value={strokeWidth} onDragStart={(event) => event.preventDefault()} onPointerDown={(event) => event.stopPropagation()} onPointerMove={(event) => event.stopPropagation()} onPointerUp={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()} onTouchStart={(event) => event.stopPropagation()} onChange={(event) => setStrokeWidth(Number(event.target.value))} className="mt-2 block w-full touch-none cursor-pointer accent-[var(--accent)]" /></label>
          </div>}
        </div>
        <div className="relative">
          <button type="button" aria-label={t("notes.drawing.tools.eraser")} onClick={() => { setTool("eraser"); setEraserMenuOpen((open) => !open); setPenMenuOpen(false); setShapeMenuOpen(false); }} className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${tool === "eraser" ? "bg-accent text-white" : "bg-surface-hover text-text-secondary"}`}><SolarIcon name="EraserLinear" size={18} /></button>
          {eraserMenuOpen && <div className="absolute left-0 top-11 z-30 w-60 rounded-2xl border border-border bg-elevated p-3 shadow-modal"><label className="block text-[10px] text-text-muted">{t("notes.drawing.eraserSize")} · {eraserSize}<input type="range" draggable={false} min="6" max="80" step="2" value={eraserSize} onDragStart={(event) => event.preventDefault()} onPointerDown={(event) => event.stopPropagation()} onPointerMove={(event) => event.stopPropagation()} onPointerUp={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()} onTouchStart={(event) => event.stopPropagation()} onChange={(event) => setEraserSize(Number(event.target.value))} className="mt-2 block w-full touch-none cursor-pointer accent-[var(--accent)]" /></label></div>}
        </div>
        <div className="relative"><button type="button" aria-label="Figuras" onClick={() => { setShapeMenuOpen((open) => !open); setPenMenuOpen(false); setEraserMenuOpen(false); }} className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${tool !== "pen" && tool !== "eraser" ? "bg-accent text-white" : "bg-surface-hover text-text-secondary"}`}><SolarIcon name={tool === "line" ? "GraphNewLinear" : tool === "circle" ? "RecordCircleLinear" : tool === "rectangle" ? "WidgetLinear" : tool === "triangle" ? "WineglassTriangleLinear" : tool === "axes2d" ? "GraphNewLinear" : tool === "axes3d" ? "StructureLinear" : "Widget5Linear"} size={18} /></button>{shapeMenuOpen && <div className="absolute left-0 top-11 z-30 grid w-64 grid-cols-3 gap-2 rounded-2xl border border-border bg-elevated p-3 shadow-modal">{(["line", "circle", "rectangle", "triangle", "axes2d", "axes3d"] as DrawingTool[]).map((shape) => <button key={shape} type="button" onClick={() => { setTool(shape); setShapeMenuOpen(false); }} className={`rounded-xl p-2 text-[10px] ${tool === shape ? "bg-accent text-white" : "bg-control text-text-secondary hover:text-text-primary"}`}>{t(`notes.drawing.tools.${shape}`)}</button>)}</div>}</div>
        <div className="flex flex-wrap items-center gap-1">
          {palette.map((ink, index) => <button key={index} type="button" aria-label={t("notes.drawing.paletteSlot", { number: index + 1 })} onClick={() => { setActiveSlot(index); setColor(ink); }} className={`h-7 w-7 rounded-full border-2 p-0.5 transition-transform ${color === ink && activeSlot === index ? "scale-110 border-text-primary" : "border-transparent"}`}><span className="block h-full w-full rounded-full border border-border" style={{ backgroundColor: ink }} /></button>)}
          <ColorPickerPopover value={palette[activeSlot]} onChange={updatePaletteColor} />
        </div>
      </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="ml-1 text-[10px] text-text-muted">{t("notes.drawing.height")}</span><button type="button" aria-label={t("notes.drawing.makeShorter")} disabled={block.props.height <= 240} onClick={() => resize(-120)} className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-hover text-text-secondary hover:bg-elevated hover:text-text-primary disabled:opacity-40">−</button><span className="w-10 text-center text-[10px] tabular-nums text-text-muted">{block.props.height}</span><button type="button" aria-label={t("notes.drawing.makeTaller")} disabled={block.props.height >= 1200} onClick={() => resize(120)} className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-hover text-text-secondary hover:bg-elevated hover:text-text-primary disabled:opacity-40">+</button>
          <button type="button" onClick={() => commit(strokesRef.current.slice(0, -1))} className="rounded-full px-3 py-1.5 text-xs text-text-secondary hover:bg-elevated hover:text-text-primary">{t("notes.drawing.undo")}</button><button type="button" onClick={() => commit([])} className="rounded-full px-3 py-1.5 text-xs text-text-secondary hover:bg-elevated hover:text-danger">{t("notes.drawing.clear")}</button>
        </div>
    </div>
    <canvas ref={canvasRef} draggable={false} onDragStart={(event) => event.preventDefault()} style={{ display: "block", width: "100%", maxWidth: "100%", height: Number(block.props.height) }} className={`min-w-0 touch-none select-none rounded-b-[1.5rem] bg-elevated/40 ${tool === "eraser" ? "cursor-cell" : "cursor-crosshair"}`} onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} />
  </div>;
}

export const DrawingBlock = createReactBlockSpec(
  { type: "drawing", propSchema: { drawing: { default: "" }, height: { default: 480 } }, content: "none" },
  { render: (props) => <DrawingCanvas block={props.block} editor={props.editor} /> },
)();
