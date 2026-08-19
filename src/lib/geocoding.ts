// Helper cliente para /api/reverse-geocode. Se usa una sola vez por acción
// del usuario (geolocalización o clic en el mapa), no necesita debounce.
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const response = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lng}`);
    if (!response.ok) return null;
    const data = await response.json();
    return typeof data.address === "string" ? data.address : null;
  } catch {
    return null;
  }
}
