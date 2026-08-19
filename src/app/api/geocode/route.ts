import { NextResponse } from "next/server";

// Proxy propio hacia Nominatim (OpenStreetMap). Se llama desde el servidor
// para poder identificar la app con un User-Agent (Nominatim lo exige y el
// navegador no permite setear ese header desde fetch del cliente) y para
// cortar consultas demasiado cortas antes de golpear el servicio externo.
export const dynamic = "force-dynamic";

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const MIN_QUERY_LENGTH = 3;
const RESULT_LIMIT = 5;

type NominatimResult = {
  place_id: number;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();

  if (query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json([]);
  }

  const url = new URL(NOMINATIM_ENDPOINT);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(RESULT_LIMIT));
  url.searchParams.set("addressdetails", "1");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": "SENDA-MVP/0.1 (accesibilidad urbana - proyecto en desarrollo)",
        "Accept-Language": "es",
      },
    });
  } catch {
    return NextResponse.json({ error: "network-error" }, { status: 503 });
  }

  if (!response.ok) {
    return NextResponse.json({ error: "geocoding-failed" }, { status: 502 });
  }

  const data: NominatimResult[] = await response.json();

  const places = data.map((item) => {
    const [name, ...rest] = item.display_name.split(",");
    return {
      id: `${item.osm_type}-${item.osm_id}`,
      name: name.trim(),
      address: rest.join(",").trim(),
      lat: Number(item.lat),
      lng: Number(item.lon),
    };
  });

  return NextResponse.json(places);
}
