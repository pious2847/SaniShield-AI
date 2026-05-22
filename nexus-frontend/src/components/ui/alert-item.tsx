"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertOctagon, AlertTriangle, Info, CheckCircle2,
  ChevronDown, MapPin, Clock, Activity, Check, X,
  Zap, Droplets, Thermometer, ClipboardCheck,
} from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import type { Alert } from "@/types";

// ── severity config ──────────────────────────────────────────────────────────

const SEV = {
  critical: {
    icon: AlertOctagon,
    bar: "bg-[var(--color-critical)]",
    text: "text-[var(--color-critical)]",
    badge: "bg-[var(--color-critical)]/10 text-[var(--color-critical)] border-[var(--color-critical)]/20",
    ring: "ring-[var(--color-critical)]/20",
    label: "Critical",
  },
  high: {
    icon: AlertTriangle,
    bar: "bg-orange-500",
    text: "text-orange-600 dark:text-orange-400",
    badge: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    ring: "ring-orange-400/20",
    label: "High",
  },
  moderate: {
    icon: AlertTriangle,
    bar: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    ring: "ring-amber-400/20",
    label: "Moderate",
  },
  low: {
    icon: Info,
    bar: "bg-blue-500",
    text: "text-blue-600 dark:text-blue-400",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    ring: "ring-blue-400/20",
    label: "Low",
  },
} as const;

// ── alert-type label ─────────────────────────────────────────────────────────

const ALERT_TYPE_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  overflow_risk:     { label: "Overflow Risk",     icon: Droplets },
  flood_risk:        { label: "Flood Risk",         icon: Droplets },
  high_fill:         { label: "High Fill Level",    icon: Activity },
  temperature:       { label: "Temperature",        icon: Thermometer },
  ai_risk_assessment:{ label: "AI Assessment",      icon: Zap },
  maintenance:       { label: "Maintenance Due",    icon: ClipboardCheck },
};

function alertTypeLabel(type: string) {
  return ALERT_TYPE_LABELS[type] ?? { label: type.replace(/_/g, " "), icon: AlertTriangle };
}

// ── status badge ─────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  active:       "bg-[var(--color-critical)]/10 text-[var(--color-critical)] border-[var(--color-critical)]/20",
  acknowledged: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  resolved:     "bg-[var(--color-ok)]/10 text-[var(--color-ok)] border-[var(--color-ok)]/20",
};

// ── props ────────────────────────────────────────────────────────────────────

interface AlertItemProps {
  alert: Alert;
  compact?: boolean;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
  isAcknowledging?: boolean;
  isResolving?: boolean;
}

// ── component ────────────────────────────────────────────────────────────────

export function AlertItem({
  alert,
  compact = false,
  onAcknowledge,
  onResolve,
  isAcknowledging,
  isResolving,
}: AlertItemProps) {
  const [expanded, setExpanded] = useState(false);
  const cfg = SEV[alert.severity] ?? SEV.low;
  const Icon = cfg.icon;
  const { label: typeLabel, icon: TypeIcon } = alertTypeLabel(alert.alert_type);
  const hasPrediction = !!alert.prediction_data;
  const recs = alert.prediction_data?.recommendations ?? [];
  const isActive = alert.status === "active";
  const isAcknowledged = alert.status === "acknowledged";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-lg)] border transition-all duration-200",
        "bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)]",
        "border-[var(--color-border)] dark:border-[var(--color-border-dark)]",
        "hover:shadow-sm",
        cfg.ring, "ring-1",
        compact && "rounded-[var(--radius-md)]"
      )}
    >
      {/* Severity stripe on the left */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", cfg.bar)} />

      <div className="pl-4">
        {/* ── Main row ── */}
        <div className="flex items-start gap-3 p-3 pr-3">
          {/* Icon */}
          <div className={cn(
            "flex-shrink-0 w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center mt-0.5",
            "bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)]"
          )}>
            <Icon className={cn("w-4 h-4", cfg.text)} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Top row: type badge + severity badge + status */}
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-body font-semibold border uppercase tracking-wide",
                cfg.badge
              )}>
                <TypeIcon className="w-2.5 h-2.5" />
                {typeLabel}
              </span>
              <span className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-body font-semibold border uppercase tracking-wide",
                STATUS_BADGE[alert.status] ?? STATUS_BADGE.active
              )}>
                {alert.status === "resolved" && <CheckCircle2 className="w-2.5 h-2.5" />}
                {alert.status}
              </span>
            </div>

            {/* Message */}
            <p className="text-sm font-body font-medium text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] leading-snug">
              {alert.message}
            </p>

            {/* Meta row */}
            {!compact && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
                {(alert.unit_name || alert.district) && (
                  <span className="inline-flex items-center gap-1 text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {alert.unit_name ?? alert.district}
                    {alert.community && ` · ${alert.community}`}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-xs font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  {timeAgo(alert.created_at)}
                </span>
                {alert.prediction_data?.risk_score != null && (
                  <span className={cn("text-xs font-mono font-semibold", cfg.text)}>
                    Risk score: {alert.prediction_data.risk_score}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right: actions + expand toggle */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-1">
            {/* Action buttons */}
            {!compact && (
              <div className="flex items-center gap-1">
                {isActive && onAcknowledge && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onAcknowledge(alert.id); }}
                    disabled={isAcknowledging}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-body font-semibold transition-all",
                      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30",
                      "hover:bg-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                    title="Mark as acknowledged"
                  >
                    <Check className="w-2.5 h-2.5" />
                    {isAcknowledging ? "…" : "Ack"}
                  </button>
                )}
                {(isActive || isAcknowledged) && onResolve && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onResolve(alert.id); }}
                    disabled={isResolving}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-body font-semibold transition-all",
                      "bg-[var(--color-ok)]/10 text-[var(--color-ok)] border border-[var(--color-ok)]/30",
                      "hover:bg-[var(--color-ok)]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                    title="Mark as resolved"
                  >
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    {isResolving ? "…" : "Resolve"}
                  </button>
                )}
              </div>
            )}

            {/* Expand toggle (only if there's prediction data) */}
            {hasPrediction && !compact && (
              <button
                onClick={() => setExpanded(v => !v)}
                className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] hover:text-[var(--color-text-1)] dark:hover:text-[var(--color-text-1-dark)] flex items-center gap-0.5 transition-colors"
              >
                Details
                <ChevronDown className={cn("w-3 h-3 transition-transform", expanded && "rotate-180")} />
              </button>
            )}
          </div>
        </div>

        {/* ── Expandable prediction details ── */}
        <AnimatePresence initial={false}>
          {expanded && hasPrediction && (
            <motion.div
              key="details"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="mx-3 mb-3 p-3 rounded-[var(--radius-md)] bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)]">
                {alert.prediction_data?.reasoning && (
                  <p className="text-xs font-body text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] mb-2 leading-relaxed">
                    {alert.prediction_data.reasoning}
                  </p>
                )}
                {alert.prediction_data?.predicted_overflow_hours != null && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <Clock className="w-3 h-3 text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]" />
                    <span className="text-xs font-mono text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)]">
                      Estimated overflow in{" "}
                      <strong className={cfg.text}>
                        {alert.prediction_data.predicted_overflow_hours}h
                      </strong>
                    </span>
                  </div>
                )}
                {recs.length > 0 && (
                  <div>
                    <p className="text-[10px] font-body font-semibold text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wider mb-1.5">
                      Recommended Actions
                    </p>
                    <ul className="space-y-1">
                      {recs.map((r, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className={cn("w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold mt-0.5", cfg.badge)}>
                            {i + 1}
                          </span>
                          <span className="text-xs font-body text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)]">{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
