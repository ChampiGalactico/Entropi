import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidthClass?: string;
  onSave?: () => void;
}

export function Modal({ open, onClose, title, children, maxWidthClass = "max-w-lg", onSave }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs[dialogs.length - 1] !== dialogRef.current) return;
      if (e.key === "Escape") onClose();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && onSave) {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose, onSave]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/30 p-4 backdrop-blur-md"
      // mousedown (not click) so this only fires when the press itself starts on the backdrop —
      // a click here would also fire after a mousedown that started inside the dialog (e.g.
      // selecting text in a field) and ended with mouseup outside it, since the browser's
      // synthetic "click" event targets the nearest common ancestor of the two, closing the
      // modal on what was meant to be a text selection, not a dismiss.
      onMouseDown={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        className={`my-auto max-h-[calc(100vh-2rem)] w-full ${maxWidthClass} overflow-x-hidden overflow-y-auto rounded-[2rem] border border-border bg-elevated p-6 shadow-modal backdrop-blur-3xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {title && <h2 id="modal-title" className="mb-4 text-lg font-semibold text-text-primary">{title}</h2>}
        {children}
      </div>
    </div>,
    document.body,
  );
}
