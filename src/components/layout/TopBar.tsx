import { useTranslation } from "react-i18next";
import { MagniferLinear, SunLinear, MoonLinear } from "../ui/appIcons";
import { IconButton } from "../ui/IconButton";
import { useTheme } from "../../hooks/useTheme";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function TopBar() {
  const { t } = useTranslation();
  const { mode, toggleMode } = useTheme();

  return (
    <header className="fixed left-[76px] right-0 top-0 z-30 flex h-[72px] items-center px-7">
      <label className="absolute left-1/2 flex w-full max-w-md -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-control px-4 py-2.5 text-text-muted shadow-card backdrop-blur-2xl transition-all duration-200 focus-within:bg-elevated focus-within:text-text-primary">
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
