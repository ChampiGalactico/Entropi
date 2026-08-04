import type { InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className = "", ...rest }: InputProps) {
  return (
    <input
      className={`w-full rounded-xl border border-border bg-control px-4 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors focus:bg-elevated focus:ring-2 focus:ring-accent ${className}`}
      {...rest}
    />
  );
}
