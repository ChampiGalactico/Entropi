export interface AccentColorOption {
  id: string;
  hex: string;
}

/** Quick-pick presets shown inside the color picker popover. */
export const ACCENT_PRESETS: AccentColorOption[] = [
  { id: "indigo", hex: "#6366f1" },
  { id: "blue", hex: "#3b82f6" },
  { id: "sky", hex: "#0ea5e9" },
  { id: "teal", hex: "#14b8a6" },
  { id: "green", hex: "#22c55e" },
  { id: "lime", hex: "#84cc16" },
  { id: "amber", hex: "#f59e0b" },
  { id: "orange", hex: "#f97316" },
  { id: "red", hex: "#ef4444" },
  { id: "pink", hex: "#ec4899" },
  { id: "fuchsia", hex: "#d946ef" },
  { id: "violet", hex: "#8b5cf6" },
];

export const DEFAULT_ACCENT_PRIMARY = "#3b82f6";
export const DEFAULT_ACCENT_SECONDARY = "#8b5cf6";
