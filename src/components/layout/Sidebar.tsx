import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Home2Linear,
  CalendarLinear,
  ChecklistMinimalisticLinear,
  NotebookLinear,
  SquareAcademicCapLinear,
  SettingsLinear,
  Widget5Linear,
  BookLinear,
} from "../ui/appIcons";
import type { ReactNode } from "react";

interface NavItem {
  to: string;
  labelKey: string;
  icon: ReactNode;
}

const navItems: NavItem[] = [
  { to: "/", labelKey: "nav.dashboard", icon: <Home2Linear size={22} /> },
  { to: "/calendar", labelKey: "nav.calendar", icon: <CalendarLinear size={22} /> },
  { to: "/subjects", labelKey: "nav.subjects", icon: <SquareAcademicCapLinear size={22} /> },
  { to: "/grades", labelKey: "nav.grades", icon: <Widget5Linear size={22} /> },
  { to: "/tasks", labelKey: "nav.tasks", icon: <ChecklistMinimalisticLinear size={22} /> },
  { to: "/planner", labelKey: "nav.planner", icon: <BookLinear size={22} /> },
  { to: "/notes", labelKey: "nav.notes", icon: <NotebookLinear size={22} /> },
  { to: "/settings", labelKey: "nav.settings", icon: <SettingsLinear size={22} /> },
];

export function Sidebar() {
  const { t } = useTranslation();
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-full w-[76px] flex-col items-center gap-2 py-5">
      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-text-primary text-sm font-bold text-base shadow-card">
        V
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `group relative flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-xl transition-all duration-200 ${
                isActive
                  ? "bg-accent text-white shadow-card"
                  : "bg-control text-text-secondary hover:-translate-y-0.5 hover:bg-elevated hover:text-text-primary"
              }`
            }
          >
            {item.icon}
            <span className="pointer-events-none absolute left-[calc(100%+10px)] z-50 translate-x-[-4px] whitespace-nowrap rounded-xl border border-border bg-elevated px-3 py-1.5 text-xs font-medium text-text-primary opacity-0 shadow-card backdrop-blur-2xl transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
              {t(item.labelKey)}
            </span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
