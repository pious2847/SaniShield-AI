"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface HealthRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
}

function scoreColor(s: number) {
  if (s >= 80) return { stroke: "var(--color-ok)",       text: "text-[var(--color-ok)]",       label: "Excellent" };
  if (s >= 60) return { stroke: "var(--color-primary)",  text: "text-[var(--color-primary)]",  label: "Good" };
  if (s >= 40) return { stroke: "var(--color-warning)",  text: "text-[var(--color-warning)]",  label: "Fair" };
  return        { stroke: "var(--color-critical)",       text: "text-[var(--color-critical)]", label: "Poor" };
}

export function HealthRing({ score, size = 140, strokeWidth = 10, label, className }: HealthRingProps) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const { stroke, text, label: ratingLabel } = scoreColor(score);

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Track */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-[var(--color-border)] dark:text-[var(--color-border-dark)]"
          />
          {/* Progress */}
          <motion.circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("font-display font-bold tabular-nums", text)} style={{ fontSize: size / 4 }}>
            {score}
          </span>
          <span className="text-[10px] font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wide">
            /100
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className={cn("font-display font-semibold text-sm", text)}>{ratingLabel}</p>
        {label && <p className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">{label}</p>}
      </div>
    </div>
  );
}
