"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type GeoCoordinates = {
  lat: number;
  lng: number;
};

export type GeolocationStatus =
  | "idle"
  | "loading"
  | "success"
  | "denied"
  | "error"
  | "unsupported";

// Configuración GPS centralizada (sección 40): ningún componente arma su
// propio PositionOptions. Alta precisión porque es navegación peatonal.
// El pedido puntual tolera una posición un poco más vieja (maximumAge más
// alto: no hace falta la posición exacta al segundo para fijar un origen);
// el seguimiento continuo durante la navegación prioriza frescura.
const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60000,
};

const WATCH_GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 5000,
};

export type GeolocationWatchStatus = "idle" | "watching" | "denied" | "error" | "unsupported";

type UseGeolocationResult = {
  location: GeoCoordinates | null;
  status: GeolocationStatus;
  errorMessage: string | null;
  requestLocation: () => Promise<GeoCoordinates | null>;

  // Seguimiento continuo (navegación activa, sección 39/41). Estado
  // independiente del pedido puntual de arriba —comparten la misma
  // configuración centralizada, pero nunca hay más de un watcher nativo
  // activo a la vez (ver watchIdRef)—, para no romper ningún consumidor
  // existente de `location`/`status`/`requestLocation`.
  watchedLocation: GeoCoordinates | null;
  watchStatus: GeolocationWatchStatus;
  watchErrorMessage: string | null;
  startWatching: () => void;
  stopWatching: () => void;
};

// Hook reutilizable para pedir la ubicación real del navegador (Geolocation
// API). No asume que el permiso ya existe: cada llamada pasa por el diálogo
// nativo del navegador. Distintos controles pueden usar este mismo hook y
// decidir qué hacer con la coordenada obtenida (fijar el origen, recentrar
// el mapa, etc.) sin duplicar el manejo de permisos/errores.
export function useGeolocation(): UseGeolocationResult {
  const [location, setLocation] = useState<GeoCoordinates | null>(null);
  const [status, setStatus] = useState<GeolocationStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pendingRequest = useRef<Promise<GeoCoordinates | null> | null>(null);

  const requestLocation = useCallback((): Promise<GeoCoordinates | null> => {
    if (pendingRequest.current) {
      return pendingRequest.current;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      setErrorMessage(
        "Tu navegador no permite acceder a la ubicación. Podés continuar usando el mapa manualmente."
      );
      return Promise.resolve(null);
    }

    setStatus("loading");
    setErrorMessage(null);

    const request = new Promise<GeoCoordinates | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const next: GeoCoordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setLocation(next);
          setStatus("success");
          setErrorMessage(null);
          pendingRequest.current = null;
          resolve(next);
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setStatus("denied");
            setErrorMessage(
              "No pudimos acceder a tu ubicación. Podés habilitar el permiso del navegador o continuar usando el mapa."
            );
          } else if (error.code === error.TIMEOUT) {
            setStatus("error");
            setErrorMessage(
              "No pudimos obtener tu ubicación a tiempo. Probá de nuevo."
            );
          } else {
            setStatus("error");
            setErrorMessage(
              "No pudimos obtener tu ubicación. Podés continuar usando el mapa."
            );
          }
          pendingRequest.current = null;
          resolve(null);
        },
        GEOLOCATION_OPTIONS
      );
    });

    pendingRequest.current = request;
    return request;
  }, []);

  // --- Seguimiento continuo (navegación) ---
  const watchIdRef = useRef<number | null>(null);
  const [watchedLocation, setWatchedLocation] = useState<GeoCoordinates | null>(null);
  const [watchStatus, setWatchStatus] = useState<GeolocationWatchStatus>("idle");
  const [watchErrorMessage, setWatchErrorMessage] = useState<string | null>(null);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
    setWatchStatus("idle");
  }, []);

  // Idempotente: si ya hay un watcher nativo activo, no crea uno segundo
  // (sección 39: "NO crear múltiples watchers").
  const startWatching = useCallback(() => {
    if (watchIdRef.current !== null) return;

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setWatchStatus("unsupported");
      setWatchErrorMessage("Tu navegador no permite seguir tu ubicación en tiempo real.");
      return;
    }

    setWatchStatus("watching");
    setWatchErrorMessage(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setWatchedLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setWatchStatus("watching");
        setWatchErrorMessage(null);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setWatchStatus("denied");
          setWatchErrorMessage(
            "No pudimos acceder a tu ubicación. Habilitá el permiso del navegador para navegar."
          );
        } else {
          // Transitorio (timeout/señal débil): no se limpia el watcher, el
          // navegador puede recuperar la señal sola. Quien consuma esto
          // (useRouteNavigation) decide cuándo un error persiste de verdad.
          setWatchStatus("error");
          setWatchErrorMessage("No pudimos actualizar tu ubicación en este momento.");
        }
      },
      WATCH_GEOLOCATION_OPTIONS
    );
  }, []);

  // Cleanup: desmontar el componente (salir de /ruta) nunca debe dejar un
  // watcher GPS corriendo en segundo plano (sección 63).
  useEffect(() => stopWatching, [stopWatching]);

  return {
    location,
    status,
    errorMessage,
    requestLocation,
    watchedLocation,
    watchStatus,
    watchErrorMessage,
    startWatching,
    stopWatching,
  };
}
