import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-base">
      <Sidebar />
      <TopBar />
      <main className="ml-16 mt-12 min-h-[calc(100vh-3rem)] overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
