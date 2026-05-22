"use client";

import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopbar } from "./DashboardTopbar";
import { DistrictProvider } from "@/context/DistrictContext";

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <DistrictProvider>
      <div className="flex h-screen overflow-hidden bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)]">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <DashboardTopbar />
          <main className="flex-1 overflow-y-auto">
            <div className="p-6 min-h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </DistrictProvider>
  );
}
