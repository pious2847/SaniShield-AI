"use client";

import dynamic from "next/dynamic";
import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Map, Layers, ChevronLeft, Toilet, Activity, AlertTriangle,
  Droplets, Truck, Building2, X, Search, Info,
  TriangleAlert, Thermometer, ChevronDown,
  Crosshair, RotateCcw, Maximize2, Minimize2,
} from "lucide-react";
import { PageSpinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { cn, DISTRICTS } from "@/lib/utils";
import type { GeoFeatureCollection, GeoFeature } from "@/types";
import type { MapLayer, MapType, MapHandle } from "@/components/map/LeafletMap";

const LeafletMap = dynamic(
  () => import("@/components/map/LeafletMap").then((m) => m.LeafletMap),
  { ssr: false, loading: () => <div className="flex-1 min-h-0 flex items-center justify-center bg-(--color-bg) dark:bg-[#0d1117]"><PageSpinner /></div> }
);

// ── Layer definitions ─────────────────────────────────────────────────────────

type LayerKey = "toilets" | "units" | "dumps" | "facilities" | "gatherers" | "alerts" | "vulnerability";

const LAYER_DEFS: Array<{
  key: LayerKey; label: string; color: string; endpoint: string;
  icon: React.ElementType; group: "assets" | "risk" | "operations";
  description: string;
}> = [
  { key: "toilets",       label: "Registered Toilets",   color: "#27AE60", endpoint: "/map/toilets",       icon: Toilet,        group: "assets",     description: "Household & public toilet registry" },
  { key: "units",         label: "Sanitation Units",     color: "#2980B9", endpoint: "/map/units",         icon: Activity,      group: "assets",     description: "IoT-monitored sanitation infrastructure" },
  { key: "facilities",    label: "Treatment Facilities", color: "#8E44AD", endpoint: "/map/facilities",    icon: Building2,     group: "assets",     description: "Waste treatment & disposal facilities" },
  { key: "gatherers",     label: "Waste Gatherers",      color: "#16A085", endpoint: "/map/gatherers",     icon: Truck,         group: "operations", description: "Active fecal sludge collectors" },
  { key: "alerts",        label: "Active Alerts",        color: "#E74C3C", endpoint: "/map/alerts",        icon: TriangleAlert, group: "risk",       description: "Live sensor & flood alerts" },
  { key: "dumps",         label: "Illegal Dump Sites",   color: "#C0392B", endpoint: "/map/dumps",         icon: AlertTriangle, group: "risk",       description: "Reported illegal dumping locations" },
  { key: "vulnerability", label: "Vulnerability",        color: "#E67E22", endpoint: "/map/vulnerability", icon: Thermometer,   group: "risk",       description: "Climate resilience score per asset" },
];

const GROUP_LABELS = { assets: "Assets", risk: "Risk & Alerts", operations: "Field Operations" };

const VULN_LEGEND = [
  { label: "Critical (75+)",    color: "#e53e3e" },
  { label: "High (50–74)",      color: "#dd6b20" },
  { label: "Moderate (25–49)",  color: "#d69e2e" },
  { label: "Low (<25)",         color: "#38a169" },
];

const MAP_TYPES: { key: MapType; label: string }[] = [
  { key: "roadmap",   label: "Road" },
  { key: "satellite", label: "Satellite" },
  { key: "hybrid",    label: "Hybrid" },
  { key: "terrain",   label: "Terrain" },
];

// ── Feature detail panel ──────────────────────────────────────────────────────

function FeatureDetailPanel({
  feature, layerKey, onClose,
}: { feature: GeoFeature; layerKey: string; onClose: () => void }) {
  const p = feature.properties;
  const name      = (p.name ?? p.owner_name ?? "Unknown") as string;
  const district  = (p.district ?? "") as string;
  const community = (p.community ?? "") as string;

  function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
    if (value == null || value === "" || value === false) return null;
    return (
      <div className="flex items-start justify-between gap-2 py-1.5 border-b border-(--color-border) last:border-0">
        <span className="text-[11px] font-body text-(--color-text-3) flex-shrink-0">{label}</span>
        <span className="text-[11px] font-body font-medium text-(--color-text-1) text-right">{value}</span>
      </div>
    );
  }

  const layerDef = LAYER_DEFS.find((l) => l.key === layerKey);

  return (
    <motion.div
      initial={{ x: 280, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 280, opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="absolute right-0 top-0 bottom-0 w-72 bg-(--color-surface) border-l border-(--color-border) shadow-xl z-[1001] flex flex-col"
    >
      <div className="flex items-start justify-between p-4 border-b border-(--color-border)">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            {layerDef && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
                style={{ background: `${layerDef.color}22`, color: layerDef.color, border: `1px solid ${layerDef.color}44` }}
              >
                <layerDef.icon className="w-2.5 h-2.5" />
                {layerDef.label}
              </span>
            )}
          </div>
          <h3 className="font-display font-bold text-sm text-(--color-text-1) leading-tight truncate">{name}</h3>
          {(community || district) && (
            <p className="text-[11px] font-body text-(--color-text-3) mt-0.5">
              {[community, district].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-(--color-bg) text-(--color-text-3) flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {layerKey === "toilets" && <>
          <DetailRow label="Toilet Type" value={p.toilet_type as string} />
          <DetailRow label="Ownership"   value={p.ownership_type as string} />
          <DetailRow label="Condition"   value={p.condition as string} />
          <DetailRow label="Daily Users" value={p.num_users as number} />
          <DetailRow label="Has Water"   value={p.has_water ? "Yes" : "No"} />
          <DetailRow label="Handwashing" value={p.has_handwashing ? "Yes" : "No"} />
          <DetailRow label="Verified"    value={p.is_verified ? "✓ Verified" : "Not verified"} />
          <DetailRow label="Vuln. Score" value={p.vulnerability_score != null ? `${p.vulnerability_score}/100` : null} />
        </>}
        {layerKey === "units" && <>
          <DetailRow label="Unit Type"   value={p.unit_type as string} />
          <DetailRow label="Status"      value={p.status as string} />
          <DetailRow label="Flood Zone"  value={p.flood_zone_risk as string} />
          <DetailRow label="School Unit" value={p.is_school ? ((p.school_name as string) ?? "Yes") : null} />
          <DetailRow label="Capacity"    value={p.capacity as number} />
          <DetailRow label="Vuln. Score" value={p.vulnerability_score != null ? `${p.vulnerability_score}/100` : null} />
        </>}
        {layerKey === "facilities" && <>
          <DetailRow label="Type"         value={p.facility_type as string} />
          <DetailRow label="Operator"     value={p.operator as string} />
          <DetailRow label="Capacity"     value={p.capacity_m3 != null ? `${p.capacity_m3} m³` : null} />
          <DetailRow label="Current Load" value={p.current_load_pct != null ? `${p.current_load_pct}%` : null} />
          <DetailRow label="Status"       value={p.status as string} />
        </>}
        {layerKey === "gatherers" && <>
          <DetailRow label="Phone"        value={p.phone as string} />
          <DetailRow label="Vehicle"      value={p.vehicle_type as string} />
          <DetailRow label="Available"    value={p.is_available ? "Yes" : "No"} />
          <DetailRow label="Waste Types"  value={Array.isArray(p.waste_types) ? (p.waste_types as string[]).join(", ") : (p.waste_types as string)} />
          <DetailRow label="Bio Certified" value={p.bio_certified ? "Yes" : null} />
        </>}
        {layerKey === "alerts" && <>
          <DetailRow label="Severity" value={p.severity as string} />
          <DetailRow label="Type"     value={(p.alert_type as string)?.replace(/_/g, " ")} />
          <DetailRow label="Message"  value={p.message as string} />
          <DetailRow label="Alert At" value={p.alert_at ? new Date(p.alert_at as string).toLocaleString() : null} />
        </>}
        {layerKey === "dumps" && <>
          <DetailRow label="Severity"    value={p.severity as string} />
          <DetailRow label="Status"      value={p.status as string} />
          <DetailRow label="Volume"      value={p.estimated_volume_m3 != null ? `${p.estimated_volume_m3} m³` : null} />
          <DetailRow label="Waste Types" value={Array.isArray(p.waste_types) ? (p.waste_types as string[]).join(", ") : (p.waste_types as string)} />
          <DetailRow label="Description" value={p.description as string} />
        </>}
        {layerKey === "vulnerability" && <>
          <DetailRow label="Asset Type" value={p.asset_type as string} />
          <DetailRow label="Risk Band"  value={p.risk_band as string} />
          <DetailRow label="Score"      value={`${p.vulnerability_score ?? 0}/100`} />
          <DetailRow label="Flood Zone" value={p.flood_zone_risk as string} />
          <DetailRow label="Condition"  value={(p.condition ?? p.status) as string} />
        </>}
      </div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MapPage() {
  const [activeLayers,    setActiveLayers]    = useState<Set<LayerKey>>(new Set(["toilets", "units"]));
  const [panelOpen,       setPanelOpen]       = useState(true);
  const [district,        setDistrict]        = useState("Tamale Metro");
  const [searchText,      setSearchText]      = useState("");
  const [selected,        setSelected]        = useState<{ feature: GeoFeature; layerKey: string } | null>(null);
  const [showAllDistricts, setShowAllDistricts] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [mapType,         setMapType]         = useState<MapType>("roadmap");
  const [isFullscreen,    setIsFullscreen]    = useState(false);
  const mapHandleRef  = useRef<MapHandle | null>(null);
  const mapSectionRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      mapSectionRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const effectiveDistrict = showAllDistricts ? undefined : district;

  const layerQueries = Object.fromEntries(
    LAYER_DEFS.map(({ key, endpoint }) => [
      key,
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useQuery<GeoFeatureCollection>({
        queryKey: ["map-layer", key, effectiveDistrict ?? "all"],
        queryFn: async () => {
          const params = effectiveDistrict ? `?district=${encodeURIComponent(effectiveDistrict)}` : "";
          const { data } = await api.get(`${endpoint}${params}`);
          return data;
        },
        enabled: activeLayers.has(key),
        staleTime: 3 * 60 * 1000,
      }),
    ])
  ) as unknown as Record<LayerKey, { data?: GeoFeatureCollection; isFetching: boolean; isError: boolean }>;

  const toggleLayer = (key: LayerKey) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group); else next.add(group);
      return next;
    });
  };

  const handleFeatureClick = useCallback((feature: GeoFeature, layerKey: string) => {
    setSelected({ feature, layerKey });
    setPanelOpen(false);
  }, []);

  const mapLayers: MapLayer[] = LAYER_DEFS
    .filter(({ key }) => activeLayers.has(key))
    .map(({ key, label, color }) => ({
      key, label, color,
      data: layerQueries[key]?.data,
    }));

  const isFetching    = LAYER_DEFS.some(({ key }) => activeLayers.has(key) && layerQueries[key]?.isFetching);
  const totalFeatures = mapLayers.reduce((sum, l) => sum + (l.data?.features.length ?? 0), 0);

  const grouped = Object.entries(GROUP_LABELS) as [string, string][];

  // Shared overlay pill style
  const overlayPill = "bg-(--color-surface)/90 dark:bg-[#161b22]/90 backdrop-blur border border-(--color-border) dark:border-white/10";

  return (
    <div className="flex flex-col h-screen bg-(--color-bg) dark:bg-[#0d1117]">
      {/* ── Top bar ── */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 h-12 border-b border-(--color-border) dark:border-white/10 bg-(--color-surface) dark:bg-[#161b22] z-10">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-xs text-(--color-text-3) hover:text-(--color-text-1) transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <span className="text-(--color-border) dark:text-white/20">·</span>
          <div className="flex items-center gap-1.5">
            <Map className="w-4 h-4 text-[#27AE60]" />
            <span className="font-display font-semibold text-sm text-(--color-text-1)">Map Explorer</span>
          </div>
          <span className="text-(--color-border) dark:text-white/20">·</span>
          <span className="text-xs font-body text-(--color-text-3)">Northern Ghana</span>
        </div>

        <div className="flex items-center gap-2">
          {isFetching && (
            <span className="w-3.5 h-3.5 rounded-full border border-[#27AE60] border-t-transparent animate-spin" />
          )}
          {totalFeatures > 0 && (
            <span className="text-xs font-mono text-(--color-text-3)">{totalFeatures.toLocaleString()} pts</span>
          )}

          <button
            onClick={() => setShowAllDistricts((v) => !v)}
            className={cn(
              "px-2 py-1 rounded text-xs font-body transition-all border",
              showAllDistricts
                ? "bg-[#27AE60]/20 text-[#27AE60] border-[#27AE60]/40"
                : "bg-(--color-bg) text-(--color-text-3) border-(--color-border) hover:border-(--color-primary)/40 hover:text-(--color-text-2)"
            )}
          >
            {showAllDistricts ? "All Districts" : "District Filter"}
          </button>

          {!showAllDistricts && (
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="h-7 px-2 rounded border border-(--color-border) dark:border-white/10 bg-(--color-surface) dark:bg-[#161b22] text-xs font-body text-(--color-text-2) dark:text-gray-300 focus:outline-none focus:border-[#27AE60]/50"
            >
              {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          )}

          <button
            onClick={() => { setPanelOpen((v) => !v); setSelected(null); }}
            className={cn(
              "flex items-center gap-1.5 h-7 px-3 rounded text-xs font-body font-medium transition-all border",
              panelOpen
                ? "bg-[#27AE60] text-white border-[#27AE60]"
                : "bg-(--color-bg) text-(--color-text-2) border-(--color-border) hover:border-[#27AE60]/50"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            Layers
          </button>
        </div>
      </header>

      {/* ── Map + panels ── */}
      <div ref={mapSectionRef} className="flex-1 flex overflow-hidden min-h-0 relative">
        <LeafletMap
          layers={mapLayers}
          center={[9.4038, -0.8424]}
          zoom={11}
          mapType={mapType}
          onFeatureClick={handleFeatureClick}
          onMapReady={(h) => { mapHandleRef.current = h; }}
        />

        {/* Search bar overlay */}
        <div className="absolute top-3 left-3 z-[999]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--color-text-3)" />
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search features…"
              className={cn(
                "h-8 pl-8 pr-3 w-52 rounded text-xs font-body focus:outline-none",
                "border border-(--color-border) dark:border-white/10",
                "bg-(--color-surface)/90 dark:bg-[#161b22]/90 backdrop-blur",
                "text-(--color-text-1) dark:text-gray-200",
                "placeholder:text-(--color-text-3) dark:placeholder:text-gray-500",
                "focus:border-[#27AE60]/50"
              )}
            />
          </div>
        </div>

        {/* ── Map type switcher ── */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[999]">
          <div className={cn("flex items-center gap-0.5 p-0.5 rounded-lg", overlayPill)}>
            {MAP_TYPES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setMapType(key)}
                className={cn(
                  "px-3 py-1 rounded-md text-[11px] font-body font-medium transition-all",
                  mapType === key
                    ? "bg-[#27AE60] text-white shadow-sm"
                    : "text-(--color-text-2) dark:text-gray-400 hover:text-(--color-text-1) dark:hover:text-gray-200"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tool buttons ── */}
        <div className="absolute top-14 left-3 z-[999] flex flex-col gap-1.5">
          <button
            title="Zoom to fit all markers"
            onClick={() => mapHandleRef.current?.zoomToFit()}
            className={cn("w-8 h-8 flex items-center justify-center rounded", overlayPill, "hover:text-[#27AE60] transition-colors text-(--color-text-2) dark:text-gray-400")}
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
          <button
            title="Reset to default view"
            onClick={() => mapHandleRef.current?.resetView()}
            className={cn("w-8 h-8 flex items-center justify-center rounded", overlayPill, "hover:text-[#27AE60] transition-colors text-(--color-text-2) dark:text-gray-400")}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            onClick={toggleFullscreen}
            className={cn("w-8 h-8 flex items-center justify-center rounded", overlayPill, "hover:text-[#27AE60] transition-colors text-(--color-text-2) dark:text-gray-400")}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Stats overlay (bottom-left) */}
        <div className="absolute bottom-12 left-3 z-[999] flex flex-col gap-1">
          {LAYER_DEFS.filter((l) => activeLayers.has(l.key)).map((l) => {
            const count = layerQueries[l.key]?.data?.features.length;
            if (count === undefined) return null;
            return (
              <div key={l.key} className={cn("flex items-center gap-2 px-2 py-1 rounded", overlayPill)}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: l.color }} />
                <span className="text-[10px] font-body text-(--color-text-2) dark:text-gray-300">{l.label}</span>
                <span className="text-[10px] font-mono text-(--color-text-3) dark:text-gray-500 ml-1">{count}</span>
              </div>
            );
          })}
        </div>

        {/* Vulnerability legend */}
        {activeLayers.has("vulnerability") && (
          <div
            className="absolute bottom-12 z-[999]"
            style={{ right: panelOpen || selected ? "296px" : "12px" }}
          >
            <div className={cn("px-3 py-2 rounded", overlayPill)}>
              <p className="text-[10px] font-body font-semibold text-(--color-text-3) dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Vulnerability
              </p>
              {VULN_LEGEND.map(({ label, color }) => (
                <div key={label} className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                  <span className="text-[10px] font-body text-(--color-text-2) dark:text-gray-300">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Layer panel ── */}
        <AnimatePresence>
          {panelOpen && !selected && (
            <motion.div
              key="layers-panel"
              initial={{ x: 280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 280, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 top-0 bottom-0 w-72 bg-(--color-surface) dark:bg-[#161b22] border-l border-(--color-border) dark:border-white/10 z-[1000] flex flex-col overflow-y-auto"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-(--color-border) dark:border-white/10">
                <p className="font-display font-semibold text-xs text-(--color-text-3) dark:text-gray-400 uppercase tracking-wider">
                  Map Layers
                </p>
                <span className="text-[10px] font-mono text-(--color-text-3) dark:text-gray-500">{activeLayers.size} active</span>
              </div>

              <div className="flex-1 p-3 space-y-1 overflow-y-auto">
                {grouped.map(([groupKey, groupLabel]) => {
                  const groupLayers = LAYER_DEFS.filter((l) => l.group === groupKey);
                  const isCollapsed = collapsedGroups.has(groupKey);
                  return (
                    <div key={groupKey} className="mb-1">
                      <button
                        onClick={() => toggleGroup(groupKey)}
                        className="w-full flex items-center justify-between px-1 py-1 text-[10px] font-body font-semibold text-(--color-text-3) dark:text-gray-500 uppercase tracking-wider hover:text-(--color-text-1) dark:hover:text-gray-300 transition-colors"
                      >
                        {groupLabel}
                        <ChevronDown className={cn("w-3 h-3 transition-transform", isCollapsed && "-rotate-90")} />
                      </button>
                      {!isCollapsed && groupLayers.map(({ key, label, color, icon: Icon, description }) => {
                        const active   = activeLayers.has(key);
                        const count    = layerQueries[key]?.data?.features.length;
                        const fetching = active && layerQueries[key]?.isFetching;
                        const hasError = active && layerQueries[key]?.isError;
                        return (
                          <button
                            key={key}
                            onClick={() => toggleLayer(key)}
                            className={cn(
                              "w-full flex items-start justify-between gap-2 px-3 py-2.5 rounded border transition-all duration-150 text-left mb-1",
                              active
                                ? "border-(--color-border) dark:border-white/10 bg-(--color-bg) dark:bg-white/5"
                                : "border-transparent opacity-40 hover:opacity-70 hover:border-(--color-border) dark:hover:border-white/5"
                            )}
                          >
                            <div className="flex items-start gap-2 min-w-0">
                              <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: active ? color : "currentColor" }} />
                              <div className="min-w-0">
                                <p className="text-xs font-body font-medium text-(--color-text-1) dark:text-gray-200 leading-tight">{label}</p>
                                <p className="text-[10px] font-body text-(--color-text-3) dark:text-gray-500 mt-0.5 leading-tight">{description}</p>
                              </div>
                            </div>
                            <div className="flex-shrink-0 flex flex-col items-end gap-1 ml-1">
                              {fetching && <span className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" style={{ color }} />}
                              {hasError && <span className="text-[9px] text-red-400">err</span>}
                              {count !== undefined && !fetching && (
                                <span className="text-[10px] font-mono" style={{ color }}>{count}</span>
                              )}
                              <span
                                className="w-3 h-3 rounded border-2 flex-shrink-0 transition-all"
                                style={active ? { borderColor: color, background: color } : { borderColor: "currentColor", opacity: 0.3 }}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              <div className="px-4 py-3 border-t border-(--color-border) dark:border-white/10">
                <div className="flex items-start gap-2">
                  <Info className="w-3 h-3 text-(--color-text-3) dark:text-gray-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] font-body text-(--color-text-3) dark:text-gray-500 leading-relaxed">
                    Click any marker to inspect its details. Toggle layers above to show or hide data.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Feature detail panel ── */}
        <AnimatePresence>
          {selected && (
            <FeatureDetailPanel
              key={selected.feature.properties.id as string}
              feature={selected.feature}
              layerKey={selected.layerKey}
              onClose={() => setSelected(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
