import { useThemeStore } from "../stores/themeStore";

export function useTheme() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const toggleMode = useThemeStore((s) => s.toggleMode);
  return { mode, setMode, toggleMode };
}
