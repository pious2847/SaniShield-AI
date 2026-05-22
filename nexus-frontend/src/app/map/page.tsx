"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Map, Layers, ChevronLeft, Toilet, Activity, AlertTriangle, Droplets } from "lucide-react";
import { PageSpinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { cn, DISTRICTS } from "@/lib/utils";
import type { GeoFeatureCollection } from "@/types";

const LeafletMap = dynamic(
  () => import("@/components/map/LeafletMap").then((m) => m.LeafletMap),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center bg-[#0d1117]"><PageSpinner /></div> }
);

type LayerKey = "toilets" | "units" | "dumps" | "vulnerability";

const layerDefs: Array<{ key: LayerKey; label: string; color: string; endpoint: string; icon: React.ReactNode }> = [
  { key: "toilets",       label: "Toilets",         color: "#27AE60", endpoint: "/map/toilets",       icon: <Toilet className="w-3.5 h-3.5" /> },
  { key: "units",         label: "Sanitation Units", color: "#2980B9", endpoint: "/map/units",         icon: <Activity className="w-3.5 h-3.5" /> },
  { key: "dumps",         label: "Dump Sites",       color: "#C0392B", endpoint: "/map/dumps",         icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  { key: "vulnerability", label: "Vulnerability",    color: "#E67E22", endpoint: "/map/vulnerability", icon: <Droplets className="w-3.5 h-3.5" /> },
];

export default function MapPage() {
  const [activeLayers, setActiveLayers] = useState<Set<LayerKey>>(new Set(["toilets", "units"]));
  const [panelOpen,    setPanelOpen]    = useState(true);
  const [district,     setDistrict]     = useState("Tamale Metro");

  const layerQueries = Object.fromEntries(
    layerDefs.map(({ key, endpoint }) => [
      key,
      useQuery<GeoFeatureCollection>({
        queryKey: ["map-layer", key, district],
        queryFn: async () => {
          const { data } = await api.get(`${endpoint}?district=${encodeURIComponent(district)}`);
          return data;
        },
        enabled: activeLayers.has(key),
        staleTime: 2 * 60 * 1000,
      }),
    ])
  ) as unknown as Record<LayerKey, { data?: GeoFeatureCollection; isFetching: boolean }>;

  const toggleLayer = (key: LayerKey) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const mapLayers = layerDefs
    .filter(({ key }) => activeLayers.has(key))
    .map(({ key, label, color }) => ({
      key,
      label,
      color,
      data: layerQueries[key]?.data,
    }));

  const isFetching = layerDefs.some(({ key }) => activeLayers.has(key) && layerQueries[key]?.isFetching);

  const totalFeatures = mapLayers.reduce((sum, l) => sum + (l.data?.features.length ?? 0), 0);

  return (
    <div className="flex flex-col h-full">
      <header className="flex-shrink-0 flex items-center justify-between px-4 h-14 border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)] bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] z-10">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] hover:text-[var(--color-primary)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <span className="text-[var(--color-border)] dark:text-[var(--color-border-dark)]">·</span>
          <div className="flex items-center gap-1.5">
            <Map className="w-4 h-4 text-[var(--color-primary)] dark:text-[var(--color-primary-dark)]" />
            <span className="font-display font-semibold text-sm text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">
              Map Explorer
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isFetching && (
            <div className="flex items-center gap-1.5 text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
              <span className="w-2.5 h-2.5 rounded-full border border-[var(--color-primary)] border-t-transparent animate-spin" />
              Loading…
            </div>
          )}
          {totalFeatures > 0 && (
            <span className="text-xs font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
              {totalFeatures} points
            </span>
          )}
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="h-8 px-2 rounded-[var(--radius-md)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] text-xs font-body text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] focus:outline-none"
          >
            {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className={cn(
              "flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-md)] text-xs font-body font-medium transition-all",
              panelOpen
                ? "bg-[var(--color-primary)] text-white"
                : "border border-[var(--color-border)] dark:border-[var(--color-border-dark)] text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] hover:border-[var(--color-primary)]"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            Layers
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        <LeafletMap layers={mapLayers} center={[9.4038, -0.8424]} zoom={11} />

        <AnimatePresence>
          {panelOpen && (
            <motion.div
              initial={{ x: 280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 280, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-0 bottom-0 w-64 bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border-l border-[var(--color-border)] dark:border-[var(--color-border-dark)] shadow-xl z-[1000] flex flex-col overflow-y-auto"
            >
              <div className="p-4 border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)]">
                <p className="font-display font-semibold text-xs text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wider">
                  Map Layers
                </p>
              </div>

              <div className="p-3 space-y-1.5 flex-1">
                {layerDefs.map(({ key, label, color, icon }) => {
                  const active   = activeLayers.has(key);
                  const count    = layerQueries[key]?.data?.features.length;
                  const fetching = active && layerQueries[key]?.isFetching;

                  return (
                    <button
                      key={key}
                      onClick={() => toggleLayer(key)}
                      className={cn(
                        "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-[var(--radius-md)] border transition-all duration-150 text-left",
                        active
                          ? "border-[color:var(--layer-color)] bg-[color:var(--layer-color)]/10"
                          : "border-[var(--color-border)] dark:border-[var(--color-border-dark)] opacity-50 hover:opacity-75"
                      )}
                      style={{ "--layer-color": color } as React.CSSProperties}
                    >
                      <div className="flex items-center gap-2">
                        <span style={{ color }} className={cn("transition-opacity", active ? "opacity-100" : "opacity-50")}>{icon}</span>
                        <span className="text-xs font-body font-medium text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">{label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {fetching && (
                          <span className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" style={{ color }} />
                        )}
                        {count !== undefined && (
                          <span className="text-[10px] font-mono" style={{ color }}>{count}</span>
                        )}
                        <span className={cn(
                          "w-3 h-3 rounded-sm border-2 transition-all",
                          active ? "border-[color:var(--layer-color)] bg-[color:var(--layer-color)]" : "border-gray-300 dark:border-gray-600"
                        )} />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="p-4 border-t border-[var(--color-border)] dark:border-[var(--color-border-dark)]">
                <p className="text-[10px] font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] leading-relaxed">
                  Northern Ghana · Tamale Basin · Data from N.E.X.U.S. live sensors and field reports
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
