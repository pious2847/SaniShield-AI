"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Thermometer, Droplets, Wind, CloudRain, AlertTriangle, Sparkles, ChevronDown, Clock } from "lucide-react";
import { PageSpinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import { useDistrict } from "@/context/DistrictContext";

// ─── types ────────────────────────────────────────────────────────────────────

interface WeatherReading {
  id: string;
  district: string;
  temperature_c: number | null;
  precipitation_mm: number | null;
  humidity_pct: number | null;
  windspeed_kmh: number | null;
  max_precip_rate_mm: number | null;
  total_precip_24h: number | null;
  hourly_precip: number[];
  raw_api_data: {
    hourly: {
      time: string[];
      precipitation: number[];
      temperature_2m: number[];
      precipitation_probability: number[];
    };
    current: {
      temperature_2m: number;
      precipitation: number;
      windspeed_10m: number;
      relative_humidity_2m: number;
    };
  } | null;
  season: string;
  recorded_at: string;
}

interface HeavyRainEvent {
  rainfall_mm: number;
  recorded_at: string;
}

// ─── design tokens ────────────────────────────────────────────────────────────

const cardClass =
  "bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] rounded-[var(--radius-lg)]";

// ─── color helpers ─────────────────────────────────────────────────────────

function precipCellColor(mm: number): string {
  if (mm <= 0)    return "rgba(59,130,246,0.05)";
  if (mm < 0.1)   return "rgba(59,130,246,0.18)";
  if (mm < 0.3)   return "rgba(59,130,246,0.38)";
  if (mm < 0.5)   return "rgba(59,130,246,0.58)";
  if (mm < 1)     return "rgba(37,99,235,0.75)";
  if (mm < 2)     return "rgba(249,115,22,0.8)";
  if (mm < 5)     return "rgba(239,68,68,0.82)";
  return "rgba(185,28,28,0.9)";
}

function tempCellColor(temp: number): string {
  if (temp < 24)  return "rgba(59,130,246,0.35)";
  if (temp < 26)  return "rgba(34,197,94,0.35)";
  if (temp < 28)  return "rgba(163,230,53,0.42)";
  if (temp < 30)  return "rgba(234,179,8,0.48)";
  if (temp < 32)  return "rgba(249,115,22,0.52)";
  if (temp < 34)  return "rgba(239,68,68,0.58)";
  return "rgba(185,28,28,0.72)";
}

function deriveRisk(total24h: number | null): "critical" | "high" | "moderate" | "low" | "none" {
  const v = total24h ?? 0;
  if (v >= 25) return "critical";
  if (v >= 15) return "high";
  if (v >= 5)  return "moderate";
  if (v >= 1)  return "low";
  return "none";
}

const riskBadgeClass: Record<string, string> = {
  critical: "text-[var(--color-critical)] bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900",
  high:     "text-orange-600 bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-900",
  moderate: "text-[var(--color-warning)] bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-900",
  low:      "text-[var(--color-ok)] bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900",
  none:     "text-[var(--color-text-3)] bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)] border-[var(--color-border)] dark:border-[var(--color-border-dark)]",
};

// ─── alert AI briefing ────────────────────────────────────────────────────────

function buildAlertQuestion(row: WeatherReading): string {
  const hourly = row.hourly_precip ?? [];
  const maxVal  = Math.max(...hourly, 0);
  const peakH   = hourly.indexOf(maxVal);
  const rainySlots = hourly
    .map((v, i) => (v > 0 ? `${String(i).padStart(2, "0")}:00 (${v.toFixed(2)}mm)` : null))
    .filter(Boolean)
    .join(", ");

  const nextDayPrecip = row.raw_api_data?.hourly?.precipitation?.slice(24) ?? [];
  const nextPeakH     = nextDayPrecip.indexOf(Math.max(...nextDayPrecip, 0));
  const nextPeakVal   = nextDayPrecip[nextPeakH] ?? 0;

  return `You are providing a weather alert briefing for community members and sanitation workers in ${row.district} district, Northern Ghana.

Current conditions: ${row.temperature_c ?? "—"}°C, humidity ${row.humidity_pct ?? "—"}%, wind ${row.windspeed_kmh ?? "—"} km/h, current precipitation ${row.precipitation_mm ?? 0}mm.
24-hour total rainfall: ${row.total_precip_24h ?? 0}mm. Peak hourly rate: ${row.max_precip_rate_mm ?? 0}mm/h.
Rainy hours today: ${rainySlots || "none recorded yet"}.
Heaviest rain today was at ${peakH}:00 (${maxVal.toFixed(2)}mm).
Tomorrow's forecast peak: around ${nextPeakH + 24}:00 with ${nextPeakVal.toFixed(2)}mm expected.

Write a clear, friendly, plain-language briefing (3–4 short paragraphs) that a community member without technical knowledge can understand. Include:
1. What the weather has been like today, mentioning specific times in plain language (e.g. "mid-morning", "late afternoon")
2. What to expect tonight and tomorrow, with specific time windows
3. Practical advice for protecting pit latrines, open defecation sites, and household sanitation around ${row.district}
4. One sentence on flood risk for low-lying areas`;
}

interface AiBriefing {
  answer: string;
  key_points: string[];
  local_context: string;
}

function AlertItem({ row }: { row: WeatherReading }) {
  const [open, setOpen]         = useState(false);
  const [briefing, setBriefing] = useState<AiBriefing | null>(null);
  const [retryIn, setRetryIn]   = useState<number | null>(null);

  const risk   = deriveRisk(row.total_precip_24h);
  const hourly = row.hourly_precip ?? [];
  const maxH   = Math.max(...hourly, 0.01);

  const { mutate: generate, isPending } = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/educator/ask", {
        question: buildAlertQuestion(row),
        district: row.district,
      });
      return data?.data as AiBriefing;
    },
    onSuccess: (data) => { setBriefing(data); setRetryIn(null); },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number; data?: { retryAfter?: number } } })?.response?.status;
      const after  = (err as { response?: { data?: { retryAfter?: number } } })?.response?.data?.retryAfter ?? 30;
      if (status === 429) {
        setRetryIn(after);
        const tick = setInterval(() => {
          setRetryIn((s) => {
            if (s === null || s <= 1) { clearInterval(tick); return null; }
            return s - 1;
          });
        }, 1000);
      }
    },
  });

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border overflow-hidden transition-colors duration-150",
        risk === "critical"
          ? "border-red-300 dark:border-red-800"
          : risk === "high"
          ? "border-orange-300 dark:border-orange-800"
          : "border-amber-200 dark:border-amber-800"
      )}
    >
      {/* Collapsed header — always visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-150",
          risk === "critical"
            ? "bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-950"
            : risk === "high"
            ? "bg-orange-50 dark:bg-orange-950/60 hover:bg-orange-100 dark:hover:bg-orange-950"
            : "bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-950"
        )}
      >
        {/* Pulsing dot */}
        <span
          className={cn(
            "w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse",
            risk === "critical" ? "bg-red-500"
              : risk === "high"  ? "bg-orange-500"
              : "bg-amber-500"
          )}
        />

        {/* District + risk */}
        <span className="font-display font-bold text-sm text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] flex-shrink-0">
          {row.district}
        </span>
        <span
          className={cn(
            "text-[10px] font-body font-semibold px-2 py-0.5 rounded-full border capitalize flex-shrink-0",
            riskBadgeClass[risk]
          )}
        >
          {risk}
        </span>

        {/* Stats */}
        <div className="flex items-center gap-4 ml-1 flex-1 min-w-0 flex-wrap">
          <span className="text-xs font-mono text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] whitespace-nowrap">
            24h: <strong>{(row.total_precip_24h ?? 0).toFixed(1)}mm</strong>
          </span>
          <span className="text-xs font-mono text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] whitespace-nowrap">
            Peak: <strong>{(row.max_precip_rate_mm ?? 0).toFixed(1)}mm/h</strong>
          </span>
          <span className="text-xs font-mono text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] whitespace-nowrap">
            {(row.temperature_c ?? 0).toFixed(0)}°C · {row.humidity_pct ?? "—"}%
          </span>
        </div>

        <ChevronDown
          className={cn(
            "w-4 h-4 flex-shrink-0 text-[var(--color-text-3)] transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Expanded body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-3 bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] space-y-4">
              {/* Hourly bar chart */}
              <div>
                <p className="text-[10px] font-body font-semibold uppercase tracking-wider text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mb-2">
                  Today&rsquo;s hourly precipitation
                </p>
                <div className="flex items-end gap-0.5" style={{ height: 48 }}>
                  {hourly.map((val, i) => {
                    const barH = Math.max(Math.round((val / maxH) * 48), val > 0 ? 3 : 0);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                        <div
                          className="w-full rounded-t-[2px] transition-all"
                          style={{
                            height: barH || 2,
                            backgroundColor:
                              val >= 2   ? "rgba(239,68,68,0.8)"
                              : val >= 1 ? "rgba(249,115,22,0.75)"
                              : val > 0  ? "rgba(37,99,235,0.65)"
                              : "rgba(59,130,246,0.08)",
                          }}
                          title={`${i}:00 — ${val.toFixed(2)}mm`}
                        />
                        {/* Hour label every 3h */}
                        {i % 6 === 0 && (
                          <span className="text-[8px] font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] absolute -bottom-4">
                            {i}h
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div style={{ height: 14 }} /> {/* spacer for hour labels */}
              </div>

              {/* Forecast probabilities (next 24h from raw_api_data) */}
              {row.raw_api_data?.hourly?.precipitation_probability && (
                <div>
                  <p className="text-[10px] font-body font-semibold uppercase tracking-wider text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mb-2 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    Rain probability forecast (next 24h)
                  </p>
                  <div className="flex items-end gap-0.5" style={{ height: 32 }}>
                    {row.raw_api_data.hourly.precipitation_probability.slice(0, 24).map((prob, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-[2px]"
                        style={{
                          height: Math.max(Math.round((prob / 100) * 32), 1),
                          backgroundColor: `rgba(59,130,246,${0.1 + (prob / 100) * 0.7})`,
                        }}
                        title={`${i}:00 — ${prob}% chance`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">0h</span>
                    <span className="text-[9px] font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">12h</span>
                    <span className="text-[9px] font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">23h</span>
                  </div>
                </div>
              )}

              {/* AI Briefing */}
              <div className="border-t border-[var(--color-border)] dark:border-[var(--color-border-dark)] pt-3">
                {!briefing && !isPending && retryIn === null && (
                  <button
                    onClick={() => generate()}
                    className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] text-sm font-body font-semibold transition-all duration-150",
                      "bg-[var(--color-ochre)]/10 border border-[var(--color-ochre)]/30",
                      "text-[var(--color-ochre)] hover:bg-[var(--color-ochre)]/18"
                    )}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate AI Briefing
                  </button>
                )}

                {retryIn !== null && (
                  <div className="flex items-center gap-3 py-1">
                    <div className="relative w-8 h-8 flex-shrink-0">
                      <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                        <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="2.5"
                          className="text-[var(--color-border)] dark:text-[var(--color-border-dark)]" />
                        <motion.circle
                          cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="2.5"
                          strokeLinecap="round"
                          className="text-[var(--color-ochre)]"
                          strokeDasharray={`${2 * Math.PI * 13}`}
                          strokeDashoffset={`${2 * Math.PI * 13 * (retryIn / 30)}`}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-[var(--color-ochre)]">
                        {retryIn}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-body font-semibold text-[var(--color-warning)]">
                        AI quota reached
                      </p>
                      <p className="text-[10px] font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
                        Retry available in {retryIn}s
                      </p>
                    </div>
                    {retryIn <= 0 && (
                      <button
                        onClick={() => generate()}
                        className="ml-auto text-xs font-body font-semibold text-[var(--color-ochre)] hover:underline"
                      >
                        Try again
                      </button>
                    )}
                  </div>
                )}

                {isPending && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="w-7 h-7 rounded-full bg-[var(--color-ochre)]/15 border border-[var(--color-ochre)]/30 flex items-center justify-center flex-shrink-0">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[var(--color-ochre)]" />
                      </motion.div>
                    </div>
                    <div className="flex items-center gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-3)] dark:bg-[var(--color-text-3-dark)]"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                        />
                      ))}
                      <span className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] ml-2">
                        Generating briefing…
                      </span>
                    </div>
                  </div>
                )}

                {briefing && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    {/* Header */}
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[var(--color-ochre)]/15 border border-[var(--color-ochre)]/30 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-3 h-3 text-[var(--color-ochre)]" />
                      </div>
                      <span className="text-xs font-body font-semibold text-[var(--color-ochre)] uppercase tracking-wide">
                        AI Weather Briefing — {row.district}
                      </span>
                      <button
                        onClick={() => generate()}
                        className="ml-auto text-[10px] font-mono text-[var(--color-text-3)] hover:text-[var(--color-text-2)] transition-colors"
                      >
                        Regenerate
                      </button>
                    </div>

                    {/* Answer */}
                    <div className="text-sm font-body text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] leading-relaxed whitespace-pre-line">
                      {briefing.answer}
                    </div>

                    {/* Key points */}
                    {briefing.key_points?.length > 0 && (
                      <ul className="space-y-1.5">
                        {briefing.key_points.map((pt, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs font-body text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)]">
                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[var(--color-ochre)] flex-shrink-0" />
                            {pt}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Local context */}
                    {briefing.local_context && (
                      <p className="text-xs font-body italic text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] border-l-2 border-[var(--color-ochre)]/40 pl-3">
                        {briefing.local_context}
                      </p>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AlertsPanel({ data }: { data: WeatherReading[] }) {
  const alerts = data
    .filter((r) => (r.total_precip_24h ?? 0) >= 1 || (r.precipitation_mm ?? 0) > 0)
    .sort((a, b) => (b.total_precip_24h ?? 0) - (a.total_precip_24h ?? 0));

  if (alerts.length === 0) return null;

  return (
    <div className={cn(cardClass, "overflow-hidden")}>
      <div className="px-5 py-4 border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)] flex items-center gap-3">
        <AlertTriangle className="w-4 h-4 text-[var(--color-warning)] flex-shrink-0" />
        <div>
          <h2 className="font-display font-semibold text-base text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">
            Active Rain Alerts
          </h2>
          <p className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mt-0.5">
            {alerts.length} district{alerts.length !== 1 ? "s" : ""} with measurable precipitation — click to expand and generate AI briefing
          </p>
        </div>
      </div>
      <div className="p-4 space-y-2">
        {alerts.map((row) => (
          <AlertItem key={row.district} row={row} />
        ))}
      </div>
    </div>
  );
}

// ─── heatmap ──────────────────────────────────────────────────────────────────

type HeatMode = "precip" | "temp";

const PRECIP_LEGEND = [
  { color: "rgba(59,130,246,0.05)",  label: "0" },
  { color: "rgba(59,130,246,0.38)",  label: "0.3" },
  { color: "rgba(37,99,235,0.75)",   label: "0.5" },
  { color: "rgba(249,115,22,0.8)",   label: "1mm" },
  { color: "rgba(239,68,68,0.82)",   label: "2mm" },
  { color: "rgba(185,28,28,0.9)",    label: "5mm+" },
];

const TEMP_LEGEND = [
  { color: "rgba(59,130,246,0.35)",  label: "<24°" },
  { color: "rgba(34,197,94,0.35)",   label: "24°" },
  { color: "rgba(163,230,53,0.42)",  label: "26°" },
  { color: "rgba(234,179,8,0.48)",   label: "28°" },
  { color: "rgba(249,115,22,0.52)",  label: "30°" },
  { color: "rgba(239,68,68,0.58)",   label: "32°" },
  { color: "rgba(185,28,28,0.72)",   label: "34°+" },
];

function WeatherHeatmap({ data }: { data: WeatherReading[] }) {
  const [mode, setMode] = useState<HeatMode>("precip");
  const [tooltip, setTooltip] = useState<{ district: string; hour: number; value: number } | null>(null);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const legend = mode === "precip" ? PRECIP_LEGEND : TEMP_LEGEND;

  function cellValue(row: WeatherReading, h: number): number {
    if (mode === "precip") {
      return row.hourly_precip?.[h] ?? 0;
    }
    const temps = row.raw_api_data?.hourly?.temperature_2m;
    return temps?.[h] ?? (row.temperature_c ?? 28);
  }

  function cellColor(row: WeatherReading, h: number): string {
    const v = cellValue(row, h);
    return mode === "precip" ? precipCellColor(v) : tempCellColor(v);
  }

  return (
    <div className={cn(cardClass, "overflow-hidden")}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)] flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display font-semibold text-base text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">
            24-Hour District Heatmap
          </h2>
          <p className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mt-0.5">
            Hourly readings across all districts — today
          </p>
        </div>
        {/* Mode toggle */}
        <div className="flex items-center p-0.5 rounded-[var(--radius-md)] bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)]">
          {(["precip", "temp"] as HeatMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-body font-medium transition-all duration-150",
                mode === m
                  ? "bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] shadow-sm"
                  : "text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] hover:text-[var(--color-text-2)]"
              )}
            >
              {m === "precip" ? "Rainfall" : "Temperature"}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {/* Legend */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-[10px] font-body font-semibold uppercase tracking-wider text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
            Scale:
          </span>
          {legend.map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1">
              <div
                className="w-5 h-3 rounded-[2px] border border-[var(--color-border)] dark:border-[var(--color-border-dark)]"
                style={{ backgroundColor: color }}
              />
              <span className="text-[10px] font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="overflow-x-auto">
          <div style={{ minWidth: 720 }}>
            {/* Hour axis */}
            <div className="flex items-center mb-1.5 gap-0.5" style={{ marginLeft: 116 }}>
              {hours.map((h) => (
                <div
                  key={h}
                  className="text-[9px] font-mono text-center text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]"
                  style={{ width: 26, flexShrink: 0 }}
                >
                  {h % 3 === 0 ? `${h}h` : ""}
                </div>
              ))}
            </div>

            {/* Rows */}
            <div className="space-y-0.5">
              {data.map((row, rIdx) => (
                <motion.div
                  key={row.district}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: rIdx * 0.035 }}
                  className="flex items-center gap-0.5"
                >
                  {/* Label */}
                  <div
                    className="text-xs font-body text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] truncate shrink-0 text-right pr-2"
                    style={{ width: 112 }}
                  >
                    {row.district}
                  </div>
                  {/* Cells */}
                  {hours.map((h) => {
                    const val = cellValue(row, h);
                    const active = tooltip?.district === row.district && tooltip?.hour === h;
                    return (
                      <div
                        key={h}
                        className="relative"
                        onMouseEnter={() => setTooltip({ district: row.district, hour: h, value: val })}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <div
                          className="rounded-[2px] border border-white/10 dark:border-black/10 cursor-default transition-transform duration-75 hover:scale-125 hover:z-10 relative"
                          style={{
                            width: 26,
                            height: 22,
                            backgroundColor: cellColor(row, h),
                            flexShrink: 0,
                          }}
                        />
                        <AnimatePresence>
                          {active && (
                            <motion.div
                              initial={{ opacity: 0, y: -4, scale: 0.88 }}
                              animate={{ opacity: 1, y: -6, scale: 1 }}
                              exit={{ opacity: 0, y: -4, scale: 0.88 }}
                              transition={{ duration: 0.08 }}
                              className="absolute bottom-full left-1/2 -translate-x-1/2 z-50 pointer-events-none whitespace-nowrap"
                            >
                              <div className="bg-[var(--color-bg-dark)] text-white text-[10px] font-mono px-2 py-1 rounded-[var(--radius-sm)] shadow-lg">
                                <span className="font-semibold">{row.district}</span>
                                {" "}
                                {h}:00
                                {" — "}
                                {mode === "precip"
                                  ? `${val.toFixed(2)}mm`
                                  : `${val.toFixed(1)}°C`}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── district card ─────────────────────────────────────────────────────────

function DistrictCard({ row, selected }: { row: WeatherReading; selected: boolean }) {
  const risk = deriveRisk(row.total_precip_24h);
  const hourly = row.hourly_precip ?? [];
  const maxH = Math.max(...hourly, 0.01);

  return (
    <div
      className={cn(
        cardClass,
        "p-4 transition-shadow duration-150",
        selected && "ring-2 ring-[var(--color-primary)] ring-offset-1"
      )}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-1.5 mb-3">
        <p className="font-display font-semibold text-sm text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] leading-tight">
          {row.district}
        </p>
        <span
          className={cn(
            "text-[10px] font-body font-semibold px-1.5 py-0.5 rounded-full border capitalize flex-shrink-0",
            riskBadgeClass[risk]
          )}
        >
          {risk}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <div>
          <p className="text-[10px] font-body uppercase tracking-wide text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
            Temp
          </p>
          <p className="font-display font-bold text-xl tabular-nums text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] leading-none">
            {(row.temperature_c ?? 0).toFixed(1)}°
          </p>
        </div>
        <div>
          <p className="text-[10px] font-body uppercase tracking-wide text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
            24h Rain
          </p>
          <p className="font-display font-bold text-xl tabular-nums text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] leading-none">
            {(row.total_precip_24h ?? 0).toFixed(1)}
            <span className="text-xs font-body font-normal text-[var(--color-text-3)] ml-0.5">mm</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] font-body uppercase tracking-wide text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
            Humidity
          </p>
          <p className="font-mono text-sm tabular-nums text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)]">
            {row.humidity_pct ?? "—"}%
          </p>
        </div>
        <div>
          <p className="text-[10px] font-body uppercase tracking-wide text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
            Wind
          </p>
          <p className="font-mono text-sm tabular-nums text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)]">
            {(row.windspeed_kmh ?? 0).toFixed(0)}
            <span className="text-[10px] text-[var(--color-text-3)] ml-0.5">km/h</span>
          </p>
        </div>
      </div>

      {/* 24h sparkline */}
      <div className="mt-3 flex items-end gap-px" style={{ height: 24 }}>
        {hourly.map((val, i) => {
          const barH = Math.max(Math.round((val / maxH) * 24), val > 0 ? 2 : 0);
          return (
            <div
              key={i}
              className="flex-1 rounded-t-[1px] transition-all"
              style={{
                height: barH || 1,
                backgroundColor:
                  val >= 2
                    ? "rgba(239,68,68,0.75)"
                    : val >= 0.5
                    ? "rgba(37,99,235,0.6)"
                    : val > 0
                    ? "rgba(59,130,246,0.35)"
                    : "rgba(59,130,246,0.06)",
              }}
              title={`${i}:00 — ${val.toFixed(2)}mm`}
            />
          );
        })}
      </div>
      <p className="text-[9px] font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mt-0.5">
        24h precip pattern
      </p>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function WeatherPage() {
  const { district } = useDistrict();

  const { data: latestAll = [], isLoading } = useQuery<WeatherReading[]>({
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

  const maxTemp      = latestAll.length ? Math.max(...latestAll.map((r) => r.temperature_c ?? 0)) : 0;
  const maxRain      = latestAll.length ? Math.max(...latestAll.map((r) => r.total_precip_24h ?? 0)) : 0;
  const selectedData = latestAll.find((r) => r.district === district);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">
          Weather & Flood Risk
        </h1>
        <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mt-0.5">
          Real-time conditions across Northern Ghana — {selectedData?.season ?? "wet season"}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <PageSpinner />
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className={cn(cardClass, "p-4 flex flex-col gap-1")}>
              <p className="text-[10px] font-body uppercase tracking-wide text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
                Districts Tracked
              </p>
              <p className="font-display font-bold text-3xl tabular-nums text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">
                {latestAll.length}
              </p>
            </div>
            <div className={cn(cardClass, "p-4 flex flex-col gap-1")}>
              <p className="text-[10px] font-body uppercase tracking-wide text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
                Highest Temp
              </p>
              <p className="font-display font-bold text-3xl tabular-nums text-[var(--color-warning)]">
                {maxTemp.toFixed(0)}°C
              </p>
            </div>
            <div className={cn(cardClass, "p-4 flex flex-col gap-1", maxRain >= 5 ? "border-[var(--color-critical)]" : "")}>
              <p className="text-[10px] font-body uppercase tracking-wide text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
                Max 24h Rain
              </p>
              <p className={cn("font-display font-bold text-3xl tabular-nums", maxRain >= 5 ? "text-[var(--color-critical)]" : "text-[var(--color-ok)]")}>
                {maxRain.toFixed(1)}
                <span className="text-base font-body font-normal text-[var(--color-text-3)] ml-1">mm</span>
              </p>
            </div>
          </div>

          {/* Alerts panel */}
          <AlertsPanel data={latestAll} />

          {/* Heatmap */}
          {latestAll.length > 0 && <WeatherHeatmap data={latestAll} />}

          {/* District cards */}
          <div>
            <p className="text-xs font-display font-semibold uppercase tracking-wider text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mb-3">
              All Districts — Current Conditions
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              {latestAll.map((row) => (
                <DistrictCard
                  key={row.district}
                  row={row}
                  selected={row.district === district}
                />
              ))}
            </div>
          </div>

          {/* Heavy rain events */}
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
                    variants={{ initial: { opacity: 0, x: -6 }, animate: { opacity: 1, x: 0 } }}
                    className="flex items-center justify-between gap-4 px-5 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-[var(--color-critical)] flex-shrink-0" />
                      <span className="font-display font-bold tabular-nums text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">
                        {(evt.rainfall_mm ?? 0).toFixed(1)}
                        <span className="text-xs font-body font-normal text-[var(--color-text-3)] ml-1">mm</span>
                      </span>
                    </div>
                    <div className="flex-1 mx-4 h-1.5 bg-[var(--color-border)] dark:bg-[var(--color-border-dark)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--color-critical)]"
                        style={{ width: `${Math.min(((evt.rainfall_mm ?? 0) / 50) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] flex-shrink-0">
                      {timeAgo(evt.recorded_at)}
                    </span>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </div>

          <p className="text-xs font-body text-center text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
            Refreshes every 5 min · Source: Open-Meteo
          </p>
        </>
      )}
    </motion.div>
  );
}
