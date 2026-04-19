import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ParkingLocation } from "@/lib/parking-api";
import { reverseGeocode } from "@/lib/parking-api";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const parkingIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const searchIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface ParkingMapProps {
  center: [number, number];
  zoom: number;
  parkingLocations: ParkingLocation[];
  searchLocation: { lat: number; lng: number } | null;
}

export default function ParkingMap({ center, zoom, parkingLocations, searchLocation }: ParkingMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView(center, zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(center, zoom);
    }
  }, [center, zoom]);

  useEffect(() => {
    if (!markersRef.current) return;
    markersRef.current.clearLayers();

    if (searchLocation) {
      L.marker([searchLocation.lat, searchLocation.lng], { icon: searchIcon })
        .bindPopup("📍 Your search location")
        .addTo(markersRef.current);
    }

    const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

    parkingLocations.forEach((p) => {
      const loadingPopup = `
        <div style="min-width:160px;font-size:14px">
          <p style="font-weight:600;font-size:15px;margin:0 0 4px">${esc(p.name)}</p>
          <p style="margin:2px 0">🏷️ ${esc(p.fee)}</p>
          <p style="margin:2px 0">📌 ${p.type === "street" ? "Street Parking" : "Car Park"}</p>
          ${p.capacity ? `<p style="margin:2px 0">🚗 ${p.capacity} spaces</p>` : ""}
          ${p.maxstay ? `<p style="margin:2px 0">⏱️ Max stay: ${esc(p.maxstay)}</p>` : ""}
          <p style="margin:4px 0 0;color:#888;font-size:12px">📍 Loading address…</p>
        </div>
      `;

      const marker = L.marker([p.lat, p.lng], { icon: parkingIcon })
        .bindPopup(loadingPopup)
        .addTo(markersRef.current!);

      // Fetch address on popup open
      marker.on("popupopen", async () => {
        const address = await reverseGeocode(p.lat, p.lng);
        const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${p.lat},${p.lng}`;
        const fullPopup = `
          <div style="min-width:160px;font-size:14px">
            <p style="font-weight:600;font-size:15px;margin:0 0 4px">${esc(p.name)}</p>
            <p style="margin:2px 0">🏷️ ${esc(p.fee)}</p>
            <p style="margin:2px 0">📌 ${p.type === "street" ? "Street Parking" : "Car Park"}</p>
            ${p.capacity ? `<p style="margin:2px 0">🚗 ${p.capacity} spaces</p>` : ""}
            ${p.maxstay ? `<p style="margin:2px 0">⏱️ Max stay: ${esc(p.maxstay)}</p>` : ""}
            ${address ? `<p style="margin:4px 0 0;font-size:12px">📍 ${esc(address)}</p>` : ""}
            <a href="${streetViewUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:6px;padding:4px 10px;background:#3B82F6;color:#fff;border-radius:6px;font-size:12px;text-decoration:none;font-weight:500">🛣️ Street View</a>
          </div>
        `;
        marker.setPopupContent(fullPopup);
      });
    });
  }, [parkingLocations, searchLocation]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
