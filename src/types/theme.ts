export type ThemeMode = "light" | "dark";

export interface ThemeTokens {
  "bg-base": string;
  "bg-surface": string;
  "bg-surface-hover": string;
  "text-primary": string;
  "text-secondary": string;
  "text-muted": string;
  "border-subtle": string;
  accent: string;
  "shadow-card": string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}

export interface ThemeDefinition {
  name: string;
  tokens: ThemeTokens;
}
