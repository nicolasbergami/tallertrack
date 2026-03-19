import { Router } from "express";
import { workOrderController } from "./work-order.controller";
import { authenticate, authorize } from "../../middleware/auth.middleware";

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/work-orders
 * @desc    List all work orders (filterable by status)
 * @access  All authenticated roles
 * @query   status?, limit?, offset?
 */
router.get("/", workOrderController.list);

/**
 * @route   GET /api/v1/work-orders/:id
 * @desc    Get a single work order with full detail
 * @access  All authenticated roles
 */
router.get("/:id", workOrderController.getById);

/**
 * @route   POST /api/v1/work-orders
 * @desc    Create a new work order (always starts at 'received')
 * @access  owner, admin, receptionist
 */
router.post(
  "/",
  authorize("owner", "admin", "receptionist"),
  workOrderController.create
);

/**
 * @route   PATCH /api/v1/work-orders/:id/transition
 * @desc    Advance or change the work order status
 * @body    { status, diagnosis?, internal_notes?, mileage_out? }
 * @access  owner, admin, mechanic
 */
router.patch(
  "/:id/transition",
  authorize("owner", "admin", "mechanic"),
  workOrderController.transition
);

/**
 * @route   GET /api/v1/work-orders/:id/transitions
 * @desc    Return the list of valid next statuses from the current state
 * @access  All authenticated roles
 */
router.get("/:id/transitions", workOrderController.getAvailableTransitions);

/**
 * @route   GET /api/v1/work-orders/:id/qr
 * @desc    Returns the QR code as a PNG image (Content-Type: image/png)
 * @access  All authenticated roles
 */
router.get("/:id/qr", workOrderController.getQrPng);

/**
 * @route   GET /api/v1/work-orders/:id/qr.json
 * @desc    Returns the QR code as base64 JSON (for mobile/print integrations)
 * @access  All authenticated roles
 */
router.get("/:id/qr.json", workOrderController.getQrJson);

/**
 * @route   POST /api/v1/work-orders/:id/quotes
 * @desc    Create a quote draft (typically from AI extraction)
 * @body    { items: QuoteItem[], notes?: string }
 * @access  owner, admin, mechanic
 */
router.post(
  "/:id/quotes",
  authorize("owner", "admin", "mechanic"),
  workOrderController.createQuote,
);

export default router;
