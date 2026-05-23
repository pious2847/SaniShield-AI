/// <reference types="google.maps" />
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { GeoFeatureCollection, GeoFeature } from "@/types";

export type MapType = "roadmap" | "satellite" | "hybrid" | "terrain";

export interface MapHandle {
  zoomToFit: () => void;
  resetView: () => void;
}

export interface MapLayer {
  key: string;
  label: string;
  color: string;
  data?: GeoFeatureCollection;
}

interface LeafletMapProps {
  layers: MapLayer[];
  center?: [number, number];
  zoom?: number;
  mapType?: MapType;
  onFeatureClick?: (feature: GeoFeature, layer: string) => void;
  onMapReady?: (handle: MapHandle) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  critical: "#e53e3e", active: "#e53e3e", high: "#dd6b20",
  moderate: "#d69e2e", good: "#38a169", operational: "#38a169",
  low: "#3182ce", ok: "#38a169", damaged: "#dd6b20",
  destroyed: "#e53e3e", open: "#e53e3e", closed: "#718096",
};

function markerColor(layer: MapLayer, feature: GeoFeature): string {
  const p = feature.properties;
  if (layer.key === "vulnerability") {
    const s = (p.vulnerability_score as number) ?? 0;
    if (s >= 75) return "#e53e3e";
    if (s >= 50) return "#dd6b20";
    if (s >= 25) return "#d69e2e";
    return "#38a169";
  }
  if (layer.key === "alerts")  return STATUS_COLORS[p.severity as string]  ?? layer.color;
  if (layer.key === "units")   return STATUS_COLORS[p.status as string]    ?? layer.color;
  if (layer.key === "dumps")   return STATUS_COLORS[p.severity as string]  ?? STATUS_COLORS[p.status as string] ?? layer.color;
  if (layer.key === "toilets") return STATUS_COLORS[p.condition as string] ?? layer.color;
  return layer.color;
}

function markerScale(layer: MapLayer, feature: GeoFeature): number {
  if (layer.key === "vulnerability")
    return Math.max(5, Math.min(14, ((feature.properties.vulnerability_score as number) ?? 20) / 7));
  if (layer.key === "alerts") return 9;
  if (layer.key === "dumps")  return 8;
  return 7;
}

function buildPopup(layer: MapLayer, f: GeoFeature): string {
  const p = f.properties;
  const name      = (p.name ?? p.owner_name ?? p.id ?? "Unknown") as string;
  const district  = (p.district ?? "") as string;
  const community = (p.community ?? "") as string;
  const badge = (text: string, color: string) =>
    `<span style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;background:${color}22;color:${color};border:1px solid ${color}44">${text}</span>`;
  const row = (label: string, value: string | number | boolean | null | undefined) =>
    value != null && value !== ""
      ? `<tr><td style="color:#666;padding:2px 8px 2px 0;font-size:11px;white-space:nowrap">${label}</td><td style="font-size:11px;font-weight:500;color:#111">${value}</td></tr>`
      : "";
  let body = "";
  if (layer.key === "toilets") body = `<table style="border-collapse:collapse;width:100%">
    ${row("Type", p.toilet_type as string)}${row("Condition", p.condition as string)}
    ${row("Ownership", p.ownership_type as string)}${row("Users", p.num_users as number)}
    ${row("Water", p.has_water ? "Yes" : "No")}${row("Verified", p.is_verified ? "✓ Yes" : "No")}
    ${row("Vuln.", p.vulnerability_score != null ? `${p.vulnerability_score}/100` : null)}</table>`;
  else if (layer.key === "units") body = `<table style="border-collapse:collapse;width:100%">
    ${row("Type", p.unit_type as string)}${row("Status", p.status as string)}
    ${row("Flood Zone", p.flood_zone_risk as string)}
    ${row("School", p.is_school ? ((p.school_name as string) ?? "Yes") : "No")}
    ${row("Vuln.", p.vulnerability_score != null ? `${p.vulnerability_score}/100` : null)}</table>`;
  else if (layer.key === "dumps") body = `<table style="border-collapse:collapse;width:100%">
    ${row("Severity", p.severity as string)}${row("Status", p.status as string)}
    ${row("Volume", p.estimated_volume_m3 != null ? `${p.estimated_volume_m3} m³` : null)}
    ${row("Types", Array.isArray(p.waste_types) ? (p.waste_types as string[]).join(", ") : (p.waste_types as string))}</table>`;
  else if (layer.key === "facilities") body = `<table style="border-collapse:collapse;width:100%">
    ${row("Type", p.facility_type as string)}${row("Operator", p.operator as string)}
    ${row("Capacity", p.capacity_m3 != null ? `${p.capacity_m3} m³` : null)}
    ${row("Status", p.status as string)}</table>`;
  else if (layer.key === "gatherers") body = `<table style="border-collapse:collapse;width:100%">
    ${row("Phone", p.phone as string)}${row("Vehicle", p.vehicle_type as string)}
    ${row("Available", p.is_available ? "Yes" : "No")}</table>`;
  else if (layer.key === "alerts") body = `<table style="border-collapse:collapse;width:100%">
    ${row("Severity", p.severity as string)}
    ${row("Type", (p.alert_type as string)?.replace(/_/g, " "))}
    ${row("Message", p.message as string)}</table>`;
  else if (layer.key === "vulnerability") {
    const score = (p.vulnerability_score as number) ?? 0;
    const band  = (p.risk_band as string) ?? "low";
    const bc    = score >= 75 ? "#e53e3e" : score >= 50 ? "#dd6b20" : score >= 25 ? "#d69e2e" : "#38a169";
    body = `<div style="margin-bottom:6px">${badge(band.toUpperCase(), bc)} ${badge(p.asset_type as string, "#666")}</div>
    <table style="border-collapse:collapse;width:100%">
      ${row("Score", `${score}/100`)}${row("Condition", ((p.condition ?? p.status) as string))}
      ${row("Flood Zone", p.flood_zone_risk as string)}</table>`;
  }
  return `<div style="font-family:system-ui,sans-serif;min-width:180px;max-width:240px">
    <p style="font-weight:700;margin:0 0 2px;font-size:13px;color:#111">${name}</p>
    ${community || district ? `<p style="color:#666;font-size:11px;margin:0 0 8px">${[community, district].filter(Boolean).join(" · ")}</p>` : ""}
    ${body}
    <p style="color:#aaa;font-size:10px;margin:6px 0 0;text-align:right">${layer.label}</p>
  </div>`;
}

