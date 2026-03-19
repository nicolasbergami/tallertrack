import { ReactNode, useState } from "react";

export interface MetalFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  /** Green check on border — indicates value came from a trusted source */
  validated?: boolean;
  type?: string;
  inputMode?: "numeric" | "text" | "decimal" | "tel" | "email";
  suffix?: string;
  /** Icon shown on the left — turns orange on focus */
  icon?: ReactNode;
  autoFocus?: boolean;
  autoCapitalize?: string;
  /** Helper text shown below the field */
  hint?: ReactNode;
  readOnly?: boolean;
  disabled?: boolean;
}

export function MetalField({
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
  autoFocus,
  autoCapitalize,
  hint,
  readOnly,
  disabled,
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
          background: disabled || readOnly
            ? "linear-gradient(180deg, #151E2E 0%, #0E1520 100%)"
            : "linear-gradient(180deg, #1C2535 0%, #111827 100%)",
          boxShadow: `inset 0 2px 4px rgba(0,0,0,0.35), ${outerGlow}`,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {/* Left icon */}
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
          autoFocus={autoFocus}
          autoCapitalize={autoCapitalize}
          readOnly={readOnly}
          disabled={disabled}
          className={[
            "w-full h-touch bg-transparent",
            "rounded-[calc(0.75rem-1px)]",
            "text-slate-100 placeholder-slate-600 text-base font-medium",
            "focus:outline-none transition-colors duration-200",
            readOnly ? "cursor-default" : "",
            icon ? "pl-9" : "pl-4",
            suffix ? "pr-14" : showIndicator ? "pr-9" : "pr-4",
            validated ? "animate-fill-in" : "",
          ].join(" ")}
        />

        {/* Suffix label */}
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-semibold pointer-events-none select-none">
            {suffix}
          </span>
        )}

        {/* Validation icon */}
        {showIndicator && (
          <div
            className="absolute top-1/2 -translate-y-1/2 animate-fade-in pointer-events-none"
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

      {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
      {hint  && <div className="text-xs text-slate-500">{hint}</div>}
    </div>
  );
}
