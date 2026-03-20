import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { workOrdersApi, RecordPaymentDTO } from "../../api/work-orders.api";
import { PaymentMethod, PAYMENT_METHOD_LABELS, WorkOrderDetail } from "../../types/work-order";

interface Props {
  order:   WorkOrderDetail;
  onClose: () => void;
}

const METHODS: { id: PaymentMethod; icon: string }[] = [
  { id: "cash",        icon: "💵" },
  { id: "transfer",    icon: "🏦" },
  { id: "card",        icon: "💳" },
  { id: "mercadopago", icon: "🔵" },
  { id: "other",       icon: "📋" },
];

export function PaymentModal({ order, onClose }: Props) {
  const qc = useQueryClient();

  const quoteTotal = order.quote?.total ?? null;

  const [method,  setMethod]  = useState<PaymentMethod>("cash");
  const [amount,  setAmount]  = useState(quoteTotal ? String(quoteTotal) : "");
  const [notes,   setNotes]   = useState("");
  const [error,   setError]   = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: (dto: RecordPaymentDTO) =>
      workOrdersApi.recordPayment(order.id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-order", order.id] });
      qc.invalidateQueries({ queryKey: ["work-orders-all"] });
      qc.invalidateQueries({ queryKey: ["work-orders"] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  function handleSubmit() {
    const n = parseFloat(amount.replace(/[^0-9.]/g, ""));
    if (!n || n <= 0) { setError("Ingresa un monto válido."); return; }
    setError("");
    mutate({ payment_method: method, paid_amount: n, payment_notes: notes || undefined });
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-surface-card w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl border border-surface-border flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-surface-border" />
        </div>

        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-surface-border flex items-center justify-between">
          <div>
            <p className="text-base font-bold text-slate-100">Registrar cobro</p>
            <p className="text-xs text-slate-500 mt-0.5">{order.order_number} · {order.client_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-2xl leading-none">×</button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          {/* Method selector */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Método de pago</p>
            <div className="grid grid-cols-5 gap-2">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-center transition-all ${
                    method === m.id
                      ? "bg-brand/15 border-brand/60 shadow-[0_0_12px_rgba(249,115,22,0.2)]"
                      : "bg-surface-raised border-surface-border hover:border-slate-500"
                  }`}
                >
                  <span className="text-lg">{m.icon}</span>
                  <span className={`text-[9px] font-semibold leading-tight ${method === m.id ? "text-brand" : "text-slate-500"}`}>
                    {PAYMENT_METHOD_LABELS[m.id].split(" ")[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Monto cobrado</p>
              {quoteTotal && (
                <button
                  type="button"
                  onClick={() => setAmount(String(quoteTotal))}
                  className="text-[11px] text-brand hover:underline font-semibold"
                >
                  Total presupuesto: ${quoteTotal.toLocaleString("es-AR")}
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg pointer-events-none">$</span>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setError(""); }}
                placeholder="0"
                className="w-full h-14 bg-surface-raised border border-surface-border rounded-xl
                           pl-9 pr-4 text-xl font-bold text-slate-100 placeholder-slate-600
                           focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent
                           transition-colors"
              />
            </div>
            {quoteTotal && parseFloat(amount) > 0 && parseFloat(amount) < quoteTotal && (
              <p className="text-[11px] text-amber-400 mt-1.5 font-medium">
                Saldo pendiente: ${(quoteTotal - parseFloat(amount)).toLocaleString("es-AR")}
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Notas (opcional)</p>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: seña, saldo pendiente…"
              className="w-full h-10 bg-surface-raised border border-surface-border rounded-xl
                         px-4 text-sm text-slate-200 placeholder-slate-600
                         focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent
                         transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm font-medium -mt-1">{error}</p>
          )}
        </div>

        {/* CTA */}
        <div className="px-5 pb-6 pt-2">
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="w-full h-14 rounded-2xl font-bold text-base text-white
                       bg-gradient-to-r from-orange-600 to-orange-500
                       hover:from-orange-500 hover:to-orange-400
                       disabled:opacity-50 disabled:pointer-events-none
                       shadow-[0_4px_20px_rgba(249,115,22,0.3)]
                       active:scale-[0.98] transition-all"
          >
            {isPending ? "Guardando…" : "✓  Confirmar cobro"}
          </button>
        </div>
      </div>
    </div>
  );
}
