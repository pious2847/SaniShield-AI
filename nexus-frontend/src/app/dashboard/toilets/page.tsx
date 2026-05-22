"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Toilet,
  CheckCircle2,
  XCircle,
  QrCode,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { PageSpinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn, DISTRICTS } from "@/lib/utils";
import { useDistrict } from "@/context/DistrictContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Toilet {
  id: string;
  owner_name: string;
  community: string;
  district: string;
  toilet_type: string;
  condition: "good" | "fair" | "poor" | "non_functional";
  is_verified: boolean;
  vulnerability_score: number;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

interface DistrictCount {
  district: string;
  total: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const cardClass =
  "bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] rounded-[var(--radius-lg)]";

const sectionLabel =
  "font-display font-semibold text-xs text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wider mb-4";

type Condition = "all" | "good" | "fair" | "poor" | "non_functional";

const conditionOptions: { value: Condition; label: string }[] = [
  { value: "all",            label: "All Conditions" },
  { value: "good",           label: "Good" },
  { value: "fair",           label: "Fair" },
  { value: "poor",           label: "Poor" },
  { value: "non_functional", label: "Non-Functional" },
];

const conditionConfig: Record<
  string,
  { label: string; color: string; bg: string; dot: string }
> = {
  good:           { label: "Good",          color: "text-[var(--color-ok)]",       bg: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900",   dot: "bg-green-500" },
  fair:           { label: "Fair",           color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-900",  dot: "bg-amber-500" },
  poor:           { label: "Poor",           color: "text-[var(--color-warning)]",  bg: "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-900", dot: "bg-orange-500" },
  non_functional: { label: "Non-Functional", color: "text-[var(--color-critical)]", bg: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900",           dot: "bg-red-500" },
};

function filterBtn(active: boolean) {
  return cn(
    "px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-body font-medium transition-all duration-150 whitespace-nowrap",
    active
      ? "bg-[var(--color-primary)] text-white"
      : "bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)] text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] hover:border-[var(--color-primary)]/50"
  );
}

const tableHeaders = [
  "ID", "Owner", "Community", "Type", "Condition", "Verified", "Vuln Score", "Actions",
];

const rowVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ToiletsPage() {
  const { district } = useDistrict();
  const queryClient = useQueryClient();

  const [conditionFilter, setConditionFilter] = useState<Condition>("all");
  const [verifiedOnly, setVerifiedOnly]       = useState(false);

  // Toilets query
  const { data: toilets = [], isLoading } = useQuery({
    queryKey: ["toilets", district],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "100" });
      if (district !== "Northern") params.set("district", district);
      const { data } = await api.get(`/toilets?${params}`);
      return (data.data ?? []) as Toilet[];
    },
    staleTime: 2 * 60 * 1000,
  });

  // District count bars
  const { data: districtCounts = [] } = useQuery({
    queryKey: ["toilets-count-by-district"],
    queryFn: async () => {
      const { data } = await api.get("/toilets/count-by-district");
      return (data.data ?? []) as DistrictCount[];
    },
    staleTime: 2 * 60 * 1000,
  });

  // Verify mutation
  const verifyMutation = useMutation({
    mutationFn: (id: string) => api.put(`/toilets/${id}/verify`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["toilets", district] });
    },
  });

  // Derived stats
  const total      = toilets.length;
  const verified   = toilets.filter((t) => t.is_verified).length;
  const unverified = total - verified;
  const avgVuln    = total > 0
    ? (toilets.reduce((s, t) => s + (t.vulnerability_score ?? 0), 0) / total).toFixed(1)
    : "—";

  // Filters
  const filtered = toilets.filter((t) => {
    const matchCondition = conditionFilter === "all" || t.condition === conditionFilter;
    const matchVerified  = !verifiedOnly || t.is_verified;
    return matchCondition && matchVerified;
  });

  const maxCount = Math.max(...districtCounts.map((d) => d.total), 1);

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
            Toilet Registry
          </h1>
          <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mt-0.5">
            Registered sanitation facilities in {district}
          </p>
        </div>
        <span className="text-xs font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] self-start sm:self-center">
          {filtered.length} / {total} shown
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Total Toilets",      value: total,      icon: Toilet,        color: "" },
          { label: "Verified",           value: verified,   icon: CheckCircle2,  color: "text-[var(--color-ok)]" },
          { label: "Unverified",         value: unverified, icon: XCircle,       color: unverified > 0 ? "text-[var(--color-warning)]" : "" },
          { label: "Avg Vulnerability",  value: avgVuln,    icon: ShieldCheck,   color: "" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`${cardClass} p-4 flex flex-col gap-1`}>
            <div className="flex items-center gap-2 mb-0.5">
              <Icon className={cn("w-4 h-4 flex-shrink-0", color || "text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]")} />
              <p className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wide">
                {label}
              </p>
            </div>
            <p className={cn(
              "font-display font-bold text-2xl tabular-nums",
              color || "text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]"
            )}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* District count bars */}
      {districtCounts.length > 0 && (
        <div className={`${cardClass} p-5`}>
          <p className={sectionLabel}>Toilets by District</p>
          <div className="space-y-2.5">
            {districtCounts
              .slice()
              .sort((a, b) => b.total - a.total)
              .map((row) => (
                <div key={row.district} className="flex items-center gap-3">
                  <span className="font-body text-xs text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] w-32 flex-shrink-0 truncate">
                    {row.district}
                  </span>
                  <div className="flex-1 h-2 bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-[var(--color-primary)] rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(row.total / maxCount) * 100}%` }}
                      transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                    />
                  </div>
                  <span className="font-mono text-xs text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] w-8 text-right tabular-nums">
                    {row.total}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mr-1">
            Condition
          </span>
          {conditionOptions.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setConditionFilter(value)}
              className={filterBtn(conditionFilter === value)}
            >
              {value !== "all" && conditionConfig[value] && (
                <span
                  className={cn(
                    "inline-block w-2 h-2 rounded-full mr-1.5",
                    conditionConfig[value].dot
                  )}
                />
              )}
              {label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 cursor-pointer sm:ml-4 self-center">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
            className="w-3.5 h-3.5 rounded accent-[var(--color-primary)]"
          />
          <span className="text-xs font-body text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)]">
            Verified only
          </span>
        </label>
      </div>

      {/* Table */}
      <div className={`${cardClass} overflow-hidden`}>
        <div className="p-5 pb-0">
          <p className={sectionLabel}>Facility List</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-14">
            <PageSpinner />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-5">
            <Toilet className="w-9 h-9 text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mb-3 opacity-25" />
            <p className="font-display font-semibold text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] mb-1">
              No toilets found
            </p>
            <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
              {conditionFilter !== "all" || verifiedOnly
                ? "Try adjusting the filters above."
                : `No facilities registered in ${district}.`}
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
                {filtered.map((toilet) => {
                  const cond = conditionConfig[toilet.condition];
                  const isPending = verifyMutation.isPending &&
                    verifyMutation.variables === toilet.id;

                  return (
                    <motion.tr
                      key={toilet.id}
                      variants={rowVariants}
                      className="border-b border-[var(--color-border)]/50 dark:border-[var(--color-border-dark)]/50 hover:bg-[var(--color-bg)] dark:hover:bg-[var(--color-bg-dark)] transition-colors"
                    >
                      {/* ID */}
                      <td className="px-5 py-3 font-mono text-xs text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] whitespace-nowrap">
                        {toilet.id.slice(0, 8)}…
                      </td>

                      {/* Owner */}
                      <td className="px-5 py-3 font-body text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] whitespace-nowrap">
                        {toilet.owner_name || "—"}
                      </td>

                      {/* Community */}
                      <td className="px-5 py-3 font-body text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] whitespace-nowrap">
                        {toilet.community || "—"}
                      </td>

                      {/* Type */}
                      <td className="px-5 py-3 font-body text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] capitalize whitespace-nowrap">
                        {(toilet.toilet_type ?? "—").replace(/_/g, " ")}
                      </td>

                      {/* Condition badge */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        {cond ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-body font-semibold",
                              cond.color,
                              cond.bg
                            )}
                          >
                            <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cond.dot)} />
                            {cond.label}
                          </span>
                        ) : (
                          <span className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
                            {toilet.condition ?? "—"}
                          </span>
                        )}
                      </td>

                      {/* Verified badge */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        {toilet.is_verified ? (
                          <span className="inline-flex items-center gap-1 text-xs font-body font-semibold text-[var(--color-ok)]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
                            <XCircle className="w-3.5 h-3.5" />
                            Unverified
                          </span>
                        )}
                      </td>

                      {/* Vuln Score */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span
                          className={cn(
                            "font-mono text-xs font-semibold tabular-nums",
                            (toilet.vulnerability_score ?? 0) >= 70
                              ? "text-[var(--color-critical)]"
                              : (toilet.vulnerability_score ?? 0) >= 40
                              ? "text-[var(--color-warning)]"
                              : "text-[var(--color-ok)]"
                          )}
                        >
                          {toilet.vulnerability_score != null
                            ? toilet.vulnerability_score.toFixed(1)
                            : "—"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {!toilet.is_verified && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isPending}
                              onClick={() => verifyMutation.mutate(toilet.id)}
                              className="h-7 text-xs gap-1 border-[var(--color-ok)]/40 text-[var(--color-ok)] hover:bg-green-50 dark:hover:bg-green-950 hover:border-[var(--color-ok)] disabled:opacity-50"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              {isPending ? "Verifying…" : "Verify"}
                            </Button>
                          )}
                          <a
                            href={`/report?toilet_id=${toilet.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 h-7 px-2 rounded-[var(--radius-md)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)] transition-colors"
                          >
                            <QrCode className="w-3 h-3" />
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
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
    </motion.div>
  );
}
