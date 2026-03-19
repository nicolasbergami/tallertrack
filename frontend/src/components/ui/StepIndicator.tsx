interface Props {
  steps: string[];
  current: number; // 0-indexed
}

export function StepIndicator({ steps, current }: Props) {
  return (
    <div className="flex items-start gap-0 w-full">
      {steps.map((label, i) => {
        const done   = i < current;
        const active = i === current;

        return (
          <div key={label} className="flex items-start flex-1 last:flex-none">

            {/* ── Orb + label column ── */}
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">

              {/* Orb wrapper (holds pulse ring + the orb itself) */}
              <div className="relative w-10 h-10">

                {/* Pulsing outer ring — active step only */}
                {active && (
                  <div
                    className="absolute inset-0 rounded-full animate-orb-pulse"
                    style={{
                      border: "2px solid rgba(249,115,22,0.55)",
                      borderRadius: "50%",
                      pointerEvents: "none",
                    }}
                  />
                )}

                {/* Metallic orb */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm relative z-10 transition-all duration-300"
                  style={{
                    background: done
                      ? "linear-gradient(145deg, #FB923C 0%, #F97316 55%, #C2410C 100%)"
                      : active
                        ? "linear-gradient(145deg, #2D3748 0%, #1A202C 55%, #2D3748 100%)"
                        : "linear-gradient(145deg, #1A2030 0%, #111827 100%)",
                    boxShadow: done
                      ? "0 2px 12px rgba(249,115,22,0.5), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.35)"
                      : active
                        ? "0 2px 16px rgba(249,115,22,0.2), inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -2px 4px rgba(0,0,0,0.4)"
                        : "inset 0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)",
                    border: done
                      ? "1px solid rgba(251,146,60,0.5)"
                      : active
                        ? "1px solid rgba(249,115,22,0.6)"
                        : "1px solid rgba(55,65,81,0.5)",
                  }}
                >
                  {done ? (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span style={{ color: active ? "#F97316" : "#4B5563" }}>{i + 1}</span>
                  )}
                </div>
              </div>

              {/* Step label */}
              <span
                className="text-xs font-semibold text-center leading-tight w-16 transition-colors duration-300"
                style={{ color: active ? "#F97316" : done ? "#94A3B8" : "#4B5563" }}
              >
                {label}
              </span>
            </div>

            {/* ── Precision metal connector ── */}
            {i < steps.length - 1 && (
              <div
                className="flex-1 relative"
                style={{ marginTop: "20px", marginLeft: "6px", marginRight: "6px" }}
              >
                <div
                  className="h-px w-full transition-all duration-500"
                  style={{
                    background: i < current
                      ? "linear-gradient(90deg, #F97316, #EA580C)"
                      : "rgba(55,65,81,0.5)",
                    boxShadow: i < current ? "0 0 6px rgba(249,115,22,0.4)" : "none",
                  }}
                />
                {/* Bright particle at the end of the lit connector */}
                {i === current - 1 && (
                  <div
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                    style={{
                      background: "#F97316",
                      boxShadow: "0 0 6px #F97316, 0 0 12px rgba(249,115,22,0.5)",
                    }}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
