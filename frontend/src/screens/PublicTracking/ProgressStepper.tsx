// Visual progress stepper for the public-facing tracking page

interface Step {
  key: string;
  label: string;
  icon: string;
}

// Canonical flow shown to the client (simplified — merges awaiting_parts into repair)
const STEPS: Step[] = [
  { key: "received",        label: "Recibido",          icon: "📥" },
  { key: "diagnosing",      label: "Diagnóstico",        icon: "🔍" },
  { key: "repair",          label: "En reparación",      icon: "⚙️" },
  { key: "quality_control", label: "Control de calidad", icon: "✅" },
  { key: "ready",           label: "Listo",              icon: "🎉" },
  { key: "delivered",       label: "Entregado",          icon: "🏁" },
];

// Map DB status → step key
const STATUS_TO_STEP: Record<string, string> = {
  received:        "received",
  diagnosing:      "diagnosing",
  awaiting_parts:  "repair",
  in_progress:     "repair",
  quality_control: "quality_control",
  ready:           "ready",
  delivered:       "delivered",
  cancelled:       "cancelled",
};

interface Props {
  status: string;
}

export function ProgressStepper({ status }: Props) {
  const isCancelled = status === "cancelled";
  const currentKey  = STATUS_TO_STEP[status] ?? "received";
  const currentIdx  = STEPS.findIndex((s) => s.key === currentKey);

  if (isCancelled) {
    return (
      <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
        <span className="text-3xl">✖️</span>
        <div>
          <p className="font-bold text-red-700">Orden cancelada</p>
          <p className="text-red-500 text-sm">Esta orden de trabajo fue cancelada.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Desktop: horizontal */}
      <div className="hidden sm:flex items-start justify-between relative">
        {/* Background line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 z-0" />
        {/* Progress fill */}
        <div
          className="absolute top-5 left-0 h-0.5 bg-orange-400 z-0 transition-all duration-700"
          style={{ width: currentIdx === 0 ? "0%" : `${(currentIdx / (STEPS.length - 1)) * 100}%` }}
        />

        {STEPS.map((step, idx) => {
          const done   = idx < currentIdx;
          const active = idx === currentIdx;
          const future = idx > currentIdx;
          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center gap-2 flex-1">
              {/* Circle */}
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center text-lg
                border-2 transition-all duration-300 bg-white
                ${done   ? "border-orange-400 bg-orange-400 text-white" : ""}
                ${active ? "border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-200 scale-110" : ""}
                ${future ? "border-gray-200 text-gray-300" : ""}
              `}>
                {done
                  ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  : <span>{step.icon}</span>
                }
              </div>
              {/* Label */}
              <span className={`text-xs font-semibold text-center leading-tight w-20
                ${active ? "text-orange-600" : done ? "text-gray-500" : "text-gray-300"}
              `}>
                {step.label}
              </span>
              {/* "Actual" pulse */}
              {active && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-orange-400 animate-ping opacity-75" />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical list */}
      <div className="flex sm:hidden flex-col gap-0">
        {STEPS.map((step, idx) => {
          const done   = idx < currentIdx;
          const active = idx === currentIdx;
          const future = idx > currentIdx;
          const isLast = idx === STEPS.length - 1;
          return (
            <div key={step.key} className="flex items-start gap-3">
              {/* Dot + line */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={`
                  w-9 h-9 rounded-full flex items-center justify-center text-base border-2
                  ${done   ? "border-orange-400 bg-orange-400 text-white" : ""}
                  ${active ? "border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-100" : ""}
                  ${future ? "border-gray-200 text-gray-300 bg-white" : ""}
                `}>
                  {done
                    ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    : <span>{step.icon}</span>
                  }
                </div>
                {!isLast && (
                  <div className={`w-0.5 h-6 mt-0.5 ${idx < currentIdx ? "bg-orange-300" : "bg-gray-100"}`} />
                )}
              </div>
              {/* Label */}
              <div className="pb-4 pt-1.5">
                <p className={`text-sm font-semibold leading-none
                  ${active ? "text-orange-600" : done ? "text-gray-500" : "text-gray-300"}
                `}>
                  {step.label}
                  {active && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-orange-400 animate-pulse" />}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
