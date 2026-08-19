// `crypto.randomUUID()` requiere un contexto seguro (HTTPS o localhost). Si
// por algún motivo no está disponible (contexto no seguro, navegador viejo),
// generar la identidad local o el id de una señalización/validación nunca
// debería fallar en silencio (eso dejaría currentUserId en null para
// siempre, y con eso, "isOwner" roto para toda la sesión). Único punto de
// generación de ids locales de la app: úsese en vez de crypto.randomUUID()
// directo en cualquier hook/componente nuevo.
export function generateLocalId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // sigue al fallback de abajo
    }
  }
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
