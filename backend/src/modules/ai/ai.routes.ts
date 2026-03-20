import { Router } from "express";
import multer from "multer";
import { authenticate } from "../../middleware/auth.middleware";
import { aiController } from "./ai.controller";

const router = Router();

router.use(authenticate);

// Multer — memory storage for audio blobs (max 25 MB, Whisper API limit)
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg",
                     "audio/wav", "audio/x-m4a", "audio/mp3", "video/webm"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Formato de audio no soportado: ${file.mimetype}`));
    }
  },
});

// POST /api/v1/ai/extract-quote
// Body: { transcript: string, complaint?: string }
// Returns: AiQuoteDraft
router.post("/extract-quote", aiController.extractQuote);

// POST /api/v1/ai/predict-delivery
// Body: { complaint: string, vehicle_brand?: string, vehicle_model?: string }
// Returns: DeliveryPrediction
router.post("/predict-delivery", aiController.predictDelivery);

// POST /api/v1/ai/voice-diagnosis
// Body: multipart/form-data — field "audio" (webm, ogg, mp4, wav, m4a, mp3)
// Returns: VoiceDiagnosisResult { transcripcion, items, resumen_cliente }
router.post("/voice-diagnosis", audioUpload.single("audio"), aiController.voiceDiagnosis);

export default router;
