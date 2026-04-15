export interface ParkingLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: "car_park" | "street";
  fee: string;
  capacity?: number;
  maxstay?: string;
}

export async function geocodePostcode(postcode: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return { lat: data.result.latitude, lng: data.result.longitude };
  } catch {
    return null;
  }
}

const OVERPASS_SERVERS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

async function queryOverpass(query: string): Promise<any> {
  const body = `data=${encodeURIComponent(query)}`;
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };

  for (const server of OVERPASS_SERVERS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const res = await fetch(server, {
        method: "POST",
        body,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) continue;

      const text = await res.text();
      // Check it's actually JSON (not an HTML error page)
      if (text.startsWith("{")) {
        return JSON.parse(text);
      }
      continue;
    } catch {
      continue;
    }
  }
  return null;
}

export async function findFreeParking(lat: number, lng: number, radius = 1500): Promise<ParkingLocation[]> {
  // Simplified query — fewer unions = faster response
  const query = `
[out:json][timeout:25];
(
  nwr["amenity"="parking"]["fee"="no"](around:${radius},${lat},${lng});
  nwr["amenity"="parking"]["fee:conditional"](around:${radius},${lat},${lng});
);
out center body;
`;

  const data = await queryOverpass(query);
  if (!data?.elements) return [];

  return data.elements
    .map((el: any, i: number) => {
      const elLat = el.lat ?? el.center?.lat;
      const elLng = el.lon ?? el.center?.lon;
      const tags = el.tags || {};
      return {
        id: `${el.id}-${i}`,
        name: tags.name || (tags.parking === "street_side" ? "Street Parking" : "Free Car Park"),
        lat: elLat,
        lng: elLng,
        type: tags.parking === "street_side" || tags.parking === "on_street" ? "street" : "car_park",
        fee: tags["fee:conditional"] ? `Free (${tags["fee:conditional"]})` : "Free",
        capacity: tags.capacity ? parseInt(tags.capacity) : undefined,
      };
    })
    .filter((p: ParkingLocation) => p.lat && p.lng);
}
