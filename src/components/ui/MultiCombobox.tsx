import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AltArrowDownLinear, MagniferLinear } from "./appIcons";
import type { ComboboxOption } from "./Combobox";

export interface MultiComboboxProps {
  options: ComboboxOption[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchable?: boolean;
  compact?: boolean;
  allLabel?: string;
}

export function MultiCombobox({
  options,
  values,
  onChange,
  placeholder = "Select...",
  searchable = false,
  compact = false,
  allLabel,
}: MultiComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number; width: number; above: boolean } | null>(null);

  const selected = options.filter((o) => values.includes(o.value));

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node) && !panelRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useLayoutEffect(() => {
    if (!open) { setPosition(null); return; }
    function place() {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const estimatedHeight = Math.min(320, filtered.length * 42 + (searchable ? 54 : 12));
      const below = window.innerHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const openAbove = below < Math.min(estimatedHeight, 220) && above > below;
      setPosition({ left: rect.left, top: openAbove ? Math.max(8, rect.top - estimatedHeight - 8) : rect.bottom + 8, width: Math.max(rect.width, 220), above: openAbove });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open, filtered.length, searchable]);

  function toggle(value: string) {
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  }

  const label = selected.length === 0
    ? (allLabel ?? placeholder)
    : selected.length === 1
      ? selected[0].label
      : `${selected.length} selected`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-1.5 border border-border bg-control text-text-primary outline-none transition-all duration-200 hover:bg-elevated focus:bg-elevated focus:ring-2 focus:ring-accent ${compact ? "rounded-full px-2.5 py-1 text-[10px]" : "rounded-xl px-4 py-2.5 text-sm"}`}
      >
        <span className="flex items-center gap-2 truncate">
          {selected.length === 1 && selected[0].color && (
            <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: selected[0].color }} />
          )}
          <span className={selected.length ? "text-text-primary" : "text-text-muted"}>{label}</span>
        </span>
        <AltArrowDownLinear size={16} className={`flex-shrink-0 text-text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && position && createPortal(
        <div
          ref={panelRef}
          className="vida-popover-enter fixed z-[160] max-h-[min(320px,calc(100vh-24px))] overflow-hidden rounded-2xl border border-border bg-elevated p-1.5 shadow-modal backdrop-blur-3xl"
          style={{ left: position.left, top: position.top, width: position.width, transformOrigin: position.above ? "bottom" : "top" }}
        >
          {searchable && (
            <div className="mb-1 flex items-center gap-2 rounded-xl border border-border bg-surface-hover px-3 py-1.5">
              <MagniferLinear size={14} className="text-text-muted" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
              />
            </div>
          )}
          <div className="max-h-64 overflow-y-auto">
            {filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className={`flex w-full items-center gap-2 rounded-xl px-3 ${compact ? "py-1.5 text-xs" : "py-2 text-sm"} text-left transition-colors duration-100 hover:bg-surface-hover text-text-primary`}
              >
                <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-md border transition-colors duration-150 ${values.includes(opt.value) ? "border-accent bg-accent" : "border-border bg-surface"}`}>
                  {values.includes(opt.value) && (
                    <svg viewBox="0 0 20 20" fill="none" className="h-3 w-3">
                      <path d="M4 10l4 4 8-8" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                {opt.color && <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: opt.color }} />}
                {opt.icon}
                <span className="truncate">{opt.label}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-2 text-sm text-text-muted">No results</p>}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
