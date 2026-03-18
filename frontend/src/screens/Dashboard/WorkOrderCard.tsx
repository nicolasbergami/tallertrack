import { useNavigate } from "react-router-dom";
import { WorkOrderDetail } from "../../types/work-order";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { getStatusConfig, formatElapsed } from "../../config/status.config";

interface Props {
  order: WorkOrderDetail;
}

export function WorkOrderCard({ order }: Props) {
  const navigate = useNavigate();
  const cfg      = getStatusConfig(order.status);
  const elapsed  = formatElapsed(order.received_at);
  const isUrgent = (Date.now() - new Date(order.received_at).getTime()) > 4 * 3600 * 1000;

  return (
    <button
      onClick={() => navigate(`/orders/${order.id}`)}
      className={`
        w-full text-left bg-surface-card rounded-2xl border-l-4 ${cfg.borderColor}
        p-4 flex flex-col gap-3
        hover:bg-surface-raised active:scale-[0.98]
        transition-all duration-100 touch-feedback
        focus:outline-none focus:ring-2 ${cfg.ringColor} focus:ring-offset-1 focus:ring-offset-surface
        animate-fade-in
      `}
    >
      {/* Row 1: Plate + elapsed time */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="font-plate text-slate-50">{order.vehicle_plate}</span>
          <span className="text-slate-400 text-sm">
            {order.vehicle_brand} {order.vehicle_model}
          </span>
        </div>
        <div className={`flex items-center gap-1 text-sm font-semibold flex-shrink-0
          ${isUrgent ? "text-red-400" : "text-slate-500"}`}>
          {isUrgent && <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />}
          <span>{elapsed}</span>
        </div>
      </div>

      {/* Row 2: Status badge + client */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <StatusBadge status={order.status} size="sm" />
        <span className="text-slate-400 text-sm truncate max-w-[9rem]">
          {order.client_name}
        </span>
      </div>

      {/* Row 3: Order number + mechanic */}
      <div className="flex items-center justify-between text-xs text-slate-500 border-t border-surface-raised pt-2">
        <span className="font-mono">{order.order_number}</span>
        {order.assigned_user_name && (
          <span className="flex items-center gap-1">
            <span>🔧</span>
            {order.assigned_user_name}
          </span>
        )}
      </div>
    </button>
  );
}
