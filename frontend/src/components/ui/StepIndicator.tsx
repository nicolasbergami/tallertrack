interface Props {
  steps: string[];
  current: number; // 0-indexed
}

export function StepIndicator({ steps, current }: Props) {
  return (
    <div className="flex items-center gap-0 w-full">
      {steps.map((label, i) => {
        const done    = i < current;
        const active  = i === current;
        const pending = i > current;

        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            {/* Circle */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                  transition-all duration-300
                  ${done    ? "bg-brand text-white"                         : ""}
                  ${active  ? "bg-brand text-white ring-4 ring-orange-500/30" : ""}
                  ${pending ? "bg-surface-raised text-slate-500"              : ""}
                `}
              >
                {done ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span className={`text-xs font-medium text-center leading-tight w-16
                ${active ? "text-brand" : done ? "text-slate-400" : "text-slate-600"}
              `}>
                {label}
              </span>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 transition-all duration-300
                ${i < current ? "bg-brand" : "bg-surface-raised"}
              `} />
            )}
          </div>
        );
      })}
    </div>
  );
}
