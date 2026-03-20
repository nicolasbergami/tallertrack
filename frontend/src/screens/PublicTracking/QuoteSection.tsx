import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PublicQuote, publicTrackingApi } from "../../api/public-tracking.api";

const ITEM_TYPE_LABEL: Record<string, string> = {
  labor:            "Mano de obra",
  part:             "Repuesto",
  consumable:       "Consumible",
  external_service: "Serv. externo",
};

const CLP = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

interface Props {
  quote: PublicQuote;
  tenantSlug: string;
  orderNumber: string;
  queryKey: unknown[];
}

type ModalState = { open: false } | { open: true; action: "approve" | "reject" };

export function QuoteSection({ quote, tenantSlug, orderNumber, queryKey }: Props) {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [reason, setReason] = useState("");

  const respondMutation = useMutation({
    mutationFn: ({ action }: { action: "approve" | "reject" }) =>
      publicTrackingApi.respondToQuote(
        tenantSlug, orderNumber, quote.id, action,
        action === "reject" ? reason : undefined
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setModal({ open: false });
      setReason("");
    },
  });

  const isActionable = quote.status === "sent";
  const isApproved   = quote.status === "approved";
  const isRejected   = quote.status === "rejected";
  const isExpired    = quote.status === "expired";

  return (
    <div className={`
      rounded-2xl border overflow-hidden transition-all
      ${isApproved ? "border-green-200 bg-green-50"
        : isRejected ? "border-red-200 bg-red-50"
        : isExpired  ? "border-gray-200 bg-gray-50"
        : "border-orange-200 bg-white shadow-sm"}
    `}>
      {/* ── Header ── */}
      <div className={`
        flex items-center justify-between gap-3 px-5 py-4
        ${isApproved ? "bg-green-100" : isRejected ? "bg-red-100" : isExpired ? "bg-gray-100" : "bg-orange-50"}
      `}>
        <div>
          <p className="font-bold text-gray-800">Presupuesto {quote.quote_number}</p>
          {quote.valid_until && !isApproved && !isRejected && (
            <p className="text-xs text-gray-500 mt-0.5">
              Válido hasta {new Date(quote.valid_until).toLocaleDateString("es-CL")}
            </p>
          )}
        </div>
        {/* Status badge */}
        {isApproved && (
          <span className="flex items-center gap-1.5 bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-full">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            Aprobado
          </span>
        )}
        {isRejected && (
          <span className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full">
            ✕ Rechazado
          </span>
        )}
        {isActionable && (
          <span className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1.5 rounded-full border border-orange-300">
            Pendiente tu aprobación
          </span>
        )}
        {isExpired && (
          <span className="bg-gray-100 text-gray-500 text-xs font-bold px-3 py-1.5 rounded-full border border-gray-300">
            Expirado
          </span>
        )}
      </div>

      {/* ── Items table ── */}
      <div className="px-5 py-4">
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-3">Descripción</th>
                <th className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 px-2 whitespace-nowrap hidden sm:table-cell">Tipo</th>
                <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 px-2 hidden sm:table-cell">Cant.</th>
                <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 px-2 hidden sm:table-cell">P. Unit.</th>
                <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 pl-2">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {quote.items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 pr-3">
                    <p className="font-medium text-gray-800">{item.description}</p>
                    {item.part_number && (
                      <p className="text-xs text-gray-400 mt-0.5 font-mono">#{item.part_number}</p>
                    )}
                    {/* Show type/qty on mobile */}
                    <p className="text-xs text-gray-400 mt-0.5 sm:hidden">
                      {ITEM_TYPE_LABEL[item.item_type]} · {item.quantity} u. · {CLP(item.unit_price)} c/u
                      {item.discount_pct > 0 && ` · ${item.discount_pct}% dto`}
                    </p>
                  </td>
                  <td className="py-3 px-2 text-center hidden sm:table-cell">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                      ${item.item_type === "labor" ? "bg-blue-100 text-blue-700"
                        : item.item_type === "part" ? "bg-orange-100 text-orange-700"
                        : "bg-gray-100 text-gray-600"}`}>
                      {ITEM_TYPE_LABEL[item.item_type]}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right text-gray-600 hidden sm:table-cell">{item.quantity}</td>
                  <td className="py-3 px-2 text-right text-gray-600 hidden sm:table-cell">
                    {CLP(item.unit_price)}
                    {item.discount_pct > 0 && (
                      <span className="block text-xs text-green-600">-{item.discount_pct}%</span>
                    )}
                  </td>
                  <td className="py-3 pl-2 text-right font-semibold text-gray-800">{CLP(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Totals ── */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex justify-between text-base font-bold text-gray-900">
            <span>Total</span>
            <span className="text-orange-600">{CLP(quote.total)}</span>
          </div>
        </div>

        {quote.notes && (
          <p className="mt-3 text-sm text-gray-500 bg-gray-50 rounded-xl p-3 italic">
            "{quote.notes}"
          </p>
        )}
      </div>

      {/* ── Action buttons ── */}
      {isActionable && (
        <div className="px-5 pb-5 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setModal({ open: true, action: "approve" })}
            className="flex-1 flex items-center justify-center gap-2 h-14 rounded-xl
                       bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold text-base
                       transition-all shadow-md shadow-green-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            Aprobar presupuesto
          </button>
          <button
            onClick={() => setModal({ open: true, action: "reject" })}
            className="flex-1 sm:flex-none sm:w-44 flex items-center justify-center gap-2 h-14 rounded-xl
                       border-2 border-red-300 text-red-600 hover:bg-red-50 active:scale-95
                       font-bold text-base transition-all"
          >
            Rechazar
          </button>
        </div>
      )}

      {/* ── Approved/Rejected record ── */}
      {(isApproved || isRejected) && quote.approved_at && (
        <div className={`mx-5 mb-5 p-4 rounded-xl border text-sm
          ${isApproved ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5">{isApproved ? "🔒" : "🔒"}</span>
            <div>
              <p className={`font-bold ${isApproved ? "text-green-800" : "text-red-800"}`}>
                {isApproved ? "Aprobación registrada" : "Rechazo registrado"}
              </p>
              <p className={`text-xs mt-1 ${isApproved ? "text-green-600" : "text-red-600"}`}>
                {new Date(quote.approved_at).toLocaleString("es-CL", {
                  day: "2-digit", month: "long", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Este registro tiene fecha y hora exacta para respaldo legal del taller y del cliente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmation Modal ── */}
      {modal.open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4 animate-slide-up">
            {modal.action === "approve" ? (
              <>
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">¿Aprobar presupuesto?</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    Estás aprobando el presupuesto por un total de{" "}
                    <span className="font-bold text-gray-800">{CLP(quote.total)}</span>.
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Tu aprobación quedará registrada con fecha, hora y dirección IP.
                  </p>
                </div>
                {respondMutation.error && (
                  <p className="text-sm text-red-500 text-center">{(respondMutation.error as Error).message}</p>
                )}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => respondMutation.mutate({ action: "approve" })}
                    disabled={respondMutation.isPending}
                    className="h-14 w-full rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-base
                               flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {respondMutation.isPending ? (
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    )}
                    Sí, apruebo el presupuesto
                  </button>
                  <button
                    onClick={() => { setModal({ open: false }); respondMutation.reset(); }}
                    disabled={respondMutation.isPending}
                    className="h-12 w-full rounded-xl text-gray-500 hover:bg-gray-100 font-semibold transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">✕</span>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">¿Rechazar presupuesto?</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    El taller será notificado y podrá contactarte.
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600 block mb-1.5">
                    Motivo (opcional)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ej: El precio es elevado, quisiera una segunda opinión..."
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-700
                               focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                  />
                </div>
                {respondMutation.error && (
                  <p className="text-sm text-red-500 text-center">{(respondMutation.error as Error).message}</p>
                )}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => respondMutation.mutate({ action: "reject" })}
                    disabled={respondMutation.isPending}
                    className="h-14 w-full rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-base
                               flex items-center justify-center transition-all disabled:opacity-50"
                  >
                    {respondMutation.isPending ? "Enviando..." : "Confirmar rechazo"}
                  </button>
                  <button
                    onClick={() => { setModal({ open: false }); setReason(""); respondMutation.reset(); }}
                    disabled={respondMutation.isPending}
                    className="h-12 w-full rounded-xl text-gray-500 hover:bg-gray-100 font-semibold transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
