import { useNavigate } from "react-router-dom";
import { WorkOrderDetail } from "../../types/work-order";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { getStatusConfig, formatElapsed } from "../../config/status.config";

interface Props {
  order: WorkOrderDetail;
  highlight?: boolean; // "needs attention" visual treatment
}

export function WorkOrderCard({ order, highlight = false }: Props) {
  const navigate  = useNavigate();
  const cfg       = getStatusConfig(order.status);
  const elapsed   = formatElapsed(order.received_at);
  const msElapsed = Date.now() - new Date(order.received_at).getTime();
  const isStale   = msElapsed > 8 * 3600 * 1000 && order.status !== "ready";
  const isReady   = order.status === "ready";

  const deliveryLabel = order.estimated_delivery
    ? new Date(order.estimated_delivery).toLocaleDateString("es-CL", { day: "numeric", month: "short" })
    : null;

  return (
    <button
      onClick={() => navigate(`/orders/${order.id}`)}
      className={`
        w-full text-left rounded-xl overflow-hidden
        border-l-[3px] ${cfg.borderColor}
        transition-all duration-100 active:scale-[0.99] focus:outline-none
        animate-fade-in
        ${highlight
          ? "bg-surface-card border border-l-[3px] border-surface-border shadow-sm"
          : "bg-surface-card border border-surface-border"
        }
        hover:bg-surface-raised
      `}
    >
      <div className="px-4 pt-3.5 pb-3 flex flex-col gap-2">

        {/* Row 1 — Plate + time */}
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-mono font-black text-[1.35rem] text-white tracking-[0.12em] leading-none">
            {order.vehicle_plate}
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isStale && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            )}
            {isReady && (
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            )}
            <span className="text-[11px] text-slate-500 tabular-nums">{elapsed}</span>
          </div>
        </div>

        {/* Row 2 — Vehicle + client */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-400 text-xs truncate">
            {order.vehicle_brand} {order.vehicle_model}
          </span>
          <span className="text-slate-500 text-xs truncate max-w-[9rem] text-right flex-shrink-0">
            {order.client_name}
          </span>
        </div>

        {/* Divider */}
        <div className="h-px bg-surface-raised/70" />

        {/* Row 3 — Status + order# + delivery */}
        <div className="flex items-center justify-between gap-2">
          <StatusBadge status={order.status} size="sm" />
          <div className="flex items-center gap-3 flex-shrink-0">
            {deliveryLabel && (
              <span className={`text-[11px] font-medium ${isStale ? "text-amber-400" : "text-slate-500"}`}>
                Entrega {deliveryLabel}
              </span>
            )}
            <span className="font-mono text-[11px] text-slate-600">{order.order_number}</span>
          </div>
        </div>
      </div>

      {/* Mechanic strip — shown only when assigned */}
      {order.assigned_user_name && (
        <div className="px-4 py-1.5 bg-surface-raised/40 border-t border-surface-border/50 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
          <span className="text-[11px] text-slate-500">{order.assigned_user_name}</span>
        </div>
      )}
    </button>
  );
}
