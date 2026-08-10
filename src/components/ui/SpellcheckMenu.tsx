import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

export interface SpellcheckMenuTarget {
  word: string;
  x: number;
  y: number;
}

export function SpellcheckMenu({ word, x, y, onIgnore, onClose }: SpellcheckMenuTarget & { onIgnore: () => void; onClose: () => void }) {
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
