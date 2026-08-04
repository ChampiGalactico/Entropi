import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppLayout() {
  return (
    <div className="h-screen overflow-hidden bg-transparent">
      <Sidebar />
      <TopBar />
      <main className="ml-[76px] mt-[72px] h-[calc(100vh-72px)] overflow-y-auto px-7 pb-8 pt-3">
        <Outlet />
      </main>
    </div>
  );
}
