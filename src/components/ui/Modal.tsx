import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/30 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-[2rem] border border-border bg-elevated p-6 shadow-modal backdrop-blur-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 id="modal-title" className="mb-4 text-lg font-semibold text-text-primary">{title}</h2>}
        {children}
      </div>
    </div>,
    document.body,
  );
}
