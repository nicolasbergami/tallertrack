import { useNavigate } from "react-router-dom";
import { WorkOrderDetail, WorkOrderStatus } from "../../types/work-order";
import { getStatusConfig, formatElapsed, ACTIVE_STATUSES } from "../../config/status.config";
import { PlateVisual } from "../../components/ui/PlateVisual";

interface Props {
  order:      WorkOrderDetail;
  highlight?: boolean;
}

// ── Live status badge — pulses if the state is active ────────────────────────
function LiveBadge({ status }: { status: WorkOrderStatus }) {
  const cfg    = getStatusConfig(status);
  const isLive = (ACTIVE_STATUSES as string[]).includes(status);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border
                  text-[10px] font-bold whitespace-nowrap
                  ${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dotColor}
                    ${isLive ? "animate-pulse" : ""}`}
      />
      {cfg.shortLabel}
    </span>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function WorkOrderCard({ order, highlight = false }: Props) {
  const navigate = useNavigate();
  const cfg      = getStatusConfig(order.status);
  const elapsed  = formatElapsed(order.received_at);
  const isStale  =
    Date.now() - new Date(order.received_at).getTime() > 8 * 3600 * 1000 &&
    order.status !== "ready";

  return (
    <button
      onClick={() => navigate(`/orders/${order.id}`)}
      className={`
        w-full text-left rounded-xl overflow-hidden
        border-l-[3px] ${cfg.borderColor}
        border border-surface-border
        transition-all duration-100 active:scale-[0.99] focus:outline-none animate-fade-in
        ${highlight ? "bg-surface-card/90" : "bg-surface-card"}
        hover:bg-surface-raised hover:border-slate-600/70
      `}
    >
      <div className="px-3 pt-3 pb-3 flex items-center gap-3">

        {/* ── Left: plate visual ── */}
        <PlateVisual plate={order.vehicle_plate} />

        {/* ── Center: vehicle model / client / OT# ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <p className="text-sm font-bold text-slate-200 truncate leading-snug">
            {order.vehicle_brand} {order.vehicle_model}
          </p>
          <p className="text-xs text-slate-400 truncate leading-snug">
            {order.client_name}
          </p>
          <p className="font-mono text-[10px] text-slate-600 leading-snug">
            {order.order_number}
          </p>
        </div>

        {/* ── Right: elapsed + live badge ── */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1">
            {isStale && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
            )}
            <span className="text-[11px] text-slate-500 tabular-nums font-mono">{elapsed}</span>
          </div>
          <LiveBadge status={order.status} />
        </div>
      </div>

      {/* ── Mechanic strip ── */}
      {order.assigned_user_name && (
        <div className="px-3 py-1.5 bg-surface-raised/40 border-t border-surface-border/50
                        flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-slate-600 flex-shrink-0" />
          <span className="text-[11px] text-slate-500 truncate">{order.assigned_user_name}</span>
        </div>
      )}
    </button>
  );
}
