import { NextResponse } from "next/server";
import { fetchNearestWalkablePoint } from "@/lib/routing";

export const dynamic = "force-dynamic";

function parseCoordinate(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// Snap explícito de un punto (p.ej. el marcador de una señalización) al
// nodo transitable peatonal más cercano — ver fetchNearestWalkablePoint en
// lib/routing.ts. Devuelve 404 cuando el servicio no encuentra un punto
// transitable cerca (nunca inventa una coordenada): quien llama (
// useAccessibleRoute) debe degradar a la coordenada cruda en ese caso.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseCoordinate(searchParams.get("lat"));
  const lng = parseCoordinate(searchParams.get("lng"));

  if (lat === null || lng === null) {
    return NextResponse.json({ reason: "invalid-response" }, { status: 400 });
  }

  const snapped = await fetchNearestWalkablePoint({ lat, lng });
  if (!snapped) {
    return NextResponse.json({ reason: "no-route" }, { status: 404 });
  }

  return NextResponse.json(snapped);
}
