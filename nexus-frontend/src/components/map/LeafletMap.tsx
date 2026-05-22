"use client";

import { useEffect, useRef, useCallback } from "react";
import type { GeoFeatureCollection, GeoFeature } from "@/types";

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
  onFeatureClick?: (feature: GeoFeature, layer: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  critical:    "#e53e3e",
  active:      "#e53e3e",
  high:        "#dd6b20",
  moderate:    "#d69e2e",
  good:        "#38a169",
  operational: "#38a169",
  low:         "#3182ce",
  ok:          "#38a169",
  damaged:     "#dd6b20",
  destroyed:   "#e53e3e",
  open:        "#e53e3e",
  closed:      "#718096",
};

function isDarkMode(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
}

function getTileUrl(dark: boolean): string {
  return dark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
}

function markerColor(layer: MapLayer, feature: GeoFeature): string {
  const p = feature.properties;
  if (layer.key === "vulnerability") {
    const s = (p.vulnerability_score as number) ?? 0;
    if (s >= 75) return "#e53e3e";
    if (s >= 50) return "#dd6b20";
    if (s >= 25) return "#d69e2e";
    return "#38a169";
  }
  if (layer.key === "alerts") return STATUS_COLORS[p.severity as string] ?? layer.color;
  if (layer.key === "units")  return STATUS_COLORS[p.status as string]   ?? layer.color;
  if (layer.key === "dumps")  return STATUS_COLORS[p.severity as string] ?? STATUS_COLORS[p.status as string] ?? layer.color;
  if (layer.key === "toilets") return STATUS_COLORS[p.condition as string] ?? layer.color;
  return layer.color;
}

function markerRadius(layer: MapLayer, feature: GeoFeature): number {
  if (layer.key === "vulnerability") {
    return Math.max(5, Math.min(14, ((feature.properties.vulnerability_score as number) ?? 20) / 7));
  }
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
      ? `<tr><td style="color:#888;padding:2px 8px 2px 0;font-size:11px;white-space:nowrap">${label}</td><td style="font-size:11px;font-weight:500">${value}</td></tr>`
      : "";

  let body = "";

  if (layer.key === "toilets") {
    body = `<table style="border-collapse:collapse;width:100%">
      ${row("Type", p.toilet_type as string)}
      ${row("Condition", p.condition as string)}
      ${row("Ownership", p.ownership_type as string)}
      ${row("Users", p.num_users as number)}
      ${row("Water", p.has_water ? "Yes" : "No")}
      ${row("Verified", p.is_verified ? "✓ Yes" : "No")}
      ${row("Vuln. Score", p.vulnerability_score != null ? `${p.vulnerability_score}/100` : null)}
    </table>`;
  } else if (layer.key === "units") {
    body = `<table style="border-collapse:collapse;width:100%">
      ${row("Type", p.unit_type as string)}
      ${row("Status", p.status as string)}
      ${row("Flood Zone", p.flood_zone_risk as string)}
      ${row("School Unit", p.is_school ? ((p.school_name as string) ?? "Yes") : "No")}
      ${row("Capacity", p.capacity as number)}
      ${row("Vuln. Score", p.vulnerability_score != null ? `${p.vulnerability_score}/100` : null)}
    </table>`;
  } else if (layer.key === "dumps") {
    body = `<table style="border-collapse:collapse;width:100%">
      ${row("Severity", p.severity as string)}
      ${row("Status", p.status as string)}
      ${row("Volume", p.estimated_volume_m3 != null ? `${p.estimated_volume_m3} m³` : null)}
      ${row("Waste Types", Array.isArray(p.waste_types) ? (p.waste_types as string[]).join(", ") : (p.waste_types as string))}
    </table>`;
  } else if (layer.key === "facilities") {
    body = `<table style="border-collapse:collapse;width:100%">
      ${row("Type", p.facility_type as string)}
      ${row("Operator", p.operator as string)}
      ${row("Capacity", p.capacity_m3 != null ? `${p.capacity_m3} m³` : null)}
      ${row("Load", p.current_load_pct != null ? `${p.current_load_pct}%` : null)}
      ${row("Status", p.status as string)}
    </table>`;
  } else if (layer.key === "gatherers") {
    body = `<table style="border-collapse:collapse;width:100%">
      ${row("Phone", p.phone as string)}
      ${row("Vehicle", p.vehicle_type as string)}
      ${row("Available", p.is_available ? "Yes" : "No")}
      ${row("Waste Types", Array.isArray(p.waste_types) ? (p.waste_types as string[]).join(", ") : (p.waste_types as string))}
    </table>`;
  } else if (layer.key === "alerts") {
    body = `<table style="border-collapse:collapse;width:100%">
      ${row("Severity", p.severity as string)}
      ${row("Type", (p.alert_type as string)?.replace(/_/g, " "))}
      ${row("Message", p.message as string)}
    </table>`;
  } else if (layer.key === "vulnerability") {
    const score = (p.vulnerability_score as number) ?? 0;
    const band  = (p.risk_band as string) ?? "low";
    const bandColor = score >= 75 ? "#e53e3e" : score >= 50 ? "#dd6b20" : score >= 25 ? "#d69e2e" : "#38a169";
    body = `
      <div style="margin-bottom:6px">${badge(band.toUpperCase(), bandColor)} ${badge(p.asset_type as string, "#666")}</div>
      <table style="border-collapse:collapse;width:100%">
        ${row("Score", `${score}/100`)}
        ${row("Condition", ((p.condition ?? p.status) as string))}
        ${row("Flood Zone", p.flood_zone_risk as string)}
      </table>`;
  }

  return `<div style="font-family:system-ui,sans-serif;min-width:180px;max-width:240px;padding:2px">
    <p style="font-weight:700;margin:0 0 2px;font-size:13px;line-height:1.3">${name}</p>
    ${community || district ? `<p style="color:#888;font-size:11px;margin:0 0 8px">${[community, district].filter(Boolean).join(" · ")}</p>` : ""}
    ${body}
    <p style="color:#aaa;font-size:10px;margin:6px 0 0;text-align:right">${layer.label}</p>
  </div>`;
}

