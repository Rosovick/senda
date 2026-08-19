import { NextResponse } from "next/server";
import { fetchRouteAlternatives, fetchRouteViaPoints, RoutingError } from "@/lib/routing";

export const dynamic = "force-dynamic";

function parseCoordinate(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function statusForReason(reason: RoutingError["reason"]): number {
  switch (reason) {
    case "no-route":
      return 404;
    case "unavailable":
      return 502;
    case "network":
      return 503;
    default:
      return 500;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const originLat = parseCoordinate(searchParams.get("originLat"));
  const originLng = parseCoordinate(searchParams.get("originLng"));
  const destLat = parseCoordinate(searchParams.get("destLat"));
  const destLng = parseCoordinate(searchParams.get("destLng"));
  // Opcional, repetible: cada `via=lat,lng` fuerza un recorrido real que
  // pase por ese punto, en el orden dado (ver fetchRouteViaPoints) — usado
  // por useRouteCandidates para generar alternativas reales cerca de
  // señalizaciones relevantes, o que encadenen varias, cuando el motor no
  // ofreció ninguna alternativa así por su cuenta.
  const viaPoints = searchParams
    .getAll("via")
    .map((raw) => {
      const [latRaw, lngRaw] = raw.split(",");
      const lat = parseCoordinate(latRaw ?? null);
      const lng = parseCoordinate(lngRaw ?? null);
      return lat !== null && lng !== null ? { lat, lng } : null;
    })
    .filter((point): point is { lat: number; lng: number } => point !== null);

  if (
    originLat === null ||
    originLng === null ||
    destLat === null ||
    destLng === null
  ) {
    return NextResponse.json({ reason: "invalid-response" }, { status: 400 });
  }

  try {
    if (viaPoints.length > 0) {
      const route = await fetchRouteViaPoints(
        { lat: originLat, lng: originLng },
        viaPoints,
        { lat: destLat, lng: destLng }
      );
      return NextResponse.json([route]);
    }

    // Devuelve TODAS las alternativas que ofreció el motor: elegir cuál
    // usar (considerando Perfil + señalizaciones) es responsabilidad del
    // cliente, que es donde vive esa información (localStorage) — ver
    // useRoute.ts + chooseBestRoute en lib/routeSignals.ts.
    const routes = await fetchRouteAlternatives(
      { lat: originLat, lng: originLng },
      { lat: destLat, lng: destLng }
    );
    return NextResponse.json(routes);
  } catch (error) {
    if (error instanceof RoutingError) {
      return NextResponse.json(
        { reason: error.reason },
        { status: statusForReason(error.reason) }
      );
    }
    return NextResponse.json({ reason: "invalid-response" }, { status: 500 });
  }
}
