import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  accentColor?: string;
  hoverLift?: boolean;
  children: ReactNode;
}

export function Card({ accentColor, hoverLift = false, className = "", style, children, ...rest }: CardProps) {
  return (
    <div
      className={`rounded-[1.75rem] border border-border bg-elevated p-5 shadow-card backdrop-blur-2xl ${
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
