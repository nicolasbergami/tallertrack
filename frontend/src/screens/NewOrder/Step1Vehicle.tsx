import { ReactNode, useState } from "react";
import { NewOrderFormState } from "../../types/work-order";

interface Props {
  form: NewOrderFormState;
  onChange: (patch: Partial<NewOrderFormState>) => void;
  onNext: () => void;
}

// Color palette — name, real hex, and poetry label
const COLORS = [
  { name: "Blanco",   hex: "#F1F5F9", label: "Blanco Glaciar" },
  { name: "Negro",    hex: "#111827", label: "Negro Profundo" },
  { name: "Gris",     hex: "#6B7280", label: "Gris Titanio"  },
  { name: "Rojo",     hex: "#DC2626", label: "Rojo Ferrari"  },
  { name: "Azul",     hex: "#2563EB", label: "Azul Zafiro"   },
  { name: "Verde",    hex: "#16A34A", label: "Verde Bosque"  },
  { name: "Amarillo", hex: "#EAB308", label: "Amarillo Solar" },
  { name: "Otro",     hex: null,      label: "Otro"          },
] as const;

// Simulated vehicle database for plate lookup
const MOCK_VEHICLES = [
  { brand: "Toyota",     model: "Corolla",  year: "2020" },
  { brand: "Volkswagen", model: "Gol",      year: "2019" },
  { brand: "Renault",    model: "Sandero",  year: "2021" },
  { brand: "Ford",       model: "Focus",    year: "2018" },
  { brand: "Chevrolet",  model: "Cruze",    year: "2022" },
  { brand: "Peugeot",    model: "208",      year: "2020" },
  { brand: "Honda",      model: "Civic",    year: "2019" },
  { brand: "Fiat",       model: "Cronos",   year: "2021" },
];

// ── Main Component ────────────────────────────────────────────────────────────

