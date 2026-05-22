"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, Activity, CheckCircle2,
  AlertOctagon, Zap, Bell, RefreshCw,
} from "lucide-react";
import { AlertItem } from "@/components/ui/alert-item";
import { PageSpinner } from "@/components/ui/spinner";
import {
  useAlerts, useAcknowledgeAlert, useResolveAlert,
} from "@/hooks/useDashboard";
import { useDistrict } from "@/context/DistrictContext";
import { cn } from "@/lib/utils";
import type { Alert } from "@/types";

type Severity = "all" | "critical" | "high" | "moderate" | "low";
type Status   = "all" | "active" | "acknowledged" | "resolved";

const SEVERITY_OPTS: { value: Severity; label: string; dot?: string }[] = [
  { value: "all",      label: "All" },
  { value: "critical", label: "Critical", dot: "bg-[var(--color-critical)]" },
  { value: "high",     label: "High",     dot: "bg-orange-500" },
  { value: "moderate", label: "Moderate", dot: "bg-amber-500" },
  { value: "low",      label: "Low",      dot: "bg-blue-500" },
];

const STATUS_OPTS: { value: Status; label: string; icon?: React.ElementType }[] = [
  { value: "all",          label: "All" },
  { value: "active",       label: "Active",       icon: AlertOctagon },
  { value: "acknowledged", label: "Acknowledged", icon: Activity },
  { value: "resolved",     label: "Resolved",     icon: CheckCircle2 },
];

function FilterBtn({ active, children, onClick }: {
  active: boolean; children: React.ReactNode; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-md text-xs font-body font-medium transition-all duration-150 flex items-center gap-1.5",
        active
          ? "bg-[var(--color-primary)] text-white shadow-sm"
          : "bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)] text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)]"
      )}
    >
      {children}
    </button>
  );
}

function StatCard({ label, value, sub, accent }: {
  label: string; value: number; sub?: string; accent?: string;
}) {
  return (
    <div className="flex-1 min-w-[100px] rounded-lg bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] p-3">
      <p className="text-[10px] font-body font-semibold text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className={cn("text-xl font-display font-bold", accent ?? "text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]")}>
        {value}
      </p>
      {sub && <p className="text-[10px] font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AlertsPage() {
  const { district } = useDistrict();
  const [severity, setSeverity] = useState<Severity>("all");
  const [status,   setStatus]   = useState<Status>("active");

  const { data: alerts = [], isLoading, dataUpdatedAt, refetch, isFetching } = useAlerts(district);

  const ackMut     = useAcknowledgeAlert(district);
  const resolveMut = useResolveAlert(district);

  const filtered = alerts.filter((a: Alert) => {
    const matchSeverity = severity === "all" || a.severity === severity;
    const matchStatus   = status   === "all" || a.status   === status;
    return matchSeverity && matchStatus;
  });

  const criticalCount  = alerts.filter((a: Alert) => a.severity === "critical" && a.status === "active").length;
  const activeCount    = alerts.filter((a: Alert) => a.status === "active").length;
  const ackCount       = alerts.filter((a: Alert) => a.status === "acknowledged").length;
  const resolvedCount  = alerts.filter((a: Alert) => a.status === "resolved").length;
  const highRiskCount  = alerts.filter((a: Alert) => ["critical","high"].includes(a.severity) && a.status === "active").length;

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-5"
    >
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Bell className="w-5 h-5 text-[var(--color-primary)]" />
            <h1 className="font-display font-bold text-2xl text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">
              Alerts
            </h1>
          </div>
          <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
            Real-time sanitation alerts across {district}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {criticalCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--color-critical)]/10 border border-[var(--color-critical)]/20">
              <span className="w-2 h-2 rounded-full bg-[var(--color-critical)] animate-pulse" />
              <span className="text-xs font-body font-semibold text-[var(--color-critical)]">
                {criticalCount} critical
              </span>
            </div>
          )}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 rounded-md border border-[var(--color-border)] dark:border-[var(--color-border-dark)] text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 transition-colors disabled:opacity-50"
            title="Refresh alerts"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
          </button>
          {lastUpdated && (
            <span className="text-xs font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
              {lastUpdated}
            </span>
          )}
        </div>
      </div>

      {/* ── Stats row ── */}
      {!isLoading && alerts.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <StatCard label="Active"       value={activeCount}   accent="text-[var(--color-critical)]" sub="need action" />
          <StatCard label="High Risk"    value={highRiskCount}  accent="text-orange-600 dark:text-orange-400" />
          <StatCard label="Acknowledged" value={ackCount}       sub="under review" />
          <StatCard label="Resolved"     value={resolvedCount}  accent="text-[var(--color-ok)]" />
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-start">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-body font-medium text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mr-0.5">Severity</span>
          {SEVERITY_OPTS.map(({ value, label, dot }) => (
            <FilterBtn key={value} active={severity === value} onClick={() => setSeverity(value)}>
              {dot && <span className={cn("w-2 h-2 rounded-full", dot)} />}
              {label}
            </FilterBtn>
          ))}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap sm:ml-2 sm:pl-2 sm:border-l sm:border-[var(--color-border)] dark:sm:border-[var(--color-border-dark)]">
          <span className="text-xs font-body font-medium text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mr-0.5">Status</span>
          {STATUS_OPTS.map(({ value, label, icon: SIcon }) => (
            <FilterBtn key={value} active={status === value} onClick={() => setStatus(value)}>
              {SIcon && <SIcon className="w-3 h-3" />}
              {label}
            </FilterBtn>
          ))}
        </div>
      </div>

      {/* ── Alert list ── */}
      {isLoading ? (
        <div className="flex justify-center py-16"><PageSpinner /></div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          {status === "active" && activeCount === 0 ? (
            <>
              <CheckCircle2 className="w-12 h-12 text-[var(--color-ok)] mb-3 opacity-60" />
              <p className="font-display font-semibold text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] mb-1">
                All clear
              </p>
              <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
                No active alerts for {district}
              </p>
            </>
          ) : (
            <>
              <AlertTriangle className="w-10 h-10 text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mb-3 opacity-30" />
              <p className="font-display font-semibold text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] mb-1">
                No alerts found
              </p>
              <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
                Try adjusting the severity or status filters.
              </p>
            </>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial="initial"
          animate="animate"
          variants={{ animate: { transition: { staggerChildren: 0.04 } } }}
          className="space-y-2"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((alert: Alert) => (
              <motion.div
                key={alert.id}
                layout
                variants={{ initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 } }}
                exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
              >
                <AlertItem
                  alert={alert}
                  onAcknowledge={alert.status === "active" ? (id) => ackMut.mutate(id) : undefined}
                  onResolve={["active","acknowledged"].includes(alert.status) ? (id) => resolveMut.mutate(id) : undefined}
                  isAcknowledging={ackMut.isPending && ackMut.variables === alert.id}
                  isResolving={resolveMut.isPending && resolveMut.variables === alert.id}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {!isLoading && filtered.length > 0 && (
        <p className="text-xs font-body text-center text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
          Showing {filtered.length} of {alerts.length} alerts · Auto-refreshes every 30s
        </p>
      )}
    </motion.div>
  );
}
