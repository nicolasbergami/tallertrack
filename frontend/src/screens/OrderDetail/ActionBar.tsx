import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { WorkOrderDetail, WorkOrderStatus } from "../../types/work-order";
import { BigButton } from "../../components/ui/BigButton";
import { TextareaField } from "../../components/ui/Field";
import { STATUS_CONFIG, NEXT_STATES, CANCELLABLE } from "../../config/status.config";
import { workOrdersApi } from "../../api/work-orders.api";

interface Props {
  order: WorkOrderDetail;
}

export function ActionBar({ order }: Props) {
  const queryClient = useQueryClient();
  const [showCancel, setShowCancel] = useState(false);
  const [diagnosis,  setDiagnosis]  = useState(order.diagnosis ?? "");
  const [notes,      setNotes]      = useState("");
  const [mileageOut, setMileageOut] = useState("");
  const [showDiagnosisInput, setShowDiagnosisInput] = useState(false);

  const nextStates  = NEXT_STATES[order.status] ?? [];
  const canCancel   = CANCELLABLE.includes(order.status);
  const isTerminal  = nextStates.length === 0 && !canCancel;

  const transitionMutation = useMutation({
    mutationFn: (newStatus: WorkOrderStatus) =>
      workOrdersApi.transition(order.id, {
        status:         newStatus,
        diagnosis:      diagnosis || undefined,
        internal_notes: notes     || undefined,
        mileage_out:    mileageOut ? parseInt(mileageOut, 10) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-order", order.id] });
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      setShowDiagnosisInput(false);
      setNotes("");
    },
  });

  const whatsappUrl = order.client_phone
    ? `https://wa.me/${order.client_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Hola ${order.client_name}, te contactamos sobre tu vehículo ${order.vehicle_plate} (OT ${order.order_number}).`
      )}`
    : null;

  if (isTerminal) {
    return (
      <div className="px-4 py-4 border-t border-surface-border">
        <div className="bg-surface-raised rounded-2xl p-4 text-center">
          <p className="text-slate-400 text-sm">
            {order.status === "delivered" ? "✅ Orden finalizada y entregada" : "Orden en estado terminal"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-surface-border bg-surface-card">

      {/* Optional diagnosis/notes input panel */}
      {showDiagnosisInput && (
        <div className="p-4 border-b border-surface-border bg-surface flex flex-col gap-3 animate-slide-up">
          {(order.status === "diagnosing" || !order.diagnosis) && (
            <TextareaField
              label="Diagnóstico"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Ej: Pastillas de freno desgastadas al 100%…"
              rows={2}
            />
          )}
          <TextareaField
            label="Nota interna (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observaciones para el equipo…"
            rows={2}
          />
          {order.status === "quality_control" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                Odómetro de salida (km)
              </label>
              <input
                type="number"
                value={mileageOut}
                onChange={(e) => setMileageOut(e.target.value)}
                placeholder={String(order.mileage_in ?? "")}
                inputMode="numeric"
                className="w-full h-touch bg-surface-card border border-surface-border rounded-xl
                           px-4 text-lg text-slate-100 placeholder-slate-500
                           focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {transitionMutation.error && (
        <div className="mx-4 mt-3 bg-red-950/60 border border-red-800 rounded-xl p-3">
          <p className="text-red-300 text-sm font-semibold">
            ⚠️ {(transitionMutation.error as Error).message}
          </p>
        </div>
      )}

      <div className="p-4 flex flex-col gap-3">

        {/* Primary next-state buttons — one per valid next state */}
        {nextStates.map((nextStatus) => {
          const cfg = STATUS_CONFIG[nextStatus];
          const isForward = nextStatus !== "in_progress"; // QC → in_progress is backwards

          return (
            <BigButton
              key={nextStatus}
              variant="primary"
              size="xl"
              fullWidth
              loading={transitionMutation.isPending && !transitionMutation.isError}
              onClick={() => {
                if (!showDiagnosisInput && (order.status === "diagnosing" || order.status === "quality_control")) {
                  setShowDiagnosisInput(true);
                } else {
                  transitionMutation.mutate(nextStatus);
                }
              }}
              icon={<span>{isForward ? cfg.emoji : "↩️"}</span>}
            >
              {isForward
                ? `Pasar a: ${cfg.label}`
                : `Volver a reparación`}
            </BigButton>
          );
        })}

        {/* WhatsApp + Cancel row */}
        <div className="flex gap-3">
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`
                flex-1 h-touch flex items-center justify-center gap-2 rounded-xl
                bg-green-800 hover:bg-green-700 text-white font-bold text-base
                transition-all touch-feedback
              `}
            >
              <span className="text-xl">💬</span> WhatsApp
            </a>
          )}

          {canCancel && !showCancel && (
            <button
              onClick={() => setShowCancel(true)}
              className="h-touch px-4 rounded-xl bg-surface-raised text-red-400 text-sm font-semibold
                         hover:bg-red-950/60 transition-all touch-feedback flex-shrink-0"
            >
              Cancelar OT
            </button>
          )}
        </div>

        {/* Cancel confirmation */}
        {showCancel && (
          <div className="bg-red-950/60 border border-red-800 rounded-2xl p-4 flex flex-col gap-3 animate-slide-up">
            <p className="text-red-300 font-semibold">
              ¿Confirmar cancelación de la orden?
            </p>
            <p className="text-red-400/70 text-sm">
              Esta acción quedará registrada en el historial.
            </p>
            <div className="flex gap-3">
              <BigButton
                variant="danger"
                size="md"
                fullWidth
                loading={transitionMutation.isPending}
                onClick={() => transitionMutation.mutate("cancelled")}
              >
                Sí, cancelar
              </BigButton>
              <BigButton variant="ghost" size="md" onClick={() => setShowCancel(false)}>
                No
              </BigButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