export function Step1Vehicle({ form, onChange, onNext }: Props) {
  const [errors, setErrors]         = useState<Partial<Record<keyof NewOrderFormState, string>>>({});
  const [plateFocused, setPlateFocused] = useState(false);
  const [searching, setSearching]   = useState(false);
  const [validated, setValidated]   = useState(false);

  const validate = () => {
    const e: typeof errors = {};
    if (!form.license_plate.trim()) e.license_plate = "Ingresa la patente";
    if (!form.brand.trim())         e.brand          = "Ingresa la marca";
    if (!form.model.trim())         e.model          = "Ingresa el modelo";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePlate = (v: string) => {
    onChange({ license_plate: v.replace(/\s/g, "").toUpperCase().slice(0, 8) });
    setValidated(false);
  };

  const searchPlate = async () => {
    if (!form.license_plate.trim() || searching) return;
    setSearching(true);
    await new Promise((r) => setTimeout(r, 1400));
    const mock = MOCK_VEHICLES[Math.floor(Math.random() * MOCK_VEHICLES.length)];
    onChange({ brand: mock.brand, model: mock.model, year: mock.year });
    setValidated(true);
    setSearching(false);
  };

  return (
    <div className="flex flex-col gap-6 p-4 pb-8 animate-slide-up">

      {/* ── PLATE ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Patente *
        </label>

        {/* Outer metallic frame */}
        <div
          style={{
            background: "linear-gradient(145deg, #4B5563 0%, #374151 30%, #1F2937 60%, #4B5563 100%)",
            borderRadius: "1rem",
            padding: "3px",
            boxShadow: "0 6px 28px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          {/* Inner plate surface */}
          <div
            className="relative overflow-hidden"
            style={{
              borderRadius: "calc(1rem - 3px)",
              background: "linear-gradient(180deg, #1C2535 0%, #0F1927 100%)",
            }}
          >
            {/* Laser scan animation — shows on focus */}
            {plateFocused && (
              <div
                className="absolute inset-0 pointer-events-none overflow-hidden"
                style={{ borderRadius: "inherit" }}
              >
                <div
                  className="absolute top-0 bottom-0 animate-laser-scan"
                  style={{
                    width: "80px",
                    background: "linear-gradient(90deg, transparent, rgba(249,115,22,0.55), transparent)",
                    filter: "blur(6px)",
                  }}
                />
              </div>
            )}

            {/* Corner screw details */}
            {(["top-2 left-3","top-2 right-3","bottom-2 left-3","bottom-2 right-3"] as const).map((pos) => (
              <div
                key={pos}
                className={`absolute ${pos} w-2 h-2 rounded-full opacity-15`}
                style={{ background: "radial-gradient(circle at 35% 35%, #9CA3AF, #374151)" }}
              />
            ))}

            {/* Plate input */}
            <input
              type="text"
              value={form.license_plate}
              onChange={(e) => handlePlate(e.target.value)}
              onFocus={() => setPlateFocused(true)}
              onBlur={() => setPlateFocused(false)}
              placeholder="ABCD12"
              maxLength={8}
              inputMode="text"
              autoCapitalize="characters"
              autoFocus
              className="w-full h-24 bg-transparent border-0 text-center focus:outline-none focus:ring-0 relative z-10 transition-all duration-300 tracking-[0.25em] placeholder-slate-700"
              style={{
                fontSize: "2.75rem",
                fontWeight: 900,
                color: errors.license_plate
                  ? "#F87171"
                  : plateFocused
                    ? "#F97316"
                    : "#F1F5F9",
                textShadow: plateFocused
                  ? "0 0 24px rgba(249,115,22,0.5), 0 2px 8px rgba(0,0,0,0.6)"
                  : "0 2px 8px rgba(0,0,0,0.5)",
              }}
            />
          </div>
        </div>

        {errors.license_plate && (
          <p className="text-xs text-red-400 font-medium">{errors.license_plate}</p>
        )}

        {/* Helper text + search button */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">Sin guión · ej: ABCD12 · ABC123</p>

          <button
            type="button"
            onClick={searchPlate}
            disabled={searching || !form.license_plate.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 disabled:opacity-40 active:scale-95"
            style={{
              background: validated ? "rgba(34,197,94,0.08)"   : "rgba(249,115,22,0.08)",
              border:     validated ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(249,115,22,0.22)",
              color:      validated ? "#4ADE80" : "#F97316",
            }}
          >
            {searching ? (
              <>
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Buscando…
              </>
            ) : validated ? (
              <>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Validado
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Buscar en base
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── BRAND + MODEL ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <MetalField
          label="Marca *"
          value={form.brand}
          onChange={(v) => onChange({ brand: v })}
          placeholder="Toyota"
          error={errors.brand}
          validated={validated && !!form.brand}
          icon={
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h6a2 2 0 004 0z" />
            </svg>
          }
        />
        <MetalField
          label="Modelo *"
          value={form.model}
          onChange={(v) => onChange({ model: v })}
          placeholder="Corolla"
          error={errors.model}
          validated={validated && !!form.model}
        />
      </div>

      {/* ── YEAR + MILEAGE ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <MetalField
          label="Año"
          value={form.year}
          onChange={(v) => onChange({ year: v })}
          placeholder={String(new Date().getFullYear())}
          type="number"
          inputMode="numeric"
          validated={validated && !!form.year}
          icon={
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <MetalField
          label="Kilometraje"
          value={form.mileage_in}
          onChange={(v) => onChange({ mileage_in: v })}
          placeholder="85000"
          type="number"
          inputMode="numeric"
          suffix="km"
          icon={
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
      </div>

      {/* ── COLOR DOTS ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Color</label>
        <div className="flex flex-wrap gap-4">
          {COLORS.map((c) => {
            const isSelected = form.color === c.name;

            // "Otro" — text chip with + icon
            if (c.hex === null) {
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => onChange({ color: c.name })}
                  className="flex flex-col items-center gap-1 touch-feedback"
                >
                  <div
                    style={{
                      padding: "2px",
                      borderRadius: "50%",
                      background: isSelected
                        ? "linear-gradient(135deg, #F97316, #EA580C)"
                        : "linear-gradient(135deg, #4B5563, #374151)",
                      boxShadow: isSelected
                        ? "0 0 12px rgba(249,115,22,0.4), 0 2px 8px rgba(0,0,0,0.4)"
                        : "0 2px 6px rgba(0,0,0,0.35)",
                      transition: "all 0.2s",
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: "linear-gradient(145deg, #374151, #1F2937)" }}
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        style={{ color: isSelected ? "#F97316" : "#6B7280" }}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  </div>
                  <span
                    className="text-[9px] font-semibold text-center"
                    style={{ color: isSelected ? "#F97316" : "#6B7280" }}
                  >
                    {c.name}
                  </span>
                </button>
              );
            }

            // Color dot with metal ring
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => onChange({ color: c.name })}
                className="flex flex-col items-center gap-1 touch-feedback"
              >
                {/* Metal ring */}
                <div
                  style={{
                    padding: "2px",
                    borderRadius: "50%",
                    background: isSelected
                      ? "linear-gradient(135deg, #F97316, #EA580C)"
                      : "linear-gradient(135deg, #4B5563, #2D3748)",
                    boxShadow: isSelected
                      ? `0 0 14px rgba(249,115,22,0.5), 0 2px 8px rgba(0,0,0,0.5)`
                      : "0 2px 6px rgba(0,0,0,0.4)",
                    transition: "all 0.2s",
                  }}
                >
                  {/* Color dot */}
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: c.hex,
                      border: c.name === "Blanco" ? "1px solid rgba(0,0,0,0.15)" : "none",
                      boxShadow: isSelected
                        ? `inset 0 1px 0 rgba(255,255,255,0.25), 0 0 8px ${c.hex}80`
                        : "inset 0 1px 0 rgba(255,255,255,0.1)",
                    }}
                  />
                </div>
                {/* Label — shows name always, label only when selected */}
                <span
                  className="text-[9px] font-semibold text-center leading-tight w-14 truncate transition-colors duration-200"
                  style={{ color: isSelected ? "#F97316" : "#4B5563" }}
                >
                  {isSelected ? c.label : c.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── NEXT BUTTON ────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => { if (validate()) onNext(); }}
        className="w-full h-cta rounded-2xl font-bold text-lg text-white transition-all duration-150 active:scale-[0.97] touch-feedback flex items-center justify-center gap-3 relative overflow-hidden select-none"
        style={{
          background: "linear-gradient(135deg, #F97316 0%, #FB923C 50%, #EA580C 100%)",
          boxShadow: [
            "0 4px 24px rgba(249,115,22,0.4)",
            "0 1px 0 rgba(255,255,255,0.12) inset",
            "0 -2px 0 rgba(0,0,0,0.2) inset",
          ].join(", "),
          letterSpacing: "0.01em",
        }}
      >
        <span>Siguiente: Cliente</span>

        {/* Arrow with light trail */}
        <div className="relative flex items-center">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          <div
            className="absolute pointer-events-none"
            style={{
              right: 0,
              width: "32px",
              height: "20px",
              background: "radial-gradient(ellipse at right, rgba(255,255,255,0.25), transparent 70%)",
              transform: "translateX(50%)",
            }}
          />
        </div>
      </button>
    </div>
  );
}

// ── Metal Field Component ─────────────────────────────────────────────────────

interface MetalFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  validated?: boolean;
  type?: string;
  inputMode?: "numeric" | "text" | "decimal";
  suffix?: string;
  icon?: ReactNode;
}

function MetalField({
  label,
  value,
  onChange,
  placeholder,
  error,
  validated,
  type = "text",
  inputMode,
  suffix,
  icon,
}: MetalFieldProps) {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? "rgba(239,68,68,0.65)"
    : focused
      ? "rgba(249,115,22,0.55)"
      : validated
        ? "rgba(34,197,94,0.4)"
        : "rgba(55,65,81,0.6)";

  const outerGlow = error
    ? "0 0 0 3px rgba(239,68,68,0.1)"
    : focused
      ? "0 0 0 3px rgba(249,115,22,0.1)"
      : "none";

  // Whether a validation icon should show (not while typing)
  const showError    = !!error && !focused;
  const showValid    = !!validated && !error;
  const showIndicator = showError || showValid;
  const indicatorRight = suffix ? "2.75rem" : "0.75rem";

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        {label}
      </label>

      <div
        className="relative transition-all duration-200"
        style={{
          borderRadius: "0.75rem",
          border: `1px solid ${borderColor}`,
          background: "linear-gradient(180deg, #1C2535 0%, #111827 100%)",
          boxShadow: `inset 0 2px 4px rgba(0,0,0,0.35), ${outerGlow}`,
        }}
      >
        {/* Left icon — color shifts on focus */}
        {icon && (
          <div
            className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none"
            style={{ color: focused ? "#F97316" : "#4B5563" }}
          >
            {icon}
          </div>
        )}

        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          inputMode={inputMode}
          className={[
            "w-full h-touch bg-transparent",
            "rounded-[calc(0.75rem-1px)]",
            "text-slate-100 placeholder-slate-600 text-base font-medium",
            "focus:outline-none transition-colors duration-200",
            icon    ? "pl-9" : "pl-4",
            suffix  ? "pr-14" : showIndicator ? "pr-9" : "pr-4",
            validated ? "animate-fill-in" : "",
          ].join(" ")}
        />

        {/* Suffix label (e.g. "km") */}
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-semibold pointer-events-none select-none">
            {suffix}
          </span>
        )}

        {/* Validation icon */}
        {showIndicator && (
          <div
            className="absolute top-1/2 -translate-y-1/2 animate-fade-in"
            style={{ right: indicatorRight }}
          >
            {showError ? (
              <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400 font-medium">{error}</p>
      )}
    </div>
  );
}
