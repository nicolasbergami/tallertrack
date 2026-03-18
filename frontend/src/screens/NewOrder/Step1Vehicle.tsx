import { useState } from "react";
import { NewOrderFormState } from "../../types/work-order";
import { InputField } from "../../components/ui/Field";
import { BigButton } from "../../components/ui/BigButton";

interface Props {
  form: NewOrderFormState;
  onChange: (patch: Partial<NewOrderFormState>) => void;
  onNext: () => void;
}

const COLORS = ["Blanco", "Negro", "Gris", "Rojo", "Azul", "Verde", "Amarillo", "Otro"];

export function Step1Vehicle({ form, onChange, onNext }: Props) {
  const [errors, setErrors] = useState<Partial<Record<keyof NewOrderFormState, string>>>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!form.license_plate.trim()) e.license_plate = "Ingresa la patente";
    if (!form.brand.trim())         e.brand          = "Ingresa la marca";
    if (!form.model.trim())         e.model          = "Ingresa el modelo";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  // Format plate as user types: remove spaces, uppercase
  const handlePlate = (v: string) => {
    onChange({ license_plate: v.replace(/\s/g, "").toUpperCase().slice(0, 8) });
  };

  return (
    <div className="flex flex-col gap-6 p-4 animate-slide-up">

      {/* Plate — biggest input, most important field */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
          Patente *
        </label>
        <input
          type="text"
          value={form.license_plate}
          onChange={(e) => handlePlate(e.target.value)}
          placeholder="ABCD12"
          maxLength={8}
          inputMode="text"
          autoCapitalize="characters"
          autoFocus
          className={`
            w-full h-20 bg-surface-card border-2 rounded-2xl
            text-center font-plate text-slate-50 placeholder-slate-600
            focus:outline-none focus:ring-4 focus:ring-brand focus:border-transparent
            transition-colors text-4xl tracking-[0.2em]
            ${errors.license_plate ? "border-red-500" : "border-surface-border"}
          `}
        />
        {errors.license_plate && (
          <p className="text-xs text-red-400 font-medium">{errors.license_plate}</p>
        )}
        <p className="text-xs text-slate-500">Escribe sin guión ni espacios · ej: ABCD12</p>
      </div>

      {/* Brand + Model */}
      <div className="grid grid-cols-2 gap-3">
        <InputField
          label="Marca *"
          value={form.brand}
          onChange={(e) => onChange({ brand: e.target.value })}
          placeholder="Toyota"
          error={errors.brand}
        />
        <InputField
          label="Modelo *"
          value={form.model}
          onChange={(e) => onChange({ model: e.target.value })}
          placeholder="Corolla"
          error={errors.model}
        />
      </div>

      {/* Year + Mileage */}
      <div className="grid grid-cols-2 gap-3">
        <InputField
          label="Año"
          type="number"
          value={form.year}
          onChange={(e) => onChange({ year: e.target.value })}
          placeholder="2019"
          inputMode="numeric"
          min={1950}
          max={new Date().getFullYear() + 1}
        />
        <InputField
          label="Kilometraje"
          type="number"
          value={form.mileage_in}
          onChange={(e) => onChange({ mileage_in: e.target.value })}
          placeholder="85000"
          inputMode="numeric"
          icon={<span className="text-base">km</span>}
        />
      </div>

      {/* Color chips */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Color</label>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ color: c })}
              className={`
                px-4 py-2 rounded-xl text-sm font-semibold transition-all touch-feedback
                ${form.color === c
                  ? "bg-brand text-white ring-2 ring-brand ring-offset-1 ring-offset-surface"
                  : "bg-surface-raised text-slate-300 hover:bg-surface-border"
                }
              `}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Next button */}
      <BigButton
        variant="primary"
        size="xl"
        fullWidth
        onClick={handleNext}
        icon={<span>→</span>}
      >
        Siguiente: Cliente
      </BigButton>
    </div>
  );
}
