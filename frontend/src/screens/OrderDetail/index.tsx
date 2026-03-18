import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "../../components/layout/AppShell";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { BigButton } from "../../components/ui/BigButton";
import { StatusTimeline } from "./StatusTimeline";
import { ActionBar } from "./ActionBar";
import { workOrdersApi } from "../../api/work-orders.api";
import { getStatusConfig, formatElapsed } from "../../config/status.config";

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [qrModal, setQrModal] = useState(false);

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
      <AppShell title="Cargando…" backTo="/">
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
      <AppShell title="Error" backTo="/">
        <div className="flex flex-col items-center gap-4 p-8 text-center">
          <span className="text-6xl">⚠️</span>
          <p className="text-red-400 font-semibold">No se pudo cargar la orden</p>
        </div>
      </AppShell>
    );
  }

  const cfg = getStatusConfig(order.status);
  const elapsed = formatElapsed(order.received_at);

  return (
    <AppShell
      title={order.order_number}
      backTo="/"
      action={
        <BigButton size="md" variant="secondary" onClick={() => setQrModal(true)} icon={<span>⬜</span>}>
          QR
        </BigButton>
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
              <span>👤 {order.client_name}</span>
              {order.client_phone && (
                <a
                  href={`tel:${order.client_phone}`}
                  className="flex items-center gap-1 text-brand hover:text-brand-hover font-medium"
                >
                  📞 {order.client_phone}
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
              🔍 Diagnóstico
            </h3>
            <p className="text-sky-100 text-base leading-relaxed">{order.diagnosis}</p>
          </section>
        )}

        {/* ── Internal notes ── */}
        {order.internal_notes && (
          <section className="mx-4 mt-3 bg-amber-950/30 rounded-2xl p-4 border border-amber-800/40">
            <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-2">
              🔒 Notas internas
            </h3>
            <p className="text-amber-100/80 text-sm leading-relaxed">{order.internal_notes}</p>
          </section>
        )}

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
                  ⬇️ Descargar PNG
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
