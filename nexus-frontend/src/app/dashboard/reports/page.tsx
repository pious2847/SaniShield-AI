"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { FileBarChart, Download, FileText, Users, MapPin, GraduationCap, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageSpinner } from "@/components/ui/spinner";
import { useDistrictExport } from "@/hooks/useDashboard";
import { api } from "@/lib/api";
import { cn, DISTRICTS, timeAgo } from "@/lib/utils";
import { useDistrict } from "@/context/DistrictContext";
import type { HealthScore } from "@/types";

const cardClass =
  "bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] rounded-[var(--radius-lg)] p-5";

const csvTypes = [
  { type: "toilets"   as const, label: "Registered Toilets",  icon: MapPin,         desc: "All toilet registrations with condition and GPS data" },
  { type: "dumps"     as const, label: "Illegal Dump Sites",   icon: FileText,       desc: "Reported dump sites, dates, and resolution status" },
  { type: "schools"   as const, label: "School MHM Records",   icon: GraduationCap,  desc: "School MHM compliance data and room counts" },
  { type: "gatherers" as const, label: "Sludge Gatherers",     icon: Users,          desc: "Registered gatherers, contact info, and districts" },
];

export default function ReportsPage() {
  const { district: globalDistrict }    = useDistrict();
  const [district, setDistrict]         = useState<string>(globalDistrict);
  const [pdfLoading, setPdfLoading]     = useState(false);
  const [csvLoading, setCsvLoading]     = useState<string | null>(null);
  const [lastExport, setLastExport]     = useState<string | null>(null);

  const { downloadPdf, downloadCsv } = useDistrictExport(district);

  const { data: hs, isLoading: hsLoading } = useQuery<HealthScore>({
    queryKey: ["health-score", district],
    queryFn: async () => {
      const { data } = await api.get(`/health-scores/${encodeURIComponent(district)}`);
      return data.data;
    },
    enabled: !!district,
    staleTime: 5 * 60 * 1000,
  });

  const handlePdf = async () => {
    setPdfLoading(true);
    try {
      await downloadPdf();
      setLastExport(new Date().toISOString());
    } finally {
      setPdfLoading(false);
    }
  };

  const handleCsv = async (type: "toilets" | "dumps" | "schools" | "gatherers") => {
    setCsvLoading(type);
    try {
      await downloadCsv(type);
      setLastExport(new Date().toISOString());
    } finally {
      setCsvLoading(null);
    }
  };

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
            Reports &amp; Export
          </h1>
          <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mt-0.5">
            Download district data and generate compliance reports
          </p>
        </div>
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className="h-9 px-3 rounded-[var(--radius-md)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] text-sm font-body text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 self-start"
        >
          {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className={cardClass}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display font-semibold text-xs text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wider mb-1">
              Full District Report
            </p>
            <p className="text-sm font-body text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] mb-3">
              Comprehensive PDF report for {district} — includes health score, asset summary, incidents, schools, sludge chain analysis, and AI-generated recommendations.
            </p>
            <Button onClick={handlePdf} loading={pdfLoading} variant="primary" size="sm">
              <Download className="w-4 h-4" />
              Download PDF Report
            </Button>
            {lastExport && (
              <p className="text-xs font-body text-[var(--color-ok)] mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Last exported {timeAgo(lastExport)}
              </p>
            )}
          </div>
          <FileBarChart className="w-10 h-10 text-[var(--color-primary)] dark:text-[var(--color-primary-dark)] opacity-20 flex-shrink-0 mt-1" />
        </div>

        <div className="mt-5 pt-5 border-t border-[var(--color-border)] dark:border-[var(--color-border-dark)]">
          <p className="text-xs font-body font-semibold text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wider mb-3">
            Report Contents
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              "District Health Score",
              "Assets Summary",
              "24h / 7d / 30d Incidents",
              "School Compliance Table",
              "Open Dump Sites",
              "Sludge Chain Rate",
              "AI Recommendations",
            ].map((item) => (
              <div key={item} className="flex items-center gap-1.5 text-xs font-body text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)]">
                <CheckCircle2 className="w-3 h-3 text-[var(--color-ok)] flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <p className="font-display font-semibold text-xs text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wider mb-4">
          CSV Data Export
        </p>
        <div className="space-y-3">
          {csvTypes.map(({ type, label, icon: Icon, desc }) => (
            <div
              key={type}
              className="flex items-center justify-between gap-4 p-3 rounded-[var(--radius-md)] bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)]"
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <Icon className="w-4 h-4 text-[var(--color-primary)] dark:text-[var(--color-primary-dark)] flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-body font-medium text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">{label}</p>
                  <p className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] truncate">{desc}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="xs"
                loading={csvLoading === type}
                onClick={() => handleCsv(type)}
                className="flex-shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                .csv
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className={cardClass}>
        <p className="font-display font-semibold text-xs text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wider mb-4">
          Latest Health Summary — {district}
        </p>
        {hsLoading ? (
          <div className="flex justify-center py-6"><PageSpinner /></div>
        ) : hs && hs.score != null ? (
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <div className="flex-shrink-0 text-center px-4 py-3 rounded-[var(--radius-md)] bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)]">
              <p className={cn(
                "font-display font-bold text-4xl tabular-nums",
                hs.score >= 80 ? "text-[var(--color-ok)]"
                  : hs.score >= 60 ? "text-[var(--color-primary)]"
                  : hs.score >= 40 ? "text-[var(--color-warning)]"
                  : "text-[var(--color-critical)]"
              )}>
                {hs.score}
              </p>
              <p className="text-[10px] font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wide mt-0.5">/100</p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mb-2">
                Calculated {timeAgo(hs.computed_at)}
              </p>
              <p className="text-sm font-body italic text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] leading-relaxed">
                {hs.ai_narrative}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] text-center py-4">
            No health score available for {district}.
          </p>
        )}
      </div>
    </motion.div>
  );
}
