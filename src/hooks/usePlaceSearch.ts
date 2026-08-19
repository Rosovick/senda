"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PlaceResult = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

export type PlaceSearchStatus = "idle" | "searching" | "success" | "empty" | "error";

const DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 3;
const NETWORK_ERROR_MESSAGE = "No pudimos buscar la dirección. Intentá nuevamente.";

// Hook reutilizable para buscar lugares reales vía /api/geocode (Nominatim).
// Cubre dos formas de buscar, usadas por el mismo combobox compartido:
// - search(): autocompletado mientras se escribe, con debounce.
// - searchNow(): búsqueda inmediata (Enter) del texto completo, sin esperar
//   el debounce. Ambas cancelan pedidos anteriores para evitar que una
//   respuesta vieja pise a una más nueva.
export function usePlaceSearch() {
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [status, setStatus] = useState<PlaceSearchStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const clearPending = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const runFetch = useCallback(async (trimmed: string): Promise<PlaceResult[]> => {
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("request-failed");

      const data: PlaceResult[] = await response.json();
      setResults(data);
      setStatus(data.length > 0 ? "success" : "empty");
      return data;
    } catch (error) {
      if ((error as Error).name === "AbortError") return [];
      setResults([]);
      setStatus("error");
      setErrorMessage(NETWORK_ERROR_MESSAGE);
      return [];
    }
  }, []);

  const search = useCallback(
    (query: string) => {
      clearPending();

      const trimmed = query.trim();
      if (trimmed.length < MIN_QUERY_LENGTH) {
        setResults([]);
        setStatus("idle");
        setErrorMessage(null);
        return;
      }

      setStatus("searching");
      setErrorMessage(null);

      debounceRef.current = setTimeout(() => {
        void runFetch(trimmed);
      }, DEBOUNCE_MS);
    },
    [clearPending, runFetch]
  );

  // Búsqueda inmediata del texto completo (tecla Enter), sin debounce.
  // Devuelve los resultados para que quien la llama pueda decidir qué hacer
  // (por ejemplo, confirmar automáticamente si hay una sola coincidencia).
  const searchNow = useCallback(
    async (query: string): Promise<PlaceResult[]> => {
      clearPending();

      const trimmed = query.trim();
      if (trimmed.length < MIN_QUERY_LENGTH) {
        return [];
      }

      setStatus("searching");
      setErrorMessage(null);

      return runFetch(trimmed);
    },
    [clearPending, runFetch]
  );

  const reset = useCallback(() => {
    clearPending();
    setResults([]);
    setStatus("idle");
    setErrorMessage(null);
  }, [clearPending]);

  useEffect(() => clearPending, [clearPending]);

  return { results, status, errorMessage, search, searchNow, reset };
}
