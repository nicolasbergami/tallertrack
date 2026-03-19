import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { useAuthStore } from "../../store/auth.store";

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
  const [error, setError]       = useState("");
  const [timedOut, setTimedOut] = useState(false);
  const token   = useAuthStore((s) => s.token);
  const abortRef = useRef<AbortController | null>(null);

  const connect = useCallback(() => {
    setQrImage(null);
    setError("");
    setTimedOut(false);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    (async () => {
      try {
        const res = await fetch("/api/v1/whatsapp/connect", {
          headers: { Authorization: `Bearer ${token}` },
          signal:  ctrl.signal,
        });

        if (res.status === 401) {
          useAuthStore.getState().logout();
          window.location.replace("/login");
          return;
        }

        if (!res.ok || !res.body) {
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

          // Process complete SSE lines
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";  // keep incomplete last line

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const payload = JSON.parse(line.slice(6)) as {
                type:    string;
                qr?:     string;
                phone?:  string | null;
                reason?: string;
                message?:string;
              };

              if (payload.type === "qr" && payload.qr) {
                setQrImage(payload.qr);
              } else if (payload.type === "connected") {
                onConnected(payload.phone ?? "");
              } else if (payload.type === "timeout") {
                setTimedOut(true);
              } else if (payload.type === "disconnected" || payload.type === "error") {
                setError(payload.reason ?? payload.message ?? "Desconectado");
              }
            } catch { /* ignore malformed SSE line */ }
          }
        }
      } catch (err: unknown) {
        if ((err as Error).name !== "AbortError") {
          setError("Error de conexión.");
        }
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

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">Conectar WhatsApp</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-2xl leading-none">×</button>
        </div>

        {/* QR / States */}
        {error ? (
          <div className="space-y-3 text-center">
            <p className="text-red-400 text-sm">{error}</p>
            <button onClick={connect}
              className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors text-sm">
              Reintentar
            </button>
          </div>
        ) : timedOut ? (
          <div className="space-y-3 text-center">
            <p className="text-yellow-400 text-sm">El código QR expiró.</p>
            <button onClick={connect}
              className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors text-sm">
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
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Generando código QR…</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WhatsApp Section (for Profile screen)
// ---------------------------------------------------------------------------
export function WhatsAppSection() {
  const queryClient              = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: status, isLoading } = useQuery<WaStatusResponse>({
    queryKey: ["whatsapp-status"],
    queryFn:  () => api.get<WaStatusResponse>("/whatsapp/status"),
    refetchInterval: 30_000,
  });

  async function handleDisconnect() {
    await api.post("/whatsapp/disconnect", {});
    queryClient.invalidateQueries({ queryKey: ["whatsapp-status"] });
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

          {/* Status badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Estado</span>
            {isLoading ? (
              <span className="text-xs text-slate-500">Cargando…</span>
            ) : isConnected ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Conectado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 bg-slate-700 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                Desconectado
              </span>
            )}
          </div>

          {/* Linked phone */}
          {isConnected && status?.phone && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Número</span>
              <span className="text-sm text-slate-200 font-mono">+{status.phone}</span>
            </div>
          )}

          {/* Explainer */}
          <p className="text-[12px] text-slate-500 leading-relaxed">
            {isConnected
              ? "Los mensajes automáticos se envían desde tu número de WhatsApp."
              : "Vinculá tu número de WhatsApp para que los mensajes a clientes salgan desde tu taller."}
          </p>

          {/* CTA */}
          {isConnected ? (
            <button
              onClick={handleDisconnect}
              className="w-full h-10 text-sm font-semibold rounded-xl border border-red-800/50 text-red-400
                         hover:bg-red-950/30 transition-colors"
            >
              Desvincular WhatsApp
            </button>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="w-full h-10 text-sm font-semibold rounded-xl bg-green-600 hover:bg-green-500
                         text-white transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.119 1.535 5.845L.057 23.571l5.9-1.547A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.823 9.823 0 01-5.006-1.37l-.36-.214-3.5.918.933-3.41-.235-.372A9.818 9.818 0 012.182 12C2.182 6.578 6.578 2.182 12 2.182c5.423 0 9.818 4.396 9.818 9.818 0 5.423-4.395 9.818-9.818 9.818z"/>
              </svg>
              Vincular WhatsApp
            </button>
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
