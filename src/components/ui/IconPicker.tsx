import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { MagniferLinear } from "./appIcons";
import { SolarIcon } from "./SolarIcon";
import { Combobox } from "./Combobox";
import {
  ICON_VARIANTS,
  SOLAR_ICON_CATEGORIES,
  SOLAR_ICON_MANIFEST,
  categoryForIcon,
  iconFullName,
  type IconVariant,
  type SolarIconCategory,
} from "../../lib/solarIcons";

export interface IconPickerProps {
  value: string | null;
  onChange: (fullName: string | null) => void;
  color?: string;
}

const RESULT_PAGE_SIZE = 96;

function parseVariant(fullName: string | null): IconVariant {
  if (!fullName) return "Linear";
  const found = ICON_VARIANTS.find((v) => fullName.endsWith(v));
  return found ?? "Linear";
}

export function IconPicker({ value, onChange, color = "currentColor" }: IconPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [variant, setVariant] = useState<IconVariant>(() => parseVariant(value));
  const [category, setCategory] = useState<SolarIconCategory>("all");
  const [visibleCount, setVisibleCount] = useState(RESULT_PAGE_SIZE);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const available = SOLAR_ICON_MANIFEST.filter((entry) => entry.variants.includes(variant));
    const categorized = category === "all"
      ? available
      : available.filter((entry) => categoryForIcon(entry.name) === category);
    const matches = q
      ? categorized.filter((entry) => entry.name.toLowerCase().includes(q))
      : categorized;
    return matches;
  }, [category, query, variant]);

  const results = matches.slice(0, visibleCount);

  useEffect(() => setVisibleCount(RESULT_PAGE_SIZE), [category, query, variant]);

  function select(base: string) {
    onChange(iconFullName(base, variant));
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary transition-colors duration-150 hover:bg-surface-hover"
      >
        {value ? <SolarIcon name={value} size={20} color={color} /> : <span className="text-xs text-text-muted">—</span>}
      </button>

      {open && createPortal(
        <div data-icon-picker-portal="true" className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
        <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col gap-2 overflow-hidden rounded-[2rem] border border-border bg-elevated p-4 shadow-modal backdrop-blur-3xl" onMouseDown={(event) => event.stopPropagation()}>
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-border bg-surface-hover px-3 py-1.5">
            <MagniferLinear size={14} className="text-text-muted" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("iconPicker.search")}
              className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
            />
          </div>

          <div className="mb-2 flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <Combobox
                value={category}
                onChange={(value) => setCategory(value as SolarIconCategory)}
                options={SOLAR_ICON_CATEGORIES.map((item) => ({
                  value: item,
                  label: item === "all"
                    ? t("iconPicker.allCategories")
                    : item.replace("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
                }))}
                searchable
              />
            </div>
            <span className="whitespace-nowrap text-[11px] text-text-muted">{matches.length} {t("iconPicker.icons")}</span>
          </div>

          <div className="mb-2 flex flex-wrap gap-1">
            {ICON_VARIANTS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVariant(v)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-150 ${
                  variant === v
                    ? "bg-accent text-white"
                    : "bg-surface-hover text-text-secondary hover:text-text-primary"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="grid max-h-[50vh] grid-cols-8 gap-1 overflow-y-auto pr-1">
            {results.map((entry) => {
              const fullName = iconFullName(entry.name, variant);
              const selected = fullName === value;
              return (
                <button
                  key={entry.name}
                  type="button"
                  title={entry.name}
                  onClick={() => select(entry.name)}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors duration-100 ${
                    selected
                      ? "bg-accent text-white"
                      : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                  }`}
                >
                  <SolarIcon name={fullName} size={18} color={selected ? "white" : color} />
                </button>
              );
            })}
            {results.length === 0 && (
              <p className="col-span-8 py-4 text-center text-sm text-text-muted">
                {t("iconPicker.noResults")}
              </p>
            )}
          </div>

          {visibleCount < matches.length && (
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + RESULT_PAGE_SIZE)}
              className="mt-1 w-full rounded-xl bg-control px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
            >
              {t("iconPicker.loadMore", { remaining: matches.length - visibleCount })}
            </button>
          )}

          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="mt-2 w-full rounded-xl px-3 py-1.5 text-center text-xs font-medium text-danger transition-colors duration-100 hover:bg-surface-hover"
            >
              {t("iconPicker.clear")}
            </button>
          )}
        </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
