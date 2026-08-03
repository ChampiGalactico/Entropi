import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { GlobalLinear } from "solar-icon-set";
import { IconButton } from "../ui/IconButton";
import { useLanguage } from "../../hooks/useLanguage";

export function LanguageSwitcher() {
  const { t } = useTranslation();
  const { language, setLanguage, locales } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <IconButton
        label={t("topbar.language")}
        icon={<GlobalLinear size={18} />}
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-40 rounded-2xl border border-border bg-surface p-1.5 shadow-xl backdrop-blur-2xl">
          {locales.map((locale) => (
            <button
              key={locale.code}
              onClick={() => {
                void setLanguage(locale.code);
                setOpen(false);
              }}
              className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition-colors duration-100 hover:bg-surface-hover ${
                locale.code === language ? "text-accent" : "text-text-primary"
              }`}
            >
              {locale.nativeLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
