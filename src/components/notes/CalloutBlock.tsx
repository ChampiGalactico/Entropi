import { useEffect, useRef, useState } from "react";
import { createReactBlockSpec } from "@blocknote/react";
import { useTranslation } from "react-i18next";
import { IconPicker } from "../ui/IconPicker";
import { SolarIcon } from "../ui/SolarIcon";
import { TuningLinear } from "../ui/appIcons";

const CALLOUT_TONES = ["gray", "blue", "purple", "green", "yellow", "orange", "red", "pink"] as const;
const QUICK_ICONS = ["💡", "ℹ️", "⚠️", "✅", "❗", "📌", "🧠", "📝", "🔎", "⭐"];

function CalloutIcon({ value }: { value: string }) {
  if (value.startsWith("solar:")) return <SolarIcon name={value.slice(6)} size={21} />;
  return <span className="text-xl leading-none">{value || "💡"}</span>;
}

function Callout({ block, editor, contentRef }: { block: any; editor: any; contentRef: (node: HTMLElement | null) => void }) {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const icon = String(block.props.icon || "💡");
  const tone = String(block.props.tone || "blue");

  useEffect(() => {
    if (!settingsOpen) return;
    function close(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (target.closest("[data-icon-picker-portal]")) return;
      if (!settingsRef.current?.contains(target)) setSettingsOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [settingsOpen]);

  function update(patch: Record<string, string>) {
    editor.updateBlock(block, { props: patch });
  }

  return <div className="entropi-callout group relative my-2 flex min-h-14 items-start gap-3 rounded-2xl border px-3 py-3" data-tone={tone}>
    <button type="button" contentEditable={false} title={t("notes.callout.customize")} onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); setSettingsOpen((open) => !open); }} className="entropi-callout-icon mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-transform hover:scale-110"><CalloutIcon value={icon} /></button>
    <div ref={contentRef} className="entropi-callout-content min-w-0 flex-1 py-1 text-text-primary" />
    <button type="button" contentEditable={false} aria-label={t("notes.callout.customize")} onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); setSettingsOpen((open) => !open); }} className="entropi-callout-settings flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-text-muted opacity-0 transition-opacity hover:bg-black/10 group-hover:opacity-100"><TuningLinear size={15} /></button>

    {settingsOpen && <div ref={settingsRef} contentEditable={false} onMouseDown={(event) => event.stopPropagation()} className="entropi-callout-popover absolute left-2 top-[calc(100%+0.45rem)] z-[175] w-64 rounded-2xl border border-border p-3 shadow-modal">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{t("notes.callout.icon")}</p>
      <div className="mt-2 grid grid-cols-5 gap-1">{QUICK_ICONS.map((item) => <button key={item} type="button" onClick={() => update({ icon: item })} className={`entropi-callout-icon-option flex h-8 items-center justify-center rounded-lg text-base ${icon === item ? "bg-accent/15 ring-1 ring-accent" : ""}`}>{item}</button>)}</div>
      <div className="mt-2 flex items-end gap-2"><label className="min-w-0 flex-1 text-[10px] text-text-muted">{t("notes.callout.systemIcon")}<input value={icon.startsWith("solar:") ? "" : icon} onChange={(event) => update({ icon: event.target.value.slice(0, 8) || "💡" })} className="mt-1 h-10 w-full rounded-xl border border-border bg-control px-3 text-center text-lg text-text-primary outline-none focus:ring-2 focus:ring-accent" /></label><div><p className="mb-1 text-[10px] text-text-muted">Solar</p><IconPicker value={icon.startsWith("solar:") ? icon.slice(6) : null} color="var(--callout-strong)" onChange={(name) => update({ icon: name ? `solar:${name}` : "💡" })} /></div></div>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{t("notes.callout.color")}</p>
      <div className="mt-2 flex flex-wrap gap-2">{CALLOUT_TONES.map((item) => <button key={item} type="button" aria-label={t(`notes.callout.tones.${item}`)} title={t(`notes.callout.tones.${item}`)} onClick={() => update({ tone: item })} className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 entropi-callout-tone-${item} ${tone === item ? "border-text-primary ring-2 ring-accent/25" : "border-transparent"}`} />)}</div>
    </div>}
  </div>;
}

export const CalloutBlock = createReactBlockSpec(
  {
    type: "callout",
    propSchema: {
      tone: { default: "blue", values: [...CALLOUT_TONES] },
      icon: { default: "💡" },
    },
    content: "inline",
  },
  { render: (props) => <Callout block={props.block} editor={props.editor} contentRef={props.contentRef} /> },
)();
