import { useState, useEffect, useRef } from "react";

// ── Helpers ──────────────────────────────────────────────────────────────────

const STORAGE_KEY  = "tt-install-dismissed";
const DISMISS_MS   = 24 * 60 * 60 * 1000; // 24 horas

function isDismissedRecently(): boolean {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  return Date.now() - Number(raw) < DISMISS_MS;
}

function saveDismiss() {
  localStorage.setItem(STORAGE_KEY, String(Date.now()));
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).standalone === true
  );
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isSafari(): boolean {
  return /safari/i.test(navigator.userAgent) && !/chrome|crios|fxios/i.test(navigator.userAgent);
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconDownload() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconX() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// iOS Share icon (exactly como se ve en Safari)
function IconIOSShare() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 1 1 0-2.684m6.632 8.025C13.886 19.061 13 18.107 13 17a3 3 0 1 1 1.316 2.367M15 12a3 3 0 1 1-2.684-2.974" />
      <path d="M12 3v9m0-9-3 3m3-3 3 3" />
    </svg>
  );
}

// Ícono de "Agregar a inicio" de iOS
function IconAddToHome() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M12 8v8m-4-4h8" />
    </svg>
  );
}

// ── iOS Guide ─────────────────────────────────────────────────────────────────

function IOSGuide() {
  return (
    <div className="flex flex-col gap-3 w-full">
      <p className="text-slate-300 text-sm font-semibold text-center">
        Instalá TallerTrack en tu iPhone:
      </p>
      <div className="flex items-stretch gap-2">
        {/* Step 1 */}
        <div className="flex-1 flex flex-col items-center gap-2 px-3 py-3 rounded-2xl bg-white/[0.05] border border-white/[0.08]">
          <div className="w-10 h-10 rounded-xl bg-brand/20 border border-brand/30 flex items-center justify-center animate-bounce">
            <IconIOSShare />
          </div>
          <p className="text-[11px] text-slate-400 text-center leading-tight">
            Tocá el botón<br />
            <strong className="text-slate-300">Compartir</strong>
          </p>
        </div>

        {/* Arrow */}
        <div className="flex items-center flex-shrink-0 text-slate-600">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>

        {/* Step 2 */}
        <div className="flex-1 flex flex-col items-center gap-2 px-3 py-3 rounded-2xl bg-white/[0.05] border border-white/[0.08]">
          <div className="w-10 h-10 rounded-xl bg-brand/20 border border-brand/30 flex items-center justify-center">
            <IconAddToHome />
          </div>
          <p className="text-[11px] text-slate-400 text-center leading-tight">
            Elegí<br />
            <strong className="text-slate-300">"Agregar a inicio"</strong>
          </p>
        </div>
      </div>

      {/* Safari indicator */}
      <p className="text-[11px] text-slate-600 text-center">
        Solo disponible desde Safari
      </p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function InstallPrompt() {
  const [visible,    setVisible]    = useState(false);
  const [animateIn,  setAnimateIn]  = useState(false);
  const [installing, setInstalling] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  const iosMode  = isIOS() && isSafari();
  const showable = !isStandalone() && !isDismissedRecently();

  useEffect(() => {
    if (!showable) return;

    if (iosMode) {
      // iOS: mostrar directamente con un pequeño delay para no interrumpir el load
      const t = setTimeout(() => {
        setVisible(true);
        requestAnimationFrame(() => setAnimateIn(true));
      }, 3000);
      return () => clearTimeout(t);
    }

    // Android / Desktop Chrome: esperar evento beforeinstallprompt
    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setVisible(true);
      requestAnimationFrame(() => setAnimateIn(true));
    }

    function handleInstalled() {
      dismiss(false); // cerrar sin guardar "dismissed", ya está instalada
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss(save = true) {
    setAnimateIn(false);
    if (save) saveDismiss();
    setTimeout(() => setVisible(false), 320);
  }

  async function handleInstall() {
    if (!deferredPrompt.current) return;
    setInstalling(true);
    try {
      await deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      if (outcome === "accepted") {
        dismiss(false);
      }
    } finally {
      deferredPrompt.current = null;
      setInstalling(false);
    }
  }

  if (!visible) return null;

  return (
    <>
      {/* Backdrop difuso en iOS para que el tutorial resalte */}
      {iosMode && (
        <div
          className={`fixed inset-0 z-[90] bg-black/40 backdrop-blur-[2px] transition-opacity duration-300
                      ${animateIn ? "opacity-100" : "opacity-0"}`}
          onClick={() => dismiss()}
        />
      )}

      {/* Banner */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 z-[100]
          transition-transform duration-300 ease-out
          ${animateIn ? "translate-y-0" : "translate-y-full"}
        `}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div
          className="mx-3 mb-3 rounded-2xl border border-white/[0.10] shadow-2xl overflow-hidden"
          style={{
            background: "linear-gradient(160deg, #1e293b 0%, #0f172a 100%)",
            boxShadow: "0 -4px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-3">
            {/* App icon */}
            <div className="w-12 h-12 rounded-2xl bg-brand/20 border border-brand/40 flex items-center justify-center flex-shrink-0 shadow-lg">
              <svg className="w-6 h-6 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </div>

            {/* Title */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-base leading-tight">TallerTrack</p>
              <p className="text-slate-400 text-xs leading-snug mt-0.5">
                {iosMode
                  ? "Agregá la app a tu pantalla de inicio"
                  : "Instalá la app en tu dispositivo"}
              </p>
            </div>

            {/* Dismiss */}
            <button
              onClick={() => dismiss()}
              aria-label="Cerrar"
              className="w-8 h-8 rounded-full bg-white/[0.07] hover:bg-white/[0.12] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors flex-shrink-0"
            >
              <IconX />
            </button>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/[0.06] mx-4" />

          {/* Body */}
          <div className="px-4 py-4">
            {iosMode ? (
              <IOSGuide />
            ) : (
              <div className="flex flex-col gap-3">
                {/* Benefits */}
                <div className="flex gap-4">
                  {[
                    { icon: "⚡", text: "Acceso rápido" },
                    { icon: "📴", text: "Sin navegador" },
                    { icon: "🔔", text: "Notificaciones" },
                  ].map(({ icon, text }) => (
                    <div key={text} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xl">{icon}</span>
                      <span className="text-[11px] text-slate-500 text-center font-medium">{text}</span>
                    </div>
                  ))}
                </div>

                {/* Install button */}
                <button
                  onClick={handleInstall}
                  disabled={installing}
                  className="w-full h-14 rounded-2xl bg-brand hover:bg-brand-hover text-white font-black text-base
                             flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]
                             disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-orange-900/40"
                >
                  {installing ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Instalando…
                    </>
                  ) : (
                    <>
                      <IconDownload />
                      Instalar TallerTrack
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
