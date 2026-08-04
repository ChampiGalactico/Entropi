import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { createReactBlockSpec } from "@blocknote/react";

type InkColor = "accent" | "secondary" | "text";
type DrawingTool = "pen" | "line" | "circle" | "rectangle" | "triangle" | "axes2d" | "axes3d";
interface Point { x: number; y: number }
interface Stroke { tool?: DrawingTool; color: InkColor; width: number; points: Point[] }

function parseStrokes(value: string): Stroke[] {
  if (!value) return [];
  try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? parsed as Stroke[] : []; }
  catch { return []; }
}

function DrawingCanvas({ block, editor }: { block: any; editor: any }) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>(parseStrokes(block.props.drawing));
  const drawingRef = useRef(false);
  const [color, setColor] = useState<InkColor>("accent");
  const [tool, setTool] = useState<DrawingTool>("pen");
  const [, setRevision] = useState(0);

  function resolveColor(ink: InkColor) {
    const styles = getComputedStyle(document.documentElement);
    return styles.getPropertyValue(ink === "accent" ? "--accent" : ink === "secondary" ? "--accent-secondary" : "--text-primary").trim();
  }

  function redraw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(rect.width * ratio) || canvas.height !== Math.round(block.props.height * ratio)) {
      canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(block.props.height * ratio);
    }
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, rect.width, block.props.height);
    context.lineCap = "round"; context.lineJoin = "round";
    for (const stroke of strokesRef.current) {
      if (!stroke.points.length) continue;
      const points = stroke.points.map((point) => ({ x: point.x * rect.width, y: point.y * block.props.height }));
      const first = points[0]; const last = points[points.length - 1]; const selectedTool = stroke.tool ?? "pen";
      context.beginPath(); context.strokeStyle = resolveColor(stroke.color); context.lineWidth = stroke.width;
      if (selectedTool === "pen") points.forEach((point, index) => { if (index === 0) context.moveTo(point.x, point.y); else context.lineTo(point.x, point.y); });
      else if (selectedTool === "line") { context.moveTo(first.x, first.y); context.lineTo(last.x, last.y); }
      else if (selectedTool === "circle") context.ellipse((first.x + last.x) / 2, (first.y + last.y) / 2, Math.abs(last.x - first.x) / 2, Math.abs(last.y - first.y) / 2, 0, 0, Math.PI * 2);
      else if (selectedTool === "rectangle") context.rect(Math.min(first.x, last.x), Math.min(first.y, last.y), Math.abs(last.x - first.x), Math.abs(last.y - first.y));
      else if (selectedTool === "triangle") { context.moveTo((first.x + last.x) / 2, first.y); context.lineTo(last.x, last.y); context.lineTo(first.x, last.y); context.closePath(); }
      else {
        const left = Math.min(first.x, last.x); const right = Math.max(first.x, last.x); const top = Math.min(first.y, last.y); const bottom = Math.max(first.y, last.y); const cx = (left + right) / 2; const cy = (top + bottom) / 2;
        context.moveTo(left, cy); context.lineTo(right, cy); context.moveTo(cx, bottom); context.lineTo(cx, top);
        context.moveTo(right - 8, cy - 5); context.lineTo(right, cy); context.lineTo(right - 8, cy + 5); context.moveTo(cx - 5, top + 8); context.lineTo(cx, top); context.lineTo(cx + 5, top + 8);
        if (selectedTool === "axes3d") { context.moveTo(cx, cy); context.lineTo(left + 12, bottom - 12); context.moveTo(left + 12, bottom - 12); context.lineTo(left + 15, bottom - 21); context.moveTo(left + 12, bottom - 12); context.lineTo(left + 21, bottom - 15); }
      }
      if (points.length === 1) context.lineTo(first.x + 0.01, first.y + 0.01);
      context.stroke();
    }
  }

  useEffect(() => {
    strokesRef.current = parseStrokes(block.props.drawing); redraw();
    const observer = new ResizeObserver(redraw); if (canvasRef.current) observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, [block.props.drawing, block.props.height]);

  function pointFrom(event: ReactPointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
  }
  function start(event: ReactPointerEvent<HTMLCanvasElement>) {
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); drawingRef.current = true;
    const point = pointFrom(event);
    strokesRef.current.push({ tool, color, width: event.pointerType === "pen" ? Math.max(1.5, event.pressure * 5) : 2.5, points: tool === "pen" ? [point] : [point, point] }); redraw();
  }
  function move(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return; event.preventDefault(); const current = strokesRef.current[strokesRef.current.length - 1]; if (!current) return; if ((current.tool ?? "pen") === "pen") current.points.push(pointFrom(event)); else current.points[1] = pointFrom(event); redraw();
  }
  function finish() {
    if (!drawingRef.current) return; drawingRef.current = false;
    editor.updateBlock(block, { props: { drawing: JSON.stringify(strokesRef.current) } }); setRevision((value) => value + 1);
  }
  function commit(next: Stroke[]) { strokesRef.current = next; editor.updateBlock(block, { props: { drawing: JSON.stringify(next) } }); redraw(); setRevision((value) => value + 1); }
  function resize(amount: number) {
    const height = Math.max(240, Math.min(1200, block.props.height + amount));
    editor.updateBlock(block, { props: { height } });
  }

  return <div contentEditable={false} className="my-3 overflow-hidden rounded-[1.5rem] border border-border bg-control shadow-card">
    <div className="flex flex-col gap-2 border-b border-border px-3 py-2"><div className="flex items-center gap-1 overflow-x-auto pb-1">{(["pen", "line", "circle", "rectangle", "triangle", "axes2d", "axes3d"] as DrawingTool[]).map((item) => <button key={item} type="button" onClick={() => setTool(item)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition-colors ${tool === item ? "bg-accent text-white" : "bg-surface-hover text-text-secondary hover:text-text-primary"}`}>{t(`notes.drawing.tools.${item}`)}</button>)}</div><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-1">{(["accent", "secondary", "text"] as InkColor[]).map((ink) => <button key={ink} type="button" aria-label={t(`notes.drawing.colors.${ink}`)} onClick={() => setColor(ink)} className={`h-7 w-7 rounded-full border-2 transition-transform ${color === ink ? "scale-110 border-text-primary" : "border-transparent"}`}><span className="block h-full w-full rounded-full border border-border" style={{ background: `var(--${ink === "text" ? "text-primary" : ink === "accent" ? "accent" : "accent-secondary"})` }} /></button>)}</div><div className="flex items-center gap-1"><span className="mr-1 text-[10px] text-text-muted">{t("notes.drawing.height")}</span><button type="button" aria-label={t("notes.drawing.makeShorter")} disabled={block.props.height <= 240} onClick={() => resize(-120)} className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-hover text-text-secondary hover:bg-elevated hover:text-text-primary disabled:opacity-40">−</button><span className="w-10 text-center text-[10px] tabular-nums text-text-muted">{block.props.height}</span><button type="button" aria-label={t("notes.drawing.makeTaller")} disabled={block.props.height >= 1200} onClick={() => resize(120)} className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-hover text-text-secondary hover:bg-elevated hover:text-text-primary disabled:opacity-40">+</button><button type="button" onClick={() => commit(strokesRef.current.slice(0, -1))} className="rounded-full px-3 py-1.5 text-xs text-text-secondary hover:bg-elevated hover:text-text-primary">{t("notes.drawing.undo")}</button><button type="button" onClick={() => commit([])} className="rounded-full px-3 py-1.5 text-xs text-text-secondary hover:bg-elevated hover:text-danger">{t("notes.drawing.clear")}</button></div></div></div>
    <canvas ref={canvasRef} style={{ height: block.props.height }} className="block w-full touch-none cursor-crosshair bg-elevated/40" onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} />
  </div>;
}

export const DrawingBlock = createReactBlockSpec(
  { type: "drawing", propSchema: { drawing: { default: "" }, height: { default: 480 } }, content: "none" },
  { render: (props) => <DrawingCanvas block={props.block} editor={props.editor} /> },
)();
