import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Car, Loader2 } from "lucide-react";
import type { ParkingLocation } from "@/lib/parking-api";

interface SearchPanelProps {
  onSearch: (postcode: string) => void;
  loading: boolean;
  results: ParkingLocation[];
  error: string | null;
  onSelectParking: (p: ParkingLocation) => void;
}

export default function SearchPanel({ onSearch, loading, results, error, onSelectParking }: SearchPanelProps) {
  const [postcode, setPostcode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (postcode.trim()) onSearch(postcode.trim());
  };

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <Car className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-bold text-foreground">UK Free Parking</h1>
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            placeholder="Enter postcode e.g. SW1A 1AA"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={loading} size="icon">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </form>
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      </div>

      <div className="flex-1 overflow-y-auto">
        {results.length > 0 && (
          <div className="p-3">
            <p className="text-xs text-muted-foreground mb-2 font-medium">
              {results.length} free parking spot{results.length !== 1 ? "s" : ""} found
            </p>
            <div className="space-y-2">
              {results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelectParking(p)}
                  className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-sm text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {p.type === "street" ? "Street" : "Car Park"} · {p.fee}
                        {p.capacity ? ` · ${p.capacity} spaces` : ""}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        {!loading && results.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center">
            <Car className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">Search a UK postcode to find free parking nearby</p>
          </div>
        )}
      </div>
    </div>
  );
}
