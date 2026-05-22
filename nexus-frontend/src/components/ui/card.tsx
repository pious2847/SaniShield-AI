import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingMap = { none: "", sm: "p-4", md: "p-6", lg: "p-8" };

export function Card({ children, className, padding = "md" }: CardProps) {
  return (
    <div
      className={cn(
        "bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)]",
        "border border-[var(--color-border)] dark:border-[var(--color-border-dark)]",
        "rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)]",
        "transition-shadow duration-[var(--transition-base)]",
        paddingMap[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn("font-display font-semibold text-[var(--text-lg)] text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] tracking-tight", className)}>
      {children}
    </h3>
  );
}
