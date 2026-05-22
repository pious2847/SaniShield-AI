"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Droplets, ArrowRight } from "lucide-react";
import { PageSpinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import type { SludgeJob } from "@/types";

const cardClass =
  "bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] rounded-[var(--radius-lg)]";

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: "Pending",    color: "text-[var(--color-ochre)]",    bg: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-900" },
  assigned:   { label: "Assigned",   color: "text-blue-600 dark:text-blue-400",  bg: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900" },
  accepted:   { label: "Accepted",   color: "text-blue-600 dark:text-blue-400",  bg: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900" },
  in_transit: { label: "In Transit", color: "text-[var(--color-warning)]",  bg: "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-900" },
  delivered:  { label: "Delivered",  color: "text-[var(--color-info)]",     bg: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900" },
  completed:  { label: "Completed",  color: "text-[var(--color-ok)]",       bg: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900" },
  cancelled:  { label: "Cancelled",  color: "text-[var(--color-text-3)]",   bg: "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800" },
};

const pipeline = ["pending", "assigned", "accepted", "in_transit", "delivered", "completed"];

export default function SludgePage() {
  const district = "Tamale Metro";

  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ["sludge-jobs", district],
    queryFn: async () => {
      const { data } = await api.get("/sludge-jobs?limit=50");
      return (data.data ?? []) as SludgeJob[];
    },
    staleTime: 60 * 1000,
  });

  const { data: statsData } = useQuery({
    queryKey: ["sludge-chain-stats"],
    queryFn: async () => {
      const { data } = await api.get("/sludge-jobs/stats/chain");
      const rows: Array<{ district: string; total: number; completed: number; completion_rate: number }> =
        data.data ?? [];
      return rows;
    },
    staleTime: 60 * 1000,
  });

  const jobs = jobsData ?? [];
  const districtStats = statsData?.find((r) => r.district === district);
  const rate = districtStats?.completion_rate ?? 0;

  const countByStatus = (s: string) => jobs.filter((j) => j.status === s).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      <div>
        <h1 className="font-display font-bold text-2xl text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">
          Sludge Chain
        </h1>
        <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mt-0.5">
          Track fecal sludge collection → transport → treatment in {district}
        </p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Total Jobs",  value: jobs.length },
          { label: "Pending",     value: countByStatus("pending") + countByStatus("assigned") + countByStatus("accepted") },
          { label: "In Transit",  value: countByStatus("in_transit") + countByStatus("delivered") },
          { label: "Completed",   value: countByStatus("completed") },
        ].map(({ label, value }) => (
          <div
            key={label}
            className={`${cardClass} p-4 flex flex-col gap-1`}
          >
            <p className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wide">{label}</p>
            <p className="font-display font-bold text-2xl text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div className={`${cardClass} p-5`}>
        <div className="flex items-center justify-between mb-3">
          <p className="font-display font-semibold text-xs text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wider">
            Chain Completion Rate
          </p>
          <span className="font-mono font-bold text-sm text-[var(--color-primary)] dark:text-[var(--color-primary-dark)]">
            {Math.round(rate)}%
          </span>
        </div>
        <div className="h-2.5 bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[var(--color-primary)] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${rate}%` }}
            transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1], delay: 0.3 }}
          />
        </div>
        <p className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mt-2">
          {districtStats ? `${districtStats.completed} of ${districtStats.total} jobs completed end-to-end` : "No stats available"}
        </p>
      </div>

      <div className={`${cardClass} p-5`}>
        <p className="font-display font-semibold text-xs text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wider mb-4">
          Service Pipeline
        </p>
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {pipeline.map((step, i) => {
            const count = countByStatus(step);
            const cfg   = statusConfig[step];
            return (
              <div key={step} className="flex items-center gap-1 flex-shrink-0">
                <div className={cn(
                  "flex flex-col items-center px-3 py-2 rounded-[var(--radius-md)] border min-w-[80px]",
                  cfg.bg
                )}>
                  <span className={cn("text-xs font-body font-semibold", cfg.color)}>{cfg.label}</span>
                  <span className={cn("font-mono font-bold text-lg tabular-nums", cfg.color)}>{count}</span>
                </div>
                {i < pipeline.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--color-border)] dark:text-[var(--color-border-dark)] flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className={`${cardClass} overflow-hidden`}>
        <div className="p-5 pb-0">
          <p className="font-display font-semibold text-xs text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wider mb-4">
            Recent Jobs
          </p>
        </div>

        {jobsLoading ? (
          <div className="flex justify-center py-10"><PageSpinner /></div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-5">
            <Droplets className="w-8 h-8 text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mb-2 opacity-30" />
            <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">No sludge jobs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)]">
                  {["Job ID", "Community", "Status", "Waste Type", "Volume (L)", "Updated"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-body font-semibold uppercase tracking-wider text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.map((job, idx) => {
                  const cfg = statusConfig[job.status] ?? statusConfig.pending;
                  return (
                    <motion.tr
                      key={job.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.03 }}
                      className="border-b border-[var(--color-border)]/50 dark:border-[var(--color-border-dark)]/50 hover:bg-[var(--color-bg)] dark:hover:bg-[var(--color-bg-dark)] transition-colors"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
                        {job.id.slice(0, 8)}…
                      </td>
                      <td className="px-5 py-3 font-body text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)]">
                        {job.community ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn("px-2 py-0.5 rounded-full border text-xs font-body font-semibold", cfg.color, cfg.bg)}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-body text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] capitalize">
                        {job.waste_type}
                      </td>
                      <td className="px-5 py-3 font-mono text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)]">
                        {job.volume_litres ?? "—"}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
                        {timeAgo(job.updated_at)}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
