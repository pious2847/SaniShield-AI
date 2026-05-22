"use client";

import { useState } from "react";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopbar } from "./DashboardTopbar";
import { type District, DISTRICTS } from "@/lib/utils";

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [district, setDistrict] = useState<District>("Tamale Metro");

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)]">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DashboardTopbar district={district} onDistrictChange={setDistrict} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
