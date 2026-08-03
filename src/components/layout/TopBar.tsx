import { useTranslation } from "react-i18next";
import { MagniferLinear, SunLinear, MoonLinear } from "solar-icon-set";
import { IconButton } from "../ui/IconButton";
import { useTheme } from "../../hooks/useTheme";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function TopBar() {
  const { t } = useTranslation();
  const { mode, toggleMode } = useTheme();

  return (
    <header className="fixed left-16 right-0 top-0 z-30 flex h-12 items-center border-b border-border bg-surface px-6 backdrop-blur-2xl">
      <label className="absolute left-1/2 flex w-full max-w-sm -translate-x-1/2 items-center gap-2 rounded-full px-3 py-1.5 text-text-muted transition-colors duration-150 focus-within:text-text-primary hover:bg-surface-hover">
        <MagniferLinear size={16} className="flex-shrink-0" />
        <input
          type="text"
          placeholder={t("topbar.search")}
          className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
        />
      </label>

      <div className="ml-auto flex items-center gap-1">
        <LanguageSwitcher />
        <IconButton
          label={t("topbar.toggleTheme")}
          onClick={() => void toggleMode()}
          icon={mode === "dark" ? <SunLinear size={18} /> : <MoonLinear size={18} />}
        />
      </div>
    </header>
  );
}
