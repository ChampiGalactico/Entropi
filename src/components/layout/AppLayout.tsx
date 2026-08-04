import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ToastViewport } from "../ui/Toast";
import { useTheme } from "../../hooks/useTheme";

let splashDismissed = false;

function dismissSplash() {
  if (splashDismissed) return;
  splashDismissed = true;

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const splash = document.getElementById("entropi-splash");
      if (!splash) return;

      splash.classList.add("is-leaving");
      const removeSplash = () => splash.remove();
      splash.addEventListener("transitionend", removeSplash, { once: true });
      window.setTimeout(removeSplash, 400);
    });
  });
}

export function AppLayout() {
  const { hydrated } = useTheme();

  useEffect(() => {
    if (hydrated) dismissSplash();
  }, [hydrated]);

  return (
    <div className="h-screen overflow-hidden bg-transparent">
      <Sidebar />
      <TopBar />
      <ToastViewport />
      <main className="ml-[76px] mt-[72px] h-[calc(100vh-72px)] overflow-y-auto px-7 pb-8 pt-3">
        <Outlet />
      </main>
    </div>
  );
}
