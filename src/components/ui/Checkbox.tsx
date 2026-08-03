import { useId } from "react";

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Checkbox({ checked, onChange, label, disabled = false }: CheckboxProps) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={`inline-flex items-center gap-2 select-none ${disabled ? "opacity-50" : "cursor-pointer"}`}
    >
      <span className="relative flex h-4 w-4 items-center justify-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer absolute inset-0 h-4 w-4 cursor-pointer appearance-none rounded-md border border-border bg-surface transition-colors duration-150 checked:border-accent checked:bg-accent"
        />
        <svg
          className="pointer-events-none absolute h-3 w-3"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path
            d="M4 10l4 4 8-8"
            stroke="white"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`check-path ${checked ? "is-checked" : ""}`}
          />
        </svg>
      </span>
      {label && <span className="text-sm text-text-primary">{label}</span>}
    </label>
  );
}
