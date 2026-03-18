import { useState } from "react";
import { NewOrderFormState } from "../../types/work-order";
import { TextareaField, InputField } from "../../components/ui/Field";
import { BigButton } from "../../components/ui/BigButton";

interface Props {
  form: NewOrderFormState;
  onChange: (patch: Partial<NewOrderFormState>) => void;
  onSubmit: () => void;
  onBack: () => void;
  loading: boolean;
}

const URGENCY_OPTIONS: { value: NewOrderFormState["urgency"]; label: string; desc: string; color: string }[] = [
  { value: "normal",   label: "Normal",   desc: "Sin prisa específica",      color: "border-surface-border text-slate-300" },
  { value: "urgent",   label: "Urgente",  desc: "Necesita salir hoy",        color: "border-amber-600 text-amber-300"      },
  { value: "critical", label: "Crítico",  desc: "Vehículo varado, prioridad", color: "border-red-600 text-red-300"          },
];

const QUICK_COMPLAINTS = [
  "Frenos",
  "No enciende",
  "Ruido motor",
  "Aceite",
  "Batería",
  "Revisión general",
  "Transmisión",
  "Suspensión",
];

export function Step3Problem({ form, onChange, onSubmit, onBack, loading }: Props) {
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!form.complaint.trim() || form.complaint.length < 5) {
      e.complaint = "Describe el problema con al menos 5 caracteres";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const appendComplaint = (text: string) => {
    const sep = form.complaint.trim() ? ", " : "";
    onChange({ complaint: form.complaint + sep + text });
  };

  return (
    <div className="flex flex-col gap-6 p-4 animate-slide-up">

      {/* Summary header */}
      <div className="bg-surface-raised rounded-2xl px-4 py-3 flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span className="font-plate text-brand text-xl">{form.license_plate}</span>
          <span className="text-slate-300">{form.brand} {form.model}</span>
        </div>
        <span className="text-slate-400 text-sm">{form.client_name} · {form.client_phone}</span>
      </div>

      {/* Urgency selector */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
          Urgencia
        </label>
        <div className="grid grid-cols-3 gap-2">
          {URGENCY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ urgency: opt.value })}
              className={`
                flex flex-col items-center gap-1 p-3 rounded-xl border-2
                text-center transition-all touch-feedback
                ${form.urgency === opt.value
                  ? `${opt.color} bg-surface-raised ring-2 ring-offset-1 ring-offset-surface ${opt.color.includes("red") ? "ring-red-600" : opt.color.includes("amber") ? "ring-amber-600" : "ring-brand"}`
                  : "border-surface-border text-slate-500 hover:border-surface-raised"
                }
              `}
            >
              <span className="font-bold text-sm">{opt.label}</span>
              <span className="text-xs leading-tight">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick complaint chips */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
          Falla rápida
        </label>
        <div className="flex flex-wrap gap-2">
          {QUICK_COMPLAINTS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => appendComplaint(c)}
              className="px-3 py-1.5 rounded-xl bg-surface-raised text-slate-300 text-sm
                         hover:bg-surface-border active:scale-95 transition-all touch-feedback"
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Complaint textarea */}
      <TextareaField
        label="Descripción del problema *"
        value={form.complaint}
        onChange={(e) => onChange({ complaint: e.target.value })}
        placeholder="Ej: El cliente reporta ruido metálico al frenar y vibración en el volante a partir de 80 km/h..."
        rows={4}
        error={errors.complaint}
        hint="Sé específico: ayuda al mecánico asignado a prepararse"
      />

      {/* Assigned mechanic */}
      <InputField
        label="Mecánico asignado (opcional)"
        value={form.assigned_to}
        onChange={(e) => onChange({ assigned_to: e.target.value })}
        placeholder="Nombre del mecánico"
        icon="🔧"
      />

      {/* Internal notes */}
      <TextareaField
        label="Notas internas (no visible al cliente)"
        value={form.internal_notes}
        onChange={(e) => onChange({ internal_notes: e.target.value })}
        placeholder="Código de cliente VIP, observaciones de recepción..."
        rows={2}
      />

      {/* Action buttons */}
      <div className="flex flex-col gap-3 pb-4">
        <BigButton
          variant="primary"
          size="xl"
          fullWidth
          onClick={() => validate() && onSubmit()}
          loading={loading}
          icon={<span>✓</span>}
        >
          {loading ? "Creando orden…" : "Crear orden de trabajo"}
        </BigButton>
        <BigButton variant="ghost" size="md" fullWidth onClick={onBack} disabled={loading}>
          ← Volver
        </BigButton>
      </div>
    </div>
  );
}
