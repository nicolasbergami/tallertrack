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
// QR Modal — streams SSE events from /api/v1/whatsapp/connect
// ---------------------------------------------------------------------------
function QRModal({ onClose, onConnected }: { onClose: () => void; onConnected: (phone: string) => void }) {
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

  useEffect(() => {
    connect();
    return () => { abortRef.current?.abort(); };
  }, [connect]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-slate-800 rounded-2xl border border-slate-700 p-6 space-y-5">

        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">Conectar WhatsApp</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-2xl leading-none">×</button>
        </div>

        {error ? (
          <div className="space-y-3 text-center">
            <p className="text-red-400 text-sm">{error}</p>
            <button onClick={connect}
              className="w-full h-11 bg-green-700 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors text-sm">
              Reintentar
            </button>
          </div>
        ) : timedOut ? (
          <div className="space-y-3 text-center">
            <p className="text-yellow-400 text-sm">El código QR expiró.</p>
            <button onClick={connect}
              className="w-full h-11 bg-green-700 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors text-sm">
              Generar nuevo QR
            </button>
          </div>
        ) : qrImage ? (
          <div className="space-y-3">
            <p className="text-slate-400 text-sm text-center">
              Abrí WhatsApp → <strong className="text-slate-200">Dispositivos vinculados</strong> → Vincular dispositivo
            </p>
            <div className="flex justify-center">
              <img src={qrImage} alt="QR WhatsApp" className="w-64 h-64 rounded-xl bg-white p-2" />
            </div>
            <p className="text-[11px] text-slate-500 text-center">El código se actualiza cada ~60 segundos</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Generando código QR…</p>
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
      {/* WhatsApp icon with green glow */}
      <div className="relative flex-shrink-0">
        {/* Outer pulsing ring */}
        <div className="absolute inset-0 rounded-full bg-green-500/15 animate-pulse scale-[1.4]" />
        {/* Icon container */}
        <div
          className="relative w-12 h-12 rounded-full bg-green-900/50 border border-green-700/60
                     flex items-center justify-center"
          style={{ boxShadow: "0 0 18px rgba(74,222,128,0.35), 0 0 6px rgba(74,222,128,0.2)" }}
        >
          <IconWhatsapp className="w-6 h-6 text-green-400" />
        </div>
      </div>

      {/* Info */}
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
              {/* ── Connection Health Monitor ── */}
              <ConnectionMonitor
                phone={status?.phone ?? null}
                syncedAt={dataUpdatedAt}
              />

              <p className="text-[12px] text-slate-500 leading-relaxed">
                Los mensajes automáticos se envían desde este número de WhatsApp.
              </p>

              {/* ── Ghost disconnect button ── */}
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
              {/* ── Disconnected state ── */}
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

              {/* ── Connect button ── */}
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
