"use client";

import { useEffect } from "react";
import { generateLocalId } from "@/lib/localId";
import { useLocalStorageState } from "./useLocalStorageState";

const LOCAL_IDENTITY_KEY = "senda:local-user-id";

// Identidad local anónima: todavía no hay autenticación real en SENDA (ver
// useUserProfile, useReports), así que hasta ahora "quién creó una
// señalización" siempre era null. Para poder determinar propiedad
// (isOwner) y garantizar una validación comunitaria por usuario, generamos
// un id estable por navegador/dispositivo y lo persistimos, igual que el
// resto del estado local de la app (localStorage detrás de un hook).
//
// NO es un sistema de autenticación: es un identificador anónimo. El día
// que exista una cuenta real, este hook se reemplaza por el id de esa
// cuenta sin tocar el resto del sistema de señalizaciones (todo lo demás
// solo conoce "un string userId").
export function useLocalIdentity() {
  const [userId, setUserId, isLoaded] = useLocalStorageState<string | null>(
    LOCAL_IDENTITY_KEY,
    null
  );

  useEffect(() => {
    if (isLoaded && !userId) {
      setUserId(generateLocalId());
    }
  }, [isLoaded, userId, setUserId]);

  return { userId, isLoaded: isLoaded && userId !== null };
}
