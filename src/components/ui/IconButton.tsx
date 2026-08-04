import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Tooltip } from "./Tooltip";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  active?: boolean;
}

export function IconButton({ icon, label, active = false, className = "", ...rest }: IconButtonProps) {
  return (
    <Tooltip label={label}>
    <button
      aria-label={label}
      className={`flex items-center justify-center rounded-full p-2 transition-all duration-150 active:scale-[0.92] ${
        active ? "bg-accent text-white" : "bg-control text-text-secondary backdrop-blur-xl hover:bg-elevated hover:text-text-primary"
      } ${className}`}
      {...rest}
    >
      {icon}
    </button>
    </Tooltip>
  );
}
