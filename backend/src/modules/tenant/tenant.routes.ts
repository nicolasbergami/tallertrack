import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.middleware";
import { requirePlan } from "../../middleware/plan.middleware";
import { tenantController } from "./tenant.controller";

const router = Router();

router.use(authenticate);

// GET  /api/v1/tenant/settings → returns { settings: { logo_url, … } }
router.get("/settings", tenantController.getSettings);

// PATCH /api/v1/tenant/settings/logo → updates logo_url (owner/admin + pro/enterprise/trialing)
router.patch(
  "/settings/logo",
  authorize("owner", "admin"),
  requirePlan("professional"),   // trialing is treated as professional inside middleware
  tenantController.updateLogo
);

export default router;
