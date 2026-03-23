import multer from "multer";
import { createHttpError } from "./error.middleware";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Multer middleware for logo uploads.
 * Stores file in memory so we can stream it to Cloudinary.
 * Accepts field name "logo", max 2 MB, jpg/png/webp only.
 */
export const uploadLogo = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: MAX_BYTES },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(createHttpError(400, "Solo se permiten imágenes JPG, PNG o WebP.") as unknown as null, false);
    }
  },
}).single("logo");
