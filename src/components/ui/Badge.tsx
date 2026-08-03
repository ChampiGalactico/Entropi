import type { HTMLAttributes, ReactNode } from "react";

export type BadgeVariant = "soft" | "outline";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: string;
  variant?: BadgeVariant;
  dot?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

export function Badge({
  color = "var(--accent-secondary)",
  variant = "soft",
  dot = false,
  icon,
  className = "",
  style,
  children,
  ...rest
}: BadgeProps) {
  const isHex = color.startsWith("#");
  const softBg = isHex ? `${color}1f` : "var(--bg-surface-hover)";
  const variantStyle =
    variant === "outline"
      ? { color, borderColor: color, backgroundColor: "transparent" }
      : { color, backgroundColor: softBg };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150 ${
        variant === "outline" ? "border" : "border-transparent"
      } ${className}`}
      style={{ ...variantStyle, ...style }}
      {...rest}
    >
      {dot && (
        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: color }} />
      )}
      {icon}
      {children}
    </span>
  );
}
