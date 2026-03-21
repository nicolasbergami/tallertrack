import { useEffect, useState } from "react";

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setHiding(true), 1600);
    const t2 = setTimeout(() => onDone(),         2100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div
      style={{
        position:       "fixed",
        inset:          0,
        zIndex:         9999,
        background:     "#0F172A",
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        gap:            32,
        opacity:    hiding ? 0 : 1,
        transition: "opacity 0.5s ease",
        pointerEvents: "none",
      }}
    >
      {/* Logo */}
      <img
        src="/logo.png"
        alt="TallerTrack"
        style={{
          height:    140,
          width:     "auto",
          animation: "splashLogo 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        }}
      />

      {/* Progress bar */}
      <div style={{
        width:        100,
        height:       2,
        background:   "rgba(249,115,22,0.15)",
        borderRadius: 2,
        overflow:     "hidden",
      }}>
        <div style={{
          height:     "100%",
          background: "linear-gradient(90deg, #EA580C, #F97316, #FB923C)",
          animation:  "splashBar 1.4s ease-out forwards",
        }} />
      </div>

      <style>{`
        @keyframes splashLogo {
          0%   { opacity: 0; transform: scale(0.72) translateY(8px); }
          100% { opacity: 1; transform: scale(1)    translateY(0);   }
        }
        @keyframes splashBar {
          0%   { width: 0%;   }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
}
