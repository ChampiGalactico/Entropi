import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SunLinear, MoonLinear, AltArrowLeftLinear, AltArrowRightLinear } from "../ui/appIcons";
import { IconButton } from "../ui/IconButton";
import { useTheme } from "../../hooks/useTheme";
import { useNavigationHistoryStore } from "../../stores/navigationHistoryStore";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { GlobalSearch } from "./GlobalSearch";

export function TopBar() {
  const { t } = useTranslation();
  const { mode, toggleMode } = useTheme();
  const navigate = useNavigate();
  const canGoBack = useNavigationHistoryStore((state) => state.canGoBack);
  const canGoForward = useNavigationHistoryStore((state) => state.canGoForward);

  return (
    <header className="fixed left-[76px] right-0 top-0 z-30 flex h-[72px] items-center gap-2 px-7">
      <IconButton label={t("topbar.goBack")} disabled={!canGoBack} onClick={() => navigate(-1)} icon={<AltArrowLeftLinear size={18} />} />
      <IconButton label={t("topbar.goForward")} disabled={!canGoForward} onClick={() => navigate(1)} icon={<AltArrowRightLinear size={18} />} />
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
