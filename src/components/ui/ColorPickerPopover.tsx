import { useState } from "react";
import { createPortal } from "react-dom";
import { HexAlphaColorPicker, HexColorInput } from "react-colorful";
import { ACCENT_PRESETS } from "../../lib/accentColors";

export interface ColorPickerPopoverProps {
  value: string;
  onChange: (hex: string) => void;
}

export function ColorPickerPopover({ value, onChange }: ColorPickerPopoverProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-1.5 transition-colors duration-150 hover:bg-surface-hover"
      >
        <span
          className="h-5 w-5 flex-shrink-0 rounded-full border border-border"
          style={{
            backgroundImage:
              "conic-gradient(#ccc 90deg, #fff 90deg 180deg, #ccc 180deg 270deg, #fff 270deg)",
            backgroundSize: "8px 8px",
          }}
        >
          <span className="block h-full w-full rounded-full" style={{ backgroundColor: value }} />
        </span>
        <span className="font-mono text-xs uppercase text-text-secondary">{value}</span>
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
        <div className="vida-color-popover flex w-64 flex-col gap-3 rounded-[2rem] border border-border bg-elevated p-4 shadow-modal backdrop-blur-3xl" onMouseDown={(event) => event.stopPropagation()}>
          <HexAlphaColorPicker color={value} onChange={onChange} />

          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-hover px-3 py-1.5">
            <span className="text-xs text-text-muted">#</span>
            <HexColorInput
              color={value}
              onChange={onChange}
              alpha
              className="w-full bg-transparent font-mono text-xs uppercase text-text-primary outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {ACCENT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                aria-label={preset.id}
                onClick={() => onChange(preset.hex)}
                className="h-5 w-5 rounded-full transition-transform duration-150 hover:scale-110"
                style={{ backgroundColor: preset.hex }}
              />
            ))}
          </div>
        </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
