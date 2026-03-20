import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "../../components/layout/AppShell";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { BigButton } from "../../components/ui/BigButton";
import { StatusTimeline } from "./StatusTimeline";
import { ActionBar } from "./ActionBar";
import { AiQuoteModal } from "./AiQuoteModal";
import { PaymentModal } from "./PaymentModal";
import { workOrdersApi } from "../../api/work-orders.api";
import { getStatusConfig, formatElapsed } from "../../config/status.config";
import { IconWrench, IconQr, IconDownload, IconPhone } from "../../components/ui/Icons";
import { PAYMENT_METHOD_LABELS } from "../../types/work-order";

// Statuses where a mechanic can dictate a quote
const AI_QUOTE_STATUSES = ["diagnosing", "awaiting_parts", "in_progress"] as const;

export function OrderDetail() {
  const { id }      = useParams<{ id: string }>();
  const qc          = useQueryClient();
  const [qrModal,      setQrModal]      = useState(false);
  const [aiModal,      setAiModal]      = useState(false);
  const [payModal,     setPayModal]     = useState(false);
  const [remitoLoading, setRemitoLoading] = useState(false);

  const { data: order, isLoading, error } = useQuery({
    queryKey:    ["work-order", id],
    queryFn:     () => workOrdersApi.getById(id!),
    enabled:     !!id,
    refetchInterval: 20_000,
  });

  const { data: qrData } = useQuery({
    queryKey: ["work-order-qr", id],
    queryFn:  () => workOrdersApi.getQrJson(id!),
    enabled:  !!id && qrModal,
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

  const cfg = getStatusConfig(order.status);
  const elapsed = formatElapsed(order.received_at);

  const canDictateQuote  = (AI_QUOTE_STATUSES as readonly string[]).includes(order.status);
  const isPaid           = order.payment_status === "paid";

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
      action={
        <div className="flex items-center gap-2">
          {canDictateQuote && (
            <button
              onClick={() => setAiModal(true)}
              className="h-9 px-3 rounded-xl bg-brand/15 hover:bg-brand/25 border border-brand/30
                         text-brand font-semibold text-xs flex items-center gap-1.5 transition-colors"
            >
              <IconWrench className="w-3.5 h-3.5" />
              Presupuesto IA
            </button>
          )}
          <BigButton size="md" variant="secondary" onClick={() => setQrModal(true)} icon={<IconQr className="w-4 h-4" />}>
            QR
          </BigButton>
        </div>
      }
    >
      <div className="flex flex-col pb-4">

        {/* ── Status Banner ── */}
        <div className={`${cfg.bgColor} border-b ${cfg.borderColor} px-4 py-4`}>
          <div className="flex items-center justify-between gap-3">
            <StatusBadge status={order.status} size="lg" />
            <span className="text-slate-400 text-sm">{elapsed} en taller</span>
          </div>
        </div>

        {/* ── Vehicle Card ── */}
        <section className="mx-4 mt-4 bg-surface-card rounded-2xl overflow-hidden border border-surface-border">
          <div className="bg-surface-raised px-4 py-3 flex items-center gap-3">
            <span className="font-plate text-slate-50 text-3xl tracking-widest">
              {order.vehicle_plate}
            </span>
            {order.mileage_in && (
              <span className="text-slate-500 text-sm ml-auto">{order.mileage_in.toLocaleString()} km</span>
            )}
          </div>
          <div className="px-4 py-3 flex flex-col gap-1">
            <p className="text-lg font-bold text-slate-200">
              {order.vehicle_brand} {order.vehicle_model}
            </p>
            <div className="flex items-center gap-2 text-sm text-slate-400 flex-wrap">
              <span>{order.client_name}</span>
              {order.client_phone && (
                <a
                  href={`tel:${order.client_phone}`}
                  className="flex items-center gap-1.5 text-brand hover:text-brand-hover font-medium"
                >
                  <IconPhone className="w-3.5 h-3.5" />
                  {order.client_phone}
                </a>
              )}
            </div>
          </div>
        </section>

        {/* ── Complaint ── */}
        <section className="mx-4 mt-3 bg-surface-card rounded-2xl p-4 border border-surface-border">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Falla reportada
          </h3>
          <p className="text-slate-200 text-base leading-relaxed">{order.complaint}</p>
        </section>

        {/* ── Diagnosis (shown if set) ── */}
        {order.diagnosis && (
          <section className="mx-4 mt-3 bg-sky-950/40 rounded-2xl p-4 border border-sky-800/50">
            <h3 className="text-xs font-semibold text-sky-500 uppercase tracking-wide mb-2">
              Diagnóstico
            </h3>
            <p className="text-sky-100 text-base leading-relaxed">{order.diagnosis}</p>
          </section>
        )}

        {/* ── Internal notes ── */}
        {order.internal_notes && (
          <section className="mx-4 mt-3 bg-amber-950/30 rounded-2xl p-4 border border-amber-800/40">
            <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-2">
              Notas internas
            </h3>
            <p className="text-amber-100/80 text-sm leading-relaxed">{order.internal_notes}</p>
          </section>
        )}

        {/* ── Payment section ── */}
        <section className="mx-4 mt-3">
          {isPaid ? (
            /* Paid — green summary card */
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
            /* Not paid — action row */
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

        {/* ── Assigned mechanic + delivery ── */}
        <section className="mx-4 mt-3 grid grid-cols-2 gap-3">
          <div className="bg-surface-card rounded-2xl p-3 border border-surface-border">
            <p className="text-xs text-slate-500 mb-1">Mecánico</p>
            <p className="text-sm font-semibold text-slate-200">
              {order.assigned_user_name ?? "—"}
            </p>
          </div>
          <div className="bg-surface-card rounded-2xl p-3 border border-surface-border">
            <p className="text-xs text-slate-500 mb-1">Entrega estimada</p>
            <p className="text-sm font-semibold text-slate-200">
              {order.estimated_delivery
                ? new Date(order.estimated_delivery).toLocaleDateString("es-CL", { day: "2-digit", month: "short" })
                : "—"}
            </p>
          </div>
        </section>

        {/* ── Timeline ── */}
        <div className="mt-4 bg-surface-card border-t border-b border-surface-border py-4">
          <StatusTimeline currentStatus={order.status} />
        </div>

        {/* ── Action bar ── */}
        <ActionBar order={order} />
      </div>

      {/* ── Payment Modal ── */}
      {payModal && (
        <PaymentModal
          order={order}
          onClose={() => setPayModal(false)}
        />
      )}

      {/* ── AI Quote Modal ── */}
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

      {/* ── QR Modal ── */}
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
              El cliente puede escanear este código para rastrear su vehículo
            </p>

            {qrData ? (
              <img
                src={qrData.qr_base64}
                alt={`QR para ${order.order_number}`}
                className="w-64 h-64 rounded-2xl"
              />
            ) : (
              <div className="w-64 h-64 bg-surface-raised rounded-2xl animate-pulse flex items-center justify-center">
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
              <BigButton variant="ghost" size="md" fullWidth onClick={() => setQrModal(false)}>
                Cerrar
              </BigButton>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
