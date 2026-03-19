import { useState } from "react";
import { NewOrderFormState } from "../../types/work-order";
import { MetalField } from "../../components/ui/MetalField";
import { BigButton } from "../../components/ui/BigButton";

interface Props {
  form: NewOrderFormState;
  onChange: (patch: Partial<NewOrderFormState>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step2Client({ form, onChange, onNext, onBack }: Props) {
  const [errors, setErrors] = useState<Partial<Record<keyof NewOrderFormState, string>>>({});

  // vehicle_id is set when the vehicle was found in the DB (Step1 lookup)
  const fromDB = !!form.vehicle_id;

  const validate = () => {
    const e: typeof errors = {};
    if (!form.client_name.trim())  e.client_name  = "Ingresa el nombre del cliente";
    if (!form.client_phone.trim()) e.client_phone = "El teléfono es necesario para WhatsApp";
    else if (!/^\+?[\d\s\-()]{7,20}$/.test(form.client_phone)) {
      e.client_phone = "Formato inválido · ej: +5491123456789";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div className="flex flex-col gap-5 p-4 pb-8 animate-slide-up">

      {/* ── Vehicle context chip ──────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl"
        style={{
          background: "linear-gradient(135deg, #1C2535, #111827)",
          border: fromDB
            ? "1px solid rgba(34,197,94,0.25)"
            : "1px solid rgba(55,65,81,0.5)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        <span
          className="font-mono font-black text-xl tracking-[0.15em] flex-shrink-0"
          style={{
            color: fromDB ? "#4ADE80" : "#F97316",
            textShadow: fromDB
              ? "0 0 16px rgba(74,222,128,0.35)"
              : "0 0 12px rgba(249,115,22,0.3)",
          }}
        >
          {form.license_plate || "---"}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-slate-300 text-sm font-semibold truncate">
            {form.brand} {form.model}{form.year ? ` ${form.year}` : ""}
          </p>
          {fromDB && (
            <p className="text-green-400/70 text-xs font-medium">
              Vehículo registrado en el taller
            </p>
          )}
        </div>
      </div>

      {/* ── Detected client banner ───────────────────────────────────────── */}
      {fromDB && (
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-xl animate-fade-in"
          style={{
            background: "rgba(34,197,94,0.06)",
            border: "1px solid rgba(34,197,94,0.2)",
          }}
        >
          <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)" }}>
            <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p className="text-green-300 text-xs font-semibold">Cliente asociado detectado</p>
            <p className="text-green-400/60 text-xs mt-0.5">
              Datos pre-cargados desde el historial del taller. Podés editar si cambiaron.
            </p>
          </div>
        </div>
      )}

      {/* ── Client fields ────────────────────────────────────────────────── */}
      <MetalField
        label="Nombre del cliente *"
        value={form.client_name}
        onChange={(v) => onChange({ client_name: v })}
        placeholder="Juan Pérez"
        autoFocus={!fromDB}
        autoCapitalize="words"
        error={errors.client_name}
        validated={fromDB && !!form.client_name}
        icon={
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        }
      />

      <MetalField
        label="Teléfono (WhatsApp) *"
        value={form.client_phone}
        onChange={(v) => onChange({ client_phone: v })}
        placeholder="+549 11 2345-6789"
        type="tel"
        inputMode="tel"
        error={errors.client_phone}
        validated={fromDB && !!form.client_phone}
        icon={
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        }
        hint={
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
            Se usa para notificaciones automáticas por WhatsApp
          </span>
        }
      />

      <MetalField
        label="Email (opcional)"
        value={form.client_email}
        onChange={(v) => onChange({ client_email: v })}
        placeholder="juan@mail.com"
        type="email"
        inputMode="email"
        autoCapitalize="none"
        validated={fromDB && !!form.client_email}
        icon={
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        }
      />

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 pt-1">
        <button
          type="button"
          onClick={() => { if (validate()) onNext(); }}
          className="w-full h-cta rounded-2xl font-bold text-lg text-white transition-all duration-150 active:scale-[0.97] touch-feedback flex items-center justify-center gap-3 relative overflow-hidden select-none"
          style={{
            background: "linear-gradient(135deg, #F97316 0%, #FB923C 50%, #EA580C 100%)",
            boxShadow: "0 4px 24px rgba(249,115,22,0.4), 0 1px 0 rgba(255,255,255,0.12) inset, 0 -2px 0 rgba(0,0,0,0.2) inset",
          }}
        >
          <span>Siguiente: Problema</span>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>

        <BigButton variant="ghost" size="md" fullWidth onClick={onBack}>
          ← Volver
        </BigButton>
      </div>
    </div>
  );
}
