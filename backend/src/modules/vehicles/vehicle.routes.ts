import { Router } from "express";
import { vehicleController } from "./vehicle.controller";

const router = Router();

/**
 * @route   GET /api/v1/vehicles/lookup?plate=ABC123
 * @desc    Look up a vehicle by license plate within the tenant.
 *          Returns vehicle data + last known client for pre-filling NewOrder form.
 * @access  All authenticated roles (authentication handled in app.ts)
 */
router.get("/lookup", vehicleController.lookupByPlate);

export default router;
