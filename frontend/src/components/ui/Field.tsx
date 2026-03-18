import { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";

const BASE_INPUT = `
  w-full bg-surface-card border border-surface-border rounded-xl
  text-slate-100 placeholder-slate-500
  px-4 text-lg
  focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent
  transition-colors
`;

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  icon?: ReactNode;
}

export function InputField({ label, hint, error, icon, className = "", ...props }: InputFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl pointer-events-none">
            {icon}
          </span>
        )}
        <input
          {...props}
          className={`${BASE_INPUT} h-touch ${icon ? "pl-12" : ""} ${error ? "border-red-500 focus:ring-red-500" : ""} ${className}`}
        />
      </div>
      {hint  && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
    </div>
  );
}

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function TextareaField({ label, hint, error, className = "", ...props }: TextareaFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
        {label}
      </label>
      <textarea
        {...props}
        className={`
          ${BASE_INPUT} py-4 resize-none min-h-[7rem]
          ${error ? "border-red-500 focus:ring-red-500" : ""}
          ${className}
        `}
      />
      {hint  && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
    </div>
  );
}
