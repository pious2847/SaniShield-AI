"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Newspaper, ExternalLink, Brain } from "lucide-react";
import { PageSpinner } from "@/components/ui/spinner";
import { Pagination } from "@/components/ui/pagination";
import { api } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";

const PAGE_SIZE = 12;

interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source_url: string | null;
  source_name: string;
  published_at: string;
  is_flood_related: boolean;
  is_sanitation_related: boolean;
  ai_sentiment: "positive" | "negative" | "neutral" | string | null;
  ai_event_type: string | null;
  ai_districts: string[] | null;
  ai_summary: string | null;
  ai_processed: boolean;
}

type NewsFilter = "all" | "flood" | "sanitation";

const cardClass =
  "bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] rounded-[var(--radius-lg)]";

const sentimentConfig: Record<string, { text: string; bg: string; border: string; label: string }> = {
  positive: { text: "text-[var(--color-ok)]",       bg: "bg-green-50 dark:bg-green-950", border: "border-green-200 dark:border-green-900", label: "Positive" },
  negative: { text: "text-[var(--color-critical)]",  bg: "bg-red-50 dark:bg-red-950",    border: "border-red-200 dark:border-red-900",   label: "Negative" },
  neutral:  { text: "text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]", bg: "bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)]", border: "border-[var(--color-border)] dark:border-[var(--color-border-dark)]", label: "Neutral" },
};
const sentCfg = (s: string | null) => sentimentConfig[s?.toLowerCase() ?? ""] ?? sentimentConfig.neutral;

function filterChip(active: boolean) {
  return cn(
    "px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-body font-medium transition-all duration-150",
    active
      ? "bg-[var(--color-primary)] text-white"
      : "bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)] text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] hover:border-[var(--color-primary)]/50"
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const sc = sentCfg(item.ai_sentiment);

  return (
    <article className={cn(cardClass, "p-5 flex flex-col gap-3")}>
      {/* source + date */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-body font-semibold uppercase tracking-wider text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
          {item.source_name}
        </span>
        <span className="text-[var(--color-border)]">·</span>
        <span className="text-[10px] font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
          {timeAgo(item.published_at)}
        </span>
        {item.ai_event_type && item.ai_event_type !== "general" && (
          <>
            <span className="text-[var(--color-border)]">·</span>
            <span className="text-[10px] font-body font-semibold capitalize text-[var(--color-primary)] dark:text-[var(--color-primary-dark)]">
              {item.ai_event_type.replace(/_/g, " ")}
            </span>
          </>
        )}
      </div>

      {/* headline */}
      {item.source_url ? (
        <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="group inline-flex items-start gap-1.5">
          <h3 className="font-display font-bold text-base text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] group-hover:text-[var(--color-primary)] dark:group-hover:text-[var(--color-primary-dark)] transition-colors leading-snug">
            {item.headline}
          </h3>
          <ExternalLink className="w-3.5 h-3.5 text-[var(--color-text-3)] group-hover:text-[var(--color-primary)] transition-colors flex-shrink-0 mt-0.5" />
        </a>
      ) : (
        <h3 className="font-display font-bold text-base text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] leading-snug">
          {item.headline}
        </h3>
      )}

      {/* AI NEXUS summary — shown if processed, else raw summary */}
      {(item.ai_summary || item.summary) && (
        <div className={cn("rounded-[var(--radius-md)] px-3 py-2 text-sm font-body leading-relaxed",
          item.ai_processed
            ? "bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/15"
            : "bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)]"
        )}>
          {item.ai_processed && (
            <div className="flex items-center gap-1 mb-1">
              <Brain className="w-3 h-3 text-[var(--color-primary)]" />
              <span className="text-[10px] font-body font-semibold text-[var(--color-primary)] uppercase tracking-wide">AI Summary</span>
            </div>
          )}
          <p className="text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] line-clamp-3">
            {item.ai_summary || item.summary}
          </p>
        </div>
      )}

      {/* districts mentioned */}
      {item.ai_districts && item.ai_districts.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.ai_districts.map((d) => (
            <span key={d} className="text-[9px] font-body font-semibold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 uppercase tracking-wide">
              {d}
            </span>
          ))}
        </div>
      )}

      {/* tags row */}
      <div className="flex flex-wrap items-center gap-1.5">
        {item.is_flood_related && (
          <span className="text-[10px] font-body font-semibold px-2 py-0.5 rounded-full border text-blue-600 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900">Flood</span>
        )}
        {item.is_sanitation_related && (
          <span className="text-[10px] font-body font-semibold px-2 py-0.5 rounded-full border text-[var(--color-ok)] bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900">Sanitation</span>
        )}
        {item.ai_sentiment && (
          <span className={cn("text-[10px] font-body font-semibold px-2 py-0.5 rounded-full border", sc.text, sc.bg, sc.border)}>
            {sc.label}
          </span>
        )}
      </div>
    </article>
  );
}

export default function NewsPage() {
  const [filter, setFilter] = useState<NewsFilter>("all");
  const [page, setPage]     = useState(1);

  const filterParams = filter === "flood" ? "&is_flood_related=true"
    : filter === "sanitation" ? "&is_sanitation_related=true" : "";

  const { data, isLoading } = useQuery<{ data: NewsItem[]; total: number; count: number }>({
    queryKey: ["news", filter, page],
    queryFn: async () => {
      const { data } = await api.get(`/news?limit=${PAGE_SIZE}&page=${page}${filterParams}`);
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const articles = data?.data ?? [];
  const total    = data?.total ?? 0;

  const filters: { value: NewsFilter; label: string }[] = [
    { value: "all",        label: "All" },
    { value: "flood",      label: "Flood Related" },
    { value: "sanitation", label: "Sanitation" },
  ];

  function handleFilter(v: NewsFilter) {
    setFilter(v);
    setPage(1);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      <div>
        <h1 className="font-display font-bold text-2xl text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">
          News Intelligence
        </h1>
        <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mt-0.5">
          AI-curated WASH and flood news from Northern Ghana
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {filters.map(({ value, label }) => (
          <button key={value} onClick={() => handleFilter(value)} className={filterChip(filter === value)}>
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><PageSpinner /></div>
      ) : articles.length === 0 ? (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 text-center">
            <Newspaper className="w-10 h-10 text-[var(--color-text-3)] mb-3 opacity-30" />
            <p className="font-display font-semibold text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] mb-1">No articles found</p>
            <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
              {filter !== "all" ? "Try a different filter above." : "No news articles have been ingested yet."}
            </p>
          </motion.div>
        </AnimatePresence>
      ) : (
        <motion.div
          key={`${filter}-${page}`}
          initial="initial"
          animate="animate"
          variants={{ animate: { transition: { staggerChildren: 0.04 } } }}
          className="space-y-3"
        >
          {articles.map((item) => (
            <motion.div key={item.id} variants={{ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } }}>
              <NewsCard item={item} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {!isLoading && total > 0 && (
        <Pagination page={page} total={total} limit={PAGE_SIZE} onChange={setPage} />
      )}
    </motion.div>
  );
}
