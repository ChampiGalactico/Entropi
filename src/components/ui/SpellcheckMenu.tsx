import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

export interface SpellcheckMenuTarget {
  word: string;
  x: number;
  y: number;
}

export function SpellcheckMenu({ word, x, y, suggestions = [], onReplace, onIgnore, onClose }: SpellcheckMenuTarget & { suggestions?: string[]; onReplace?: (suggestion: string) => void; onIgnore: () => void; onClose: () => void }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onClose, true);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      style={{ position: "fixed", top: y, left: x, zIndex: 1000 }}
      className="min-w-[220px] overflow-hidden rounded-xl border border-border bg-elevated py-1 shadow-modal backdrop-blur-2xl"
    >
      {suggestions.length > 0 && <>
        <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{t("settings.spellcheck.suggestions")}</p>
        {suggestions.map((suggestion) => <button
          key={suggestion}
          type="button"
          onClick={() => onReplace?.(suggestion)}
          className="block w-full truncate px-3 py-2 text-left text-sm font-medium text-text-primary hover:bg-surface-hover hover:text-accent"
        >
          {suggestion}
        </button>)}
        <div className="my-1 h-px bg-border" />
      </>}
      <button
        type="button"
        onClick={onIgnore}
        className="block w-full truncate px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-hover"
      >
        {t("settings.spellcheck.addToDictionary", { word })}
      </button>
      <button
        type="button"
        onClick={onIgnore}
        className="block w-full truncate px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-hover"
      >
        {t("settings.spellcheck.ignoreWord", { word })}
      </button>
    </div>,
    document.body,
  );
}
