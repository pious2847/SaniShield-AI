"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Droplets, MapPin, Clock, ChevronRight, CheckCircle2,
  Truck, PackageCheck, ArrowLeft, AlertTriangle, Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageSpinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import type { SludgeJob } from "@/types";

type Tab = "jobs" | "alerts";

const statusConfig: Record<string, { label: string; color: string; bg: string; next?: string; nextLabel?: string }> = {
  assigned:   { label: "Assigned to You",  color: "text-blue-600 dark:text-blue-400",  bg: "bg-blue-50 dark:bg-blue-950",   next: "accept",  nextLabel: "Accept Job" },
  accepted:   { label: "Accepted",          color: "text-[var(--color-primary)]",       bg: "bg-green-50 dark:bg-green-950", next: "pickup",  nextLabel: "Log Pickup" },
  in_transit: { label: "In Transit",        color: "text-[var(--color-warning)]",       bg: "bg-orange-50 dark:bg-orange-950", next: "deliver", nextLabel: "Confirm Delivery" },
  delivered:  { label: "Delivered",         color: "text-[var(--color-info)]",          bg: "bg-blue-50 dark:bg-blue-950" },
  completed:  { label: "Completed",         color: "text-[var(--color-ok)]",            bg: "bg-green-50 dark:bg-green-950" },
  pending:    { label: "Pending",           color: "text-[var(--color-ochre)]",         bg: "bg-amber-50 dark:bg-amber-950" },
};

