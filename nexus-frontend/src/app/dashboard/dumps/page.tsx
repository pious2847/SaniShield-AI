"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Trash2,
  CheckCircle2,
  Sparkles,
  MapPin,
  ChevronDown,
  ChevronUp,
  AlertOctagon,
} from "lucide-react";
import { PageSpinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import { useDistrict } from "@/context/DistrictContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DumpSite {
  id: string;
  description: string | null;
  district: string;
  community: string | null;
  status: "open" | "assigned" | "resolved";
  severity: "critical" | "high" | "moderate" | "low";
  latitude: number | null;
  longitude: number | null;
  reported_by: string | null;
  assigned_to: string | null;
  ai_analysis: string | null;
  created_at: string;
  resolved_at: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const cardClass =
  "bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] rounded-[var(--radius-lg)]";

type StatusFilter = "all" | "open" | "assigned" | "resolved";

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: "all",      label: "All" },
  { value: "open",     label: "Open" },
  { value: "assigned", label: "Assigned" },
  { value: "resolved", label: "Resolved" },
];

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string; dot: string }
> = {
  open:     { label: "Open",     color: "text-[var(--color-critical)]", bg: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900",          dot: "bg-red-500" },
  assigned: { label: "Assigned", color: "text-[var(--color-ochre)]",    bg: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-900",  dot: "bg-amber-500" },
  resolved: { label: "Resolved", color: "text-[var(--color-ok)]",       bg: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900",  dot: "bg-green-500" },
};

const severityConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  critical: { label: "Critical", color: "text-[var(--color-critical)]", bg: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900" },
  high:     { label: "High",     color: "text-[var(--color-warning)]",  bg: "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-900" },
  moderate: { label: "Moderate", color: "text-[var(--color-ochre)]",    bg: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-900" },
  low:      { label: "Low",      color: "text-[var(--color-ok)]",       bg: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900" },
};

function filterBtn(active: boolean) {
  return cn(
    "px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-body font-medium transition-all duration-150",
    active
      ? "bg-[var(--color-primary)] text-white"
      : "bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)] text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] hover:border-[var(--color-primary)]/50"
  );
}

// ─── Dump Card ────────────────────────────────────────────────────────────────

interface DumpCardProps {
  dump: DumpSite;
  onResolve: (id: string) => void;
  onAnalyze: (id: string) => void;
  isResolving: boolean;
  isAnalyzing: boolean;
}

function DumpCard({ dump, onResolve, onAnalyze, isResolving, isAnalyzing }: DumpCardProps) {
  const [aiExpanded, setAiExpanded] = useState(false);

  const status   = statusConfig[dump.status]   ?? statusConfig.open;
  const severity = severityConfig[dump.severity] ?? severityConfig.moderate;

  return (
    <motion.div
      layout
      variants={{
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
      }}
      className={cn(cardClass, "p-5 space-y-3")}
    >
      {/* Top row: location + badges + time */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-sm text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] truncate">
            {dump.community ? `${dump.community}, ${dump.district}` : dump.district}
          </p>
          <p className="text-xs font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mt-0.5">
            {timeAgo(dump.created_at)}
            {dump.resolved_at && (
              <span className="ml-2 text-[var(--color-ok)]">
                · Resolved {timeAgo(dump.resolved_at)}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-body font-semibold",
              status.color,
              status.bg
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", status.dot)} />
            {status.label}
          </span>
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-body font-semibold",
              severity.color,
              severity.bg
            )}
          >
            {severity.label}
          </span>
        </div>
      </div>

      {/* Description */}
      {dump.description && (
        <p className="text-sm font-body text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] line-clamp-2 leading-relaxed">
          {dump.description}
        </p>
      )}

      {/* GPS */}
      {dump.latitude != null && dump.longitude != null && (
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3 h-3 text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] flex-shrink-0" />
          <span className="font-mono text-xs text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
            {dump.latitude.toFixed(5)}, {dump.longitude.toFixed(5)}
          </span>
        </div>
      )}

      {/* AI Analysis collapsible */}
      {dump.ai_analysis && (
        <div>
          <button
            onClick={() => setAiExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-body font-medium text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] hover:text-[var(--color-primary)] transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            AI Analysis
            {aiExpanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
          <AnimatePresence initial={false}>
            {aiExpanded && (
              <motion.div
                key="ai-analysis"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <blockquote className="mt-2 pl-3 border-l-2 border-[var(--color-ochre)]">
                  <p className="text-xs font-body italic text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] leading-relaxed whitespace-pre-wrap">
                    {dump.ai_analysis}
                  </p>
                </blockquote>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1 flex-wrap">
        {dump.status !== "resolved" && (
          <Button
            size="sm"
            variant="outline"
            disabled={isResolving}
            onClick={() => onResolve(dump.id)}
            className="h-7 text-xs gap-1 border-[var(--color-ok)]/40 text-[var(--color-ok)] hover:bg-green-50 dark:hover:bg-green-950 hover:border-[var(--color-ok)] disabled:opacity-50"
          >
            <CheckCircle2 className="w-3 h-3" />
            {isResolving ? "Resolving…" : "Mark Resolved"}
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={isAnalyzing}
          onClick={() => onAnalyze(dump.id)}
          className="h-7 text-xs gap-1 border-[var(--color-primary)]/40 text-[var(--color-primary)] dark:text-[var(--color-primary-dark)] hover:bg-[var(--color-primary)]/5 hover:border-[var(--color-primary)] disabled:opacity-50"
        >
          <Sparkles className="w-3 h-3" />
          {isAnalyzing ? "Analyzing…" : "AI Analysis"}
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DumpsPage() {
  const { district } = useDistrict();
  const queryClient  = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { data: dumps = [], isLoading } = useQuery({
    queryKey: ["dumps", district],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "100" });
      if (district !== "Northern") params.set("district", district);
      const { data } = await api.get(`/dumps?${params}`);
      return (data.data ?? []) as DumpSite[];
    },
    staleTime: 60 * 1000,
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => api.put(`/dumps/${id}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dumps", district] });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/dumps/${id}/analyze`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dumps", district] });
    },
  });

  // Derived stats
  const total    = dumps.length;
  const open     = dumps.filter((d) => d.status === "open").length;
  const resolved = dumps.filter((d) => d.status === "resolved").length;

  // Filter
  const filtered = statusFilter === "all"
    ? dumps
    : dumps.filter((d) => d.status === statusFilter);

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
            Illegal Dump Sites
          </h1>
          <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mt-0.5">
            Reported sanitation violations in {district}
          </p>
        </div>
        {open > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] bg-red-50 dark:bg-red-950 border border-[var(--color-critical)]/20 self-start">
            <span className="w-2 h-2 rounded-full bg-[var(--color-critical)] animate-pulse" />
            <span className="text-xs font-body font-semibold text-[var(--color-critical)]">
              {open} open {open === 1 ? "site" : "sites"}
            </span>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total",    value: total,    icon: Trash2,       color: "" },
          { label: "Open",     value: open,     icon: AlertOctagon, color: open > 0 ? "text-[var(--color-critical)]" : "" },
          { label: "Resolved", value: resolved, icon: CheckCircle2, color: "text-[var(--color-ok)]" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`${cardClass} p-4 flex flex-col gap-1`}>
            <div className="flex items-center gap-2 mb-0.5">
              <Icon
                className={cn(
                  "w-4 h-4 flex-shrink-0",
                  color || "text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]"
                )}
              />
              <p className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wide">
                {label}
              </p>
            </div>
            <p
              className={cn(
                "font-display font-bold text-2xl tabular-nums",
                color || "text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]"
              )}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mr-1">
          Status
        </span>
        {statusOptions.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={filterBtn(statusFilter === value)}
          >
            {value !== "all" && statusConfig[value] && (
              <span
                className={cn(
                  "inline-block w-2 h-2 rounded-full mr-1.5",
                  statusConfig[value].dot
                )}
              />
            )}
            {label}
          </button>
        ))}
        <span className="text-xs font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] ml-2">
          {filtered.length} shown
        </span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <PageSpinner />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <Trash2 className="w-10 h-10 text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mb-3 opacity-25" />
          <p className="font-display font-semibold text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] mb-1">
            No dump sites found
          </p>
          <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
            {statusFilter !== "all"
              ? "Try adjusting the status filter above."
              : `No dump sites reported in ${district}.`}
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial="initial"
          animate="animate"
          variants={{ animate: { transition: { staggerChildren: 0.06 } } }}
          className="space-y-3"
        >
          {filtered.map((dump) => (
            <DumpCard
              key={dump.id}
              dump={dump}
              onResolve={(id) => resolveMutation.mutate(id)}
              onAnalyze={(id) => analyzeMutation.mutate(id)}
              isResolving={
                resolveMutation.isPending && resolveMutation.variables === dump.id
              }
              isAnalyzing={
                analyzeMutation.isPending && analyzeMutation.variables === dump.id
              }
            />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
