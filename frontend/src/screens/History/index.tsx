import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { workOrdersApi } from "../../api/work-orders.api";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { formatElapsed } from "../../config/status.config";

export function History() {
  const navigate = useNavigate();

  // Reuse the work-orders list — all statuses including terminal ones
  const { data, isLoading } = useQuery({
    queryKey: ["work-orders-all"],
    queryFn:  () => workOrdersApi.list({ limit: 50 }),
    staleTime: 30_000,
  });

  const orders = [...(data?.data ?? [])].sort(
    (a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
  );

  return (
    <AppShell title="Historial">
      <div className="flex flex-col">

        {/* Header */}
        <div className="px-4 py-4 border-b border-surface-border">
          <p className="text-slate-400 text-sm">
            {data?.total ?? 0} órdenes en total
          </p>
        </div>

        {isLoading && (
          <div className="flex flex-col gap-2 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-surface-card rounded-xl animate-pulse border border-surface-border" />
            ))}
          </div>
        )}

        {!isLoading && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-8">
            <div className="w-14 h-14 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-center">
              <span className="text-2xl">📋</span>
            </div>
            <div>
              <p className="text-slate-300 font-semibold">Sin historial aún</p>
              <p className="text-slate-500 text-sm mt-1">Las órdenes creadas aparecerán aquí</p>
            </div>
          </div>
        )}

        {!isLoading && orders.length > 0 && (
          <div className="flex flex-col gap-0 p-4 animate-slide-up">
            {orders.map((order) => (
              <button
                key={order.id}
                onClick={() => navigate(`/orders/${order.id}`)}
                className="flex items-center gap-3 py-3 px-1 border-b border-surface-border/50
                           last:border-b-0 text-left hover:bg-surface-card/50 -mx-1 px-2 rounded-xl
                           transition-colors active:scale-[0.99] touch-feedback"
              >
                {/* Date */}
                <div className="flex-shrink-0 w-10 text-center">
                  <p className="text-base font-black text-slate-300 leading-none">
                    {new Date(order.received_at).getDate()}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                    {new Date(order.received_at).toLocaleDateString("es-CL", { month: "short" })}
                  </p>
                </div>

                {/* Divider */}
                <div className="w-px h-8 bg-surface-border flex-shrink-0" />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-slate-100 tracking-widest">
                      {order.vehicle_plate}
                    </span>
                    <span className="text-slate-500 text-xs truncate">
                      {order.vehicle_brand} {order.vehicle_model}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={order.status} size="sm" showDot={false} />
                    <span className="text-slate-600 text-[11px] font-mono">{order.order_number}</span>
                  </div>
                </div>

                {/* Elapsed */}
                <span className="text-[11px] text-slate-600 flex-shrink-0">
                  {formatElapsed(order.received_at)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
