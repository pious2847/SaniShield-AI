"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Newspaper, ExternalLink } from "lucide-react";
import { PageSpinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import { useDistrict } from "@/context/DistrictContext";

// ─── types ────────────────────────────────────────────────────────────────────

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source_url: string | null;
  source_name: string;
  published_at: string;
  is_flood_related: boolean;
  is_sanitation_related: boolean;
  sentiment: "positive" | "negative" | "neutral" | string;
}

type NewsFilter = "all" | "flood" | "sanitation" | "positive" | "negative";

// ─── design tokens ────────────────────────────────────────────────────────────

const cardClass =
  "bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] rounded-[var(--radius-lg)]";

const sentimentConfig: Record<string, { text: string; bg: string; border: string; label: string }> = {
  positive: {
    text:   "text-[var(--color-ok)]",
    bg:     "bg-green-50 dark:bg-green-950",
    border: "border-green-200 dark:border-green-900",
    label:  "Positive",
  },
  negative: {
    text:   "text-[var(--color-critical)]",
    bg:     "bg-red-50 dark:bg-red-950",
    border: "border-red-200 dark:border-red-900",
    label:  "Negative",
  },
  neutral: {
    text:   "text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]",
    bg:     "bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)]",
    border: "border-[var(--color-border)] dark:border-[var(--color-border-dark)]",
    label:  "Neutral",
  },
};

function sentCfg(s: string) {
  return sentimentConfig[s?.toLowerCase()] ?? sentimentConfig.neutral;
}

// ─── filter button ────────────────────────────────────────────────────────────

function filterChip(active: boolean) {
  return cn(
    "px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-body font-medium transition-all duration-150",
    active
      ? "bg-[var(--color-primary)] text-white"
      : "bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)] text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] hover:border-[var(--color-primary)]/50"
  );
}

// ─── news card ────────────────────────────────────────────────────────────────

function NewsCard({ item }: { item: NewsItem }) {
  const sc = sentCfg(item.sentiment);

  return (
    <article className={cn(cardClass, "p-5")}>
      {/* source + date */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-body font-semibold uppercase tracking-wider text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
          {item.source_name}
        </span>
        <span className="text-[var(--color-border)] dark:text-[var(--color-border-dark)]">·</span>
        <span className="text-[10px] font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
          {timeAgo(item.published_at)}
        </span>
      </div>

      {/* title */}
      {item.source_url ? (
        <a
          href={item.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-start gap-1.5 mb-2"
        >
          <h3 className="font-display font-bold text-base text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] group-hover:text-[var(--color-primary)] dark:group-hover:text-[var(--color-primary-dark)] transition-colors leading-snug">
            {item.title}
          </h3>
          <ExternalLink className="w-3.5 h-3.5 text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] group-hover:text-[var(--color-primary)] transition-colors flex-shrink-0 mt-0.5" />
        </a>
      ) : (
        <h3 className="font-display font-bold text-base text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] mb-2 leading-snug">
          {item.title}
        </h3>
      )}

      {/* summary */}
      {item.summary && (
        <p className="text-sm font-body text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] leading-relaxed line-clamp-3 mb-3">
          {item.summary}
        </p>
      )}

      {/* tags */}
      <div className="flex flex-wrap items-center gap-1.5">
        {item.is_flood_related && (
          <span className="text-[10px] font-body font-semibold px-2 py-0.5 rounded-full border text-blue-600 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900">
            Flood
          </span>
        )}
        {item.is_sanitation_related && (
          <span className="text-[10px] font-body font-semibold px-2 py-0.5 rounded-full border text-[var(--color-ok)] bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900">
            Sanitation
          </span>
        )}
        <span
          className={cn(
            "text-[10px] font-body font-semibold px-2 py-0.5 rounded-full border",
            sc.text,
            sc.bg,
            sc.border
          )}
        >
          {sc.label}
        </span>
      </div>
    </article>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function NewsPage() {
  useDistrict(); // context available if needed for future filtering

  const [filter, setFilter] = useState<NewsFilter>("all");

  const { data: news = [], isLoading } = useQuery<NewsItem[]>({
    queryKey: ["news"],
    queryFn: async () => {
      const { data } = await api.get("/news?limit=20");
      return data.data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const filtered = news.filter((item) => {
    switch (filter) {
      case "flood":      return item.is_flood_related;
      case "sanitation": return item.is_sanitation_related;
      case "positive":   return item.sentiment?.toLowerCase() === "positive";
      case "negative":   return item.sentiment?.toLowerCase() === "negative";
      default:           return true;
    }
  });

  const filters: { value: NewsFilter; label: string }[] = [
    { value: "all",        label: "All" },
    { value: "flood",      label: "Flood Related" },
    { value: "sanitation", label: "Sanitation" },
    { value: "positive",   label: "Positive" },
    { value: "negative",   label: "Negative" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* ── header ── */}
      <div>
        <h1 className="font-display font-bold text-2xl text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">
          News Intelligence
        </h1>
        <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mt-0.5">
          AI-curated WASH and flood news
        </p>
      </div>

      {/* ── filter chips ── */}
      <div className="flex flex-wrap gap-1.5">
        {filters.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={filterChip(filter === value)}
          >
            {label}
          </button>
        ))}
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
            <Newspaper className="w-10 h-10 text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mb-3 opacity-30" />
            <p className="font-display font-semibold text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] mb-1">
              No articles found
            </p>
            <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
              {filter !== "all"
                ? "Try a different filter above."
                : "No news articles have been ingested yet."}
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
          {filtered.map((item) => (
            <motion.div
              key={item.id}
              variants={{
                initial: { opacity: 0, y: 8 },
                animate: { opacity: 1, y: 0 },
              }}
            >
              <NewsCard item={item} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {!isLoading && filtered.length > 0 && (
        <p className="text-xs font-body text-center text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
          Showing {filtered.length} of {news.length} articles · Cached for 10 minutes
        </p>
      )}
    </motion.div>
  );
}
