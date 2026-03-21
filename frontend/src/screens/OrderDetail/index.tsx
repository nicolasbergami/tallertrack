import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "../../components/layout/AppShell";
import { ActionBar } from "./ActionBar";
import { AiQuoteModal } from "./AiQuoteModal";
import { DiagnosisPanel } from "./DiagnosisPanel";
import { OrderSummaryCard } from "./OrderSummaryCard";
import { PaymentModal } from "./PaymentModal";
import { workOrdersApi } from "../../api/work-orders.api";
import { getStatusConfig, formatElapsed } from "../../config/status.config";
import { IconWrench, IconQr, IconDownload, IconPhone } from "../../components/ui/Icons";
import { PAYMENT_METHOD_LABELS } from "../../types/work-order";
import { PremiumModal } from "../../components/ui/PremiumModal";
import { usePremiumGate } from "../../config/features.config";

// Statuses where the floating "Presupuesto IA" header button is shown
// (diagnosing uses the inline DiagnosisPanel instead)
const AI_QUOTE_STATUSES = ["awaiting_parts", "in_progress"] as const;

// Inline icon — calendar (not in central library)
function IconCalendar({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

// Inline icon — person circle
function IconPersonCircle({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const qc     = useQueryClient();

  const [qrModal,       setQrModal]       = useState(false);
  const [aiModal,       setAiModal]       = useState(false);
  const [payModal,      setPayModal]      = useState(false);
  const [remitoLoading, setRemitoLoading] = useState(false);

  const { gate: gateAiQuote, paywallOpen: aiPaywallOpen, setPaywallOpen: setAiPaywallOpen } =
    usePremiumGate("ai_quote");

  const { data: order, isLoading, error } = useQuery({
    queryKey:        ["work-order", id],
    queryFn:         () => workOrdersApi.getById(id!),
    enabled:         !!id,
    refetchInterval: 20_000,
  });

  const { data: qrData } = useQuery({
    queryKey:  ["work-order-qr", id],
    queryFn:   () => workOrdersApi.getQrJson(id!),
    enabled:   !!id && qrModal,
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <AppShell title="Cargando…" backTo="/dashboard">
        <div className="flex flex-col gap-3 p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface-card rounded-2xl h-24 animate-pulse" />
          ))}
        </div>
      </AppShell>
    );
  }

  if (error || !order) {
    return (
      <AppShell title="Error" backTo="/dashboard">
        <div className="flex flex-col items-center gap-4 p-8 text-center">
          <span className="text-6xl">⚠️</span>
          <p className="text-red-400 font-semibold">No se pudo cargar la orden</p>
        </div>
      </AppShell>
    );
  }

  const cfg     = getStatusConfig(order.status);
  const elapsed = formatElapsed(order.received_at);

  const canDictateQuote = (AI_QUOTE_STATUSES as readonly string[]).includes(order.status);
  const isPaid          = order.payment_status === "paid";

  async function handleDownloadRemito() {
    if (!order) return;
    setRemitoLoading(true);
    try {
      const blob = await workOrdersApi.downloadRemito(order.id);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `Remito-${order.order_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setRemitoLoading(false);
    }
  }

  return (
    <AppShell
      title={order.order_number}
      backTo="/dashboard"
      footer={<ActionBar order={order} />}
      action={
        canDictateQuote ? (
          <button
            onClick={() => gateAiQuote() && setAiModal(true)}
            className="h-9 px-3 rounded-xl bg-brand/15 hover:bg-brand/25 border border-brand/30
                       text-brand font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <IconWrench className="w-3.5 h-3.5" />
            Presupuesto IA
          </button>
        ) : undefined
      }
    >
      <div className="flex flex-col pb-4">

        {/* ── Hero: plate + status badge + client ──────────────────────────── */}
        <section className={`${cfg.bgColor} border-b ${cfg.borderColor} px-4 pt-5 pb-4`}>
          {/* Plate + mileage */}
          <div className="flex items-start justify-between gap-3">
            <span className="font-plate text-slate-50 text-4xl tracking-widest leading-none">
              {order.vehicle_plate}
            </span>
            {order.mileage_in && (
              <span className="text-slate-500 text-xs font-mono mt-1.5 flex-shrink-0">
                {order.mileage_in.toLocaleString()} km
              </span>
            )}
          </div>

          {/* Vehicle */}
          <p className="text-slate-300 font-semibold text-base mt-1.5">
            {order.vehicle_brand} {order.vehicle_model}
          </p>

          {/* Status badge (glowing) + elapsed */}
          <div className="flex items-center gap-3 mt-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                          text-xs font-bold ${cfg.textColor} ${cfg.bgColor} border ${cfg.borderColor}`}
            >
              <span className={`w-2 h-2 rounded-full ${cfg.dotColor} animate-pulse`} />
              {cfg.label}
            </span>
            <span className="text-slate-500 text-xs">{elapsed} en taller</span>
          </div>

          {/* Client */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-slate-400 text-sm">{order.client_name}</span>
            {order.client_phone && (
              <a
                href={`tel:${order.client_phone}`}
                className="flex items-center gap-1 text-brand hover:text-brand-hover font-medium text-sm"
              >
                <IconPhone className="w-3.5 h-3.5" />
                {order.client_phone}
              </a>
            )}
          </div>
        </section>

        {/* ── Info pills: mechanic + delivery ──────────────────────────────── */}
        <div className="flex gap-2 px-4 pt-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-surface-card border border-surface-border
                          rounded-full px-3 py-1.5 text-xs text-slate-300">
            <IconPersonCircle className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span className="max-w-[120px] truncate">
              {order.assigned_user_name ?? "Sin asignar"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-surface-card border border-surface-border
                          rounded-full px-3 py-1.5 text-xs text-slate-300">
            <IconCalendar className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span>
              {order.estimated_delivery
                ? new Date(order.estimated_delivery).toLocaleDateString("es-AR", {
                    day: "2-digit", month: "short",
                  })
                : "Sin fecha estimada"}
            </span>
          </div>
        </div>

        {/* ── QR highlighted card ───────────────────────────────────────────── */}
        <div className="px-4 pt-2">
          <button
            onClick={() => setQrModal(true)}
            className="w-full flex items-center gap-3 bg-surface-card border border-surface-border
                       rounded-2xl px-4 py-3 hover:bg-surface-raised active:scale-[0.99]
                       transition-all group"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-700/80 border border-slate-600/60
                            flex items-center justify-center flex-shrink-0
                            group-hover:border-brand/50 group-hover:bg-brand/10 transition-colors">
              <IconQr className="w-5 h-5 text-slate-300 group-hover:text-brand transition-colors" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-slate-200">QR de seguimiento</p>
              <p className="text-[11px] text-slate-500">Mostrá al cliente para rastrear su vehículo</p>
            </div>
            <span className="text-slate-600 text-xl leading-none">›</span>
          </button>
        </div>

        {/* ── Complaint ────────────────────────────────────────────────────── */}
        <section className="mx-4 mt-3 bg-surface-card rounded-2xl p-4 border border-surface-border">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Falla reportada
          </h3>
          <p className="text-slate-200 text-base leading-relaxed">{order.complaint}</p>
        </section>

        {/* ── Diagnosis Panel (inline module, diagnosing only) ──────────────── */}
        {order.status === "diagnosing" && (
          <DiagnosisPanel
            order={order}
            onSent={() => qc.invalidateQueries({ queryKey: ["work-order", id] })}
          />
        )}

        {/* ── Diagnosis ────────────────────────────────────────────────────── */}
        {order.diagnosis && (
          <section className="mx-4 mt-3 bg-sky-950/40 rounded-2xl p-4 border border-sky-800/50">
            <h3 className="text-xs font-semibold text-sky-500 uppercase tracking-wide mb-2">
              Diagnóstico
            </h3>
            <p className="text-sky-100 text-base leading-relaxed">{order.diagnosis}</p>
          </section>
        )}

        {/* ── Internal notes ───────────────────────────────────────────────── */}
        {order.internal_notes && (
          <section className="mx-4 mt-3 bg-amber-950/30 rounded-2xl p-4 border border-amber-800/40">
            <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-2">
              Notas internas
            </h3>
            <p className="text-amber-100/80 text-sm leading-relaxed">{order.internal_notes}</p>
          </section>
        )}

        {/* ── Order summary (delivered / cancelled only) ───────────────────── */}
        {(order.status === "delivered" || order.status === "cancelled") && (
          <OrderSummaryCard workOrderId={order.id} />
        )}

        {/* ── Payment ──────────────────────────────────────────────────────── */}
        <section className="mx-4 mt-3">
          {isPaid ? (
            <div className="bg-emerald-950/40 rounded-2xl p-4 border border-emerald-800/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-900/60 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">✓</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wide">Cobrado</p>
                <p className="text-sm font-bold text-emerald-100 mt-0.5">
                  ${order.paid_amount?.toLocaleString("es-AR") ?? "—"}
                  {order.payment_method && (
                    <span className="text-emerald-400/70 font-normal ml-2">
                      · {PAYMENT_METHOD_LABELS[order.payment_method]}
                    </span>
                  )}
                </p>
                {order.payment_notes && (
                  <p className="text-xs text-emerald-400/60 mt-0.5 truncate">{order.payment_notes}</p>
                )}
              </div>
              <button
                onClick={handleDownloadRemito}
                disabled={remitoLoading}
                className="flex-shrink-0 h-9 px-3 rounded-xl bg-emerald-900/60 hover:bg-emerald-900
                           border border-emerald-700/50 text-emerald-300 text-xs font-semibold
                           flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <IconDownload className="w-3.5 h-3.5" />
                {remitoLoading ? "…" : "PDF"}
              </button>
            </div>
          ) : (
            <div className="bg-amber-950/30 rounded-2xl p-4 border border-amber-800/40 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">💰</span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide">Pago pendiente</p>
                <p className="text-xs text-amber-400/60 mt-0.5">Sin cobro registrado</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleDownloadRemito}
                  disabled={remitoLoading}
                  className="h-9 px-3 rounded-xl border border-surface-border text-slate-400
                             hover:text-slate-200 text-xs font-semibold flex items-center gap-1.5
                             transition-colors disabled:opacity-50"
                >
                  <IconDownload className="w-3.5 h-3.5" />
                  {remitoLoading ? "…" : "Remito"}
                </button>
                <button
                  onClick={() => setPayModal(true)}
                  className="h-9 px-4 rounded-xl bg-brand hover:bg-brand-hover text-white
                             text-xs font-bold transition-colors"
                >
                  Cobrar
                </button>
              </div>
            </div>
          )}
        </section>

      </div>

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      {payModal && (
        <PaymentModal order={order} onClose={() => setPayModal(false)} />
      )}

      <PremiumModal
        isOpen={aiPaywallOpen}
        onClose={() => setAiPaywallOpen(false)}
        feature="ai_quote"
      />

      {aiModal && (
        <AiQuoteModal
          workOrderId={order.id}
          complaint={order.complaint}
          onClose={() => setAiModal(false)}
          onSaved={() => {
            setAiModal(false);
            qc.invalidateQueries({ queryKey: ["work-order", id] });
          }}
        />
      )}

      {/* ── QR Modal ─────────────────────────────────────────────────────────── */}
      {qrModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setQrModal(false)}
        >
          <div
            className="bg-surface-card rounded-3xl p-6 flex flex-col items-center gap-4 w-full max-w-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-slate-100">Código QR</h2>
            <p className="text-sm text-slate-400 text-center">
              El cliente escanea este código para rastrear su vehículo
            </p>

            {qrData ? (
              <img
                src={qrData.qr_base64}
                alt={`QR para ${order.order_number}`}
                className="w-64 h-64 rounded-2xl"
              />
            ) : (
              <div className="w-64 h-64 bg-surface-raised rounded-2xl animate-pulse
                              flex items-center justify-center">
                <span className="text-slate-500 text-4xl">⬜</span>
              </div>
            )}

            {qrData && (
              <p className="text-xs text-slate-500 break-all text-center">{qrData.tracking_url}</p>
            )}

            <div className="flex flex-col gap-2 w-full">
              {qrData && (
                <a
                  href={qrData.qr_base64}
                  download={`QR-${order.order_number}.png`}
                  className="w-full h-touch flex items-center justify-center gap-2 rounded-xl
                             bg-brand text-white font-bold text-base touch-feedback"
                >
                  <IconDownload className="w-4 h-4" />
                  Descargar PNG
                </a>
              )}
              <button
                onClick={() => setQrModal(false)}
                className="w-full h-11 rounded-xl border border-surface-border text-slate-400
                           hover:text-slate-200 text-sm font-semibold transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
