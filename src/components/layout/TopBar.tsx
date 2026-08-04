import { useTranslation } from "react-i18next";
import { SunLinear, MoonLinear } from "../ui/appIcons";
import { IconButton } from "../ui/IconButton";
import { useTheme } from "../../hooks/useTheme";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { GlobalSearch } from "./GlobalSearch";

export function TopBar() {
  const { t } = useTranslation();
  const { mode, toggleMode } = useTheme();

  return (
    <header className="fixed left-[76px] right-0 top-0 z-30 flex h-[72px] items-center px-7">
      <GlobalSearch />

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
