import { cn, timeAgo } from "@/lib/utils";
import { AlertTriangle, Info, AlertOctagon, CheckCircle } from "lucide-react";
import type { Alert } from "@/types";

const severityConfig = {
  critical: { icon: AlertOctagon, color: "text-[var(--color-critical)]",  bg: "bg-[var(--color-critical-bg)] dark:bg-[var(--color-critical-bg-dark)]",  border: "border-[var(--color-critical)]/30" },
  high:     { icon: AlertTriangle,color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950", border: "border-orange-200 dark:border-orange-900" },
  moderate: { icon: AlertTriangle,color: "text-[var(--color-warning)]",   bg: "bg-amber-50 dark:bg-amber-950",        border: "border-amber-200 dark:border-amber-900" },
  low:      { icon: Info,         color: "text-[var(--color-info)]",       bg: "bg-blue-50 dark:bg-blue-950",          border: "border-blue-200 dark:border-blue-900" },
};

export function AlertItem({ alert, compact = false }: { alert: Alert; compact?: boolean }) {
  const cfg = severityConfig[alert.severity] ?? severityConfig.low;
  const Icon = cfg.icon;

  return (
    <div className={cn(
      "flex gap-3 p-3 rounded-[var(--radius-md)] border transition-colors",
      cfg.bg, cfg.border,
      compact ? "items-start" : "items-start"
    )}>
      <Icon className={cn("w-4 h-4 flex-shrink-0 mt-0.5", cfg.color)} />
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-body font-medium leading-tight", cfg.color)}>
          {alert.message}
        </p>
        {!compact && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
              {alert.unit_name ?? alert.district}
            </span>
            <span className="text-[var(--color-border)]">·</span>
            <span className="text-xs font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
              {timeAgo(alert.created_at)}
            </span>
          </div>
        )}
      </div>
      {alert.status === "resolved" && (
        <CheckCircle className="w-4 h-4 text-[var(--color-ok)] flex-shrink-0" />
      )}
    </div>
  );
}
