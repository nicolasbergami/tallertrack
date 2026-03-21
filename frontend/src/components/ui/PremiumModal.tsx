// ---------------------------------------------------------------------------
// PremiumModal — Contextual paywall (Bottom Sheet mobile / Modal desktop)
//
// Shown when a user on a lower plan tries to use a premium feature.
// Design inspiration: Tinder Gold / Spotify Premium upsell sheets.
// ---------------------------------------------------------------------------

import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FEATURE_GATES,
  PLAN_DISPLAY,
  type PremiumFeature,
} from "../../config/features.config";

interface Props {
  isOpen:   boolean;
  onClose:  () => void;
  feature:  PremiumFeature;
}

export function PremiumModal({ isOpen, onClose, feature }: Props) {
  const navigate = useNavigate();
  const cfg      = FEATURE_GATES[feature];

  function handleCTA() {
    onClose();
    navigate("/billing");
  }

  return (
    <AnimatePresence>
      {isOpen && (
        // ── Outer container: bottom-aligned on mobile, centered on desktop ──
        <div className="fixed inset-0 z-[70] flex items-end lg:items-center justify-center">

          {/* ── Backdrop ── */}
          <motion.div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
          />

          {/* ── Sheet / Modal panel ── */}
          <motion.div
            className="relative w-full max-w-md rounded-t-[2rem] lg:rounded-[2rem]
                       overflow-hidden"
            style={{
              background:
                "linear-gradient(180deg, #0E0E1A 0%, #090910 100%)",
              boxShadow:
                "0 -4px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)",
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "110%" }}
            transition={{ type: "spring", damping: 32, stiffness: 340 }}
          >
            {/* ── Drag handle (mobile visual affordance) ── */}
            <div className="flex justify-center pt-3 pb-1 lg:hidden">
              <div className="w-9 h-1 rounded-full bg-white/20" />
            </div>

            <div className="px-6 pt-4 pb-8 flex flex-col gap-5">

              {/* ── Icon with layered glow ── */}
              <div className="flex justify-center">
                <div className="relative flex items-center justify-center w-28 h-28">
                  {/* Ambient outer glow — pulsing */}
                  <motion.div
                    className="absolute w-28 h-28 rounded-full blur-2xl"
                    style={{ background: cfg.iconGlow }}
                    animate={{ opacity: [0.35, 0.65, 0.35], scale: [1, 1.15, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  />
                  {/* Mid glow ring */}
                  <div
                    className="absolute w-24 h-24 rounded-3xl"
                    style={{
                      background: cfg.iconGlow.replace("0.55", "0.12"),
                      border: `1px solid ${cfg.iconGlow.replace("0.55", "0.3")}`,
                    }}
                  />
                  {/* Icon card */}
                  <div
                    className="relative w-20 h-20 rounded-2xl flex items-center justify-center text-5xl"
                    style={{
                      background: cfg.iconBg,
                      boxShadow: `0 8px 32px ${cfg.iconGlow}, inset 0 1px 0 rgba(255,255,255,0.08)`,
                      border: `1px solid ${cfg.iconGlow.replace("0.55", "0.25")}`,
                    }}
                  >
                    {cfg.icon}
                  </div>
                </div>
              </div>

              {/* ── Plan badge ── */}
              <div className="flex justify-center">
                <span
                  className={`px-3 py-1 rounded-full text-[11px] font-black uppercase
                               tracking-wider ${cfg.accentText} ${cfg.accentBg}
                               border ${cfg.accentBorder}`}
                >
                  ✦ {PLAN_DISPLAY[cfg.planRequired]}
                </span>
              </div>

              {/* ── Copy ── */}
              <div className="text-center flex flex-col gap-2">
                <h2 className="text-[22px] font-black text-white leading-tight tracking-tight">
                  {cfg.title}
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed px-2">
                  {cfg.subtitle}
                </p>
              </div>

              {/* ── Perks list ── */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                {cfg.perks.map((perk, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 px-4 py-3
                      ${i < cfg.perks.length - 1 ? "border-b border-white/5" : ""}`}
                  >
                    {/* Colored check circle */}
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center
                                  flex-shrink-0 ${cfg.accentBg} border ${cfg.accentBorder}`}
                    >
                      <svg
                        className={`w-3 h-3 ${cfg.accentText}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm text-slate-300 leading-snug">{perk}</span>
                  </div>
                ))}
              </div>

              {/* ── CTA button with breathing glow ── */}
              <motion.button
                onClick={handleCTA}
                className="relative w-full h-14 rounded-2xl overflow-hidden
                           font-black text-base text-white"
                style={{
                  background: cfg.ctaGradient,
                  boxShadow: `0 4px 24px ${cfg.ctaGlow}`,
                }}
                animate={{
                  boxShadow: [
                    `0 4px 20px ${cfg.ctaGlow.replace("0.6", "0.35")}`,
                    `0 4px 40px ${cfg.ctaGlow.replace("0.6", "0.70")}`,
                    `0 4px 20px ${cfg.ctaGlow.replace("0.6", "0.35")}`,
                  ],
                }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.015 }}
              >
                {/* Sweep shine */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent
                             via-white/[0.12] to-transparent"
                  animate={{ x: ["-120%", "220%"] }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    repeatDelay: 2.5,
                    ease: "easeInOut",
                  }}
                />
                <span className="relative z-10">{cfg.ctaLabel} →</span>
              </motion.button>

              {/* ── Dismiss link ── */}
              <button
                onClick={onClose}
                className="text-sm text-slate-600 hover:text-slate-400
                           transition-colors text-center -mt-2 pb-1"
              >
                Ahora no
              </button>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
