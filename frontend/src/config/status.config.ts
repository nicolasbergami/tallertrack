import { WorkOrderStatus } from "../types/work-order";

// ---------------------------------------------------------------------------
// Single source of truth for all status-related UI data
// ---------------------------------------------------------------------------

export interface StatusConfig {
  label: string;                 // Human-readable label in Spanish
  shortLabel: string;            // Used in tight spaces (Kanban column headers)
  emoji: string;
  bgColor: string;               // Tailwind bg class for cards/badges
  textColor: string;             // Tailwind text class
  dotColor: string;              // Tailwind bg class for the status dot
  borderColor: string;           // Left border on cards
  ringColor: string;             // Focus ring
  step: number;                  // 1-indexed position in the workflow (0 = terminal)
}

export const STATUS_CONFIG: Record<WorkOrderStatus, StatusConfig> = {
  received: {
    label:       "Recibido",
    shortLabel:  "Recibido",
    emoji:       "📥",
    bgColor:     "bg-blue-950/60",
    textColor:   "text-blue-300",
    dotColor:    "bg-blue-400",
    borderColor: "border-blue-500",
    ringColor:   "ring-blue-500",
    step: 1,
  },
  diagnosing: {
    label:       "En diagnóstico",
    shortLabel:  "Diagnóstico",
    emoji:       "🔍",
    bgColor:     "bg-sky-950/60",
    textColor:   "text-sky-300",
    dotColor:    "bg-sky-400",
    borderColor: "border-sky-500",
    ringColor:   "ring-sky-500",
    step: 2,
  },
  awaiting_parts: {
    label:       "Esperando repuestos",
    shortLabel:  "Repuestos",
    emoji:       "⏳",
    bgColor:     "bg-amber-950/60",
    textColor:   "text-amber-300",
    dotColor:    "bg-amber-400",
    borderColor: "border-amber-500",
    ringColor:   "ring-amber-500",
    step: 3,
  },
  in_progress: {
    label:       "En reparación",
    shortLabel:  "Reparando",
    emoji:       "⚙️",
    bgColor:     "bg-orange-950/60",
    textColor:   "text-orange-300",
    dotColor:    "bg-orange-400",
    borderColor: "border-orange-500",
    ringColor:   "ring-orange-500",
    step: 4,
  },
  quality_control: {
    label:       "Control de calidad",
    shortLabel:  "QC",
    emoji:       "✅",
    bgColor:     "bg-purple-950/60",
    textColor:   "text-purple-300",
    dotColor:    "bg-purple-400",
    borderColor: "border-purple-500",
    ringColor:   "ring-purple-500",
    step: 5,
  },
  ready: {
    label:       "Listo para retirar",
    shortLabel:  "Listo",
    emoji:       "🎉",
    bgColor:     "bg-green-950/60",
    textColor:   "text-green-300",
    dotColor:    "bg-green-400",
    borderColor: "border-green-500",
    ringColor:   "ring-green-500",
    step: 6,
  },
  delivered: {
    label:       "Entregado",
    shortLabel:  "Entregado",
    emoji:       "🏁",
    bgColor:     "bg-teal-950/60",
    textColor:   "text-teal-300",
    dotColor:    "bg-teal-400",
    borderColor: "border-teal-600",
    ringColor:   "ring-teal-500",
    step: 0,  // terminal
  },
  cancelled: {
    label:       "Cancelado",
    shortLabel:  "Cancelado",
    emoji:       "✖️",
    bgColor:     "bg-red-950/60",
    textColor:   "text-red-300",
    dotColor:    "bg-red-500",
    borderColor: "border-red-600",
    ringColor:   "ring-red-500",
    step: 0,  // terminal
  },
};

// Valid forward transitions (mirrors backend state machine)
export const NEXT_STATES: Partial<Record<WorkOrderStatus, WorkOrderStatus[]>> = {
  received:        ["diagnosing"],
  diagnosing:      ["awaiting_parts", "in_progress"],
  awaiting_parts:  ["in_progress"],
  in_progress:     ["quality_control"],
  quality_control: ["ready", "in_progress"],
  ready:           ["delivered"],
};

// States that can be cancelled
export const CANCELLABLE: WorkOrderStatus[] = [
  "received", "diagnosing", "awaiting_parts", "in_progress", "quality_control", "ready",
];

// Active states (visible on Dashboard kanban by default)
export const ACTIVE_STATUSES: WorkOrderStatus[] = [
  "received", "diagnosing", "awaiting_parts", "in_progress", "quality_control", "ready",
];

export function getStatusConfig(status: WorkOrderStatus): StatusConfig {
  return STATUS_CONFIG[status];
}

// Returns how many minutes since received_at
export function getElapsedMinutes(receivedAt: string): number {
  return Math.floor((Date.now() - new Date(receivedAt).getTime()) / 60_000);
}

export function formatElapsed(receivedAt: string): string {
  const mins = getElapsedMinutes(receivedAt);
  if (mins < 60)   return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${Math.floor(mins / 1440)}d`;
}
