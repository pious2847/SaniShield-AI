"use client";

import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";
import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";

interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  icon?: LucideIcon;
  trend?: { value: number; label: string };
  variant?: "default" | "primary" | "ochre" | "critical";
  animate?: boolean;
  className?: string;
}

function AnimatedCounter({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { duration: 1200, bounce: 0 });
  const displayed = useTransform(springValue, (v) => `${prefix}${Math.round(v).toLocaleString()}${suffix}`);

  useEffect(() => {
    if (inView) motionValue.set(value);
  }, [inView, motionValue, value]);

  return <motion.span ref={ref}>{displayed}</motion.span>;
}

const variantStyles = {
  default:  "bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border-[var(--color-border)] dark:border-[var(--color-border-dark)]",
  primary:  "bg-[var(--color-primary)] border-[var(--color-primary-hover)] text-white",
  ochre:    "bg-[var(--color-ochre)] border-amber-400 text-white",
  critical: "bg-[var(--color-critical)] border-red-400 text-white",
};

export function StatCard({
  label, value, suffix, prefix, icon: Icon,
  trend, variant = "default", animate = true, className
}: StatCardProps) {
  const isDark = variant !== "default";

  return (
    <div className={cn(
      "rounded-[var(--radius-lg)] border p-6 shadow-[var(--shadow-sm)]",
      "transition-all duration-[var(--transition-base)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5",
      variantStyles[variant],
      className
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-[11px] font-body font-semibold uppercase tracking-widest mb-1",
            isDark ? "text-white/70" : "text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]"
          )}>
            {label}
          </p>
          <p className={cn(
            "font-display font-bold text-4xl leading-none tabular-nums",
            isDark ? "text-white" : "text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]"
          )}>
            {animate
              ? <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
              : `${prefix ?? ""}${value.toLocaleString()}${suffix ?? ""}`
            }
          </p>
          {trend && (
            <p className={cn(
              "text-[12px] font-body mt-1.5",
              isDark ? "text-white/70" : "text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]"
            )}>
              <span className={trend.value >= 0 ? "text-[var(--color-ok)]" : "text-[var(--color-critical)]"}>
                {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              {" "}{trend.label}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn(
            "flex-shrink-0 w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center",
            isDark ? "bg-white/15" : "bg-[var(--color-primary-muted)] dark:bg-[var(--color-primary)]/20"
          )}>
            <Icon className={cn("w-5 h-5", isDark ? "text-white" : "text-[var(--color-primary)] dark:text-[var(--color-primary-dark)]")} />
          </div>
        )}
      </div>
    </div>
  );
}
