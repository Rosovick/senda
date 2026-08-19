import { NextResponse } from "next/server";

// Mismo proveedor que /api/geocode (Nominatim), solo que en su variante
// "reverse": convierte una coordenada en una dirección aproximada. No es una
// API nueva, es el mismo servicio ya usado en el proyecto.
export const dynamic = "force-dynamic";

const NOMINATIM_REVERSE_ENDPOINT = "https://nominatim.openstreetmap.org/reverse";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json({ address: null }, { status: 400 });
  }

  const url = new URL(NOMINATIM_REVERSE_ENDPOINT);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", lat);
  url.searchParams.set("lon", lon);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "SENDA-MVP/0.1 (accesibilidad urbana - proyecto en desarrollo)",
        "Accept-Language": "es",
      },
    });

    if (!response.ok) {
      return NextResponse.json({ address: null }, { status: 502 });
    }

    const data = await response.json();
    const address = typeof data.display_name === "string" ? data.display_name : null;
    return NextResponse.json({ address });
  } catch {
    return NextResponse.json({ address: null }, { status: 503 });
  }
}
