import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { publicTrackingApi, PublicHistoryEntry } from "../../api/public-tracking.api";
import { ProgressStepper } from "./ProgressStepper";
import { QuoteSection } from "./QuoteSection";

// Human-readable status for the hero badge
const STATUS_DISPLAY: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  received:        { label: "Recibido",             bg: "bg-blue-50",    text: "text-blue-700",   dot: "bg-blue-400"   },
  diagnosing:      { label: "En diagnóstico",        bg: "bg-sky-50",     text: "text-sky-700",    dot: "bg-sky-400"    },
  awaiting_parts:  { label: "Esperando repuestos",   bg: "bg-amber-50",   text: "text-amber-700",  dot: "bg-amber-400"  },
  in_progress:     { label: "En reparación",         bg: "bg-orange-50",  text: "text-orange-700", dot: "bg-orange-400" },
  quality_control: { label: "Control de calidad",    bg: "bg-purple-50",  text: "text-purple-700", dot: "bg-purple-400" },
  ready:           { label: "¡Listo para retirar!",  bg: "bg-green-50",   text: "text-green-700",  dot: "bg-green-500"  },
  delivered:       { label: "Entregado",             bg: "bg-teal-50",    text: "text-teal-700",   dot: "bg-teal-400"   },
  cancelled:       { label: "Cancelado",             bg: "bg-red-50",     text: "text-red-700",    dot: "bg-red-400"    },
};

export function PublicTracking() {
  const { tenantSlug, orderNumber } = useParams<{ tenantSlug: string; orderNumber: string }>();

  const queryKey = ["public-order", tenantSlug, orderNumber];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => publicTrackingApi.getOrder(tenantSlug!, orderNumber!),
    enabled: !!tenantSlug && !!orderNumber,
    refetchInterval: 30_000,
  });

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <PublicShell>
        <div className="flex flex-col gap-4 animate-pulse">
          <div className="h-28 bg-gray-100 rounded-2xl" />
          <div className="h-20 bg-gray-100 rounded-2xl" />
          <div className="h-48 bg-gray-100 rounded-2xl" />
        </div>
      </PublicShell>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <PublicShell>
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <span className="text-6xl">🔍</span>
          <h2 className="text-xl font-bold text-gray-700">Orden no encontrada</h2>
          <p className="text-gray-400 max-w-xs">
            Verifica que el código QR sea correcto o consulta directamente con el taller.
          </p>
        </div>
      </PublicShell>
    );
  }

  const statusDisplay = STATUS_DISPLAY[data.status] ?? STATUS_DISPLAY.received;
  const isReady       = data.status === "ready";
  const hasPendingQuote = data.quotes.some((q) => q.status === "sent");

  return (
    <PublicShell workshopName={data.workshop.name}>
      <div className="flex flex-col gap-5">

        {/* ── Hero status card ── */}
        <div className={`rounded-2xl p-5 ${statusDisplay.bg} border ${isReady ? "border-green-300 shadow-md shadow-green-100" : "border-transparent"}`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${statusDisplay.dot} ${isReady ? "animate-pulse" : ""}`} />
              <span className={`text-xl font-black ${statusDisplay.text}`}>
                {statusDisplay.label}
              </span>
            </div>
            <span className="font-mono text-sm font-bold text-gray-400 bg-white/70 px-3 py-1 rounded-lg">
              {data.order_number}
            </span>
          </div>

          {/* Ready-to-pick-up callout */}
          {isReady && (
            <div className="mt-4 bg-green-600 text-white rounded-xl p-4 flex items-center gap-3">
              <span className="text-3xl">🎉</span>
              <div>
                <p className="font-bold">¡Tu vehículo está listo!</p>
                <p className="text-green-100 text-sm">Puedes pasar a retirarlo cuando quieras.</p>
              </div>
            </div>
          )}

          {/* Action required callout */}
          {hasPendingQuote && (
            <div className="mt-4 bg-orange-500 text-white rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl">📋</span>
              <div>
                <p className="font-bold">Presupuesto pendiente de aprobación</p>
                <p className="text-orange-100 text-sm">Revisa el presupuesto más abajo y apruébalo para continuar.</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Vehicle info ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-gray-800 px-5 py-3 flex items-center justify-between">
            <span className="text-white font-black text-2xl tracking-[0.15em]">
              {data.vehicle.plate}
            </span>
            <span className="text-gray-400 text-sm">
              {data.vehicle.color}
            </span>
          </div>
          <div className="px-5 py-4 grid grid-cols-2 gap-3">
            <InfoCell label="Vehículo" value={`${data.vehicle.brand} ${data.vehicle.model}`} />
            {data.vehicle.year && <InfoCell label="Año" value={String(data.vehicle.year)} />}
            <InfoCell
              label="Ingresado"
              value={new Date(data.received_at).toLocaleDateString("es-CL", {
                day: "2-digit", month: "long",
              })}
            />
            {data.estimated_delivery && (
              <InfoCell
                label="Entrega estimada"
                value={new Date(data.estimated_delivery).toLocaleDateString("es-CL", {
                  day: "2-digit", month: "long",
                })}
                highlight
              />
            )}
          </div>
        </div>

        {/* ── Progress stepper ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-5">
            Progreso de la reparación
          </h2>
          <ProgressStepper status={data.status} />
        </div>

        {/* ── Complaint ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-2">
            Motivo de ingreso
          </h2>
          <p className="text-gray-700 leading-relaxed">{data.complaint}</p>
        </div>

        {/* ── Diagnosis (if available) ── */}
        {data.diagnosis && (
          <div className="bg-sky-50 rounded-2xl border border-sky-100 p-5">
            <h2 className="text-sm font-bold text-sky-500 uppercase tracking-wide mb-2">
              🔍 Diagnóstico del mecánico
            </h2>
            <p className="text-sky-800 leading-relaxed">{data.diagnosis}</p>
          </div>
        )}

        {/* ── Quotes ── */}
        {data.quotes.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-bold text-gray-700">
              {data.quotes.length === 1 ? "Presupuesto" : "Presupuestos"}
            </h2>
            {data.quotes.map((quote) => (
              <QuoteSection
                key={quote.id}
                quote={quote}
                tenantSlug={tenantSlug!}
                orderNumber={orderNumber!}
                queryKey={queryKey}
              />
            ))}
          </div>
        )}

        {/* ── Status timeline ── */}
        {data.history.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4">
              Historial
            </h2>
            <div className="flex flex-col gap-0">
              {data.history.map((entry, idx) => (
                <HistoryRow key={idx} entry={entry} />
              ))}
            </div>
          </div>
        )}

        {/* ── Contact workshop ── */}
        {data.workshop.phone && (
          <a
            href={`https://wa.me/${data.workshop.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola, consulto por mi vehículo ${data.vehicle.plate}, orden ${data.order_number}.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 h-14 rounded-2xl
                       bg-green-600 hover:bg-green-700 text-white font-bold text-base
                       shadow-md shadow-green-200 active:scale-95 transition-all"
          >
            <span className="text-xl">💬</span>
            Consultar por WhatsApp
          </a>
        )}
      </div>
    </PublicShell>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function PublicShell({ children, workshopName }: { children: React.ReactNode; workshopName?: string }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-orange-500 font-black text-lg tracking-tight">TallerTrack</span>
            {workshopName && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-gray-600 text-sm font-medium truncate max-w-[160px]">{workshopName}</span>
              </>
            )}
          </div>
          <span className="text-xs text-gray-400">Seguimiento en tiempo real</span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="max-w-xl mx-auto px-4 py-8 text-center">
        <p className="text-xs text-gray-300">
          Impulsado por <span className="font-semibold text-orange-400">TallerTrack</span> · Gestión moderna para talleres
        </p>
      </footer>
    </div>
  );
}

function InfoCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className={`font-semibold mt-0.5 ${highlight ? "text-orange-600" : "text-gray-800"}`}>{value}</p>
    </div>
  );
}

const ACTION_LABELS: Record<string, string> = {
  created:                    "Orden recibida en el taller",
  status_changed:             "Estado actualizado",
  quote_approved_by_client:   "Presupuesto aprobado por el cliente",
  quote_rejected_by_client:   "Presupuesto rechazado por el cliente",
};

const STATUS_LABELS_ES: Record<string, string> = {
  received: "Recibido", diagnosing: "En diagnóstico",
  awaiting_parts: "Esperando repuestos", in_progress: "En reparación",
  quality_control: "Control de calidad", ready: "Listo",
  delivered: "Entregado", cancelled: "Cancelado",
};

function HistoryRow({ entry }: { entry: PublicHistoryEntry }) {
  const label = ACTION_LABELS[entry.action] ?? entry.action;
  const isQuoteAction = entry.action.includes("quote");

  return (
    <div className="flex gap-3 pb-4 last:pb-0">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0
          ${isQuoteAction ? "bg-orange-400" : "bg-gray-300"}`} />
        <div className="w-px flex-1 bg-gray-100 mt-1" />
      </div>
      <div className="pb-2">
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        {entry.to_status && (
          <p className="text-xs text-gray-400 mt-0.5">
            → {STATUS_LABELS_ES[entry.to_status] ?? entry.to_status}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">
          {new Date(entry.performed_at).toLocaleString("es-CL", {
            day: "2-digit", month: "short",
            hour: "2-digit", minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