// ── Main component ────────────────────────────────────────────────────────────

export function LeafletMap({ layers, center = [9.4038, -0.8424], zoom = 10, onFeatureClick }: LeafletMapProps) {
  const mapRef       = useRef<HTMLDivElement>(null);
  const mapInstance  = useRef<unknown>(null);
  const tileLayerRef = useRef<unknown>(null);
  const layerGroups  = useRef<Record<string, unknown>>({});
  const onClickRef   = useRef(onFeatureClick);
  onClickRef.current = onFeatureClick;

  const buildGroup = useCallback((L: typeof import("leaflet"), layer: MapLayer) => {
    const group = L.layerGroup();
    (layer.data?.features ?? []).forEach((f) => {
      const [lng, lat] = f.geometry.coordinates;
      if (!lat || !lng) return;
      const color  = markerColor(layer, f);
      const radius = markerRadius(layer, f);
      const marker = L.circleMarker([lat, lng], {
        radius,
        fillColor:   color,
        color:       isDarkMode() ? "#fff" : "#333",
        weight:      1.5,
        opacity:     0.9,
        fillOpacity: 0.8,
      });
      marker.bindPopup(buildPopup(layer, f), { maxWidth: 260 });
      marker.on("click", () => onClickRef.current?.(f, layer.key));
      group.addLayer(marker);
    });
    return group;
  }, []);

  // Initialise map once
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    import("leaflet").then((L) => {
      if (!mapRef.current || mapInstance.current) return;

      const map = L.map(mapRef.current, { zoomControl: false }).setView(center, zoom);
      mapInstance.current = map;

      // Set initial tile layer based on current theme
      const dark = isDarkMode();
      const tile = L.tileLayer(getTileUrl(dark), {
        attribution: "© CartoDB © OpenStreetMap",
        maxZoom: 19,
      });
      tile.addTo(map);
      tileLayerRef.current = tile;

      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Fix split/offset tile rendering in flex containers
      setTimeout(() => map.invalidateSize(), 50);

      // Watch for light/dark mode changes and swap tile layers
      const observer = new MutationObserver(() => {
        const nowDark = isDarkMode();
        const m = mapInstance.current as import("leaflet").Map;
        if (tileLayerRef.current) {
          (tileLayerRef.current as import("leaflet").TileLayer).remove();
        }
        const newTile = L.tileLayer(getTileUrl(nowDark), {
          attribution: "© CartoDB © OpenStreetMap",
          maxZoom: 19,
        });
        newTile.addTo(m);
        tileLayerRef.current = newTile;
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

      // Add initial layers
      layers.forEach((layer) => {
        if (!layer.data) return;
        const group = buildGroup(L, layer);
        group.addTo(map);
        layerGroups.current[layer.key] = group;
      });

      // Store observer for cleanup
      (map as unknown as Record<string, unknown>).__themeObserver = observer;
    });

    return () => {
      if (mapInstance.current) {
        const m = mapInstance.current as import("leaflet").Map & { __themeObserver?: MutationObserver };
        m.__themeObserver?.disconnect();
        m.remove();
        mapInstance.current = null;
        tileLayerRef.current = null;
        layerGroups.current = {};
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update layers when data/active set changes
  useEffect(() => {
    if (!mapInstance.current) return;
    import("leaflet").then((L) => {
      const map = mapInstance.current as { addLayer: (l: unknown) => void; removeLayer: (l: unknown) => void };
      const activeKeys = new Set(layers.map((l) => l.key));

      // Remove stale layer groups
      Object.entries(layerGroups.current).forEach(([key, group]) => {
        if (!activeKeys.has(key)) {
          map.removeLayer(group);
          delete layerGroups.current[key];
        }
      });

      // Add / refresh active layers
      layers.forEach((layer) => {
        const existing = layerGroups.current[layer.key] as ReturnType<typeof L.layerGroup> | undefined;
        if (existing) {
          existing.clearLayers();
          (layer.data?.features ?? []).forEach((f) => {
            const [lng, lat] = f.geometry.coordinates;
            if (!lat || !lng) return;
            const color  = markerColor(layer, f);
            const radius = markerRadius(layer, f);
            const marker = L.circleMarker([lat, lng], {
              radius, fillColor: color,
              color: isDarkMode() ? "#fff" : "#333",
              weight: 1.5, opacity: 0.9, fillOpacity: 0.8,
            });
            marker.bindPopup(buildPopup(layer, f), { maxWidth: 260 });
            marker.on("click", () => onClickRef.current?.(f, layer.key));
            existing.addLayer(marker);
          });
        } else if (layer.data) {
          const group = buildGroup(L, layer);
          group.addTo(map as unknown as import("leaflet").Map);
          layerGroups.current[layer.key] = group;
        }
      });
    });
  }, [layers, buildGroup]);

  return (
    <div
      ref={mapRef}
      className="flex-1 w-full bg-(--color-bg) dark:bg-[#0d1117]"
      style={{ minHeight: 0 }}
    />
  );
}
