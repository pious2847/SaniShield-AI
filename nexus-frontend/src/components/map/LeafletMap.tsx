"use client";

import { useEffect, useRef } from "react";
import type { GeoFeatureCollection } from "@/types";

interface MapLayer {
  key: string;
  label: string;
  color: string;
  data?: GeoFeatureCollection;
}

interface LeafletMapProps {
  layers: MapLayer[];
  center?: [number, number];
  zoom?: number;
}

export function LeafletMap({ layers, center = [9.4038, -0.8424], zoom = 10 }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<unknown>(null);
  const layerGroups = useRef<Record<string, unknown>>({});

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    import("leaflet").then((L) => {
      if (!mapRef.current || mapInstance.current) return;

      const map = L.map(mapRef.current, { zoomControl: false }).setView(center, zoom);
      mapInstance.current = map;

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "© CartoDB",
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      layers.forEach((layer) => {
        if (!layer.data) return;
        const group = L.layerGroup();
        layer.data.features.forEach((f) => {
          const [lng, lat] = f.geometry.coordinates;
          const marker = L.circleMarker([lat, lng], {
            radius:      layer.key === "vulnerability" ? Math.max(4, (f.properties.vulnerability_score as number ?? 20) / 10) : 7,
            fillColor:   layer.color,
            color:       "#fff",
            weight:      1.5,
            opacity:     0.9,
            fillOpacity: 0.75,
          });
          const name     = f.properties.name ?? f.properties.id;
          const district = f.properties.district ?? "";
          const risk     = f.properties.risk_band ?? "";
          const vuln     = f.properties.vulnerability_score;
          marker.bindPopup(
            `<div style="font-family: sans-serif; min-width:160px;">
              <p style="font-weight:700; margin:0 0 4px">${name}</p>
              <p style="color:#888; font-size:11px; margin:0 0 2px">${district}</p>
              ${risk  ? `<p style="font-size:11px; margin:0">Risk: <b>${risk}</b></p>` : ""}
              ${vuln !== undefined ? `<p style="font-size:11px; margin:0">Vulnerability: <b>${vuln}</b>/100</p>` : ""}
            </div>`
          );
          group.addLayer(marker);
        });
        group.addTo(map);
        layerGroups.current[layer.key] = group;
      });
    });

    return () => {
      if (mapInstance.current) {
        (mapInstance.current as { remove: () => void }).remove();
        mapInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current) return;
    import("leaflet").then((L) => {
      layers.forEach((layer) => {
        if (!layer.data || !layerGroups.current[layer.key]) return;
        const group = layerGroups.current[layer.key] as ReturnType<typeof L.layerGroup>;
        group.clearLayers();
        layer.data!.features.forEach((f) => {
          const [lng, lat] = f.geometry.coordinates;
          const marker = L.circleMarker([lat, lng], {
            radius:      layer.key === "vulnerability" ? Math.max(4, (f.properties.vulnerability_score as number ?? 20) / 10) : 7,
            fillColor:   layer.color,
            color:       "#fff",
            weight:      1.5,
            opacity:     0.9,
            fillOpacity: 0.75,
          });
          group.addLayer(marker);
        });
      });
    });
  }, [layers]);

  return (
    <div
      ref={mapRef}
      className="flex-1 w-full"
      style={{ minHeight: 0 }}
    />
  );
}
