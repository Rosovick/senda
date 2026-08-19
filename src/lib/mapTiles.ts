// Configuración compartida de la capa base de todos los mapas de SENDA
// (Leaflet). Un solo lugar para el estilo cartográfico (CARTO Positron):
// cambiar el proveedor/estilo en el futuro no debería requerir tocar cada
// <TileLayer> por separado. Los datos siguen siendo de OpenStreetMap — CARTO
// solo redibuja esos mismos datos con una estética más clara y minimalista.
export const CARTO_TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
export const CARTO_TILE_SUBDOMAINS = "abcd";
export const CARTO_MAX_ZOOM = 20;
export const CARTO_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
