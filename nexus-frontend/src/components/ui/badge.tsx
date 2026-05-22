import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "critical" | "high" | "moderate" | "low" | "ok" | "info" | "outline";
  className?: string;
}

const variants = {
  default:   "bg-[var(--color-primary-muted)] text-[var(--color-primary)] border border-[var(--color-primary)]/20",
  critical:  "bg-[var(--color-critical-bg)] text-[var(--color-critical)] border border-[var(--color-critical)]/25 dark:bg-[var(--color-critical-bg-dark)] dark:text-red-300",
  high:      "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950 dark:text-orange-300",
  moderate:  "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300",
  low:       "bg-[var(--color-ok-bg)] text-[var(--color-ok)] border border-[var(--color-ok)]/25 dark:bg-[var(--color-ok-bg-dark)] dark:text-green-300",
  ok:        "bg-[var(--color-ok-bg)] text-[var(--color-ok)] border border-[var(--color-ok)]/25 dark:bg-[var(--color-ok-bg-dark)] dark:text-green-300",
  info:      "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300",
  outline:   "bg-transparent border border-[var(--color-border)] text-[var(--color-text-2)]",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-body font-semibold tracking-wide uppercase",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
