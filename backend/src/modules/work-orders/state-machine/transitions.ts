import { WorkOrderStatus, STATUS_LABELS } from "../work-order.types";

// ---------------------------------------------------------------------------
// TallerTrack — Work Order State Machine
//
// Flujo principal:
//   received → diagnosing → awaiting_approval → in_progress → quality_control → ready → delivered
//
// Reglas de negocio:
//   1. El único camino es hacia adelante (excepto quality_control → in_progress si falla QC).
//   2. No se puede saltar estados.
//   3. Desde cualquier estado activo se puede cancelar (excepto delivered).
//   4. delivered y cancelled son estados terminales — no admiten transición.
//   5. awaiting_approval → in_progress/awaiting_parts solo via endpoints públicos del cliente.
//      El mecánico NO puede avanzar manualmente desde awaiting_approval a esos estados.
// ---------------------------------------------------------------------------

type TransitionMap = Readonly<Record<WorkOrderStatus, readonly WorkOrderStatus[]>>;

export const VALID_TRANSITIONS: TransitionMap = {
  received:          ["diagnosing", "cancelled"],
  // diagnosing can only advance via quote submission (auto-transition to awaiting_approval)
  diagnosing:        ["awaiting_approval", "cancelled"],
  // awaiting_approval advances only via client /approve or /reject endpoints
  awaiting_approval: ["in_progress", "awaiting_parts", "cancelled"],
  awaiting_parts:    ["in_progress", "cancelled"],
  in_progress:       ["quality_control", "awaiting_parts", "cancelled"],
  quality_control:   ["ready", "in_progress"],   // ← back to repair if QC fails
  ready:             ["delivered"],
  delivered:         [],                         // terminal
  cancelled:         [],                         // terminal
};

// ---------------------------------------------------------------------------
// Human-readable reason displayed when a transition is blocked
// ---------------------------------------------------------------------------
const TRANSITION_BLOCKED_REASON: Partial<Record<WorkOrderStatus, Partial<Record<WorkOrderStatus, string>>>> = {
  received: {
    in_progress:     "Debe pasar por Diagnóstico antes de iniciar la reparación.",
    quality_control: "Debe completar Diagnóstico y Reparación antes del control de calidad.",
    ready:           "No se puede marcar como Listo sin completar el proceso completo.",
    delivered:       "La orden debe completar todos los pasos antes de ser entregada.",
  },
  diagnosing: {
    in_progress:     "Envíe el presupuesto al cliente primero. El sistema esperará su aprobación antes de comenzar la reparación.",
    awaiting_parts:  "Envíe el presupuesto al cliente primero. El sistema esperará su aprobación.",
    ready:           "Debe completar la Reparación y el Control de Calidad primero.",
    delivered:       "La orden aún no ha sido reparada ni aprobada.",
  },
  awaiting_approval: {
    in_progress:     "La reparación solo puede comenzar cuando el cliente apruebe el presupuesto.",
    awaiting_parts:  "No se puede avanzar manualmente mientras se espera aprobación del cliente.",
  },
};

// ---------------------------------------------------------------------------
// StateMachine class
// ---------------------------------------------------------------------------
export class WorkOrderStateMachine {
  /**
   * Returns true if the transition from → to is allowed.
   */
  static canTransition(from: WorkOrderStatus, to: WorkOrderStatus): boolean {
    return (VALID_TRANSITIONS[from] as readonly WorkOrderStatus[]).includes(to);
  }

  /**
   * Validates the transition and throws a descriptive error if it is not allowed.
   */
  static assertTransition(from: WorkOrderStatus, to: WorkOrderStatus): void {
    if (from === to) {
      throw new TransitionError(
        `La orden ya se encuentra en estado "${STATUS_LABELS[from]}".`,
        from,
        to
      );
    }

    if (!this.canTransition(from, to)) {
      const customReason = TRANSITION_BLOCKED_REASON[from]?.[to];
      const defaultReason = `La transición de "${STATUS_LABELS[from]}" → "${STATUS_LABELS[to]}" no está permitida.`;
      throw new TransitionError(customReason ?? defaultReason, from, to);
    }
  }

  /**
   * Returns the list of valid next statuses from a given current status.
   */
  static getAvailableTransitions(from: WorkOrderStatus): WorkOrderStatus[] {
    return [...VALID_TRANSITIONS[from]];
  }

  /**
   * Returns true if the status is a terminal state (no further transitions).
   */
  static isTerminal(status: WorkOrderStatus): boolean {
    return VALID_TRANSITIONS[status].length === 0;
  }
}

// ---------------------------------------------------------------------------
// Custom error
// ---------------------------------------------------------------------------
export class TransitionError extends Error {
  constructor(
    message: string,
    public readonly from: WorkOrderStatus,
    public readonly to: WorkOrderStatus
  ) {
    super(message);
    this.name = "TransitionError";
  }
}
