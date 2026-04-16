export interface ParkingLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: "car_park" | "street";
  fee: string;
  capacity?: number;
  maxstay?: string;
  address?: string;
}

export async function geocodeLocation(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.result) {
        return { lat: data.result.latitude, lng: data.result.longitude };
      }
    }
  } catch {
    // not a postcode — fall through
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ", UK")}&format=json&limit=1`,
      { headers: { "User-Agent": "UKFreeParkingApp/1.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {
    // ignore
  }

  return null;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18`,
      { headers: { "User-Agent": "UKFreeParkingApp/1.0" } }
    );
    if (!res.ok) return "";
    const data = await res.json();
    const addr = data.address || {};
    const parts: string[] = [];
    if (addr.road) parts.push(addr.road);
    if (addr.suburb || addr.neighbourhood) parts.push(addr.suburb || addr.neighbourhood);
    if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
    if (addr.postcode) parts.push(addr.postcode);
    return parts.join(", ");
  } catch {
    return "";
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

function parseElements(elements: any[]): ParkingLocation[] {
  return elements
    .map((el: any, i: number) => {
      const elLat = el.lat ?? el.center?.lat;
      const elLng = el.lon ?? el.center?.lon;
      const tags = el.tags || {};
      const feeConditional = tags["fee:conditional"] || "";

      let feeLabel = "Free";
      if (feeConditional) {
        feeLabel = `Free (${feeConditional})`;
      }

      return {
        id: `${el.id}-${i}`,
        name: tags.name || (tags.parking === "street_side" ? "Street Parking" : "Free Car Park"),
        lat: elLat,
        lng: elLng,
        type: (tags.parking === "street_side" || tags.parking === "on_street" ? "street" : "car_park") as "street" | "car_park",
        fee: feeLabel,
        capacity: tags.capacity ? parseInt(tags.capacity) : undefined,
        maxstay: tags.maxstay || undefined,
      };
    })
    .filter((p: ParkingLocation) => p.lat && p.lng);
}

export async function findFreeParking(lat: number, lng: number, radius = 1500): Promise<ParkingLocation[]> {
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
  return parseElements(data.elements);
}
