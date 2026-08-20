import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ToastViewport } from "../ui/Toast";
import { ConfirmDialogViewport } from "../ui/ConfirmDialog";
import { UpdateBanner } from "../ui/UpdateBanner";
import { EntityDetailModal } from "../shared/EntityDetailModal";
import { useNavigationHistoryStore } from "../../stores/navigationHistoryStore";
import { useUpdateStore } from "../../stores/updateStore";
import { useTypographyStore } from "../../stores/typographyStore";

export function AppLayout() {
  const location = useLocation();
  const track = useNavigationHistoryStore((state) => state.track);
  useEffect(() => { track(location.key, `${location.pathname}${location.search}`); }, [location.key, location.pathname, location.search, track]);

  const checkForUpdates = useUpdateStore((state) => state.check);
  useEffect(() => { void checkForUpdates(true); }, [checkForUpdates]);
  const hydrateTypography = useTypographyStore((state) => state.hydrate);
  useEffect(() => { void hydrateTypography(); }, [hydrateTypography]);

  return (
    <div className="h-screen overflow-hidden bg-transparent">
      <Sidebar />
      <TopBar />
      <ToastViewport />
      <ConfirmDialogViewport />
      <UpdateBanner />
      <EntityDetailModal />
      <main className="ml-[76px] mt-[72px] h-[calc(100vh-72px)] overflow-y-auto px-7 pb-8 pt-3">
        <Outlet />
      </main>
    </div>
  );
}
