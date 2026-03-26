import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireSuperAdmin } from "../../middleware/superadmin.middleware";
import { backofficeController } from "./backoffice.controller";

const router = Router();

// All backoffice routes require a valid JWT + is_system_admin flag
router.use(authenticate, requireSuperAdmin);

router.get("/dashboard",          backofficeController.getDashboard);
router.get("/tenants",            backofficeController.getTenants);
router.get("/activity",           backofficeController.getActivity);
router.patch("/tenants/:id/plan",        backofficeController.updateTenantPlan);
router.patch("/plans/:slug",             backofficeController.updatePlanPrice);
router.post("/tenants/:id/impersonate",  backofficeController.impersonate);

export default router;
