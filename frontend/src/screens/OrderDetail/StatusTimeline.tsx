import { WorkOrderStatus } from "../../types/work-order";
import { STATUS_CONFIG, ACTIVE_STATUSES } from "../../config/status.config";

interface Props {
  currentStatus: WorkOrderStatus;
}

// The canonical forward flow (excluding cancelled, which is a side-exit)
const FLOW: WorkOrderStatus[] = [
  "received", "diagnosing", "awaiting_parts", "in_progress", "quality_control", "ready", "delivered",
];

export function StatusTimeline({ currentStatus }: Props) {
  const isCancelled = currentStatus === "cancelled";
  const currentIdx  = FLOW.indexOf(currentStatus);

  // For "awaiting_parts" being optional, we show it dimmed if skipped
  return (
    <div className="flex flex-col gap-0">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 mb-3">
        Progreso
      </h3>

      {isCancelled ? (
        <div className="mx-4 bg-red-950/40 border border-red-800/50 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl">✖️</span>
          <div>
            <p className="text-red-300 font-bold">Orden cancelada</p>
            <p className="text-red-400/70 text-sm">Esta orden fue cancelada y no puede continuar</p>
          </div>
        </div>
      ) : (
        <div className="px-4">
          <div className="relative">
            {/* Vertical connector */}
            <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-surface-raised" />

            <div className="flex flex-col gap-1">
              {FLOW.map((status, idx) => {
                const cfg   = STATUS_CONFIG[status];
                const done  = idx < currentIdx;
                const active = idx === currentIdx;
                const future = idx > currentIdx;

                return (
                  <div key={status} className="relative flex items-center gap-4 py-2">
                    {/* Dot */}
                    <div className={`
                      relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                      transition-all duration-300
                      ${done   ? `${cfg.bgColor} ${cfg.dotColor} border-2 border-transparent` : ""}
                      ${active ? `${cfg.bgColor} ring-4 ${cfg.ringColor}/30 border-2 ${cfg.borderColor}` : ""}
                      ${future ? "bg-surface-raised border-2 border-surface-border" : ""}
                    `}>
                      {done ? (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className={`text-sm ${active ? cfg.textColor : "text-slate-600"}`}>
                          {idx + 1}
                        </span>
                      )}
                    </div>

                    {/* Label */}
                    <div className="flex flex-col">
                      <span className={`
                        font-semibold text-sm transition-colors
                        ${done   ? "text-slate-400" : ""}
                        ${active ? `${cfg.textColor} text-base` : ""}
                        ${future ? "text-slate-600" : ""}
                      `}>
                        {cfg.emoji} {cfg.label}
                      </span>
                      {active && (
                        <span className={`text-xs font-medium ${cfg.textColor} opacity-70`}>
                          Estado actual
                        </span>
                      )}
                    </div>

                    {/* Pulse for active */}
                    {active && (
                      <span className={`ml-auto w-2 h-2 rounded-full ${cfg.dotColor} animate-pulse`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
