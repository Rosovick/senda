// Validación y compresión de la foto de un reporte. Igual que con el avatar
// del perfil, no persistimos el archivo original: localStorage no está
// pensado para varios MB. `photo` queda como un campo bien separado del
// resto del modelo, listo para migrarse a almacenamiento remoto real.

export const MAX_REPORT_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
export const ACCEPTED_REPORT_PHOTO_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export type ReportPhotoErrorReason = "invalid-type" | "too-large" | "read-error";

export class ReportPhotoError extends Error {
  reason: ReportPhotoErrorReason;

  constructor(reason: ReportPhotoErrorReason, message: string) {
    super(message);
    this.name = "ReportPhotoError";
    this.reason = reason;
  }
}

export function validateReportPhotoFile(file: File): void {
  if (!ACCEPTED_REPORT_PHOTO_TYPES.includes(file.type)) {
    throw new ReportPhotoError(
      "invalid-type",
      "El archivo debe ser una imagen JPG, PNG o WEBP."
    );
  }
  if (file.size > MAX_REPORT_PHOTO_BYTES) {
    throw new ReportPhotoError(
      "too-large",
      "La imagen supera el tamaño máximo de 5 MB."
    );
  }
}

const PREVIEW_SIZE = 320;

export function createReportPhotoPreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new ReportPhotoError("read-error", "No pudimos leer la imagen."));
    };

    reader.onload = () => {
      const image = new Image();

      image.onerror = () => {
        reject(new ReportPhotoError("read-error", "No pudimos procesar la imagen."));
      };

      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = PREVIEW_SIZE;
        canvas.height = PREVIEW_SIZE;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new ReportPhotoError("read-error", "No pudimos procesar la imagen."));
          return;
        }

        const side = Math.min(image.width, image.height);
        const sx = (image.width - side) / 2;
        const sy = (image.height - side) / 2;
        ctx.drawImage(image, sx, sy, side, side, 0, 0, PREVIEW_SIZE, PREVIEW_SIZE);

        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };

      image.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
