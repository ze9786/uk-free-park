import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ParkingLocation } from "@/lib/parking-api";

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

  // Initialize map
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

  // Update view
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(center, zoom);
    }
  }, [center, zoom]);

  // Update markers
  useEffect(() => {
    if (!markersRef.current) return;
    markersRef.current.clearLayers();

    if (searchLocation) {
      L.marker([searchLocation.lat, searchLocation.lng], { icon: searchIcon })
        .bindPopup("📍 Your search location")
        .addTo(markersRef.current);
    }

    parkingLocations.forEach((p) => {
      const popup = `
        <div style="min-width:160px;font-size:14px">
          <p style="font-weight:600;font-size:15px;margin:0 0 4px">${p.name}</p>
          <p style="margin:2px 0">🏷️ ${p.fee}</p>
          <p style="margin:2px 0">📌 ${p.type === "street" ? "Street Parking" : "Car Park"}</p>
          ${p.capacity ? `<p style="margin:2px 0">🚗 ${p.capacity} spaces</p>` : ""}
          ${p.maxstay ? `<p style="margin:2px 0">⏱️ Max stay: ${p.maxstay}</p>` : ""}
        </div>
      `;
      L.marker([p.lat, p.lng], { icon: parkingIcon })
        .bindPopup(popup)
        .addTo(markersRef.current!);
    });
  }, [parkingLocations, searchLocation]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
