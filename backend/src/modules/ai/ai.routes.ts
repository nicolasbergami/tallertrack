import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { aiController } from "./ai.controller";

const router = Router();

router.use(authenticate);

// POST /api/v1/ai/extract-quote
// Body: { transcript: string, complaint?: string }
// Returns: AiQuoteDraft
router.post("/extract-quote", aiController.extractQuote);

// POST /api/v1/ai/predict-delivery
// Body: { complaint: string, vehicle_brand?: string, vehicle_model?: string }
// Returns: DeliveryPrediction
router.post("/predict-delivery", aiController.predictDelivery);

export default router;
