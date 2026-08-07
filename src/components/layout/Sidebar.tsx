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
  LightbulbBoltLinear,
} from "../ui/appIcons";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useRef, useState } from "react";

interface NavItem {
  to: string;
  labelKey: string;
  icon: ReactNode;
}

const defaultNavItems: NavItem[] = [
  { to: "/", labelKey: "nav.dashboard", icon: <Home2Linear size={22} /> },
  { to: "/calendar", labelKey: "nav.calendar", icon: <CalendarLinear size={22} /> },
  { to: "/subjects", labelKey: "nav.subjects", icon: <SquareAcademicCapLinear size={22} /> },
  { to: "/grades", labelKey: "nav.grades", icon: <Widget5Linear size={22} /> },
  { to: "/tasks", labelKey: "nav.tasks", icon: <ChecklistMinimalisticLinear size={22} /> },
  { to: "/learning-topics", labelKey: "nav.learningTopics", icon: <LightbulbBoltLinear size={22} /> },
  { to: "/planner", labelKey: "nav.planner", icon: <BookLinear size={22} /> },
  { to: "/notes", labelKey: "nav.notes", icon: <NotebookLinear size={22} /> },
  { to: "/settings", labelKey: "nav.settings", icon: <SettingsLinear size={22} /> },
];

const MENU_ORDER_KEY = "entropi_sidebar_order";

function initialNavItems() {
  try {
    const order: unknown = JSON.parse(localStorage.getItem(MENU_ORDER_KEY) ?? "null");
    if (!Array.isArray(order)) return defaultNavItems;
    const ordered = order.map((path) => defaultNavItems.find((item) => item.to === path)).filter((item): item is NavItem => Boolean(item));
    return [...ordered, ...defaultNavItems.filter((item) => !ordered.some((orderedItem) => orderedItem.to === item.to))];
  } catch { return defaultNavItems; }
}

export function Sidebar() {
  const { t } = useTranslation();
  const [navItems, setNavItems] = useState<NavItem[]>(initialNavItems);
  const [dragging, setDragging] = useState<string | null>(null);
  const dragState = useRef<{ path: string; startY: number; moved: boolean } | null>(null);
  const blockNextClick = useRef(false);

  function moveToTarget(targetPath: string) {
    const sourcePath = dragState.current?.path;
    if (!sourcePath || sourcePath === targetPath) return;
    setNavItems((current) => {
      const source = current.find((item) => item.to === sourcePath);
      if (!source) return current;
      const targetIndex = current.findIndex((item) => item.to === targetPath);
      const withoutSource = current.filter((item) => item.to !== sourcePath);
      const next = [...withoutSource];
      next.splice(targetIndex, 0, source);
      localStorage.setItem(MENU_ORDER_KEY, JSON.stringify(next.map((item) => item.to)));
      return next;
    });
  }

  function startPointer(event: ReactPointerEvent<HTMLAnchorElement>, path: string) {
    if (!event.isPrimary || event.button !== 0) return;
    dragState.current = { path, startY: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function movePointer(event: ReactPointerEvent<HTMLAnchorElement>) {
    const state = dragState.current;
    if (!state) return;
    if (!state.moved && Math.abs(event.clientY - state.startY) < 5) return;
    state.moved = true;
    setDragging(state.path);
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-nav-path]");
    const targetPath = target?.dataset.navPath;
    if (targetPath) moveToTarget(targetPath);
  }

  function finishPointer(event: ReactPointerEvent<HTMLAnchorElement>) {
    const state = dragState.current;
    if (!state) return;
    if (state.moved) blockNextClick.current = true;
    dragState.current = null;
    setDragging(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    window.setTimeout(() => { blockNextClick.current = false; }, 0);
  }
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-full w-[76px] flex-col items-center gap-2 py-5">
      <nav className="absolute top-1/2 flex -translate-y-1/2 flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            data-nav-path={item.to}
            draggable={false}
            onPointerDown={(event) => startPointer(event, item.to)}
            onPointerMove={movePointer}
            onPointerUp={finishPointer}
            onPointerCancel={finishPointer}
            onClick={(event) => { if (blockNextClick.current) { event.preventDefault(); event.stopPropagation(); } }}
            className={({ isActive }) =>
              `group relative flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-xl transition-all duration-200 ${
                isActive
                  ? "bg-accent text-white shadow-card"
                  : "bg-control text-text-secondary hover:-translate-y-0.5 hover:bg-elevated hover:text-text-primary"
              } ${dragging === item.to ? "z-10 scale-90 cursor-grabbing opacity-45" : "cursor-grab active:cursor-grabbing"} touch-none select-none`
            }
          >
            {item.icon}
            <span className="vida-tooltip pointer-events-none absolute left-[calc(100%+10px)] z-50 translate-x-[-4px] whitespace-nowrap rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-text-primary opacity-0 shadow-card backdrop-blur-2xl transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
              {t(item.labelKey)}
            </span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-text-primary text-sm font-bold text-base shadow-card">
        E
      </div>
    </aside>
  );
}
