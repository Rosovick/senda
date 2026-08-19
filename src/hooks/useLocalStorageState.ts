"use client";

import { useEffect, useState } from "react";

// Hook genérico de persistencia local. Carga el valor guardado después del
// primer render (evita mismatches de hidratación: servidor y cliente
// arrancan siempre con `defaultValue`) y lo guarda en cada cambio posterior.
// `isLoaded` permite distinguir "todavía no leímos localStorage" de "el
// usuario realmente no tiene nada guardado".
export function useLocalStorageState<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) {
        setValue(JSON.parse(stored));
      }
    } catch {
      // localStorage no disponible (modo privado, etc.) o dato corrupto:
      // seguimos con el valor por defecto.
    }
    setIsLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignorar (cuota excedida, modo privado, etc.).
    }
  }, [key, value, isLoaded]);

  return [value, setValue, isLoaded] as const;
}
