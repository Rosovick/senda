"use client";

import { useEffect, useRef, useState } from "react";
import type { RouteData } from "@/lib/routing";

export type RouteStatus = "idle" | "loading" | "success" | "error";

type RoutePoint = { lat: number; lng: number };

const ERROR_MESSAGES: Record<string, string> = {
  network: "No pudimos conectarnos para calcular la ruta. Revisá tu conexión.",
  unavailable:
    "El servicio de rutas no está disponible en este momento. Probá de nuevo en unos segundos.",
  "no-route":
    "No pudimos encontrar una ruta entre estos puntos. Probá con otro destino.",
  "invalid-response": "No pudimos calcular la ruta. Probá de nuevo.",
};

function messageForReason(reason: unknown): string {
  if (typeof reason === "string" && reason in ERROR_MESSAGES) {
    return ERROR_MESSAGES[reason];
  }
  return ERROR_MESSAGES["invalid-response"];
}

// Calcula automáticamente las alternativas reales de ruta (vía /api/route)
// cada vez que existen simultáneamente un origin y un destination válidos,
// y las recalcula cuando cualquiera de los dos cambia. Cancela pedidos que
// quedaron obsoletos para que un cambio de destino no termine mostrando una
// ruta vieja.
//
// Devuelve TODAS las alternativas que ofreció el motor (`routes`, puede
// tener más de un elemento): este hook solo sabe hablar con el motor de
// rutas, no sabe nada de Perfil ni de señalizaciones. Elegir cuál de esas
// alternativas mostrar es responsabilidad de quien lo consume (ver
// chooseBestRoute en lib/routeSignals.ts, usado en RouteMapSection).
export function useRoute(origin: RoutePoint | null, destination: RoutePoint | null) {
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [status, setStatus] = useState<RouteStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const originLat = origin?.lat ?? null;
  const originLng = origin?.lng ?? null;
  const destLat = destination?.lat ?? null;
  const destLng = destination?.lng ?? null;

  useEffect(() => {
    if (originLat === null || originLng === null || destLat === null || destLng === null) {
      setRoutes([]);
      setStatus("idle");
      setErrorMessage(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

    setStatus("loading");
    setErrorMessage(null);
    setRoutes([]);

    (async () => {
      try {
        const url = `/api/route?originLat=${originLat}&originLng=${originLng}&destLat=${destLat}&destLng=${destLng}`;
        const response = await fetch(url, { signal: controller.signal });
        const payload = await response.json();

        if (requestIdRef.current !== requestId) return;

        if (!response.ok) {
          setRoutes([]);
          setStatus("error");
          setErrorMessage(messageForReason(payload?.reason));
          return;
        }

        setRoutes(payload as RouteData[]);
        setStatus("success");
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        if (requestIdRef.current !== requestId) return;
        setRoutes([]);
        setStatus("error");
        setErrorMessage(ERROR_MESSAGES.network);
      }
    })();

    return () => controller.abort();
  }, [originLat, originLng, destLat, destLng]);

  return { routes, status, errorMessage };
}
