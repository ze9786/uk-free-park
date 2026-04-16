import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Car, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import ParkingMap from "@/components/ParkingMap";
import { geocodeLocation, findFreeParking, findPaidParking, type ParkingLocation } from "@/lib/parking-api";

const UK_CENTER: [number, number] = [53.5, -2.5];
const DEFAULT_ZOOM = 6;
const SEARCH_ZOOM = 14;

type ParkingTab = "free" | "paid";

const Index = () => {
  const [center, setCenter] = useState<[number, number]>(UK_CENTER);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [freeResults, setFreeResults] = useState<ParkingLocation[]>([]);
  const [paidResults, setPaidResults] = useState<ParkingLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchLoc, setSearchLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [postcode, setPostcode] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ParkingTab>("free");

  const results = activeTab === "free" ? freeResults : paidResults;

  const handleSearch = useCallback(async (pc: string) => {
    setLoading(true);
    setError(null);
    setFreeResults([]);
    setPaidResults([]);

    const loc = await geocodePostcode(pc);
    if (!loc) {
      setError("Invalid postcode. Please try again.");
      setLoading(false);
      return;
    }

    setSearchLoc(loc);
    setCenter([loc.lat, loc.lng]);
    setZoom(SEARCH_ZOOM);

    const [free, paid] = await Promise.all([
      findFreeParking(loc.lat, loc.lng),
      findPaidParking(loc.lat, loc.lng),
    ]);

    setFreeResults(free);
    setPaidResults(paid);
    setPanelOpen(free.length > 0 || paid.length > 0);
    if (free.length === 0 && paid.length === 0) {
      setError("No parking found nearby, or the parking server is busy. Try again or try a different postcode.");
    }
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

  const hasAnyResults = freeResults.length > 0 || paidResults.length > 0;

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
              placeholder="Enter UK postcode e.g. SW1A 1AA"
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
      {hasAnyResults && (
        <div
          style={{ position: "absolute", zIndex: 1000 }}
          className="bottom-0 left-0 right-0 md:top-16 md:bottom-auto md:left-3 md:right-auto md:w-80 transition-transform duration-300"
        >
          {/* Mobile toggle */}
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className="md:hidden w-full flex items-center justify-center gap-1 bg-card border-t border-border rounded-t-xl py-2 text-sm font-medium text-foreground shadow-lg"
          >
            {panelOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            {results.length} parking spot{results.length !== 1 ? "s" : ""} found
          </button>

          <div
            className={`
              bg-card border border-border shadow-lg overflow-hidden
              md:rounded-xl
              ${panelOpen ? "max-h-[50vh] md:max-h-[70vh]" : "max-h-0 md:max-h-[70vh]"}
              transition-all duration-300
            `}
          >
            {/* Tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab("free")}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === "free"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Free ({freeResults.length})
              </button>
              <button
                onClick={() => setActiveTab("paid")}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === "paid"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Paid ({paidResults.length})
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(50vh-80px)] md:max-h-[calc(70vh-80px)]">
              {results.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center">
                  No {activeTab} parking found nearby.
                </p>
              ) : (
                <div className="p-2 space-y-1">
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
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
