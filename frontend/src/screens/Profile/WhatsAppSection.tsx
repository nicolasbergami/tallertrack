import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { useAuthStore } from "../../store/auth.store";
import { IconWhatsapp } from "../../components/ui/Icons";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type WaStatus = "not_started" | "connecting" | "qr" | "connected" | "disconnected";

interface WaStatusResponse {
  status: WaStatus;
  phone:  string | null;
}

// ---------------------------------------------------------------------------
// Hook: detecta si el usuario está en un viewport mobile (< 768px)
// ---------------------------------------------------------------------------
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 768
  );
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return isMobile;
}

// ---------------------------------------------------------------------------
// Mobile Guide — se muestra en lugar del QR cuando el modal se abre en celular
// ---------------------------------------------------------------------------
const STEPS: { icon: React.ReactNode; title: string; desc: string }[] = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
           className="w-5 h-5 text-orange-400">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
    title: "Abrí TallerTrack en tu PC o tablet",
    desc: "Cualquier navegador con la sesión iniciada sirve.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
           className="w-5 h-5 text-orange-400">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
    title: "Andá a Perfil y tocá 'Vincular WhatsApp'",
    desc: "El código QR aparecerá en la pantalla de la PC.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
           className="w-5 h-5 text-orange-400">
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M10 6h4M11 19h2" />
      </svg>
    ),
    title: "Escaneá el QR con este celular",
    desc: "WhatsApp → Dispositivos vinculados → Vincular dispositivo.",
  },
];

function MobileGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-end justify-center">
      <div
        className="w-full max-w-sm rounded-t-3xl border border-slate-700/60 px-5 pt-5 pb-8 flex flex-col gap-5"
        style={{
          background: "linear-gradient(160deg, #1e293b 0%, #0f172a 100%)",
          boxShadow: "0 -12px 48px rgba(0,0,0,0.7)",
        }}
      >
        {/* Handle */}
        <div className="flex justify-center">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        {/* Illustration: laptop + flecha + celular */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            {/* Laptop */}
            <svg viewBox="0 0 58 46" className="w-16 h-12" fill="none">
              <rect x="4" y="2" width="50" height="33" rx="4"
                    fill="#1e293b" stroke="#475569" strokeWidth="1.5"/>
              <rect x="9" y="7" width="40" height="23" rx="2" fill="#0f172a"/>
              {/* pantalla con contenido */}
              <circle cx="21" cy="18" r="2.5" fill="#EA580C" opacity="0.7"/>
              <rect x="25.5" y="16.5" width="14" height="2" rx="1" fill="#475569"/>
              <rect x="25.5" y="20" width="10" height="2" rx="1" fill="#334155"/>
              {/* base */}
              <rect x="0" y="35" width="58" height="9" rx="3"
                    fill="#334155" stroke="#475569" strokeWidth="1"/>
              <rect x="21" y="35" width="16" height="5" rx="1.5" fill="#1e293b"/>
            </svg>

            {/* Flecha animada */}
            <svg viewBox="0 0 32 16" className="w-8 h-4" fill="none">
              <path d="M2 8h24" stroke="#EA580C" strokeWidth="2" strokeLinecap="round"
                    strokeDasharray="4 2"/>
              <path d="M20 3l8 5-8 5" stroke="#EA580C" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"/>
            </svg>

            {/* Phone */}
            <svg viewBox="0 0 34 58" className="w-8 h-14" fill="none">
              <rect x="1" y="1" width="32" height="56" rx="6"
                    fill="#1e293b" stroke="#475569" strokeWidth="1.5"/>
              <rect x="5" y="7" width="24" height="38" rx="2" fill="#0f172a"/>
              <circle cx="17" cy="51" r="3" fill="#334155"/>
              {/* WA hint en pantalla */}
              <circle cx="17" cy="26" r="7" fill="#15803d" opacity="0.4"/>
              <path d="M14 26.5c0-1.7 1.3-3 3-3s3 1.3 3 3-1.3 3-3 3c-.5 0-1-.1-1.5-.4L12.5 30l.8-2.5c-.2-.4-.3-.6-.3-1z"
                    fill="#4ade80" opacity="0.9"/>
            </svg>
          </div>

          <div className="text-center">
            <h2 className="text-white font-black text-xl leading-tight">
              ¡Necesitamos una<br />pantalla más grande!
            </h2>
            <p className="text-slate-400 text-[13px] mt-1.5 leading-relaxed">
              No podés escanear el QR desde el mismo celular que lo muestra.
            </p>
          </div>
        </div>

        {/* Pasos */}
        <div className="flex flex-col gap-2">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{
                background: "rgba(30,41,59,0.6)",
                border: "1px solid rgba(71,85,105,0.35)",
              }}
            >
              {/* Número */}
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-950/60 border border-orange-700/50
                              flex items-center justify-center text-[11px] font-black text-orange-400">
                {i + 1}
              </div>

              {/* Ícono */}
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-700/40
                              flex items-center justify-center">
                {step.icon}
              </div>

              {/* Texto */}
              <div className="flex-1 min-w-0">
                <p className="text-slate-100 text-[13px] font-semibold leading-snug">
                  {step.title}
                </p>
                <p className="text-slate-500 text-[11px] mt-0.5 leading-snug">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="w-full h-12 rounded-2xl text-sm font-bold text-slate-400
                     border border-slate-700/60 hover:text-slate-200 hover:border-slate-500
                     transition-colors"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// QR Modal — streams SSE events from /api/v1/whatsapp/connect
