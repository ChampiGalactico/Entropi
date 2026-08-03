import type { InputHTMLAttributes } from "react";

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Checkbox({ label, className = "", id, ...rest }: CheckboxProps) {
  return (
    <label htmlFor={id} className="inline-flex items-center gap-2 cursor-pointer select-none">
      <input
        id={id}
        type="checkbox"
        className={`h-4 w-4 rounded-md border border-border accent-[color:var(--accent)] ${className}`}
        {...rest}
      />
      {label && <span className="text-sm text-text-primary">{label}</span>}
    </label>
  );
}
