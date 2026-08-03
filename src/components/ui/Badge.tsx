import type { HTMLAttributes, ReactNode } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: string;
  children: ReactNode;
}

export function Badge({ color, className = "", style, children, ...rest }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${className}`}
      style={{
        backgroundColor: color ? `${color}26` : "var(--bg-surface-hover)",
        color: color ?? "var(--text-primary)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}
