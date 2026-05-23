"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Truck, User, CheckCircle2, XCircle, Users } from "lucide-react";
import { PageSpinner } from "@/components/ui/spinner";
import { Pagination } from "@/components/ui/pagination";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useDistrict } from "@/context/DistrictContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Gatherer {
  id: string;
  name: string;
  phone: string;
  district: string;
  vehicle_type: string;
  capacity_litres: number | null;
  is_available: boolean;
  is_active: boolean;
  latitude: number | null;
  longitude: number | null;
  total_jobs: number;
  completed_jobs: number;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const cardClass =
  "bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] rounded-[var(--radius-lg)]";

const sectionLabel =
  "font-display font-semibold text-xs text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wider mb-4";

const tableHeaders = [
  "Name", "Phone", "District", "Vehicle Type", "Capacity (L)", "Availability", "Jobs Done", "Completion Rate",
];

const rowVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GatherersPage() {
  const { district } = useDistrict();
  const [availableOnly, setAvailableOnly] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const { data: gatherers = [], isLoading } = useQuery({
    queryKey: ["gatherers", district],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "100" });
      if (district !== "Northern") params.set("district", district);
      const { data } = await api.get(`/gatherers?${params}`);
      return (data.data ?? []) as Gatherer[];
    },
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });

  // Derived stats
  const total     = gatherers.length;
  const available = gatherers.filter((g) => g.is_available).length;
  const active    = gatherers.filter((g) => g.is_active).length;

  // Filter
  const filtered  = availableOnly ? gatherers.filter((g) => g.is_available) : gatherers;
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">
            Sludge Gatherers
          </h1>
          <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mt-0.5">
            Fecal sludge collection operators in {district}
          </p>
        </div>
        <span className="text-xs font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] self-start sm:self-center">
          {filtered.length} filtered · {total} total
        </span>
      </div>

      {/* Stat cards + availability indicator */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total */}
        <div className={`${cardClass} p-4 flex flex-col gap-1`}>
          <div className="flex items-center gap-2 mb-0.5">
            <Users className="w-4 h-4 text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]" />
            <p className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wide">
              Total
            </p>
          </div>
          <p className="font-display font-bold text-2xl tabular-nums text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">
            {total}
          </p>
        </div>

        {/* Available */}
        <div className={`${cardClass} p-4 flex flex-col gap-1`}>
          <div className="flex items-center gap-2 mb-0.5">
            <CheckCircle2 className="w-4 h-4 text-[var(--color-ok)]" />
            <p className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wide">
              Available
            </p>
          </div>
          <p className="font-display font-bold text-2xl tabular-nums text-[var(--color-ok)]">
            {available}
          </p>
        </div>

        {/* Active */}
        <div className={`${cardClass} p-4 flex flex-col gap-1`}>
          <div className="flex items-center gap-2 mb-0.5">
            <Truck className="w-4 h-4 text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]" />
            <p className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wide">
              Active
            </p>
          </div>
          <p className="font-display font-bold text-2xl tabular-nums text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">
            {active}
          </p>
        </div>

        {/* Animated availability badge */}
        <div
          className={cn(
            cardClass,
            "p-4 flex flex-col items-center justify-center gap-2",
            available > 0
              ? "border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950"
              : ""
          )}
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "w-2.5 h-2.5 rounded-full flex-shrink-0",
                available > 0
                  ? "bg-green-500 animate-pulse"
                  : "bg-gray-400"
              )}
            />
            <span
              className={cn(
                "font-display font-bold text-2xl tabular-nums",
                available > 0
                  ? "text-[var(--color-ok)]"
                  : "text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]"
              )}
            >
              {available}
            </span>
          </div>
          <p
            className={cn(
              "text-xs font-body text-center",
              available > 0
                ? "text-green-700 dark:text-green-300 font-semibold"
                : "text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]"
            )}
          >
            {available === 1 ? "gatherer available" : "gatherers available"}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => setAvailableOnly(e.target.checked)}
            className="w-3.5 h-3.5 rounded accent-[var(--color-primary)]"
          />
          <span className="text-xs font-body text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)]">
            Available only
          </span>
        </label>
        <span className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
          Refreshes every 2 minutes
        </span>
      </div>

      {/* Table */}
      <div className={`${cardClass} overflow-hidden`}>
        <div className="p-5 pb-0">
          <p className={sectionLabel}>Gatherer Roster</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-14">
            <PageSpinner />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-5">
            <Truck className="w-9 h-9 text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mb-3 opacity-25" />
            <p className="font-display font-semibold text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] mb-1">
              No gatherers found
            </p>
            <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
              {availableOnly
                ? "No gatherers are currently available."
                : `No gatherers registered in ${district}.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)]">
                  {tableHeaders.map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-body font-semibold uppercase tracking-wider text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <motion.tbody
                initial="initial"
                animate="animate"
                variants={{ animate: { transition: { staggerChildren: 0.04 } } }}
              >
                {paginated.map((gatherer) => {
                  const completionRate =
                    gatherer.total_jobs > 0
                      ? Math.round((gatherer.completed_jobs / gatherer.total_jobs) * 100)
                      : 0;

                  return (
                    <motion.tr
                      key={gatherer.id}
                      variants={rowVariants}
                      className="border-b border-[var(--color-border)]/50 dark:border-[var(--color-border-dark)]/50 hover:bg-[var(--color-bg)] dark:hover:bg-[var(--color-bg-dark)] transition-colors"
                    >
                      {/* Name */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] flex items-center justify-center flex-shrink-0">
                            <User className="w-3 h-3 text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]" />
                          </div>
                          <span className="font-body font-medium text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">
                            {gatherer.name}
                          </span>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-5 py-3 font-mono text-xs text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] whitespace-nowrap">
                        {gatherer.phone || "—"}
                      </td>

                      {/* District */}
                      <td className="px-5 py-3 font-body text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] whitespace-nowrap">
                        {gatherer.district}
                      </td>

                      {/* Vehicle type */}
                      <td className="px-5 py-3 font-body text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] capitalize whitespace-nowrap">
                        {(gatherer.vehicle_type ?? "—").replace(/_/g, " ")}
                      </td>

                      {/* Capacity */}
                      <td className="px-5 py-3 font-mono text-xs text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] whitespace-nowrap tabular-nums">
                        {gatherer.capacity_litres != null
                          ? gatherer.capacity_litres.toLocaleString()
                          : "—"}
                      </td>

                      {/* Availability badge */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        {gatherer.is_available ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900 text-xs font-body font-semibold text-[var(--color-ok)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                            Available
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)] border-[var(--color-border)] dark:border-[var(--color-border-dark)] text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                            Busy
                          </span>
                        )}
                      </td>

                      {/* Jobs done */}
                      <td className="px-5 py-3 font-mono text-xs text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] whitespace-nowrap tabular-nums">
                        {gatherer.completed_jobs} / {gatherer.total_jobs}
                      </td>

                      {/* Completion rate with bg bar */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2 min-w-[80px]">
                          <div className="flex-1 h-1.5 bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)] rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                completionRate >= 80
                                  ? "bg-[var(--color-ok)]"
                                  : completionRate >= 50
                                  ? "bg-[var(--color-ochre)]"
                                  : "bg-[var(--color-warning)]"
                              )}
                              style={{ width: `${completionRate}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs font-semibold tabular-nums text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] w-9 text-right">
                            {gatherer.total_jobs > 0 ? `${completionRate}%` : "—"}
                          </span>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </motion.tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination page={page} total={filtered.length} limit={PAGE_SIZE} onChange={setPage} />
    </motion.div>
  );
}
