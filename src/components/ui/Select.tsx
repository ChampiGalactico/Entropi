import type { SelectHTMLAttributes } from "react";
import { AltArrowDownLinear } from "./appIcons";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  placeholder?: string;
}

export function Select({ options, placeholder, className = "", ...rest }: SelectProps) {
  return (
    <span className="relative block">
      <select
        className={`w-full appearance-none rounded-xl border border-border bg-control px-4 py-2.5 pr-10 text-sm text-text-primary outline-none transition-all hover:bg-elevated focus:bg-elevated focus:ring-2 focus:ring-accent ${className}`}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>{placeholder}</option>
        )}
        {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      <AltArrowDownLinear size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
    </span>
  );
}
