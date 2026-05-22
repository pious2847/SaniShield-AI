"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, Droplets, CloudRain, Toilet, FileBarChart, Map, ExternalLink } from "lucide-react";
import { HealthRing } from "@/components/ui/health-ring";
import { AlertItem } from "@/components/ui/alert-item";
import { StatCard } from "@/components/ui/stat-card";
import { PageSpinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import {
  useHealthScore,
  useAlerts,
  useSludgeStats,
  useFloodAssessments,
  useToilets,
  useDistrictExport,
} from "@/hooks/useDashboard";
import { useDistrict } from "@/context/DistrictContext";
import { timeAgo } from "@/lib/utils";

const cardClass =
  "bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] rounded-[var(--radius-lg)] p-5";

const sectionLabel =
  "font-display font-semibold text-xs text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wider mb-4";

const containerVariants = {
  animate: { transition: { staggerChildren: 0.09 } },
};
const itemVariants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const floodStatusColor: Record<string, string> = {
  active:    "text-[var(--color-critical)]",
  recovery:  "text-[var(--color-warning)]",
  completed: "text-[var(--color-ok)]",
};

export default function DashboardPage() {
  const { district } = useDistrict();
  const { data: hs, isLoading: hsLoading }       = useHealthScore(district);
  const { data: allAlerts = [], isLoading: aLoad } = useAlerts(district);
  const { data: sludge }                          = useSludgeStats(district);
  const { data: floods = [] }                     = useFloodAssessments(district);
  const { data: toilets = [] }                    = useToilets(district);
  const { downloadPdf }                           = useDistrictExport(district);

  const activeAlerts  = allAlerts.filter((a) => a.status === "active");
  const criticalCount = activeAlerts.filter((a) => a.severity === "critical").length;
  const activeFloods  = floods.filter((f) => f.status === "active" || f.status === "recovery");

  const sludgeRow = Array.isArray(sludge) ? null : sludge;
  const completionRate = sludgeRow?.completion_rate ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">
            Overview
          </h1>
          <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mt-0.5">
            {district} · {new Date().toLocaleDateString("en-GH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        {criticalCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-critical-bg)] dark:bg-[var(--color-critical-bg-dark)] border border-[var(--color-critical)]/25">
            <span className="w-2 h-2 rounded-full bg-[var(--color-critical)] animate-pulse" />
            <span className="text-xs font-body font-semibold text-[var(--color-critical)]">
              {criticalCount} critical alert{criticalCount > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 xl:grid-cols-4 gap-4"
      >
        <motion.div variants={itemVariants}>
          <StatCard
            label="Registered Toilets"
            value={toilets.length}
            icon={Toilet}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            label="Active Alerts"
            value={activeAlerts.length}
            icon={AlertTriangle}
            variant={criticalCount > 0 ? "critical" : "default"}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            label="Chain Completion"
            value={Math.round(completionRate)}
            suffix="%"
            icon={Droplets}
            variant={completionRate >= 70 ? "primary" : "default"}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            label="Flood Assessments"
            value={activeFloods.length}
            icon={CloudRain}
          />
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className={`xl:col-span-2 ${cardClass}`}>
          <p className={sectionLabel}>District Health Score</p>
          {hsLoading ? (
            <div className="flex justify-center py-8"><PageSpinner /></div>
          ) : hs && hs.score != null ? (
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="flex-shrink-0">
                <HealthRing score={hs.score} label={district} size={160} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
                    Last calculated {timeAgo(hs.computed_at)}
                  </span>
                </div>
                <blockquote className="border-l-2 border-[var(--color-primary)] pl-4 py-1">
                  <p className="text-sm font-body italic text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] leading-relaxed">
                    {hs.ai_narrative}
                  </p>
                </blockquote>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { label: "Excellent", min: 80, color: "var(--color-ok)" },
                    { label: "Good",      min: 60, color: "var(--color-primary)" },
                    { label: "Fair",      min: 40, color: "var(--color-warning)" },
                  ].map(({ label, min, color }) => (
                    <div
                      key={label}
                      className="text-center p-2 rounded-[var(--radius-md)] bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)]"
                    >
                      <p className="text-[10px] font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wide">{label}</p>
                      <p className="text-xs font-mono font-semibold mt-0.5" style={{ color }}>{min}+</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : hs?.pending ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <span className="w-8 h-8 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
              <p className="text-sm font-body text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] font-medium">Computing health score…</p>
              <p className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">{hs.ai_narrative}</p>
            </div>
          ) : (
            <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] text-center py-8">
              No health score available for {district} yet.
            </p>
          )}
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between mb-4">
            <p className={sectionLabel.replace("mb-4", "mb-0")}>Recent Alerts</p>
            <Link
              href="/dashboard/alerts"
              className="text-xs font-body text-[var(--color-primary)] dark:text-[var(--color-primary-dark)] hover:underline flex items-center gap-1"
            >
              View all <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          {aLoad ? (
            <div className="flex justify-center py-6"><PageSpinner /></div>
          ) : activeAlerts.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">No active alerts</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeAlerts.slice(0, 5).map((alert) => (
                <AlertItem key={alert.id} alert={alert} compact />
              ))}
              {activeAlerts.length > 5 && (
                <p className="text-xs font-body text-center text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] pt-1">
                  +{activeAlerts.length - 5} more alerts
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className={cardClass}>
          <p className={sectionLabel}>Recent Flood Assessments</p>
          {floods.length === 0 ? (
            <div className="py-6 text-center">
              <CloudRain className="w-8 h-8 mx-auto text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mb-2 opacity-40" />
              <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">No flood assessments on record</p>
            </div>
          ) : (
            <div className="space-y-3">
              {floods.slice(0, 3).map((f) => (
                <div
                  key={f.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-body font-semibold capitalize ${floodStatusColor[f.status] ?? ""}`}>
                        {f.status}
                      </span>
                      <span className="text-[10px] font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
                        {f.trigger_type === "manual" ? "Manual trigger" : `${f.trigger_rainfall_mm}mm rainfall`}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
                      <span>{f.total_assets_flagged} flagged</span>
                      <span>·</span>
                      <span>{f.assets_damaged} damaged</span>
                      <span>·</span>
                      <span>{timeAgo(f.started_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
              <Link
                href="/dashboard/floods"
                className="block text-center text-xs font-body text-[var(--color-primary)] dark:text-[var(--color-primary-dark)] hover:underline mt-1"
              >
                View all assessments →
              </Link>
            </div>
          )}
        </div>

        <div className={cardClass}>
          <p className={sectionLabel}>Quick Actions</p>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: "All Alerts",         href: "/dashboard/alerts",  Icon: AlertTriangle },
              { label: "Sludge Chain",        href: "/dashboard/sludge",  Icon: Droplets },
              { label: "Flood Assessments",   href: "/dashboard/floods",  Icon: CloudRain },
              { label: "Schools MHM",         href: "/dashboard/schools", Icon: FileBarChart },
              { label: "Map Explorer",        href: "/map",               Icon: Map },
            ].map(({ label, href, Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] text-sm font-body font-medium text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] dark:hover:text-[var(--color-primary-dark)] hover:bg-[var(--color-primary)]/5 transition-all duration-150"
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 justify-start px-3 py-2.5 h-auto text-sm"
              onClick={downloadPdf}
            >
              <FileBarChart className="w-4 h-4 flex-shrink-0" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
