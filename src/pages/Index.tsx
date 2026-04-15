import { useState, useCallback } from "react";
import SearchPanel from "@/components/SearchPanel";
import ParkingMap from "@/components/ParkingMap";
import { geocodePostcode, findFreeParking, type ParkingLocation } from "@/lib/parking-api";

const UK_CENTER: [number, number] = [53.5, -2.5];
const DEFAULT_ZOOM = 6;
const SEARCH_ZOOM = 14;

const Index = () => {
  const [center, setCenter] = useState<[number, number]>(UK_CENTER);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [results, setResults] = useState<ParkingLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchLoc, setSearchLoc] = useState<{ lat: number; lng: number } | null>(null);

  const handleSearch = useCallback(async (postcode: string) => {
    setLoading(true);
    setError(null);
    setResults([]);

    const loc = await geocodePostcode(postcode);
    if (!loc) {
      setError("Invalid postcode. Please try again.");
      setLoading(false);
      return;
    }

    setSearchLoc(loc);
    setCenter([loc.lat, loc.lng]);
    setZoom(SEARCH_ZOOM);

    const parking = await findFreeParking(loc.lat, loc.lng);
    if (parking.length === 0) {
      setError("No free parking found nearby. Try a different postcode.");
    }
    setResults(parking);
    setLoading(false);
  }, []);

  const handleSelectParking = useCallback((p: ParkingLocation) => {
    setCenter([p.lat, p.lng]);
    setZoom(17);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <div className="w-80 shrink-0 border-r border-border shadow-lg z-10">
        <SearchPanel
          onSearch={handleSearch}
          loading={loading}
          results={results}
          error={error}
          onSelectParking={handleSelectParking}
        />
      </div>
      <div className="flex-1 relative">
        <ParkingMap
          center={center}
          zoom={zoom}
          parkingLocations={results}
          searchLocation={searchLoc}
        />
      </div>
    </div>
  );
};

export default Index;
