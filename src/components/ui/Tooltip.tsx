import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface TooltipProps {
  label: string;
  children: ReactNode;
  placement?: "top" | "right" | "bottom" | "left";
}

export function Tooltip({ label, children, placement = "top" }: TooltipProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number; placement: NonNullable<TooltipProps["placement"]> } | null>(null);

  function show() {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const horizontalRoom = 180;
    const verticalRoom = 44;
    let resolved = placement;
    if (placement === "top" && rect.top < verticalRoom) resolved = "bottom";
    if (placement === "bottom" && window.innerHeight - rect.bottom < verticalRoom) resolved = "top";
    if (placement === "right" && window.innerWidth - rect.right < horizontalRoom) resolved = "left";
    if (placement === "left" && rect.left < horizontalRoom) resolved = "right";
    if (resolved === "right") setPosition({ left: rect.right + 10, top: rect.top + rect.height / 2, placement: resolved });
    else if (resolved === "left") setPosition({ left: rect.left - 10, top: rect.top + rect.height / 2, placement: resolved });
    else if (resolved === "bottom") setPosition({ left: rect.left + rect.width / 2, top: rect.bottom + 8, placement: resolved });
    else setPosition({ left: rect.left + rect.width / 2, top: rect.top - 8, placement: resolved });
  }

  return (
    <span ref={rootRef} className="inline-flex" onMouseEnter={show} onMouseLeave={() => setPosition(null)} onFocus={show} onBlur={() => setPosition(null)}>
      {children}
      {position && createPortal(
        <span
          role="tooltip"
          className="vida-tooltip vida-tooltip-enter pointer-events-none fixed z-[200] whitespace-nowrap rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-text-primary shadow-card backdrop-blur-2xl"
          style={{
            left: position.left,
            top: position.top,
            transform: position.placement === "right" ? "translateY(-50%)" : position.placement === "left" ? "translate(-100%, -50%)" : position.placement === "bottom" ? "translateX(-50%)" : "translate(-50%, -100%)",
          }}
        >
          {label}
        </span>,
        document.body,
      )}
    </span>
  );
}