function JobCard({ job, onAdvance }: { job: SludgeJob; onAdvance: (id: string, action: string) => void }) {
  const cfg = statusConfig[job.status] ?? statusConfig.pending;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className={cn(
        "rounded-2xl border p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
        "bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)]",
        "border-[var(--color-border)] dark:border-[var(--color-border-dark)]"
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-xs font-body font-semibold px-2 py-0.5 rounded-full", cfg.color, cfg.bg)}>
              {cfg.label}
            </span>
          </div>
          <p className="font-display font-semibold text-base text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">
            {job.toilet_name ?? `Toilet ${job.toilet_id.slice(0, 6)}`}
          </p>
        </div>
        <span className="font-mono text-[10px] text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] flex-shrink-0 mt-0.5">
          #{job.id.slice(0, 8)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-[var(--color-text-3)] flex-shrink-0" />
          <span className="text-xs font-body text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] truncate">
            {job.community ?? "—"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Droplets className="w-3.5 h-3.5 text-[var(--color-text-3)] flex-shrink-0" />
          <span className="text-xs font-body text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] capitalize">
            {job.waste_type}
          </span>
        </div>
        {job.volume_litres && (
          <div className="flex items-center gap-2">
            <PackageCheck className="w-3.5 h-3.5 text-[var(--color-text-3)] flex-shrink-0" />
            <span className="text-xs font-body text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)]">
              {job.volume_litres}L estimated
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[var(--color-text-3)] flex-shrink-0" />
          <span className="text-xs font-body text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)]">
            {timeAgo(job.created_at)}
          </span>
        </div>
      </div>

      {cfg.next && cfg.nextLabel && (
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          onClick={() => onAdvance(job.id, cfg.next!)}
        >
          {cfg.next === "accept"  && <CheckCircle2 className="w-4 h-4" />}
          {cfg.next === "pickup"  && <Truck className="w-4 h-4" />}
          {cfg.next === "deliver" && <PackageCheck className="w-4 h-4" />}
          {cfg.nextLabel}
          <ChevronRight className="w-4 h-4 ml-auto" />
        </Button>
      )}

      {job.status === "completed" && (
        <div className="flex items-center justify-center gap-2 py-2 text-sm font-body text-[var(--color-ok)]">
          <CheckCircle2 className="w-4 h-4" />
          Chain complete
        </div>
      )}
    </motion.div>
  );
}

export default function FieldPage() {
  const [tab, setTab] = useState<Tab>("jobs");
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading } = useQuery<SludgeJob[]>({
    queryKey: ["field-jobs", user?.id],
    queryFn: async () => {
      const { data } = await api.get(`/sludge-jobs?gatherer_id=${user?.id}&limit=20`);
      return data.data ?? [];
    },
    enabled: !!user?.id,
    refetchInterval: 60 * 1000,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["field-alerts"],
    queryFn: async () => {
      const { data } = await api.get("/alerts?limit=20");
      return data.data ?? [];
    },
    refetchInterval: 30 * 1000,
  });

  const advanceMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      await api.put(`/sludge-jobs/${id}/${action}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field-jobs"] });
    },
  });

  const activeJobs    = jobs.filter((j) => !["completed", "cancelled"].includes(j.status));
  const completedJobs = jobs.filter((j) => j.status === "completed");
  const alertCount    = alerts.filter((a: { status: string }) => a.status === "active").length;

  return (
    <div className="flex flex-col h-screen max-h-screen">
      <header className="flex-shrink-0 flex items-center justify-between px-4 h-14 border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)] bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)]">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 grid grid-cols-3 gap-0.5 p-0.5">
            {[...Array(9)].map((_, i) => (
              <div key={i} className={`rounded-[1px] ${i === 4 ? "bg-[var(--color-ochre)]" : "bg-[var(--color-primary)]"}`} />
            ))}
          </div>
          <span className="font-display font-bold text-sm text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">Field View</span>
        </div>
        <div className="flex items-center gap-2">
          {alertCount > 0 && (
            <span className="flex items-center gap-1 text-xs font-body text-[var(--color-critical)] px-2 py-0.5 rounded-full bg-[var(--color-critical-bg)] dark:bg-[var(--color-critical-bg-dark)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-critical)] animate-pulse" />
              {alertCount}
            </span>
          )}
          <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
            <span className="text-white text-xs font-display font-bold">
              {user?.full_name?.[0]?.toUpperCase() ?? "W"}
            </span>
          </div>
        </div>
      </header>

      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        <p className="font-display font-semibold text-lg text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},{" "}
          {user?.full_name?.split(" ")[0] ?? "Worker"}
        </p>
        <p className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mt-0.5">
          {activeJobs.length} active job{activeJobs.length !== 1 ? "s" : ""} · {completedJobs.length} completed today
        </p>
      </div>

      <div className="flex-shrink-0 flex gap-1 px-4 pb-3">
        {([["jobs", "My Jobs"], ["alerts", "Alerts"]] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-2 text-sm font-body font-medium rounded-[var(--radius-md)] transition-all duration-150",
              tab === t
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)]"
            )}
          >
            {label}
            {t === "alerts" && alertCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[var(--color-critical)] text-white text-[10px] font-mono">
                {alertCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <AnimatePresence mode="wait">
          {tab === "jobs" ? (
            <motion.div
              key="jobs"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {isLoading ? (
                <div className="flex justify-center pt-10"><PageSpinner /></div>
              ) : activeJobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center pt-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-[var(--color-ok)] opacity-30 mb-3" />
                  <p className="font-display font-semibold text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] mb-1">All clear!</p>
                  <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
                    No active jobs assigned to you.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs font-body font-semibold uppercase tracking-wider text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
                    Active
                  </p>
                  {activeJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onAdvance={(id, action) => advanceMutation.mutate({ id, action })}
                    />
                  ))}
                  {completedJobs.length > 0 && (
                    <>
                      <p className="text-xs font-body font-semibold uppercase tracking-wider text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] pt-2">
                        Completed
                      </p>
                      {completedJobs.map((job) => (
                        <JobCard
                          key={job.id}
                          job={job}
                          onAdvance={(id, action) => advanceMutation.mutate({ id, action })}
                        />
                      ))}
                    </>
                  )}
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="alerts"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-2"
            >
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center pt-12 text-center">
                  <Bell className="w-10 h-10 text-[var(--color-text-3)] opacity-30 mb-3" />
                  <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">No alerts</p>
                </div>
              ) : (
                alerts.slice(0, 20).map((alert: { id: string; severity: string; message: string; status: string; created_at: string; district?: string }) => (
                  <div
                    key={alert.id}
                    className={cn(
                      "flex gap-3 p-3 rounded-xl border",
                      alert.severity === "critical" ? "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900"
                        : alert.severity === "high" ? "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-900"
                        : "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-900"
                    )}
                  >
                    <AlertTriangle className={cn(
                      "w-4 h-4 flex-shrink-0 mt-0.5",
                      alert.severity === "critical" ? "text-[var(--color-critical)]"
                        : alert.severity === "high" ? "text-orange-500"
                        : "text-[var(--color-warning)]"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-body font-medium text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] leading-tight">
                        {alert.message}
                      </p>
                      <p className="text-xs font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mt-0.5">
                        {timeAgo(alert.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-shrink-0 flex border-t border-[var(--color-border)] dark:border-[var(--color-border-dark)] bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] safe-area-bottom">
        {[
          { tab: "jobs" as Tab,   Icon: Droplets,  label: "Jobs" },
          { tab: "alerts" as Tab, Icon: Bell,       label: "Alerts", badge: alertCount },
        ].map(({ tab: t, Icon, label, badge }) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-3 transition-colors",
              tab === t
                ? "text-[var(--color-primary)] dark:text-[var(--color-primary-dark)]"
                : "text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]"
            )}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {badge !== undefined && badge > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[var(--color-critical)] text-white text-[8px] font-mono flex items-center justify-center">
                  {badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-body">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
