import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // -----------------------------------------------------------------------
      // TallerTrack Design System — "Dirty Hands" edition
      // Optimized for: dark workshop environments, greasy fingers, bright sunlight
      // -----------------------------------------------------------------------
      colors: {
        surface: {
          DEFAULT: "#0F172A",  // app background (slate-900)
          card:    "#1E293B",  // card background (slate-800)
          raised:  "#334155",  // elevated element (slate-700)
          border:  "#475569",  // border (slate-600)
        },
        brand: {
          DEFAULT: "#F97316",  // primary CTA — orange-500
          hover:   "#EA580C",  // orange-600
          dim:     "#431407",  // orange-950 — bg for orange badges
        },
        status: {
          received:        { bg: "#1E3A5F", text: "#93C5FD", dot: "#3B82F6" },
          diagnosing:      { bg: "#1E3A5F", text: "#93C5FD", dot: "#60A5FA" },
          awaiting_parts:  { bg: "#422006", text: "#FDE68A", dot: "#F59E0B" },
          in_progress:     { bg: "#431407", text: "#FED7AA", dot: "#F97316" },
          quality_control: { bg: "#3B0764", text: "#E9D5FF", dot: "#A855F7" },
          ready:           { bg: "#052E16", text: "#86EFAC", dot: "#22C55E" },
          delivered:       { bg: "#042F2E", text: "#99F6E4", dot: "#14B8A6" },
          cancelled:       { bg: "#450A0A", text: "#FECACA", dot: "#EF4444" },
        },
      },
      // Large, touch-friendly sizes
      height: {
        touch:    "3.5rem",   // 56px — minimum touch target
        cta:      "4.5rem",   // 72px — primary CTA buttons
        "cta-sm": "4rem",     // 64px — secondary CTA
      },
      fontSize: {
        plate: ["1.875rem", { lineHeight: "1", fontWeight: "900", letterSpacing: "0.15em" }],
      },
      animation: {
        "pulse-brand": "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-up":    "slideUp 0.2s ease-out",
        "fade-in":     "fadeIn 0.15s ease-out",
        "laser-scan":  "laserScan 1s ease-in-out infinite",
        "orb-pulse":   "orbPulse 2s ease-out infinite",
        "fill-in":     "fillIn 0.3s ease-out",
      },
      keyframes: {
        slideUp: {
          "0%":   { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)",   opacity: "1" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        laserScan: {
          "0%":   { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(500%)" },
        },
        orbPulse: {
          "0%, 100%": { transform: "scale(1)",   opacity: "1" },
          "50%":      { transform: "scale(1.6)", opacity: "0" },
        },
        fillIn: {
          "0%":   { opacity: "0", transform: "translateY(-3px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
