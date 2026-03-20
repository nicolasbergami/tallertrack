import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { WorkOrderDetail, WorkOrderStatus } from "../../types/work-order";
import { STATUS_CONFIG, NEXT_STATES, CANCELLABLE } from "../../config/status.config";
import { workOrdersApi } from "../../api/work-orders.api";
import { IconWhatsapp } from "../../components/ui/Icons";

interface Props {
  order: WorkOrderDetail;
}

function IconForward({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 5l7 7-7 7M6 5l7 7-7 7" />
    </svg>
  );
}

export function ActionBar({ order }: Props) {
  const queryClient = useQueryClient();

  const [sheetOpen,         setSheetOpen]         = useState(false);
  const [selectedNext,      setSelectedNext]      = useState<WorkOrderStatus | null>(null);
  const [diagnosis,         setDiagnosis]         = useState(order.diagnosis ?? "");
  const [notes,             setNotes]             = useState("");
  const [mileageOut,        setMileageOut]        = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const nextStates = NEXT_STATES[order.status] ?? [];
  const canCancel  = CANCELLABLE.includes(order.status);
  const isTerminal = nextStates.length === 0 && !canCancel;

  const primaryNext = nextStates[0] ?? null;
  const primaryCfg  = primaryNext ? STATUS_CONFIG[primaryNext] : null;
  const activeNext  = selectedNext ?? primaryNext;
  const activeCfg   = activeNext   ? STATUS_CONFIG[activeNext] : null;

  const transitionMutation = useMutation({
    mutationFn: (newStatus: WorkOrderStatus) =>
      workOrdersApi.transition(order.id, {
        status:         newStatus,
        diagnosis:      diagnosis  || undefined,
        internal_notes: notes      || undefined,
        mileage_out:    mileageOut ? parseInt(mileageOut, 10) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-order", order.id] });
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      setSheetOpen(false);
      setNotes("");
    },
  });

  const whatsappUrl = order.client_phone
    ? `https://wa.me/${order.client_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Hola ${order.client_name}, te contactamos sobre tu vehículo ${order.vehicle_plate} (OT ${order.order_number}).`
      )}`
    : null;

  function openSheet() {
    setSelectedNext(primaryNext);
    setSheetOpen(true);
  }

  const needsDiagnosis = order.status === "diagnosing";
  const needsMileage   = order.status === "quality_control" && activeNext === "ready";

  // ── Terminal state ────────────────────────────────────────────────────────
  if (isTerminal) {
    return (
      <div className="bg-surface border-t border-surface-border px-4 py-3">
        <div className="bg-surface-card border border-surface-border rounded-2xl p-4 text-center">
          <p className="text-slate-400 text-sm">
            {order.status === "delivered" ? "✅ Orden finalizada y entregada" : "Orden cancelada"}
          </p>
        </div>
      </div>
    );
  }

  // ── Awaiting client approval ──────────────────────────────────────────────
  if (order.status === "awaiting_approval") {
    return (
      <div className="bg-surface border-t border-surface-border px-4 pt-3 pb-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 h-9 px-3 rounded-xl
                         bg-green-950/50 border border-green-800/60
                         text-green-400 text-sm font-semibold hover:bg-green-950 transition-colors"
            >
              <IconWhatsapp className="w-4 h-4" />
              WhatsApp
            </a>
          ) : <div />}
          {!showCancelConfirm && (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="h-9 px-3 rounded-xl text-red-400/60 text-sm font-semibold
                         hover:text-red-400 hover:bg-red-950/30 transition-colors"
            >
              Cancelar OT
            </button>
          )}
        </div>
        {showCancelConfirm && (
          <div className="bg-red-950/60 border border-red-800 rounded-2xl p-4 flex flex-col gap-3">
            <p className="text-red-300 font-semibold text-sm">¿Confirmar cancelación de la orden?</p>
            <div className="flex gap-2">
              <button
                disabled={transitionMutation.isPending}
                onClick={() => transitionMutation.mutate("cancelled")}
                className="flex-1 h-10 rounded-xl bg-red-700 hover:bg-red-600 text-white
                           text-sm font-bold transition-colors disabled:opacity-50"
              >
                {transitionMutation.isPending ? "…" : "Sí, cancelar"}
              </button>
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="h-10 px-4 rounded-xl bg-surface-raised text-slate-300 text-sm font-semibold"
              >
                No
              </button>
            </div>
          </div>
        )}
        <div className="w-full rounded-2xl border border-violet-500/30 bg-violet-950/30 px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">📋</span>
          <div className="flex flex-col">
            <span className="text-violet-300 font-bold text-sm">Esperando aprobación del cliente</span>
            <span className="text-violet-400/60 text-xs">El cliente debe aprobar el presupuesto por WhatsApp</span>
          </div>
          <span className="ml-auto w-2 h-2 rounded-full bg-violet-400 animate-pulse flex-shrink-0" />
        </div>
        <button
          disabled={transitionMutation.isPending}
          onClick={() => transitionMutation.mutate("in_progress")}
          className="w-full h-10 rounded-xl bg-surface-raised border border-surface-border
                     text-slate-400 text-sm font-semibold hover:text-orange-300 hover:border-orange-500/40
                     transition-colors disabled:opacity-50"
        >
          {transitionMutation.isPending ? "…" : "Cliente ya aprobó — Iniciar reparación"}
        </button>
      </div>
    );
  }

  // ── Active state ──────────────────────────────────────────────────────────
  return (
    <>
      <div className="bg-surface border-t border-surface-border px-4 pt-3 pb-4 flex flex-col gap-3">

        {/* Secondary row: WhatsApp + Cancel */}
        <div className="flex items-center justify-between">
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 h-9 px-3 rounded-xl
                         bg-green-950/50 border border-green-800/60
                         text-green-400 text-sm font-semibold hover:bg-green-950 transition-colors"
            >
              <IconWhatsapp className="w-4 h-4" />
              WhatsApp
            </a>
          ) : <div />}

          {canCancel && !showCancelConfirm && (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="h-9 px-3 rounded-xl text-red-400/60 text-sm font-semibold
                         hover:text-red-400 hover:bg-red-950/30 transition-colors"
            >
              Cancelar OT
            </button>
          )}
        </div>

        {/* Cancel confirmation */}
        {showCancelConfirm && (
          <div className="bg-red-950/60 border border-red-800 rounded-2xl p-4 flex flex-col gap-3">
            <p className="text-red-300 font-semibold text-sm">¿Confirmar cancelación de la orden?</p>
            <div className="flex gap-2">
              <button
                disabled={transitionMutation.isPending}
                onClick={() => transitionMutation.mutate("cancelled")}
                className="flex-1 h-10 rounded-xl bg-red-700 hover:bg-red-600 text-white
                           text-sm font-bold transition-colors disabled:opacity-50"
              >
                {transitionMutation.isPending ? "…" : "Sí, cancelar"}
              </button>
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="h-10 px-4 rounded-xl bg-surface-raised text-slate-300 text-sm font-semibold"
              >
                No
              </button>
            </div>
          </div>
        )}

        {/* Transition error */}
        {transitionMutation.error && (
          <div className="bg-red-950/60 border border-red-800 rounded-xl p-3">
            <p className="text-red-300 text-sm font-semibold">
              ⚠️ {(transitionMutation.error as Error).message}
            </p>
          </div>
        )}

        {/* ── Main FAB ── */}
        {primaryNext && primaryCfg && (
          <button
            onClick={openSheet}
            className="w-full h-16 rounded-2xl flex items-center justify-center gap-3
                       font-bold text-white active:scale-[0.98] transition-transform"
            style={{
              background: "linear-gradient(135deg, #EA580C 0%, #F97316 50%, #C2410C 100%)",
              boxShadow:  "0 4px 24px rgba(249,115,22,0.4), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.2)",
            }}
          >
            <IconForward className="w-6 h-6 flex-shrink-0 opacity-90" />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-orange-200/70 text-[10px] font-semibold uppercase tracking-widest">
                Avanzar a
              </span>
              <span className="text-white font-black text-[17px] leading-tight">
                {primaryCfg.label}
              </span>
            </div>
          </button>
        )}
      </div>

      {/* ── Advance Confirmation Bottom Sheet ──────────────────────────────── */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSheetOpen(false)}
          />
          <div
            className="relative w-full max-w-2xl mx-auto bg-surface-card rounded-t-[2rem]
                        border-t border-x border-surface-border flex flex-col animate-slide-up"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-slate-600 rounded-full" />
            </div>

            <div className="px-6 pb-8 flex flex-col gap-4">
              {/* Header */}
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                  Confirmar avance
                </p>
                <p className="text-xl font-black text-white mt-0.5">
                  {activeCfg?.emoji} {activeCfg?.label}
                </p>
              </div>

              {/* State picker (only when 2+ next states) */}
              {nextStates.length > 1 && (
                <div className="flex gap-2">
                  {nextStates.map((ns) => {
                    const c = STATUS_CONFIG[ns];
                    const sel = (selectedNext ?? primaryNext) === ns;
                    const isBackward = ns === "in_progress" && order.status === "quality_control";
                    return (
                      <button
                        key={ns}
                        onClick={() => setSelectedNext(ns)}
                        className={`flex-1 h-12 rounded-xl border text-sm font-bold transition-all ${
                          sel
                            ? `${c.bgColor} ${c.textColor} ${c.borderColor}`
                            : "bg-surface border-surface-border text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        {isBackward ? "↩" : c.emoji}{" "}
                        {isBackward ? "Volver a reparar" : c.shortLabel}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Diagnosis field */}
              {needsDiagnosis && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                    Diagnóstico (recomendado)
                  </label>
                  <textarea
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="Ej: Pastillas de freno desgastadas al 100%…"
                    rows={2}
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-3
                               text-slate-100 placeholder-slate-500 text-sm resize-none
                               focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              )}

              {/* Note field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                  Nota interna (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones para el equipo…"
                  rows={2}
                  className="w-full bg-surface border border-surface-border rounded-xl px-4 py-3
                             text-slate-100 placeholder-slate-500 text-sm resize-none
                             focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              {/* Mileage out */}
              {needsMileage && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                    Odómetro de salida (km)
                  </label>
                  <input
                    type="number"
                    value={mileageOut}
                    onChange={(e) => setMileageOut(e.target.value)}
                    placeholder={String(order.mileage_in ?? "")}
                    inputMode="numeric"
                    className="w-full h-12 bg-surface border border-surface-border rounded-xl
                               px-4 text-slate-100 placeholder-slate-500 text-base
                               focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              )}

              {/* Confirm button */}
              <button
                onClick={() => { if (activeNext) transitionMutation.mutate(activeNext); }}
                disabled={transitionMutation.isPending || !activeNext}
                className="w-full h-14 rounded-2xl flex items-center justify-center gap-2
                           font-bold text-white text-base disabled:opacity-60
                           active:scale-[0.99] transition-transform"
                style={{
                  background: "linear-gradient(135deg, #EA580C 0%, #F97316 50%, #C2410C 100%)",
                  boxShadow:  "0 4px 16px rgba(249,115,22,0.35)",
                }}
              >
                {transitionMutation.isPending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Aplicando…
                  </>
                ) : (
                  <>
                    <IconForward className="w-5 h-5" />
                    Confirmar avance
                  </>
                )}
              </button>

              <button
                onClick={() => setSheetOpen(false)}
                className="text-slate-500 text-sm text-center hover:text-slate-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
