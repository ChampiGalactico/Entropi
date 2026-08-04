import type { InputHTMLAttributes } from "react";

export interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange" | "step" | "min" | "max"> {
  value: string | number;
  onValueChange: (value: string) => void;
  step?: number;
  min?: number;
  max?: number;
}

export function NumberInput({ value, onValueChange, step = 1, min, max, className = "", ...rest }: NumberInputProps) {
  function increment(direction: -1 | 1) {
    const current = value === "" ? (min ?? 0) : Number(value);
    if (!Number.isFinite(current)) return;
    let next = current + direction * step;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    const decimals = Math.max(0, (step.toString().split(".")[1] ?? "").length);
    onValueChange(String(Number(next.toFixed(decimals))));
  }

  return <div className={`grid min-w-0 max-w-full grid-cols-[minmax(2rem,1fr)_auto] items-stretch rounded-xl border border-border bg-control transition-colors focus-within:bg-elevated focus-within:ring-2 focus-within:ring-accent ${className}`}>
    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(event) => {
        const next = event.target.value.replace(",", ".");
        if (next === "" || /^-?\d*\.?\d*$/.test(next)) onValueChange(next);
      }}
      className="w-full min-w-0 bg-transparent px-2 py-2 text-center text-sm tabular-nums text-text-primary placeholder:text-text-muted outline-none"
      {...rest}
    />
    <div className="m-1 flex items-center rounded-lg bg-surface-hover p-0.5">
      <button type="button" aria-label="Decrease" onClick={() => increment(-1)} className="flex h-7 w-6 items-center justify-center rounded-md text-base text-text-secondary transition-colors hover:bg-elevated hover:text-text-primary">−</button>
      <button type="button" aria-label="Increase" onClick={() => increment(1)} className="flex h-7 w-6 items-center justify-center rounded-md text-base text-text-secondary transition-colors hover:bg-elevated hover:text-text-primary">+</button>
    </div>
  </div>;
}
