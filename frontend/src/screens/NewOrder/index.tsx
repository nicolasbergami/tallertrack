import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "../../components/layout/AppShell";
import { StepIndicator } from "../../components/ui/StepIndicator";
import { Step1Vehicle } from "./Step1Vehicle";
import { Step2Client }  from "./Step2Client";
import { Step3Problem } from "./Step3Problem";
import { workOrdersApi } from "../../api/work-orders.api";
import { NewOrderFormState, EMPTY_FORM } from "../../types/work-order";

const STEPS = ["Vehículo", "Cliente", "Problema"];

export function NewOrder() {
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<NewOrderFormState>(EMPTY_FORM);

  const patch = (p: Partial<NewOrderFormState>) => setForm((f) => ({ ...f, ...p }));

  const createMutation = useMutation({
    mutationFn: () =>
      workOrdersApi.create({
        // In a real app these UUIDs come from vehicle/client lookup or creation
        vehicle_id: form.vehicle_id ?? "00000000-0000-0000-0000-000000000001",
        client_id:  form.client_id  ?? "00000000-0000-0000-0000-000000000002",
        complaint:  form.complaint,
        mileage_in: form.mileage_in ? parseInt(form.mileage_in, 10) : undefined,
        internal_notes: form.internal_notes || undefined,
      }),
    onSuccess: (newOrder) => {
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      navigate(`/orders/${newOrder.id}`, { replace: true });
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
    </AppShell>
  );
}
