import { Router } from "express";
import { teamController } from "./team.controller";
import { authorize } from "../../middleware/auth.middleware";

const router = Router();

// Todas las rutas de equipo requieren rol owner o admin
// (authenticate ya viene aplicado globalmente en app.ts)

router.get("/",      authorize("owner", "admin"), teamController.list);
router.post("/",     authorize("owner", "admin"), teamController.create);
router.patch("/:id", authorize("owner", "admin"), teamController.update);
router.delete("/:id",authorize("owner", "admin"), teamController.remove);

export default router;
