import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "../../components/layout/AppShell";
import { StepIndicator } from "../../components/ui/StepIndicator";
import { Step1Vehicle } from "./Step1Vehicle";
import { Step2Client }  from "./Step2Client";
import { Step3Problem } from "./Step3Problem";
import { workOrdersApi } from "../../api/work-orders.api";
import { aiApi, DeliveryPrediction } from "../../api/ai.api";
import { NewOrderFormState, EMPTY_FORM } from "../../types/work-order";

const STEPS = ["Vehículo", "Cliente", "Problema"];

const CONFIDENCE_LABEL = {
  high:   { text: "Alta",  color: "text-green-400" },
  medium: { text: "Media", color: "text-amber-400" },
  low:    { text: "Baja",  color: "text-slate-500" },
};

export function NewOrder() {
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();
  const [step,         setStep]       = useState(0);
  const [form,         setForm]       = useState<NewOrderFormState>(EMPTY_FORM);
  const [newOrderId,   setNewOrderId] = useState<string | null>(null);
  const [prediction,   setPrediction] = useState<DeliveryPrediction | null>(null);
  const [predLoading,  setPredLoading] = useState(false);

  const patch = (p: Partial<NewOrderFormState>) => setForm((f) => ({ ...f, ...p }));

  const createMutation = useMutation({
    mutationFn: () =>
      workOrdersApi.create({
        vehicle_data: {
          license_plate: form.license_plate,
          brand:  form.brand,
          model:  form.model,
          year:   form.year   ? parseInt(form.year, 10)      : undefined,
          color:  form.color  || undefined,
        },
        client_data: {
          full_name: form.client_name,
          phone:     form.client_phone,
          email:     form.client_email || undefined,
        },
        complaint:      form.complaint,
        mileage_in:     form.mileage_in ? parseInt(form.mileage_in, 10) : undefined,
        internal_notes: form.internal_notes || undefined,
      }),
    onSuccess: async (newOrder) => {
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      setNewOrderId(newOrder.id);
      setStep(3); // success step

      // Fire AI delivery prediction (non-blocking)
      setPredLoading(true);
      try {
        const pred = await aiApi.predictDelivery({
          complaint:     form.complaint,
          vehicle_brand: form.brand,
          vehicle_model: form.model,
        });
        setPrediction(pred);
      } catch {
        // Prediction failure is non-critical — just skip it
      } finally {
        setPredLoading(false);
      }
    },
  });

  return (
    <AppShell title="Nueva orden" backTo="/">

      {/* Step indicator — sticky below header */}
      <div className="sticky top-[3.75rem] z-30 bg-surface/95 backdrop-blur
                      border-b border-surface-border px-6 py-4">
        <StepIndicator steps={STEPS} current={step} />
      </div>

      {/* Error banner */}
      {createMutation.error && (
        <div className="mx-4 mt-4 bg-red-950/60 border border-red-800 rounded-xl p-3">
          <p className="text-red-300 text-sm font-semibold">
            ⚠️ {(createMutation.error as Error).message}
          </p>
        </div>
      )}

      {/* Step content */}
      {step === 0 && (
        <Step1Vehicle form={form} onChange={patch} onNext={() => setStep(1)} />
      )}
      {step === 1 && (
        <Step2Client form={form} onChange={patch}
          onNext={() => setStep(2)} onBack={() => setStep(0)}
        />
      )}
      {step === 2 && (
        <Step3Problem
          form={form}
          onChange={patch}
          onSubmit={() => createMutation.mutate()}
          onBack={() => setStep(1)}
          loading={createMutation.isPending}
        />
      )}

      {/* Success + AI Prediction */}
      {step === 3 && (
        <div className="flex flex-col gap-4 p-4 animate-slide-up">

          {/* Success card */}
          <div className="bg-green-950/40 border border-green-800/40 rounded-2xl px-4 py-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-900/60 border border-green-700/50
                            flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-green-300 font-bold text-base">Orden creada correctamente</p>
              <p className="text-green-600 text-sm">{form.license_plate} — {form.client_name}</p>
            </div>
          </div>

          {/* AI Prediction card */}
          <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-border flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-brand/20 flex items-center justify-center">
                <svg className="w-3 h-3 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                Predicción IA de entrega
              </span>
            </div>

            {predLoading && (
              <div className="flex items-center gap-3 px-4 py-5">
                <svg className="animate-spin w-5 h-5 text-brand flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <p className="text-slate-400 text-sm">Analizando historial del taller…</p>
              </div>
            )}

            {!predLoading && prediction && (
              <div className="px-4 py-4 flex flex-col gap-3">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-black text-slate-100 tabular-nums">
                    {prediction.estimated_days}
                  </span>
                  <span className="text-slate-400 text-sm">
                    día{prediction.estimated_days !== 1 ? "s" : ""} hábiles
                  </span>
                  <span className="ml-auto text-sm text-slate-300 font-semibold">
                    {new Date(prediction.estimated_date + "T12:00:00").toLocaleDateString("es-CL", {
                      weekday: "short", day: "numeric", month: "short"
                    })}
                  </span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{prediction.reasoning}</p>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-slate-600">
                    Basado en {prediction.similar_orders_analyzed} órdenes previas
                  </span>
                  <span className={`font-semibold ${CONFIDENCE_LABEL[prediction.confidence].color}`}>
                    Confianza {CONFIDENCE_LABEL[prediction.confidence].text}
                  </span>
                </div>
              </div>
            )}

            {!predLoading && !prediction && (
              <div className="px-4 py-4">
                <p className="text-slate-500 text-sm">
                  Sin historial suficiente para predecir. La predicción mejorará con el tiempo.
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate(`/orders/${newOrderId}`, { replace: true })}
            className="h-14 rounded-xl bg-brand hover:bg-brand-hover text-white
                       font-bold text-base transition-colors active:scale-95"
          >
            Ver orden →
          </button>
        </div>
      )}
    </AppShell>
  );
}