// Desktop: muestra QR en recuadro metálico oscuro.
// Mobile: muestra MobileGuide (sin iniciar conexión SSE).
// ---------------------------------------------------------------------------
function QRModal({ onClose, onConnected }: { onClose: () => void; onConnected: (phone: string) => void }) {
  const isMobile = useIsMobile();
  const [qrImage, setQrImage]   = useState<string | null>(null);
  const [error,   setError]     = useState("");
  const [timedOut, setTimedOut] = useState(false);
  const token    = useAuthStore((s) => s.token);
  const abortRef = useRef<AbortController | null>(null);

  const connect = useCallback(() => {
    setQrImage(null);
    setError("");
    setTimedOut(false);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const safetyTimer = setTimeout(() => {
      ctrl.abort();
      setError("El servidor no respondió. Verificá que el servicio esté activo y reintentá.");
    }, 50_000);

    (async () => {
      try {
        const res = await fetch("/api/v1/whatsapp/connect", {
          headers: { Authorization: `Bearer ${token}` },
          signal:  ctrl.signal,
        });

        if (res.status === 401) {
          clearTimeout(safetyTimer);
          useAuthStore.getState().logout();
          window.location.replace("/login");
          return;
        }

        if (!res.ok || !res.body) {
          clearTimeout(safetyTimer);
          setError("No se pudo iniciar la conexión.");
          return;
        }

        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer    = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const payload = JSON.parse(line.slice(6)) as {
                type: string; qr?: string; phone?: string | null;
                reason?: string; message?: string;
              };
              if (payload.type === "qr" && payload.qr) {
                clearTimeout(safetyTimer);
                setQrImage(payload.qr);
              } else if (payload.type === "connected") {
                clearTimeout(safetyTimer);
                onConnected(payload.phone ?? "");
              } else if (payload.type === "timeout") {
                clearTimeout(safetyTimer);
                setTimedOut(true);
              } else if (payload.type === "disconnected" || payload.type === "error") {
                clearTimeout(safetyTimer);
                setError(payload.reason ?? payload.message ?? "Desconectado");
              }
            } catch { /* ignore malformed SSE line */ }
          }
        }
      } catch (err: unknown) {
        clearTimeout(safetyTimer);
        if ((err as Error).name !== "AbortError") setError("Error de conexión.");
      } finally {
        clearTimeout(safetyTimer);
      }
    })();
  }, [token, onConnected]);

  // Solo conectar en desktop — en mobile no tiene sentido generar el QR
  useEffect(() => {
    if (isMobile) return;
    connect();
    return () => { abortRef.current?.abort(); };
  }, [connect, isMobile]);

  // ── Mobile: guía de pasos ────────────────────────────────────────────────
  if (isMobile) return <MobileGuide onClose={onClose} />;

  // ── Desktop: recuadro metálico con QR ────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-4">
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-600/40 p-6 space-y-5"
        style={{
          background: "linear-gradient(160deg, #1e293b 0%, #0f172a 60%, #080f1e 100%)",
          boxShadow:
            "0 0 0 1px rgba(148,163,184,0.07) inset, 0 24px 64px rgba(0,0,0,0.75), 0 0 120px rgba(234,88,12,0.04)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-green-900/50 border border-green-700/50
                            flex items-center justify-center">
              <IconWhatsapp className="w-4 h-4 text-green-400" />
            </div>
            <h2 className="text-white font-bold text-base">Conectar WhatsApp</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-xl leading-none
                       text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Content */}
        {error ? (
          <div className="space-y-3 text-center">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={connect}
              className="w-full h-11 bg-green-800 hover:bg-green-700 text-white
                         font-semibold rounded-xl transition-colors text-sm"
            >
              Reintentar
            </button>
          </div>
        ) : timedOut ? (
          <div className="space-y-3 text-center">
            <p className="text-yellow-400 text-sm">El código QR expiró.</p>
            <button
              onClick={connect}
              className="w-full h-11 bg-green-800 hover:bg-green-700 text-white
                         font-semibold rounded-xl transition-colors text-sm"
            >
              Generar nuevo QR
            </button>
          </div>
        ) : qrImage ? (
          <div className="space-y-4">
            <p className="text-slate-200 text-sm text-center font-medium">
              Abrí WhatsApp en tu celular y escaneá este código
            </p>
            {/* QR frame metálico */}
            <div className="flex justify-center">
              <div
                className="rounded-2xl p-3 bg-white"
                style={{
                  boxShadow:
                    "0 0 0 1px rgba(148,163,184,0.2), 0 12px 40px rgba(0,0,0,0.6), 0 0 0 6px rgba(30,41,59,0.8)",
                }}
              >
                <img src={qrImage} alt="QR WhatsApp" className="w-52 h-52 rounded-lg block" />
              </div>
            </div>
            {/* Hint path */}
            <div className="flex items-center gap-2 rounded-xl bg-green-950/30
                            border border-green-800/30 px-3 py-2.5">
              <IconWhatsapp className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
              <p className="text-[11px] text-slate-400 leading-snug">
                <span className="text-slate-200 font-semibold">Dispositivos vinculados</span>
                {" → "}Vincular dispositivo
              </p>
              <span className="ml-auto text-[10px] text-slate-600 tabular-nums flex-shrink-0">
                ~60 s
              </span>
            </div>
          </div>
        ) : (
          /* Cargando QR — spinner naranja */
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="relative w-14 h-14">
              <div className="absolute inset-0 rounded-full border-2 border-orange-950/50" />
              <div
                className="absolute inset-0 rounded-full border-2
                            border-t-orange-500 border-r-orange-500/30
                            border-b-transparent border-l-transparent
                            animate-spin"
              />
              <div
                className="absolute inset-2 rounded-full border border-orange-700/20 animate-spin"
                style={{ animationDirection: "reverse", animationDuration: "1.4s" }}
              />
            </div>
            <div className="text-center">
              <p className="text-slate-200 text-sm font-semibold">Cargando QR…</p>
              <p className="text-slate-500 text-xs mt-0.5">Conectando con el servidor</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Connection Health Monitor — shown when status is "connected"
// ---------------------------------------------------------------------------
function ConnectionMonitor({ phone, syncedAt }: { phone: string | null; syncedAt: number }) {
  const [syncLabel, setSyncLabel] = useState("hace menos de 1 min");

  useEffect(() => {
    function tick() {
      const mins = Math.floor((Date.now() - syncedAt) / 60_000);
      setSyncLabel(mins < 1 ? "hace menos de 1 min" : `hace ${mins} min`);
    }
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [syncedAt]);

  return (
    <div
      className="rounded-xl border border-green-800/40 p-4 flex items-center gap-4"
      style={{ background: "linear-gradient(135deg, rgba(20,83,45,0.25) 0%, rgba(15,23,42,0.6) 100%)" }}
    >
      <div className="relative flex-shrink-0">
        <div className="absolute inset-0 rounded-full bg-green-500/15 animate-pulse scale-[1.4]" />
        <div
          className="relative w-12 h-12 rounded-full bg-green-900/50 border border-green-700/60
                     flex items-center justify-center"
          style={{ boxShadow: "0 0 18px rgba(74,222,128,0.35), 0 0 6px rgba(74,222,128,0.2)" }}
        >
          <IconWhatsapp className="w-6 h-6 text-green-400" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-bold text-green-300">WhatsApp activo</span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full
                           bg-green-400/10 border border-green-400/20 text-[9px] font-bold
                           text-green-400 uppercase tracking-wider">
            <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
            en línea
          </span>
        </div>
        {phone && (
          <p className="text-xs font-mono text-slate-300 leading-snug">+{phone}</p>
        )}
        <p className="text-[11px] text-slate-500 mt-0.5">
          Última sync: <span className="text-slate-400">{syncLabel}</span>
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WhatsApp Section (for Profile screen)
// ---------------------------------------------------------------------------
export function WhatsAppSection() {
  const queryClient               = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const { data: status, isLoading, dataUpdatedAt } = useQuery<WaStatusResponse>({
    queryKey:       ["whatsapp-status"],
    queryFn:        () => api.get<WaStatusResponse>("/whatsapp/status"),
    refetchInterval: 30_000,
  });

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await api.post("/whatsapp/disconnect", {});
      queryClient.invalidateQueries({ queryKey: ["whatsapp-status"] });
    } finally {
      setDisconnecting(false);
    }
  }

  function handleConnected(phone: string) {
    setShowModal(false);
    queryClient.setQueryData<WaStatusResponse>(["whatsapp-status"], {
      status: "connected",
      phone:  phone || null,
    });
  }

  const isConnected = status?.status === "connected";

  return (
    <>
      <section>
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-1 mb-2">
          WhatsApp
        </p>
        <div className="bg-surface-card rounded-2xl border border-surface-border p-4 space-y-3">

          {isLoading ? (
            <div className="h-16 bg-surface-raised rounded-xl animate-pulse" />
          ) : isConnected ? (
            <>
              <ConnectionMonitor
                phone={status?.phone ?? null}
                syncedAt={dataUpdatedAt}
              />
              <p className="text-[12px] text-slate-500 leading-relaxed">
                Los mensajes automáticos se envían desde este número de WhatsApp.
              </p>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="w-full h-9 text-xs font-semibold rounded-xl
                           border border-red-900/40 text-red-400/70
                           hover:border-red-700/60 hover:text-red-400 hover:bg-red-950/20
                           transition-all disabled:opacity-40"
              >
                {disconnecting ? "Desvinculando…" : "Desvincular WhatsApp"}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Estado</span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold
                                 text-slate-400 bg-slate-700/60 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  Desconectado
                </span>
              </div>
              <p className="text-[12px] text-slate-500 leading-relaxed">
                Vinculá tu número de WhatsApp para que los mensajes a clientes salgan desde tu taller.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="w-full h-11 text-sm font-semibold rounded-xl
                           text-white transition-colors flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #15803D 0%, #16A34A 50%, #15803D 100%)",
                  boxShadow:  "0 2px 12px rgba(22,163,74,0.3)",
                }}
              >
                <IconWhatsapp className="w-4 h-4" />
                Vincular WhatsApp
              </button>
            </>
          )}
        </div>
      </section>

      {showModal && (
        <QRModal
          onClose={() => setShowModal(false)}
          onConnected={handleConnected}
        />
      )}
    </>
  );
}
