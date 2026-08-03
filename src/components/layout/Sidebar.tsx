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
} from "solar-icon-set";
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
    <aside className="fixed left-0 top-0 z-40 flex h-full w-16 flex-col items-center gap-2 border-r border-border bg-surface py-4 backdrop-blur-2xl">
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-2xl bg-accent text-sm font-bold text-white">
        V
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            title={t(item.labelKey)}
            className={({ isActive }) =>
              `flex h-11 w-11 items-center justify-center rounded-2xl transition-colors duration-150 ${
                isActive
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              }`
            }
          >
            {item.icon}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
