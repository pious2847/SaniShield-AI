"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { AlertItem } from "@/components/ui/alert-item";
import { PageSpinner } from "@/components/ui/spinner";
import { useAlerts } from "@/hooks/useDashboard";
import { cn } from "@/lib/utils";
import type { Alert } from "@/types";

type Severity = "all" | "critical" | "high" | "moderate" | "low";
type Status   = "all" | "active" | "acknowledged" | "resolved";

const severityOptions: { value: Severity; label: string }[] = [
  { value: "all",      label: "All" },
  { value: "critical", label: "Critical" },
  { value: "high",     label: "High" },
  { value: "moderate", label: "Moderate" },
  { value: "low",      label: "Low" },
];

const statusOptions: { value: Status; label: string }[] = [
  { value: "all",          label: "All" },
  { value: "active",       label: "Active" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "resolved",     label: "Resolved" },
];

const severityDotColor: Record<string, string> = {
  critical: "bg-[var(--color-critical)]",
  high:     "bg-orange-500",
  moderate: "bg-[var(--color-warning)]",
  low:      "bg-[var(--color-info)]",
};

function filterBtn(active: boolean) {
  return cn(
    "px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-body font-medium transition-all duration-150",
    active
      ? "bg-[var(--color-primary)] text-white"
      : "bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)] text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] hover:border-[var(--color-primary)]/50"
  );
}

export default function AlertsPage() {
  const district = "Tamale Metro";
  const [severity, setSeverity] = useState<Severity>("all");
  const [status,   setStatus]   = useState<Status>("active");

  const { data: alerts = [], isLoading } = useAlerts(district);

  const filtered = alerts.filter((a: Alert) => {
    const matchSeverity = severity === "all" || a.severity === severity;
    const matchStatus   = status   === "all" || a.status   === status;
    return matchSeverity && matchStatus;
  });

  const criticalCount  = alerts.filter((a: Alert) => a.severity === "critical" && a.status === "active").length;
  const activeCount    = alerts.filter((a: Alert) => a.status === "active").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">
            Alerts
          </h1>
          <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mt-0.5">
            Real-time sanitation alerts across {district}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {criticalCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-critical-bg)] dark:bg-[var(--color-critical-bg-dark)] border border-[var(--color-critical)]/20">
              <span className="w-2 h-2 rounded-full bg-[var(--color-critical)] animate-pulse" />
              <span className="text-xs font-body font-semibold text-[var(--color-critical)]">{criticalCount} critical</span>
            </div>
          )}
          <span className="text-xs font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
            {activeCount} active / {alerts.length} total
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mr-1">Severity</span>
          {severityOptions.map(({ value, label }) => (
            <button key={value} onClick={() => setSeverity(value)} className={filterBtn(severity === value)}>
              {value !== "all" && (
                <span className={cn("inline-block w-2 h-2 rounded-full mr-1.5", severityDotColor[value])} />
              )}
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap sm:ml-4">
          <span className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mr-1">Status</span>
          {statusOptions.map(({ value, label }) => (
            <button key={value} onClick={() => setStatus(value)} className={filterBtn(status === value)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><PageSpinner /></div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <AlertTriangle className="w-10 h-10 text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mb-3 opacity-30" />
          <p className="font-display font-semibold text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] mb-1">
            No alerts found
          </p>
          <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
            {severity !== "all" || status !== "all"
              ? "Try adjusting the filters above."
              : "All clear — no alerts for this district."}
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial="initial"
          animate="animate"
          variants={{ animate: { transition: { staggerChildren: 0.05 } } }}
          className="space-y-2"
        >
          {filtered.map((alert: Alert) => (
            <motion.div
              key={alert.id}
              variants={{ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } }}
            >
              <AlertItem alert={alert} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {!isLoading && filtered.length > 0 && (
        <p className="text-xs font-body text-center text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
          Showing {filtered.length} of {alerts.length} alerts · Refreshes every 30s
        </p>
      )}
    </motion.div>
  );
}
