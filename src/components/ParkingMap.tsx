import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
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

function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

interface ParkingMapProps {
  center: [number, number];
  zoom: number;
  parkingLocations: ParkingLocation[];
  searchLocation: { lat: number; lng: number } | null;
}

export default function ParkingMap({ center, zoom, parkingLocations, searchLocation }: ParkingMapProps) {
  return (
    <MapContainer center={center} zoom={zoom} className="h-full w-full z-0">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapUpdater center={center} zoom={zoom} />
      {searchLocation && (
        <Marker position={[searchLocation.lat, searchLocation.lng]} icon={searchIcon}>
          <Popup>📍 Your search location</Popup>
        </Marker>
      )}
      {parkingLocations.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={parkingIcon}>
          <Popup>
            <div className="text-sm min-w-[160px]">
              <p className="font-semibold text-base">{p.name}</p>
              <p className="mt-1">🏷️ {p.fee}</p>
              <p>📌 {p.type === "street" ? "Street Parking" : "Car Park"}</p>
              {p.capacity && <p>🚗 {p.capacity} spaces</p>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
