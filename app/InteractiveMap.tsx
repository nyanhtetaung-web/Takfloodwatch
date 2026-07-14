"use client";

import "leaflet/dist/leaflet.css";

import { Crosshair, ZoomIn, ZoomOut } from "lucide-react";
import type { LayerGroup, Map as LeafletMap, TileLayer } from "leaflet";
import { useEffect, useRef, useState } from "react";

export type BaseMap = "streets" | "satellite";

export type FloodMapPoint = {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  district: string;
  value: string;
  tone: "critical" | "warning" | "watch" | "rainfall";
  warningId?: string;
};

type InteractiveMapProps = {
  baseMap: BaseMap;
  points: FloodMapPoint[];
  selectedPointId: string | null;
  ariaLabel: string;
  zoomInLabel: string;
  zoomOutLabel: string;
  centerLabel: string;
  onSelectPoint: (point: FloodMapPoint) => void;
};

const targetBounds: [[number, number], [number, number]] = [[15.75, 97.75], [17.85, 99.2]];

const pointColors: Record<FloodMapPoint["tone"], string> = {
  critical: "#bd302c",
  warning: "#d77a0b",
  watch: "#227b75",
  rainfall: "#247da6",
};

function buildPopup(point: FloodMapPoint) {
  const popup = document.createElement("div");
  popup.className = "leaflet-station-popup";

  const title = document.createElement("strong");
  title.textContent = point.label;
  popup.appendChild(title);

  const district = document.createElement("span");
  district.textContent = point.district;
  popup.appendChild(district);

  const value = document.createElement("b");
  value.textContent = point.value;
  popup.appendChild(value);

  return popup;
}

export default function InteractiveMap({
  baseMap,
  points,
  selectedPointId,
  ariaLabel,
  zoomInLabel,
  zoomOutLabel,
  centerLabel,
  onSelectPoint,
}: InteractiveMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const tileRef = useRef<TileLayer | null>(null);
  const pointLayerRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const selectPointRef = useRef(onSelectPoint);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    selectPointRef.current = onSelectPoint;
  }, [onSelectPoint]);

  useEffect(() => {
    let active = true;

    void import("leaflet").then((L) => {
      if (!active || !containerRef.current || mapRef.current) return;

      leafletRef.current = L;
      const map = L.map(containerRef.current, {
        attributionControl: true,
        zoomControl: false,
        minZoom: 7,
        maxZoom: 18,
        maxBounds: [[14.9, 96.9], [18.7, 100]],
        maxBoundsViscosity: 0.7,
      });

      map.fitBounds(targetBounds, { padding: [24, 24] });
      mapRef.current = map;
      pointLayerRef.current = L.layerGroup().addTo(map);
      setReady(true);
    });

    return () => {
      active = false;
      setReady(false);
      tileRef.current = null;
      pointLayerRef.current = null;
      leafletRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;

    tileRef.current?.remove();
    tileRef.current = baseMap === "satellite"
      ? L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
          attribution: "Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community",
          maxZoom: 18,
        }).addTo(map)
      : L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 18,
        }).addTo(map);
  }, [baseMap, ready]);

  useEffect(() => {
    const L = leafletRef.current;
    const layer = pointLayerRef.current;
    if (!ready || !L || !layer) return;

    layer.clearLayers();
    points.forEach((point) => {
      const selected = point.id === selectedPointId;
      const color = pointColors[point.tone];
      if (selected || point.tone === "critical" || point.tone === "warning") {
        L.circleMarker([point.latitude, point.longitude], {
          radius: selected ? 18 : 15,
          color,
          weight: 2,
          fillColor: color,
          fillOpacity: 0.08,
          opacity: 0.45,
          interactive: false,
          className: `flood-marker-halo ${point.tone}${selected ? " selected" : ""}`,
        }).addTo(layer);
      }
      const marker = L.circleMarker([point.latitude, point.longitude], {
        radius: selected ? 11 : 8,
        color: selected ? "#ffffff" : color,
        weight: selected ? 4 : 2,
        fillColor: color,
        fillOpacity: 0.94,
        opacity: 1,
        className: selected ? "active-flood-marker" : "flood-marker",
      });

      marker.bindTooltip(point.label, { direction: "top", offset: [0, -8] });
      marker.bindPopup(buildPopup(point), { closeButton: false, offset: [0, -5] });
      marker.on("click", () => selectPointRef.current(point));
      marker.addTo(layer);
    });
  }, [points, ready, selectedPointId]);

  useEffect(() => {
    if (!ready || !selectedPointId || !mapRef.current) return;
    const point = points.find((item) => item.id === selectedPointId);
    if (point) mapRef.current.panTo([point.latitude, point.longitude], { animate: true, duration: 0.35 });
  }, [points, ready, selectedPointId]);

  const centerMap = () => mapRef.current?.fitBounds(targetBounds, { padding: [24, 24], animate: true });

  return (
    <>
      <div ref={containerRef} className="leaflet-map" role="application" aria-label={ariaLabel} />
      <div className="map-controls">
        <button type="button" aria-label={zoomInLabel} title={zoomInLabel} onClick={() => mapRef.current?.zoomIn()}><ZoomIn size={18} /></button>
        <button type="button" aria-label={zoomOutLabel} title={zoomOutLabel} onClick={() => mapRef.current?.zoomOut()}><ZoomOut size={18} /></button>
        <button type="button" aria-label={centerLabel} title={centerLabel} onClick={centerMap}><Crosshair size={18} /></button>
      </div>
    </>
  );
}
