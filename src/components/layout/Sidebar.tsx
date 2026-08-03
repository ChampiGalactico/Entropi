import { NavLink } from "react-router-dom";
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
  label: string;
  icon: ReactNode;
}

const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: <Home2Linear size={22} /> },
  { to: "/calendar", label: "Calendar", icon: <CalendarLinear size={22} /> },
  { to: "/subjects", label: "Subjects", icon: <SquareAcademicCapLinear size={22} /> },
  { to: "/grades", label: "Grades", icon: <Widget5Linear size={22} /> },
  { to: "/tasks", label: "Tasks", icon: <ChecklistMinimalisticLinear size={22} /> },
  { to: "/planner", label: "Weekly Planner", icon: <BookLinear size={22} /> },
  { to: "/notes", label: "Notes", icon: <NotebookLinear size={22} /> },
  { to: "/settings", label: "Settings", icon: <SettingsLinear size={22} /> },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-full w-16 flex-col items-center gap-2 border-r border-border bg-surface py-4 backdrop-blur-xl">
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-2xl bg-accent text-sm font-bold text-white">
        V
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            title={item.label}
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
