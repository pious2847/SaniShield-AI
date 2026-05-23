"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, total, limit, onChange, className }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;

  const start = (page - 1) * limit + 1;
  const end   = Math.min(page * limit, total);

  // Build page number list with ellipsis
  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  const btnBase = cn(
    "min-w-[32px] h-8 px-2 rounded-[var(--radius-md)] text-xs font-body font-medium transition-all duration-150",
    "border border-[var(--color-border)] dark:border-[var(--color-border-dark)]",
    "text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)]",
    "hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)]",
    "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[var(--color-border)]",
    "dark:disabled:hover:border-[var(--color-border-dark)] disabled:hover:text-[var(--color-text-2)]",
    "dark:disabled:hover:text-[var(--color-text-2-dark)]"
  );

  const activeBtn = cn(
    btnBase,
    "bg-[var(--color-primary)] border-[var(--color-primary)] text-white hover:border-[var(--color-primary)] hover:text-white"
  );

  return (
    <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-3", className)}>
      <p className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
        Showing <span className="font-medium text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)]">{start}–{end}</span> of{" "}
        <span className="font-medium text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)]">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        <button
          className={btnBase}
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5 mx-auto" />
        </button>

        {pages.map((p, i) =>
          p === "…" ? (
            <span
              key={`ellipsis-${i}`}
              className="min-w-[32px] h-8 flex items-center justify-center text-xs text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              className={p === page ? activeBtn : btnBase}
              onClick={() => onChange(p as number)}
            >
              {p}
            </button>
          )
        )}

        <button
          className={btnBase}
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5 mx-auto" />
        </button>
      </div>
    </div>
  );
}
