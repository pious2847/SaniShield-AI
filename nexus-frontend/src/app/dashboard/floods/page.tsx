"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CloudRain, ChevronDown, ChevronUp, AlertOctagon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageSpinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import type { FloodAssessment } from "@/types";

const cardClass =
  "bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] rounded-[var(--radius-lg)] p-5";

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  active:    { label: "Active",    color: "text-[var(--color-critical)]", dot: "bg-[var(--color-critical)]" },
  recovery:  { label: "Recovery",  color: "text-[var(--color-warning)]",  dot: "bg-[var(--color-warning)]" },
  completed: { label: "Completed", color: "text-[var(--color-ok)]",       dot: "bg-[var(--color-ok)]" },
};

interface AssetCheck {
  id: string;
  asset_type: string;
  asset_name: string;
  status: string;
  damage_level: string;
  notes?: string;
  inspected_at?: string;
}

function AssessmentCard({ assessment }: { assessment: FloodAssessment }) {
  const [expanded, setExpanded] = useState(false);

  const { data: checks = [], isFetching } = useQuery({
    queryKey: ["flood-checks", assessment.id],
    queryFn: async () => {
      const { data } = await api.get(`/flood-assessments/${assessment.id}/checks`);
      return (data.data ?? []) as AssetCheck[];
    },
    enabled: expanded,
    staleTime: 2 * 60 * 1000,
  });

  const cfg = statusConfig[assessment.status] ?? statusConfig.completed;
  const inspected = assessment.assets_inspected ?? 0;
  const total     = assessment.total_assets_flagged ?? 0;
  const progress  = total > 0 ? (inspected / total) * 100 : 0;

  return (
    <div className={cardClass}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1">
            <span className={cn("w-2 h-2 rounded-full flex-shrink-0", cfg.dot, assessment.status === "active" ? "animate-pulse" : "")} />
            <span className={cn("text-sm font-body font-semibold", cfg.color)}>{cfg.label}</span>
            <span className="text-xs font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
              {assessment.trigger_type === "manual" ? "Manual trigger" : `${assessment.trigger_rainfall_mm}mm rainfall`}
            </span>
          </div>
          <p className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
            Started {timeAgo(assessment.started_at)}
            {assessment.completed_at && ` · Completed ${timeAgo(assessment.completed_at)}`}
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs font-body text-[var(--color-primary)] dark:text-[var(--color-primary-dark)] hover:underline flex-shrink-0"
        >
          {expanded ? "Hide" : "View"} Checks
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: "Flagged",   value: assessment.total_assets_flagged },
          { label: "Inspected", value: assessment.assets_inspected },
          { label: "Damaged",   value: assessment.assets_damaged },
          { label: "Destroyed", value: assessment.assets_destroyed },
        ].map(({ label, value }) => (
          <div key={label} className="text-center p-2 rounded-[var(--radius-md)] bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)]">
            <p className="font-display font-bold text-lg tabular-nums text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">{value ?? 0}</p>
            <p className="text-[10px] font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wide">{label}</p>
          </div>
        ))}
      </div>

      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">Inspection progress</span>
        <span className="text-xs font-mono text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)]">{Math.round(progress)}%</span>
      </div>
      <div className="h-2 bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>

      {assessment.ai_assessment && (
        <blockquote className="mt-4 border-l-2 border-[var(--color-ochre)] pl-3 py-0.5">
          <p className="text-xs font-body italic text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] leading-relaxed">
            {assessment.ai_assessment}
          </p>
        </blockquote>
      )}

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-[var(--color-border)] dark:border-[var(--color-border-dark)]">
              {isFetching ? (
                <div className="flex justify-center py-4"><PageSpinner /></div>
              ) : checks.length === 0 ? (
                <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] text-center py-2">
                  No asset checks recorded yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {checks.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-3 text-sm py-2 border-b border-[var(--color-border)]/50 dark:border-[var(--color-border-dark)]/50 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-body font-medium text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] truncate">
                          {c.asset_name}
                        </p>
                        {c.notes && (
                          <p className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] truncate">{c.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] font-body uppercase tracking-wide text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] capitalize">
                          {c.asset_type}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-body font-semibold border",
                          c.damage_level === "destroyed" ? "text-[var(--color-critical)] bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900"
                            : c.damage_level === "major" ? "text-orange-600 bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-900"
                            : c.damage_level === "minor" ? "text-[var(--color-warning)] bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-900"
                            : "text-[var(--color-ok)] bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900"
                        )}>
                          {c.damage_level}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FloodsPage() {
  const district = "Tamale Metro";
  const queryClient = useQueryClient();
  const [triggering, setTriggering] = useState(false);

  const { data: assessments = [], isLoading } = useQuery<FloodAssessment[]>({
    queryKey: ["flood-assessments", district],
    queryFn: async () => {
      const { data } = await api.get(`/flood-assessments?district=${encodeURIComponent(district)}&limit=10`);
      return data.data ?? [];
    },
    staleTime: 60 * 1000,
  });

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      await api.post("/flood-assessments/trigger", { district });
      queryClient.invalidateQueries({ queryKey: ["flood-assessments", district] });
    } catch {
      // silently fail — backend may reject if already active
    } finally {
      setTriggering(false);
    }
  };

  const activeCount = assessments.filter((a) => a.status === "active").length;

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
            Flood Assessments
          </h1>
          <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mt-0.5">
            Climate event response tracking for flood-affected sanitation infrastructure
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          loading={triggering}
          onClick={handleTrigger}
          className="flex-shrink-0"
        >
          <CloudRain className="w-4 h-4" />
          Trigger Assessment
        </Button>
      </div>

      {activeCount > 0 && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-[var(--radius-md)] bg-[var(--color-critical-bg)] dark:bg-[var(--color-critical-bg-dark)] border border-[var(--color-critical)]/25">
          <AlertOctagon className="w-4 h-4 text-[var(--color-critical)] flex-shrink-0" />
          <p className="text-sm font-body font-medium text-[var(--color-critical)]">
            {activeCount} active flood assessment{activeCount > 1 ? "s" : ""} in progress for {district}
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><PageSpinner /></div>
      ) : assessments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CloudRain className="w-10 h-10 text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mb-3 opacity-30" />
          <p className="font-display font-semibold text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] mb-1">
            No assessments on record
          </p>
          <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
            Trigger a manual assessment or wait for the automated rainfall threshold check.
          </p>
        </div>
      ) : (
        <motion.div
          initial="initial"
          animate="animate"
          variants={{ animate: { transition: { staggerChildren: 0.08 } } }}
          className="space-y-4"
        >
          {assessments.map((a) => (
            <motion.div
              key={a.id}
              variants={{ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }}
            >
              <AssessmentCard assessment={a} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
