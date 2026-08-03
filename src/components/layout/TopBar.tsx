import { MagniferLinear, SunLinear, MoonLinear } from "solar-icon-set";
import { IconButton } from "../ui/IconButton";
import { useTheme } from "../../hooks/useTheme";

export function TopBar() {
  const { mode, toggleMode } = useTheme();
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="fixed left-16 right-0 top-0 z-30 flex h-12 items-center justify-between border-b border-border bg-surface px-6 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-text-secondary">
        <MagniferLinear size={18} />
        <span className="text-sm">Search</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-text-secondary">{today}</span>
        <IconButton
          label="Toggle theme"
          onClick={toggleMode}
          icon={mode === "dark" ? <SunLinear size={18} /> : <MoonLinear size={18} />}
        />
      </div>
    </header>
  );
}
