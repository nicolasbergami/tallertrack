import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "whatsapp" | "success";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "lg" | "xl";
  fullWidth?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:   "bg-brand hover:bg-brand-hover text-white shadow-lg shadow-orange-900/40",
  secondary: "bg-surface-raised hover:bg-surface-border text-slate-200 border border-surface-border",
  ghost:     "bg-transparent hover:bg-surface-raised text-slate-300",
  danger:    "bg-red-900/60 hover:bg-red-800/80 text-red-200 border border-red-800",
  whatsapp:  "bg-green-700 hover:bg-green-600 text-white shadow-lg shadow-green-900/40",
  success:   "bg-green-800 hover:bg-green-700 text-green-100 border border-green-600",
};

const SIZES: Record<"md" | "lg" | "xl", string> = {
  md: "h-touch  text-base  px-5  rounded-xl  gap-2",
  lg: "h-cta-sm text-lg   px-6  rounded-2xl gap-3",
  xl: "h-cta    text-xl   px-7  rounded-2xl gap-3",
};

export function BigButton({
  variant = "primary",
  size = "lg",
  fullWidth = false,
  loading = false,
  icon,
  children,
  className = "",
  disabled,
  ...props
}: Props) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-bold
        transition-all duration-100 touch-feedback
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface
        disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
        select-none
        ${VARIANTS[variant]}
        ${SIZES[size]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
    >
      {loading ? (
        <Spinner />
      ) : (
        icon && <span className="flex-shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
