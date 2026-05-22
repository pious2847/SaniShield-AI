"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Thermometer, Droplets, Wind, CloudRain } from "lucide-react";
import { PageSpinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import { useDistrict } from "@/context/DistrictContext";

// ─── types ────────────────────────────────────────────────────────────────────

interface WeatherReading {
  district: string;
  rainfall_mm: number;
  temperature_c: number;
  humidity_percent: number;
  wind_speed_kmh: number;
  recorded_at: string;
  flood_risk_level: string;
  source: string;
}

interface WeatherSummary {
  district: string;
  avg_rainfall_7d: number;
  max_rainfall_7d: number;
  flood_days_7d: number;
  current: {
    rainfall_mm: number;
    temperature_c: number;
    humidity_percent: number;
    flood_risk_level: string;
  };
}

interface HeavyRainEvent {
  rainfall_mm: number;
  recorded_at: string;
}

// ─── design tokens ────────────────────────────────────────────────────────────

const cardClass =
  "bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] rounded-[var(--radius-lg)]";

const floodRiskConfig: Record<
  string,
  { text: string; bg: string; border: string; label: string }
> = {
  critical: {
    text:   "text-[var(--color-critical)]",
    bg:     "bg-red-50 dark:bg-red-950",
    border: "border-red-200 dark:border-red-900",
    label:  "Critical",
  },
  high: {
    text:   "text-orange-600",
    bg:     "bg-orange-50 dark:bg-orange-950",
    border: "border-orange-200 dark:border-orange-900",
    label:  "High",
  },
  moderate: {
    text:   "text-[var(--color-warning)]",
    bg:     "bg-amber-50 dark:bg-amber-950",
    border: "border-amber-200 dark:border-amber-900",
    label:  "Moderate",
  },
  low: {
    text:   "text-[var(--color-ok)]",
    bg:     "bg-green-50 dark:bg-green-950",
    border: "border-green-200 dark:border-green-900",
    label:  "Low",
  },
  none: {
    text:   "text-[var(--color-ok)]",
    bg:     "bg-green-50 dark:bg-green-950",
    border: "border-green-200 dark:border-green-900",
    label:  "None",
  },
};

function floodCfg(level: string) {
  return floodRiskConfig[level?.toLowerCase()] ?? floodRiskConfig.none;
}

// ─── stat box ─────────────────────────────────────────────────────────────────

function StatBox({
  icon: Icon,
  label,
  value,
  unit,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  unit?: string;
  sub?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-[var(--radius-md)] bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)]">
      <div className="flex items-center gap-1.5 text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[10px] font-body uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-display font-bold text-2xl tabular-nums text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] leading-none">
        {value}
        {unit && (
          <span className="text-sm font-body font-normal text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] ml-1">
            {unit}
          </span>
        )}
      </p>
      {sub && <div className="mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── rainfall bar ─────────────────────────────────────────────────────────────

function RainfallBar({ mm }: { mm: number }) {
  const MAX_MM = 100;
  const pct = Math.min((mm / MAX_MM) * 100, 100);
  const color =
    pct >= 80
      ? "bg-[var(--color-critical)]"
      : pct >= 50
      ? "bg-orange-500"
      : pct >= 25
      ? "bg-[var(--color-warning)]"
      : "bg-[var(--color-primary)]";

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-[var(--color-border)] dark:bg-[var(--color-border-dark)] rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono tabular-nums text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] w-12 text-right">
        {mm.toFixed(1)}mm
      </span>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function WeatherPage() {
  const { district } = useDistrict();

  const { data: summary, isLoading: summaryLoading } = useQuery<WeatherSummary>({
    queryKey: ["weather-summary", district],
    queryFn: async () => {
      const { data } = await api.get(`/weather/${encodeURIComponent(district)}/summary`);
      return data.data;
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  const { data: latestAll = [], isLoading: latestLoading } = useQuery<WeatherReading[]>({
    queryKey: ["weather-latest"],
    queryFn: async () => {
      const { data } = await api.get("/weather/latest");
      return data.data ?? [];
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  const { data: heavyRain = [], isLoading: heavyLoading } = useQuery<HeavyRainEvent[]>({
    queryKey: ["weather-heavy-rain", district],
    queryFn: async () => {
      const { data } = await api.get(`/weather/${encodeURIComponent(district)}/heavy-rain`);
      return data.data ?? [];
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  const current = summary?.current;
  const riskCfg = floodCfg(current?.flood_risk_level ?? "none");

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
          Weather & Flood Risk
        </h1>
        <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mt-0.5">
          Live conditions and 7-day trends for{" "}
          <span className="font-semibold text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)]">
            {district}
          </span>
        </p>
      </div>

      {/* ── district summary card ── */}
      {summaryLoading ? (
        <div className="flex justify-center py-10">
          <PageSpinner />
        </div>
      ) : summary && current ? (
        <div className={cn(cardClass, "p-5")}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-body font-semibold uppercase tracking-wider text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
              Current Conditions
            </p>
            <span className="text-xs font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
              7d avg: {summary.avg_rainfall_7d.toFixed(1)}mm · max: {summary.max_rainfall_7d.toFixed(1)}mm · {summary.flood_days_7d} flood day{summary.flood_days_7d !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox
              icon={CloudRain}
              label="Rainfall"
              value={current.rainfall_mm.toFixed(1)}
              unit="mm"
            />
            <StatBox
              icon={Thermometer}
              label="Temp"
              value={current.temperature_c.toFixed(1)}
              unit="°C"
            />
            <StatBox
              icon={Droplets}
              label="Humidity"
              value={current.humidity_percent.toFixed(0)}
              unit="%"
            />
            <StatBox
              icon={Wind}
              label="Flood Risk"
              value={current.flood_risk_level ? (current.flood_risk_level.charAt(0).toUpperCase() + current.flood_risk_level.slice(1)) : "—"}
              sub={
                <span
                  className={cn(
                    "text-[10px] font-body font-semibold px-2 py-0.5 rounded-full border",
                    riskCfg.text,
                    riskCfg.bg,
                    riskCfg.border
                  )}
                >
                  {riskCfg.label}
                </span>
              }
            />
          </div>
        </div>
      ) : (
        <div className={cn(cardClass, "p-5 text-center")}>
          <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
            No summary data available for {district}.
          </p>
        </div>
      )}

      {/* ── all districts table ── */}
      <div className={cn(cardClass, "overflow-hidden")}>
        <div className="px-5 py-4 border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)]">
          <h2 className="font-display font-semibold text-base text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">
            All Districts — Latest Readings
          </h2>
        </div>

        {latestLoading ? (
          <div className="flex justify-center py-10">
            <PageSpinner />
          </div>
        ) : latestAll.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
              No readings available.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)]">
                  {["District", "Rainfall", "Temp", "Humidity", "Wind", "Risk", "Updated"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-5 py-2.5 text-left text-[10px] font-body uppercase tracking-wider text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] font-semibold whitespace-nowrap"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] dark:divide-[var(--color-border-dark)]">
                {latestAll.map((row) => {
                  const rc = floodCfg(row.flood_risk_level);
                  return (
                    <tr
                      key={row.district}
                      className={cn(
                        "hover:bg-[var(--color-bg)] dark:hover:bg-[var(--color-bg-dark)] transition-colors",
                        row.district === district &&
                          "bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)]"
                      )}
                    >
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className="font-body font-medium text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">
                          {row.district}
                        </span>
                        {row.district === district && (
                          <span className="ml-2 text-[9px] font-body font-bold uppercase tracking-wide text-[var(--color-primary)] opacity-70">
                            selected
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <RainfallBar mm={row.rainfall_mm} />
                      </td>
                      <td className="px-5 py-3 font-mono tabular-nums text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] whitespace-nowrap">
                        {row.temperature_c.toFixed(1)}°C
                      </td>
                      <td className="px-5 py-3 font-mono tabular-nums text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)]">
                        {row.humidity_percent.toFixed(0)}%
                      </td>
                      <td className="px-5 py-3 font-mono tabular-nums text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] whitespace-nowrap">
                        {row.wind_speed_kmh.toFixed(1)} km/h
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "text-xs font-body font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap",
                            rc.text,
                            rc.bg,
                            rc.border
                          )}
                        >
                          {rc.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] whitespace-nowrap">
                        {timeAgo(row.recorded_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── heavy rain events ── */}
      <div className={cn(cardClass, "overflow-hidden")}>
        <div className="px-5 py-4 border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)]">
          <h2 className="font-display font-semibold text-base text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">
            Heavy Rain Events
          </h2>
          <p className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mt-0.5">
            Recent high-rainfall events for {district}
          </p>
        </div>

        {heavyLoading ? (
          <div className="flex justify-center py-10">
            <PageSpinner />
          </div>
        ) : heavyRain.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <CloudRain className="w-8 h-8 mx-auto mb-2 text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] opacity-30" />
            <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
              No heavy rain events recorded for {district}.
            </p>
          </div>
        ) : (
          <motion.ul
            initial="initial"
            animate="animate"
            variants={{ animate: { transition: { staggerChildren: 0.04 } } }}
            className="divide-y divide-[var(--color-border)] dark:divide-[var(--color-border-dark)]"
          >
            {heavyRain.map((evt, idx) => (
              <motion.li
                key={idx}
                variants={{
                  initial: { opacity: 0, x: -6 },
                  animate: { opacity: 1, x: 0 },
                }}
                className="flex items-center justify-between gap-4 px-5 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-critical)] flex-shrink-0" />
                  <span className="font-display font-bold tabular-nums text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">
                    {evt.rainfall_mm.toFixed(1)}
                    <span className="text-xs font-body font-normal text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] ml-1">
                      mm
                    </span>
                  </span>
                </div>
                <RainfallBar mm={evt.rainfall_mm} />
                <span className="text-xs font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] flex-shrink-0">
                  {timeAgo(evt.recorded_at)}
                </span>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </div>

      <p className="text-xs font-body text-center text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
        Weather data refreshes every 5 minutes
      </p>
    </motion.div>
  );
}
