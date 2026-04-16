import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Car, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import ParkingMap from "@/components/ParkingMap";
import { geocodeLocation, findFreeParking, type ParkingLocation } from "@/lib/parking-api";

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
  const [postcode, setPostcode] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);

  const handleSearch = useCallback(async (pc: string) => {
    setLoading(true);
    setError(null);
    setResults([]);

    const loc = await geocodeLocation(pc);
    if (!loc) {
      setError("Could not find that location. Try a postcode or street name.");
      setLoading(false);
      return;
    }

    setSearchLoc(loc);
    setCenter([loc.lat, loc.lng]);
    setZoom(SEARCH_ZOOM);

    const parking = await findFreeParking(loc.lat, loc.lng);
    if (parking.length === 0) {
      setError("No free parking found nearby, or the parking server is busy. Try again or try a different postcode.");
    }
    setResults(parking);
    setPanelOpen(parking.length > 0);
    setLoading(false);
  }, []);

  const handleSelectParking = useCallback((p: ParkingLocation) => {
    setCenter([p.lat, p.lng]);
    setZoom(17);
    setPanelOpen(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (postcode.trim()) handleSearch(postcode.trim());
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <ParkingMap
          center={center}
          zoom={zoom}
          parkingLocations={results}
          searchLocation={searchLoc}
        />
      </div>

      {/* Search bar overlay */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 1000 }}>
        <div className="mx-auto w-full max-w-lg p-3">
          <form onSubmit={handleSubmit} className="flex gap-2 rounded-xl bg-card p-2 shadow-lg border border-border">
            <div className="flex items-center gap-2 pl-2">
              <Car className="h-5 w-5 text-primary shrink-0" />
            </div>
            <Input
              placeholder="Postcode or street name e.g. OX1 1AA"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              className="flex-1 border-0 shadow-none focus-visible:ring-0"
            />
            <Button type="submit" disabled={loading} size="icon" className="shrink-0 rounded-lg">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </form>
          {error && (
            <div className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Results panel */}
      {results.length > 0 && (
        <div
          style={{ position: "absolute", zIndex: 1000 }}
          className="bottom-0 left-0 right-0 md:top-16 md:bottom-auto md:left-3 md:right-auto md:w-80 transition-transform duration-300"
        >
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className="md:hidden w-full flex items-center justify-center gap-1 bg-card border-t border-border rounded-t-xl py-2 text-sm font-medium text-foreground shadow-lg"
          >
            {panelOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            {results.length} free parking spot{results.length !== 1 ? "s" : ""} found
          </button>

          <div
            className={`
              bg-card border border-border shadow-lg overflow-hidden
              md:rounded-xl
              ${panelOpen ? "max-h-[50vh] md:max-h-[70vh]" : "max-h-0 md:max-h-[70vh]"}
              transition-all duration-300
            `}
          >
            <div className="hidden md:block p-3 border-b border-border">
              <p className="text-xs text-muted-foreground font-medium">
                {results.length} free parking spot{results.length !== 1 ? "s" : ""} found
              </p>
            </div>
            <div className="overflow-y-auto max-h-[calc(50vh-40px)] md:max-h-[calc(70vh-50px)] p-2 space-y-1">
              {results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectParking(p)}
                  className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {p.type === "street" ? "Street" : "Car Park"} · {p.fee}
                        {p.capacity ? ` · ${p.capacity} spaces` : ""}
                        {p.maxstay ? ` · Max ${p.maxstay}` : ""}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer disclaimer */}
      <div style={{ position: "absolute", bottom: 0, left: 0, zIndex: 1000 }} className="px-3 py-2">
        <p className="text-[10px] text-muted-foreground/70 bg-card/80 backdrop-blur-sm rounded px-2 py-1">
          Data for guidance only. Always verify with physical signage.
        </p>
      </div>
    </div>
  );
};

export default Index;
