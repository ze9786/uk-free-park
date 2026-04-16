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

export async function geocodeLocation(query: string): Promise<{ lat: number; lng: number } | null> {
  // Try postcode API first (fast & accurate for UK postcodes)
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

  // Fall back to Nominatim for street names / places
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
      const feeTag = tags.fee || "";
      const feeConditional = tags["fee:conditional"] || "";
      const charge = tags["charge"] || tags["fee:amount"] || "";

      let feeLabel = "Free";
      if (feeConditional) {
        feeLabel = `Free (${feeConditional})`;
      } else if (feeTag === "yes" || feeTag === "true") {
        feeLabel = charge || "Paid";
      } else if (feeTag && feeTag !== "no") {
        feeLabel = feeTag;
      }

      return {
        id: `${el.id}-${i}`,
        name: tags.name || (tags.parking === "street_side" ? "Street Parking" : feeTag === "no" || !feeTag ? "Free Car Park" : "Car Park"),
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

export async function findPaidParking(lat: number, lng: number, radius = 1500): Promise<ParkingLocation[]> {
  const query = `
[out:json][timeout:25];
(
  nwr["amenity"="parking"]["fee"="yes"](around:${radius},${lat},${lng});
  nwr["amenity"="parking"]["fee"~"^[0-9]"](around:${radius},${lat},${lng});
);
out center body;
`;

  const data = await queryOverpass(query);
  if (!data?.elements) return [];

  const results = parseElements(data.elements);

  // Sort by fee — extract leading number if present, otherwise push to end
  return results.sort((a, b) => {
    const numA = parseFloat(a.fee.replace(/[^0-9.]/g, "")) || Infinity;
    const numB = parseFloat(b.fee.replace(/[^0-9.]/g, "")) || Infinity;
    return numA - numB;
  });
}
