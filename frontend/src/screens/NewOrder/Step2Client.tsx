import { useState } from "react";
import { NewOrderFormState } from "../../types/work-order";
import { InputField } from "../../components/ui/Field";
import { BigButton } from "../../components/ui/BigButton";

interface Props {
  form: NewOrderFormState;
  onChange: (patch: Partial<NewOrderFormState>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step2Client({ form, onChange, onNext, onBack }: Props) {
  const [errors, setErrors] = useState<Partial<Record<keyof NewOrderFormState, string>>>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!form.client_name.trim())  e.client_name  = "Ingresa el nombre del cliente";
    if (!form.client_phone.trim()) e.client_phone = "El teléfono es necesario para WhatsApp";
    else if (!/^\+?[\d\s\-()]{7,15}$/.test(form.client_phone)) {
      e.client_phone = "Formato inválido · ej: +56912345678";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div className="flex flex-col gap-6 p-4 animate-slide-up">

      {/* Context reminder */}
      <div className="bg-surface-raised rounded-2xl px-4 py-3 flex items-center gap-3">
        <span className="font-plate text-brand text-xl">{form.license_plate || "---"}</span>
        <span className="text-slate-400 text-sm">{form.brand} {form.model}</span>
      </div>

      <InputField
        label="Nombre del cliente *"
        value={form.client_name}
        onChange={(e) => onChange({ client_name: e.target.value })}
        placeholder="Juan Pérez"
        autoFocus
        autoCapitalize="words"
        error={errors.client_name}
        icon="👤"
      />

      <div className="flex flex-col gap-1.5">
        <InputField
          label="Teléfono (WhatsApp) *"
          type="tel"
          value={form.client_phone}
          onChange={(e) => onChange({ client_phone: e.target.value })}
          placeholder="+56 9 1234 5678"
          inputMode="tel"
          error={errors.client_phone}
          icon="📱"
        />
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <span className="text-green-400">●</span>
          Se usará para enviar notificaciones automáticas por WhatsApp
        </p>
      </div>

      <InputField
        label="Email (opcional)"
        type="email"
        value={form.client_email}
        onChange={(e) => onChange({ client_email: e.target.value })}
        placeholder="juan@mail.com"
        inputMode="email"
        autoCapitalize="none"
        icon="✉️"
      />

      {/* Action buttons */}
      <div className="flex flex-col gap-3 pt-2">
        <BigButton
          variant="primary"
          size="xl"
          fullWidth
          onClick={() => validate() && onNext()}
          icon={<span>→</span>}
        >
          Siguiente: Problema
        </BigButton>
        <BigButton variant="ghost" size="md" fullWidth onClick={onBack}>
          ← Volver
        </BigButton>
      </div>
    </div>
  );
}
