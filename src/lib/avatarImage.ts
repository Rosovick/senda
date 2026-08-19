// Lógica de imagen de avatar separada de la interfaz: valida el archivo
// elegido y genera una vista previa liviana lista para persistir.

export const MAX_AVATAR_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
export const ACCEPTED_AVATAR_TYPES = ["image/jpeg", "image/jpg", "image/png"];

export type AvatarUploadErrorReason = "invalid-type" | "too-large" | "read-error";

export class AvatarUploadError extends Error {
  reason: AvatarUploadErrorReason;

  constructor(reason: AvatarUploadErrorReason, message: string) {
    super(message);
    this.name = "AvatarUploadError";
    this.reason = reason;
  }
}

export function validateAvatarFile(file: File): void {
  if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
    throw new AvatarUploadError(
      "invalid-type",
      "El archivo debe ser una imagen JPG o PNG."
    );
  }
  if (file.size > MAX_AVATAR_UPLOAD_BYTES) {
    throw new AvatarUploadError(
      "too-large",
      "La imagen supera el tamaño máximo de 5 MB."
    );
  }
}

const PREVIEW_SIZE = 256;

// localStorage no está pensado para guardar archivos de varios MB: en lugar
// de persistir la imagen original, la recortamos a un cuadrado y la
// recodificamos como JPEG liviano. Cuando exista almacenamiento remoto real,
// esto se reemplaza sin cambiar cómo se usa createAvatarPreview().
export function createAvatarPreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new AvatarUploadError("read-error", "No pudimos leer la imagen."));
    };

    reader.onload = () => {
      const image = new Image();

      image.onerror = () => {
        reject(new AvatarUploadError("read-error", "No pudimos procesar la imagen."));
      };

      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = PREVIEW_SIZE;
        canvas.height = PREVIEW_SIZE;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new AvatarUploadError("read-error", "No pudimos procesar la imagen."));
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
