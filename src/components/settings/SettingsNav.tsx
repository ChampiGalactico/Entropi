import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export interface SettingsNavItem {
  id: string;
  label: string;
  icon: ReactNode;
}

export interface SettingsNavProps {
  items: SettingsNavItem[];
  activeId: string;
  onChange: (id: string) => void;
}

export function SettingsNav({ items, activeId, onChange }: SettingsNavProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState<{ top: number; height: number } | null>(null);

  useEffect(() => {
    const el = itemRefs.current.get(activeId);
    const container = containerRef.current;
    if (el && container) {
      const elRect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      setIndicator({ top: elRect.top - containerRect.top, height: elRect.height });
    }
  }, [activeId, items]);

  return (
    <nav ref={containerRef} className="relative flex w-56 flex-shrink-0 flex-col gap-1 p-3">
      {indicator && (
        <div
          className="absolute left-3 right-3 rounded-2xl bg-accent transition-all duration-300 ease-out"
          style={{ top: indicator.top, height: indicator.height }}
        />
      )}
      {items.map((item) => (
        <button
          key={item.id}
          ref={(el) => {
            if (el) itemRefs.current.set(item.id, el);
          }}
          onClick={() => onChange(item.id)}
          className={`relative z-10 flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors duration-200 ${
            activeId === item.id
              ? "text-white"
              : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
          }`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </nav>
  );
}
