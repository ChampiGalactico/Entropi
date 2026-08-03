import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AltArrowDownLinear, MagniferLinear } from "solar-icon-set";

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

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const exactMatch = filtered.some((o) => o.label.toLowerCase() === query.trim().toLowerCase());

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

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
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text-primary outline-none transition-colors duration-150 hover:bg-surface-hover focus:ring-2 focus:ring-accent"
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

      {open && (
        <div className="absolute z-50 mt-2 w-full origin-top scale-100 rounded-2xl border border-border bg-surface p-1.5 opacity-100 shadow-xl backdrop-blur-2xl transition-all duration-150">
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
          <div className="max-h-56 overflow-y-auto">
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
        </div>
      )}
    </div>
  );
}
