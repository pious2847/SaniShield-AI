"use client";

import { useState } from "react";
import { Bell, ChevronDown, Search, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { DISTRICTS, type District } from "@/lib/utils";
import { useAlerts } from "@/hooks/useDashboard";
import { useDistrict } from "@/context/DistrictContext";

export function DashboardTopbar() {
  const { district, setDistrict } = useDistrict();
  const { theme, setTheme } = useTheme();
  const [districtOpen, setDistrictOpen] = useState(false);
  const { data: alerts } = useAlerts(district);

  const activeAlerts = alerts?.filter((a) => a.status === "active") ?? [];
  const criticalCount = activeAlerts.filter((a) => a.severity === "critical").length;

  const now = new Date().toLocaleString("en-GH", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)] gap-4">
      <div className="relative">
        <button
          onClick={() => setDistrictOpen(!districtOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)] hover:border-[var(--color-primary)]/40 transition-colors"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-ok)]" />
          <span className="font-display font-semibold text-sm text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">
            {district}
          </span>
          <ChevronDown className={cn("w-3.5 h-3.5 text-[var(--color-text-3)] transition-transform", districtOpen && "rotate-180")} />
        </button>

        {districtOpen && (
          <div className="absolute top-full left-0 mt-1 z-50 w-52 rounded-[var(--radius-lg)] bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] shadow-[var(--shadow-lg)] overflow-hidden">
            {DISTRICTS.map((d) => (
              <button
                key={d}
                onClick={() => { setDistrict(d as District); setDistrictOpen(false); }}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-sm font-body transition-colors",
                  d === district
                    ? "bg-[var(--color-primary-muted)] dark:bg-[var(--color-primary)]/15 text-[var(--color-primary)] dark:text-[var(--color-primary-dark)] font-medium"
                    : "text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] hover:bg-[var(--color-bg)] dark:hover:bg-[var(--color-bg-dark)]"
                )}
              >
                {d}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <span className="hidden md:block text-xs font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
          {now}
        </span>

        <button className="w-9 h-9 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-3)] hover:bg-[var(--color-bg)] dark:hover:bg-[var(--color-bg-dark)] transition-colors">
          <Search className="w-4 h-4" />
        </button>

        <button className="relative w-9 h-9 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-3)] hover:bg-[var(--color-bg)] dark:hover:bg-[var(--color-bg-dark)] transition-colors">
          <Bell className="w-4 h-4" />
          {activeAlerts.length > 0 && (
            <span className={cn(
              "absolute top-1.5 right-1.5 min-w-[16px] h-4 rounded-full text-[10px] font-display font-bold text-white flex items-center justify-center px-1 animate-pulse",
              criticalCount > 0 ? "bg-[var(--color-critical)]" : "bg-[var(--color-warning)]"
            )}>
              {activeAlerts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-9 h-9 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-3)] hover:bg-[var(--color-bg)] dark:hover:bg-[var(--color-bg-dark)] transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