// ── Dark map styles ───────────────────────────────────────────────────────────

const DARK_STYLES = [
  { elementType: "geometry",           stylers: [{ color: "#0d1117" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0d1117" }] },
  { elementType: "labels.text.fill",   stylers: [{ color: "#8b949e" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#c9d1d9" }] },
  { featureType: "poi",          elementType: "labels.text.fill",   stylers: [{ color: "#8b949e" }] },
  { featureType: "poi.park",     elementType: "geometry",           stylers: [{ color: "#111b22" }] },
  { featureType: "poi.park",     elementType: "labels.text.fill",   stylers: [{ color: "#6e7681" }] },
  { featureType: "road",         elementType: "geometry",           stylers: [{ color: "#21262d" }] },
  { featureType: "road",         elementType: "geometry.stroke",    stylers: [{ color: "#1f2d3d" }] },
  { featureType: "road",         elementType: "labels.text.fill",   stylers: [{ color: "#8b949e" }] },
  { featureType: "road.highway", elementType: "geometry",           stylers: [{ color: "#2d333b" }] },
  { featureType: "road.highway", elementType: "geometry.stroke",    stylers: [{ color: "#373e47" }] },
  { featureType: "road.highway", elementType: "labels.text.fill",   stylers: [{ color: "#c9d1d9" }] },
  { featureType: "transit",      elementType: "geometry",           stylers: [{ color: "#161b22" }] },
  { featureType: "water",        elementType: "geometry",           stylers: [{ color: "#0a0f14" }] },
  { featureType: "water",        elementType: "labels.text.fill",   stylers: [{ color: "#3d5a73" }] },
];

function isDark(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
}

// Load Google Maps JS API script once, cache the promise
let gmapsPromise: Promise<void> | null = null;
function loadGoogleMaps(apiKey: string): Promise<void> {
  if (gmapsPromise) return gmapsPromise;
  gmapsPromise = new Promise((resolve, reject) => {
    if (window.google?.maps?.marker) { resolve(); return; }
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&libraries=marker`;
    s.async = true;
    s.defer = true;
    s.onload  = () => resolve();
    s.onerror = () => { gmapsPromise = null; reject(new Error("Google Maps failed to load")); };
    document.head.appendChild(s);
  });
  return gmapsPromise;
}

// ── Component ─────────────────────────────────────────────────────────────────

type GMap    = google.maps.Map;
type GInfoW  = google.maps.InfoWindow;
interface GMarker {
  position?: google.maps.LatLng | google.maps.LatLngLiteral;
  setMap(map: google.maps.Map | null): void;
  addListener(event: string, handler: () => void): void;
}

export function LeafletMap({
  layers,
  center = [9.4038, -0.8424],
  zoom = 10,
  mapType = "roadmap",
  onFeatureClick,
  onMapReady,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<GMap | null>(null);
  const markersRef   = useRef<GMarker[]>([]);
  const infoWinRef   = useRef<GInfoW | null>(null);
  const centerRef    = useRef(center);
  const zoomRef      = useRef(zoom);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const onClickRef   = useRef(onFeatureClick);
  onClickRef.current = onFeatureClick;
  const onReadyRef   = useRef(onMapReady);
  onReadyRef.current = onMapReady;

  // Initialise once
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
    if (!key) { setStatus("error"); return; }

    loadGoogleMaps(key)
      .then(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = new google.maps.Map(containerRef.current, {
          center: { lat: centerRef.current[0], lng: centerRef.current[1] },
          zoom: zoomRef.current,
          styles: isDark() ? DARK_STYLES : [],
          backgroundColor: isDark() ? "#0d1117" : "#f5f5f5",
          zoomControl: true,
          zoomControlOptions: { position: google.maps.ControlPosition.BOTTOM_RIGHT },
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          gestureHandling: "greedy",
        });
        mapRef.current = map;

        // Shared info window
        infoWinRef.current = new google.maps.InfoWindow();

        // Close info window on map click
        map.addListener("click", () => infoWinRef.current?.close());

        // Switch dark/light styles on theme change
        const themeObs = new MutationObserver(() => {
          map.setOptions({ styles: isDark() ? DARK_STYLES : [], backgroundColor: isDark() ? "#0d1117" : "#f5f5f5" });
        });
        themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

        // ResizeObserver: keep map tiles aligned when container changes
        const resizeObs = new ResizeObserver(() => {
          google.maps.event.trigger(map, "resize");
        });
        resizeObs.observe(containerRef.current!);

        // Store for cleanup
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (map as any).__nexus_cleanup = () => { themeObs.disconnect(); resizeObs.disconnect(); };

        // Expose imperative handle to parent
        onReadyRef.current?.({
          zoomToFit: () => {
            if (!mapRef.current || markersRef.current.length === 0) return;
            const bounds = new google.maps.LatLngBounds();
            markersRef.current.forEach((m) => {
              const pos = m.position;
              if (pos) bounds.extend(pos as google.maps.LatLngLiteral);
            });
            if (!bounds.isEmpty()) mapRef.current.fitBounds(bounds, 48);
          },
          resetView: () => {
            if (!mapRef.current) return;
            mapRef.current.setCenter({ lat: centerRef.current[0], lng: centerRef.current[1] });
            mapRef.current.setZoom(zoomRef.current);
          },
        });

        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync map type when it changes
  useEffect(() => {
    if (mapRef.current) mapRef.current.setMapTypeId(mapType);
  }, [mapType]);

  // Re-render markers when layers change
  const renderMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !window.google) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    layers.forEach((layer) => {
      (layer.data?.features ?? []).forEach((f) => {
        const [lng, lat] = f.geometry.coordinates;
        if (!lat || !lng) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const marker = new (google.maps as any).Marker({
          position: { lat, lng },
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor:   markerColor(layer, f),
            fillOpacity: 0.9,
            strokeColor: isDark() ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.25)",
            strokeWeight: 1.5,
            scale:       markerScale(layer, f),
          },
        }) as GMarker;

        marker.addListener("click", () => {
          infoWinRef.current?.setContent(buildPopup(layer, f));
          infoWinRef.current?.open(map, marker as unknown as google.maps.MVCObject);
          onClickRef.current?.(f, layer.key);
        });

        markersRef.current.push(marker);
      });
    });
  }, [layers]);

  useEffect(() => {
    if (status === "ready") renderMarkers();
  }, [status, renderMarkers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      infoWinRef.current?.close();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mapRef.current as any)?.__nexus_cleanup?.();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="flex-1 min-h-0 relative bg-(--color-bg) dark:bg-[#0d1117]">
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="w-8 h-8 rounded-full border-2 border-[#27AE60] border-t-transparent animate-spin" />
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <p className="text-sm font-body text-red-500">Failed to load Google Maps</p>
          <p className="text-xs font-body text-(--color-text-3)">Check NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local</p>
        </div>
      )}
      <div ref={containerRef} className="absolute inset-0" />
    </div>
  );
}
