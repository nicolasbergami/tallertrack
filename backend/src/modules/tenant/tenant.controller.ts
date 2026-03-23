import { Request, Response, NextFunction } from "express";
import { pool } from "../../config/database";
import { cloudinary } from "../../config/cloudinary";
import { createHttpError } from "../../middleware/error.middleware";

export const tenantController = {

  // GET /api/v1/tenant/settings
  async getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { rows } = await pool.query<{ settings: Record<string, unknown> }>(
        `SELECT settings FROM tenants WHERE id = $1`,
        [req.user.tenant_id]
      );
      if (!rows[0]) throw createHttpError(404, "Tenant no encontrado.");
      res.json({ settings: rows[0].settings });
    } catch (err) {
      next(err);
    }
  },

  // PATCH /api/v1/tenant/settings/logo  (multipart/form-data, campo "logo")
  async updateLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw createHttpError(400, "No se recibió ningún archivo.");

      // Upload buffer to Cloudinary
      const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder:         "tallertrack/logos",
            public_id:      `tenant_${req.user.tenant_id}`,
            overwrite:      true,
            resource_type:  "image",
            transformation: [{ width: 400, height: 400, crop: "limit" }],
          },
          (error, result) => {
            if (error || !result) return reject(error ?? new Error("Cloudinary upload failed"));
            resolve(result as { secure_url: string });
          }
        );
        stream.end(req.file!.buffer);
      });

      const logo_url = uploadResult.secure_url;

      await pool.query(
        `UPDATE tenants
            SET settings   = jsonb_set(settings, '{logo_url}', $1::jsonb, true),
                updated_at = NOW()
          WHERE id = $2`,
        [JSON.stringify(logo_url), req.user.tenant_id]
      );

      res.json({ logo_url });
    } catch (err) {
      next(err);
    }
  },
};
