import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AudioRecorder } from "../../components/ui/AudioRecorder";
import { aiApi, AiQuoteDraft, AiQuoteItem, QuoteItemType } from "../../api/ai.api";
import { IconX, IconCheck, IconWrench } from "../../components/ui/Icons";

// ────────────────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<QuoteItemType, string> = {
  labor:            "Mano de obra",
  part:             "Repuesto",
  consumable:       "Consumible",
  external_service: "Servicio ext.",
};

const TYPE_COLORS: Record<QuoteItemType, string> = {
  labor:            "text-blue-300  bg-blue-950/60",
  part:             "text-orange-300 bg-orange-950/60",
  consumable:       "text-amber-300  bg-amber-950/60",
  external_service: "text-purple-300 bg-purple-950/60",
};

function formatCLP(n: number): string {
  return n === 0
    ? "—"
    : `$${n.toLocaleString("es-CL")}`;
}

// ────────────────────────────────────────────────────────────────────────────

interface EditableItem extends AiQuoteItem {
  _key: number;
}

interface Props {
  workOrderId: string;
  complaint:   string;
  onClose:     () => void;
  onSaved:     () => void;
}

type Step = "record" | "review" | "saving" | "success";

export function AiQuoteModal({ workOrderId, complaint, onClose, onSaved }: Props) {
  const [step,      setStep]      = useState<Step>("record");
  const [items,     setItems]     = useState<EditableItem[]>([]);
  const [notes,     setNotes]     = useState("");
  const [summary,   setSummary]   = useState("");
  const [recError,  setRecError]  = useState<string | null>(null);

  // ── Mutation: extract quote from transcript ──────────────────────────────
  const extractMutation = useMutation({
    mutationFn: ({ transcript }: { transcript: string }) =>
      aiApi.extractQuote(transcript, complaint),
    onSuccess: (draft: AiQuoteDraft) => {
      setSummary(draft.summary);
      setNotes(draft.notes);
      setItems(draft.items.map((it, i) => ({ ...it, _key: i })));
      setStep("review");
    },
  });

  // ── Mutation: save quote ─────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () =>
      aiApi.saveQuote(
        workOrderId,
        items.map((it) => ({
          type:        it.type,
          description: it.description,
          quantity:    it.quantity,
          unit_price:  it.unit_price_estimate,
        })),
        notes || undefined,
      ),
    onSuccess: () => {
      setStep("success");
      setTimeout(onSaved, 1200);
    },
  });

  // ── Item editing helpers ─────────────────────────────────────────────────
  const updateItem = (key: number, patch: Partial<EditableItem>) => {
    setItems((prev) => prev.map((it) => (it._key === key ? { ...it, ...patch } : it)));
  };

  const removeItem = (key: number) => {
    setItems((prev) => prev.filter((it) => it._key !== key));
  };

  // ── Subtotal ─────────────────────────────────────────────────────────────
  const subtotal = items.reduce((s, it) => s + it.quantity * it.unit_price_estimate, 0);
  const tax      = Math.round(subtotal * 0.19);
  const total    = subtotal + tax;

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-card w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl
                   flex flex-col max-h-[92dvh] overflow-hidden border border-surface-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand/20 flex items-center justify-center">
              <IconWrench className="w-4 h-4 text-brand" />
            </div>
            <div>
              <h2 className="text-slate-100 font-bold text-base leading-none">
                Presupuesto IA
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">
                {step === "record"  && "Dicta el trabajo al mecánico"}
                {step === "review"  && "Revisa y ajusta los ítems"}
                {step === "saving"  && "Guardando…"}
                {step === "success" && "¡Guardado correctamente!"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl
                       text-slate-500 hover:text-slate-200 hover:bg-surface-raised transition-colors"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ─ Step: Record ─ */}
          {step === "record" && (
            <div className="flex flex-col gap-4 p-5">
              <div className="rounded-xl bg-surface-raised/50 border border-surface-border px-4 py-3">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Falla reportada
                </p>
                <p className="text-slate-300 text-sm">{complaint}</p>
              </div>

              {recError && (
                <div className="rounded-xl bg-red-950/40 border border-red-800/50 px-4 py-3">
                  <p className="text-red-400 text-sm">{recError}</p>
                </div>
              )}

              {extractMutation.isError && (
                <div className="rounded-xl bg-red-950/40 border border-red-800/50 px-4 py-3">
                  <p className="text-red-400 text-sm">
                    {(extractMutation.error as Error).message}
                  </p>
                </div>
              )}

              {extractMutation.isPending ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <svg className="animate-spin w-8 h-8 text-brand" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  <p className="text-slate-400 text-sm">Analizando transcripción con IA…</p>
                </div>
              ) : (
                <AudioRecorder
                  onTranscriptReady={(transcript) =>
                    extractMutation.mutate({ transcript })
                  }
                  onError={setRecError}
                />
              )}
            </div>
          )}

          {/* ─ Step: Review ─ */}
          {step === "review" && (
            <div className="flex flex-col gap-4 p-5">
              {/* Summary */}
              {summary && (
                <div className="rounded-xl bg-surface-raised/50 border border-surface-border px-4 py-3">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Resumen IA
                  </p>
                  <p className="text-slate-300 text-sm leading-relaxed">{summary}</p>
                </div>
              )}

              {/* Items */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    Ítems detectados ({items.length})
                  </p>
                  <button
                    onClick={() =>
                      setItems((prev) => [
                        ...prev,
                        {
                          _key:                Date.now(),
                          type:                "labor",
                          description:         "",
                          quantity:            1,
                          unit_price_estimate: 0,
                        },
                      ])
                    }
                    className="text-[11px] text-brand hover:text-brand-hover font-semibold transition-colors"
                  >
                    + Agregar ítem
                  </button>
                </div>

                {items.map((it) => (
                  <div
                    key={it._key}
                    className="bg-surface-raised rounded-xl border border-surface-border overflow-hidden"
                  >
                    {/* Type selector + delete */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-surface-border/60">
                      <select
                        value={it.type}
                        onChange={(e) =>
                          updateItem(it._key, { type: e.target.value as QuoteItemType })
                        }
                        className={`text-[11px] font-semibold px-2 py-1 rounded-md border-0
                                    outline-none cursor-pointer ${TYPE_COLORS[it.type]}`}
                      >
                        {(Object.keys(TYPE_LABELS) as QuoteItemType[]).map((t) => (
                          <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                        ))}
                      </select>
                      <div className="flex-1" />
                      <button
                        onClick={() => removeItem(it._key)}
                        className="text-slate-600 hover:text-red-400 transition-colors"
                      >
                        <IconX className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Description */}
                    <input
                      type="text"
                      value={it.description}
                      onChange={(e) => updateItem(it._key, { description: e.target.value })}
                      placeholder="Descripción del ítem"
                      className="w-full bg-transparent px-3 py-2 text-sm text-slate-200
                                 placeholder-slate-600 focus:outline-none border-b border-surface-border/60"
                    />

                    {/* Qty + Price */}
                    <div className="flex gap-0">
                      <div className="flex-1 flex items-center gap-2 px-3 py-2 border-r border-surface-border/60">
                        <span className="text-[10px] text-slate-600 font-semibold uppercase">Qty</span>
                        <input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={it.quantity}
                          onChange={(e) =>
                            updateItem(it._key, { quantity: parseFloat(e.target.value) || 1 })
                          }
                          className="flex-1 bg-transparent text-sm text-slate-200 text-right
                                     focus:outline-none w-12 tabular-nums"
                        />
                      </div>
                      <div className="flex-1 flex items-center gap-2 px-3 py-2">
                        <span className="text-[10px] text-slate-600 font-semibold uppercase">P.U</span>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={it.unit_price_estimate}
                          onChange={(e) =>
                            updateItem(it._key, {
                              unit_price_estimate: parseInt(e.target.value) || 0,
                            })
                          }
                          className="flex-1 bg-transparent text-sm text-slate-200 text-right
                                     focus:outline-none tabular-nums"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Notas
                </p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Notas adicionales para el cliente…"
                  className="w-full rounded-xl bg-surface-raised border border-surface-border
                             text-slate-200 text-sm px-3 py-2.5 placeholder-slate-600
                             focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                />
              </div>

              {/* Totals */}
              {subtotal > 0 && (
                <div className="rounded-xl bg-surface-raised border border-surface-border overflow-hidden">
                  <div className="flex justify-between px-4 py-2 border-b border-surface-border/60">
                    <span className="text-sm text-slate-400">Subtotal</span>
                    <span className="text-sm text-slate-300 tabular-nums font-mono">{formatCLP(subtotal)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2 border-b border-surface-border/60">
                    <span className="text-sm text-slate-400">IVA (19%)</span>
                    <span className="text-sm text-slate-300 tabular-nums font-mono">{formatCLP(tax)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-sm font-bold text-slate-200">Total</span>
                    <span className="text-base font-black text-brand tabular-nums font-mono">
                      {formatCLP(total)}
                    </span>
                  </div>
                </div>
              )}

              {saveMutation.isError && (
                <div className="rounded-xl bg-red-950/40 border border-red-800/50 px-4 py-3">
                  <p className="text-red-400 text-sm">
                    {(saveMutation.error as Error).message}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ─ Step: Success ─ */}
          {step === "success" && (
            <div className="flex flex-col items-center justify-center gap-4 py-14 px-8">
              <div className="w-14 h-14 rounded-2xl bg-green-950/60 border border-green-800/50
                              flex items-center justify-center">
                <IconCheck className="w-7 h-7 text-green-400" />
              </div>
              <div className="text-center">
                <p className="text-slate-100 font-bold text-lg">Presupuesto guardado</p>
                <p className="text-slate-500 text-sm mt-1">El borrador fue creado exitosamente</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer buttons ── */}
        {step === "review" && (
          <div className="flex gap-3 p-4 border-t border-surface-border flex-shrink-0">
            <button
              onClick={() => setStep("record")}
              className="h-12 px-5 rounded-xl border border-surface-border text-slate-400
                         hover:text-slate-200 font-semibold text-sm transition-colors"
            >
              Rehacer
            </button>
            <button
              onClick={() => {
                setStep("saving");
                saveMutation.mutate();
              }}
              disabled={items.length === 0 || saveMutation.isPending}
              className="flex-1 h-12 rounded-xl bg-brand hover:bg-brand-hover text-white
                         font-bold text-sm transition-colors active:scale-95
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
            >
              {saveMutation.isPending ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <IconCheck className="w-4 h-4" />
              )}
              Guardar presupuesto
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
