import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  accentColor?: string;
  hoverLift?: boolean;
  children: ReactNode;
}

export function Card({ accentColor, hoverLift = false, className = "", style, children, ...rest }: CardProps) {
  return (
    <div
      className={`rounded-2xl backdrop-blur-2xl bg-surface shadow-card border border-border p-5 ${
        hoverLift ? "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md" : ""
      } ${className}`}
      style={{
        borderLeft: accentColor ? `4px solid ${accentColor}` : undefined,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
