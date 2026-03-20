import { useQuery } from "@tanstack/react-query";
import { workOrdersApi } from "../../api/work-orders.api";
import { QUOTE_ITEM_TYPE_LABELS, QuoteItemType } from "../../types/work-order";
import { PAYMENT_METHOD_LABELS, PaymentMethod } from "../../types/work-order";

const TYPE_COLORS: Record<QuoteItemType, string> = {
  labor:            "bg-violet-900/60 text-violet-300 border-violet-700/40",
  part:             "bg-orange-900/50 text-orange-300 border-orange-700/40",
  consumable:       "bg-sky-900/50 text-sky-300 border-sky-700/40",
  external_service: "bg-teal-900/50 text-teal-300 border-teal-700/40",
};

function fmt(n: number) {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

interface Props {
  workOrderId: string;
}

export function OrderSummaryCard({ workOrderId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey:  ["work-order-summary", workOrderId],
    queryFn:   () => workOrdersApi.getSummary(workOrderId),
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <section className="mx-4 mt-3 bg-surface-card rounded-2xl border border-surface-border overflow-hidden">
        <div className="h-40 animate-pulse" />
      </section>
    );
  }

  const quote = data?.quote;

  return (
    <section className="mx-4 mt-3 bg-surface-card rounded-2xl border border-surface-border overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-surface-border flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Resumen de la orden
          </h3>
          {quote && (
            <p className="text-xs text-slate-600 mt-0.5">{quote.quote_number}</p>
          )}
        </div>
        {quote?.approved_at && (
          <span className="text-xs text-emerald-400/70">
            Aprobado {new Date(quote.approved_at).toLocaleDateString("es-AR", {
              day: "2-digit", month: "short", year: "numeric",
            })}
          </span>
        )}
      </div>

      {/* Order dates */}
      {data && (
        <div className="px-4 py-3 border-b border-surface-border flex gap-6 text-xs text-slate-400">
          <div>
            <span className="text-slate-600 block mb-0.5">Ingreso</span>
            {new Date(data.received_at).toLocaleDateString("es-AR", {
              day: "2-digit", month: "short", year: "numeric",
            })}
          </div>
          {data.delivered_at && (
            <div>
              <span className="text-slate-600 block mb-0.5">Entrega</span>
              {new Date(data.delivered_at).toLocaleDateString("es-AR", {
                day: "2-digit", month: "short", year: "numeric",
              })}
            </div>
          )}
          {data.mileage_in && (
            <div>
              <span className="text-slate-600 block mb-0.5">Km ingreso</span>
              {data.mileage_in.toLocaleString()}
            </div>
          )}
          {data.mileage_out && (
            <div>
              <span className="text-slate-600 block mb-0.5">Km salida</span>
              {data.mileage_out.toLocaleString()}
            </div>
          )}
        </div>
      )}

      {/* Quote items */}
      {quote && quote.items.length > 0 ? (
        <>
          <div className="divide-y divide-surface-border">
            {quote.items.map((item) => (
              <div key={item.id} className="px-4 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 leading-snug">{item.description}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border
                                     ${TYPE_COLORS[item.item_type]}`}>
                      {QUOTE_ITEM_TYPE_LABELS[item.item_type]}
                    </span>
                    <span className="text-xs text-slate-600">
                      {item.quantity % 1 === 0
                        ? item.quantity
                        : item.quantity.toFixed(2)
                      } × {fmt(item.unit_price)}
                    </span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-slate-200 flex-shrink-0">
                  {fmt(item.line_total)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="px-4 py-3 border-t border-surface-border space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Subtotal</span>
              <span>{fmt(quote.subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>IVA (19%)</span>
              <span>{fmt(quote.tax_amount)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-100 pt-1 border-t border-surface-border">
              <span>Total</span>
              <span className="text-brand">{fmt(quote.total)}</span>
            </div>
          </div>
        </>
      ) : (
        <p className="px-4 py-4 text-sm text-slate-600">Sin presupuesto registrado.</p>
      )}

      {/* Payment summary */}
      {data?.payment_status === "paid" && (
        <div className="px-4 py-3 border-t border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-900/60 flex items-center justify-center text-[10px]">✓</span>
            <span className="text-xs font-semibold text-emerald-400">Cobrado</span>
            {data.payment_method && (
              <span className="text-xs text-slate-500">
                · {PAYMENT_METHOD_LABELS[data.payment_method as PaymentMethod]}
              </span>
            )}
          </div>
          <span className="text-sm font-bold text-emerald-300">
            {fmt(data.paid_amount ?? 0)}
          </span>
        </div>
      )}
    </section>
  );
}
