export interface ParkingLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: "car_park" | "street";
  fee: string;
  capacity?: number;
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

export async function findFreeParking(lat: number, lng: number, radius = 2000): Promise<ParkingLocation[]> {
  const query = `
    [out:json][timeout:15];
    (
      node["amenity"="parking"]["fee"="no"](around:${radius},${lat},${lng});
      way["amenity"="parking"]["fee"="no"](around:${radius},${lat},${lng});
      node["amenity"="parking"]["fee:conditional"](around:${radius},${lat},${lng});
      way["amenity"="parking"]["fee:conditional"](around:${radius},${lat},${lng});
      node["amenity"="parking"]["access"="yes"]["fee"!="yes"](around:${radius},${lat},${lng});
      way["amenity"="parking"]["access"="yes"]["fee"!="yes"](around:${radius},${lat},${lng});
    );
    out center body;
  `;

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const data = await res.json();

    return data.elements.map((el: any, i: number) => {
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
    }).filter((p: ParkingLocation) => p.lat && p.lng);
  } catch {
    return [];
  }
}
