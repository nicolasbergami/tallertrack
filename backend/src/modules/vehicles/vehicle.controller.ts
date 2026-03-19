import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { withTenantContext } from "../../config/database";
import { JwtPayload } from "../../middleware/auth.middleware";

const plateSchema = z
  .string()
  .min(1, "La patente es requerida")
  .max(10)
  .transform((v) => v.toUpperCase().replace(/[\s\-]/g, ""));

export const vehicleController = {
  /**
   * GET /api/v1/vehicles/lookup?plate=ABC123
   *
   * Returns vehicle data + associated client for an existing plate in this tenant.
   * Used by the NewOrder wizard to auto-fill form fields when the vehicle
   * was seen in the shop before.
   */
  async lookupByPlate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plate = plateSchema.parse(req.query.plate);
      const user  = req.user as JwtPayload;

      const row = await withTenantContext(user.tenant_id, async (client) => {
        const { rows } = await client.query<{
          id: string;
          license_plate: string;
          brand: string;
          model: string;
          year: number | null;
          color: string | null;
          fuel_type: string | null;
          engine_cc: number | null;
          mileage_km: number | null;
          vin: string | null;
          vehicle_notes: string | null;
          client_id: string;
          client_name: string;
          client_phone: string | null;
          client_email: string | null;
          last_order_number: string | null;
        }>(
          `SELECT
             v.id,
             v.license_plate,
             v.brand,
             v.model,
             v.year,
             v.color,
             v.fuel_type,
             v.engine_cc,
             v.mileage_km,
             v.vin,
             v.notes          AS vehicle_notes,
             c.id             AS client_id,
             c.full_name      AS client_name,
             c.phone          AS client_phone,
             c.email          AS client_email,
             (SELECT wo.order_number
                FROM work_orders wo
               WHERE wo.vehicle_id = v.id
                 AND wo.deleted_at IS NULL
               ORDER BY wo.created_at DESC
               LIMIT 1)       AS last_order_number
           FROM  vehicles v
           JOIN  clients  c ON c.id = v.client_id
           WHERE v.license_plate = $1
             AND v.deleted_at   IS NULL
           LIMIT 1`,
          [plate],
        );
        return rows[0] ?? null;
      });

      if (!row) {
        res.status(404).json({ found: false });
        return;
      }

      res.json({
        found: true,
        vehicle: {
          id:               row.id,
          license_plate:    row.license_plate,
          brand:            row.brand,
          model:            row.model,
          year:             row.year,
          color:            row.color,
          fuel_type:        row.fuel_type,
          engine_cc:        row.engine_cc,
          mileage_km:       row.mileage_km,
          vin:              row.vin,
          notes:            row.vehicle_notes,
          last_order_number: row.last_order_number,
          client: {
            id:    row.client_id,
            name:  row.client_name,
            phone: row.client_phone,
            email: row.client_email,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  },
};
