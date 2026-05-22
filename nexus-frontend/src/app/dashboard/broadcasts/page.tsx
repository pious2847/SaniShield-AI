"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Radio } from "lucide-react";
import { PageSpinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import { useDistrict } from "@/context/DistrictContext";

// ─── types ────────────────────────────────────────────────────────────────────

interface Broadcast {
  id: string;
  title: string;
  message: string;
  severity: "critical" | "high" | "moderate" | "low";
  broadcast_type: string;
  status: "sent" | "pending" | "draft";
  target_districts: string[];
  created_at: string;
}

type SeverityFilter = "all" | "critical" | "high" | "moderate";
type StatusFilter   = "all" | "pending" | "sent";

// ─── design tokens ────────────────────────────────────────────────────────────

const cardClass =
  "bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] rounded-[var(--radius-lg)]";

const severityConfig: Record<
  string,
  { dot: string; text: string; bg: string; label: string }
> = {
  critical: {
    dot:   "bg-[var(--color-critical)]",
    text:  "text-[var(--color-critical)]",
    bg:    "bg-red-50 dark:bg-red-950",
    label: "Critical",
  },
  high: {
    dot:   "bg-orange-500",
    text:  "text-orange-600",
    bg:    "bg-orange-50 dark:bg-orange-950",
    label: "High",
  },
  moderate: {
    dot:   "bg-[var(--color-warning)]",
    text:  "text-[var(--color-warning)]",
    bg:    "bg-amber-50 dark:bg-amber-950",
    label: "Moderate",
  },
  low: {
    dot:   "bg-[var(--color-primary)]",
    text:  "text-[var(--color-primary)]",
    bg:    "bg-green-50 dark:bg-green-950",
    label: "Low",
  },
};

const statusBadge: Record<string, string> = {
  sent:    "text-[var(--color-ok)] bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900",
  pending: "text-[var(--color-warning)] bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-900",
  draft:   "text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)] border-[var(--color-border)] dark:border-[var(--color-border-dark)]",
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function filterBtn(active: boolean) {
  return cn(
    "px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-body font-medium transition-all duration-150",
    active
      ? "bg-[var(--color-primary)] text-white"
      : "bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)] text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] hover:border-[var(--color-primary)]/50"
  );
}

// ─── card ─────────────────────────────────────────────────────────────────────

function BroadcastCard({ broadcast }: { broadcast: Broadcast }) {
  const sev = severityConfig[broadcast.severity] ?? severityConfig.low;
  const isPulsing = broadcast.severity === "critical" || broadcast.severity === "high";

  return (
    <div className={cn(cardClass, "p-5")}>
      {/* top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "w-2.5 h-2.5 rounded-full flex-shrink-0",
              sev.dot,
              isPulsing && "animate-pulse"
            )}
          />
          <span className={cn("text-xs font-body font-semibold", sev.text)}>
            {sev.label}
          </span>
        </div>
        {/* type chip */}
        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-[var(--radius-md)] bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)] text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] flex-shrink-0">
          {broadcast.broadcast_type}
        </span>
      </div>

      {/* title */}
      <h3 className="font-display font-bold text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] mb-1.5 leading-snug">
        {broadcast.title}
      </h3>

      {/* message */}
      <p className="text-sm font-body text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] leading-relaxed line-clamp-3 mb-4">
        {broadcast.message}
      </p>

      {/* footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[var(--color-border)] dark:border-[var(--color-border-dark)]">
        {/* district chips */}
        <div className="flex flex-wrap gap-1">
          {broadcast.target_districts.map((d) => (
            <span
              key={d}
              className="text-[10px] font-body px-2 py-0.5 rounded-full bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)] text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)]"
            >
              {d}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
            {timeAgo(broadcast.created_at)}
          </span>
          {/* status badge */}
          <span
            className={cn(
              "text-xs font-body font-semibold px-2 py-0.5 rounded-full border capitalize",
              statusBadge[broadcast.status] ?? statusBadge.draft
            )}
          >
            {broadcast.status}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function BroadcastsPage() {
  useDistrict(); // honours district context even if not filtering by it

  const [statusFilter,   setStatusFilter]   = useState<StatusFilter>("all");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");

  const { data: broadcasts = [], isLoading } = useQuery<Broadcast[]>({
    queryKey: ["broadcasts"],
    queryFn: async () => {
      const { data } = await api.get("/broadcasts?limit=30");
      return data.data ?? [];
    },
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
  });

  const filtered = broadcasts.filter((b) => {
    const matchStatus   = statusFilter   === "all" || b.status   === statusFilter;
    const matchSeverity = severityFilter === "all" || b.severity === severityFilter;
    return matchStatus && matchSeverity;
  });

  const statusFilters: { value: StatusFilter; label: string }[] = [
    { value: "all",     label: "All" },
    { value: "pending", label: "Pending" },
    { value: "sent",    label: "Sent" },
  ];

  const severityFilters: { value: SeverityFilter; label: string }[] = [
    { value: "all",      label: "All Severity" },
    { value: "critical", label: "Critical" },
    { value: "high",     label: "High" },
    { value: "moderate", label: "Moderate" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* ── header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">
            AI Broadcasts
          </h1>
          <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mt-0.5">
            AI-generated emergency and community broadcasts
          </p>
        </div>

        {/* count badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)]">
            <Radio className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span className="text-xs font-mono text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)]">
              {broadcasts.length} broadcast{broadcasts.length !== 1 ? "s" : ""}
            </span>
          </span>
        </div>
      </div>

      {/* ── filter row ── */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mr-1">
            Status
          </span>
          {statusFilters.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={filterBtn(statusFilter === value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap sm:ml-4">
          <span className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mr-1">
            Severity
          </span>
          {severityFilters.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSeverityFilter(value)}
              className={filterBtn(severityFilter === value)}
            >
              {value !== "all" && (
                <span
                  className={cn(
                    "inline-block w-2 h-2 rounded-full mr-1.5",
                    severityConfig[value]?.dot
                  )}
                />
              )}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── list ── */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <PageSpinner />
        </div>
      ) : filtered.length === 0 ? (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <Radio className="w-10 h-10 text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mb-3 opacity-30" />
            <p className="font-display font-semibold text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] mb-1">
              No broadcasts found
            </p>
            <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
              {statusFilter !== "all" || severityFilter !== "all"
                ? "Try adjusting the filters above."
                : "No broadcasts have been issued yet."}
            </p>
          </motion.div>
        </AnimatePresence>
      ) : (
        <motion.div
          initial="initial"
          animate="animate"
          variants={{ animate: { transition: { staggerChildren: 0.05 } } }}
          className="space-y-3"
        >
          {filtered.map((broadcast) => (
            <motion.div
              key={broadcast.id}
              variants={{
                initial: { opacity: 0, y: 8 },
                animate: { opacity: 1, y: 0 },
              }}
            >
              <BroadcastCard broadcast={broadcast} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {!isLoading && filtered.length > 0 && (
        <p className="text-xs font-body text-center text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
          Showing {filtered.length} of {broadcasts.length} broadcasts · Refreshes every 60s
        </p>
      )}
    </motion.div>
  );
}
