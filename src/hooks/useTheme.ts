import { useEffect } from "react";
import { useThemeStore } from "../stores/themeStore";

export function useTheme() {
  const mode = useThemeStore((s) => s.mode);
  const accentPrimary = useThemeStore((s) => s.accentPrimary);
  const accentSecondary = useThemeStore((s) => s.accentSecondary);
  const hydrated = useThemeStore((s) => s.hydrated);
  const hydrate = useThemeStore((s) => s.hydrate);
  const setMode = useThemeStore((s) => s.setMode);
  const toggleMode = useThemeStore((s) => s.toggleMode);
  const setAccentPrimary = useThemeStore((s) => s.setAccentPrimary);
  const setAccentSecondary = useThemeStore((s) => s.setAccentSecondary);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return {
    mode,
    accentPrimary,
    accentSecondary,
    hydrated,
    setMode,
    toggleMode,
    setAccentPrimary,
    setAccentSecondary,
  };
}
