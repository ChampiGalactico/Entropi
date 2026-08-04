import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { AltArrowDownLinear, MagniferLinear } from "./appIcons";

export interface ComboboxOption {
  value: string;
  label: string;
  icon?: ReactNode;
  color?: string;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  creatable?: boolean;
  onCreate?: (label: string) => void;
  createLabel?: (input: string) => string;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchable = false,
  creatable = false,
  onCreate,
  createLabel = (input) => `Create "${input}"`,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number; width: number; above: boolean } | null>(null);

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const exactMatch = filtered.some((o) => o.label.toLowerCase() === query.trim().toLowerCase());

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

  function select(v: string) {
    onChange(v);
    setOpen(false);
    setQuery("");
  }

  function create() {
    if (!query.trim() || !onCreate) return;
    onCreate(query.trim());
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-control px-4 py-2.5 text-sm text-text-primary outline-none transition-all duration-200 hover:bg-elevated focus:bg-elevated focus:ring-2 focus:ring-accent"
      >
        <span className="flex items-center gap-2 truncate">
          {selected?.color && (
            <span
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: selected.color }}
            />
          )}
          {selected?.icon}
          <span className={selected ? "text-text-primary" : "text-text-muted"}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <AltArrowDownLinear
          size={16}
          className={`flex-shrink-0 text-text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
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
                onClick={() => select(opt.value)}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors duration-100 hover:bg-surface-hover ${
                  opt.value === value ? "text-accent" : "text-text-primary"
                }`}
              >
                {opt.color && (
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: opt.color }}
                  />
                )}
                {opt.icon}
                <span className="truncate">{opt.label}</span>
              </button>
            ))}
            {filtered.length === 0 && !creatable && (
              <p className="px-3 py-2 text-sm text-text-muted">No results</p>
            )}
            {creatable && query.trim() && !exactMatch && (
              <button
                type="button"
                onClick={create}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-accent transition-colors duration-100 hover:bg-surface-hover"
              >
                {createLabel(query.trim())}
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
