// ---------------------------------------------------------------------------
// DiagnosisPanel — inline diagnosis + quote module
// Visible only when work order status === "diagnosing"
// Steps: input (voice | manual) → processing → review → sent
// ---------------------------------------------------------------------------

import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { WorkOrderDetail } from "../../types/work-order";
import { aiApi, AiQuoteDraft, QuoteItemType, SaveQuoteItem } from "../../api/ai.api";
import { IconX } from "../../components/ui/Icons";

// ── Types ───────────────────────────────────────────────────────────────────

type Method = "voice" | "manual";
type Step   = "input" | "processing" | "review" | "sent";

interface ItemRow {
  _key:        number;
  type:        QuoteItemType;
  description: string;
  quantity:    number;
  unit_price:  number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<QuoteItemType, string> = {
  labor:            "Mano de obra",
  part:             "Repuesto",
  consumable:       "Consumible",
  external_service: "Servicio ext.",
};

const TYPE_COLORS: Record<QuoteItemType, string> = {
  labor:            "text-blue-300 bg-blue-950/60",
  part:             "text-orange-300 bg-orange-950/60",
  consumable:       "text-amber-300 bg-amber-950/60",
  external_service: "text-purple-300 bg-purple-950/60",
};

const PROCESSING_MSGS = [
  "Transcribiendo audio…",
  "Analizando con IA…",
  "Identificando repuestos…",
  "Estimando tiempos de trabajo…",
  "Generando presupuesto…",
];

const MAX_SECS = 90;

// ── Helpers ──────────────────────────────────────────────────────────────────

function newItem(): ItemRow {
  return { _key: Date.now() + Math.random(), type: "labor", description: "", quantity: 1, unit_price: 0 };
}

function formatCLP(n: number) {
  return n === 0 ? "—" : `$${n.toLocaleString("es-CL")}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  order:  WorkOrderDetail;
  onSent: () => void;
}

export function DiagnosisPanel({ order, onSent }: Props) {
  const [method,      setMethod]      = useState<Method>("voice");
  const [step,        setStep]        = useState<Step>("input");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript,  setTranscript]  = useState("");
  const [interim,     setInterim]     = useState("");
  const [voiceError,  setVoiceError]  = useState<string | null>(null);
  const [seconds,     setSeconds]     = useState(0);
  const [procMsgIdx,  setProcMsgIdx]  = useState(0);
  const [resumen,     setResumen]     = useState("");
  const [items,       setItems]       = useState<ItemRow[]>([newItem()]);
  const [notes,       setNotes]       = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef  = useRef<any>(null);
  const finalRef        = useRef("");
  const isRecordingRef  = useRef(false);
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const procRef         = useRef<ReturnType<typeof setInterval> | null>(null);

  const SR = typeof window !== "undefined"
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;

  // ── Cycling processing messages ──────────────────────────────────────────

  useEffect(() => {
    if (step !== "processing") {
      if (procRef.current) clearInterval(procRef.current);
      return;
    }
    setProcMsgIdx(0);
    procRef.current = setInterval(() => {
      setProcMsgIdx((i) => (i + 1) % PROCESSING_MSGS.length);
    }, 1200);
    return () => { if (procRef.current) clearInterval(procRef.current); };
  }, [step]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      if (procRef.current)  clearInterval(procRef.current);
    };
  }, []);

  // ── Mutations ────────────────────────────────────────────────────────────

  const extractMutation = useMutation({
    mutationFn: (t: string) => aiApi.extractQuote(t, order.complaint),
    onSuccess: (draft: AiQuoteDraft) => {
      setResumen(draft.summary ?? "");
      setNotes(draft.notes ?? "");
      setItems(draft.items.map((it, i) => ({
        _key:        i,
        type:        it.type,
        description: it.description,
        quantity:    it.quantity,
        unit_price:  it.unit_price_estimate,
      })));
      setStep("review");
    },
    onError: () => setStep("input"),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      aiApi.saveQuote(
        order.id,
        items.map((it): SaveQuoteItem => ({
          type:        it.type,
          description: it.description,
          quantity:    it.quantity,
          unit_price:  it.unit_price,
        })),
        notes || undefined,
        resumen || undefined,
      ),
    onSuccess: () => {
      setStep("sent");
      setTimeout(onSent, 1800);
    },
  });

  // ── Voice recording ──────────────────────────────────────────────────────

  const stopRecording = useCallback((autoSubmit = false) => {
    isRecordingRef.current = false;
    recognitionRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setInterim("");
    if (autoSubmit) {
      const text = finalRef.current.trim();
      if (text) { setStep("processing"); extractMutation.mutate(text); }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = useCallback(() => {
    if (!SR) return;
    finalRef.current = "";
    isRecordingRef.current = true;
    setTranscript(""); setInterim(""); setSeconds(0); setVoiceError(null); setIsRecording(true);

    const rec = new SR();
    rec.continuous     = true;
    rec.interimResults = true;
    rec.lang           = "es-CL";
    recognitionRef.current = rec;

    rec.onresult = (e) => {
      let final = ""; let intr = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript;
        if (e.results[i].isFinal) { final += text + " "; } else { intr += text; }
      }
      if (final) { finalRef.current += final; setTranscript(finalRef.current); }
      setInterim(intr);
    };

    rec.onerror = (e) => {
      if (e.error === "not-allowed") {
        setVoiceError("Permiso de micrófono denegado. Habilítalo en la configuración del navegador.");
      } else if (e.error !== "no-speech") {
        setVoiceError(`Error: ${e.error}`);
      }
      isRecordingRef.current = false;
      setIsRecording(false);
    };

    rec.onend = () => {
      if (recognitionRef.current === rec && isRecordingRef.current) {
        try { rec.start(); } catch (_) { /* already started */ }
      }
    };

    rec.start();

    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_SECS) { stopRecording(true); return MAX_SECS; }
        return s + 1;
      });
    }, 1000);
  }, [SR, stopRecording]);

  // ── Item helpers ─────────────────────────────────────────────────────────

  const updateItem = (key: number, patch: Partial<ItemRow>) =>
    setItems((prev) => prev.map((it) => (it._key === key ? { ...it, ...patch } : it)));

  const removeItem = (key: number) =>
    setItems((prev) => prev.filter((it) => it._key !== key));

  const subtotal = items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const tax      = Math.round(subtotal * 0.19);
  const total    = subtotal + tax;

  const progressPct = Math.min((seconds / MAX_SECS) * 100, 100);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  // ── Sent ──────────────────────────────────────────────────────────────────
  if (step === "sent") {
    return (
      <section className="mx-4 mt-4 bg-violet-950/30 border border-violet-500/40 rounded-2xl
                          p-6 flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-green-950/60 border border-green-800/50
                        flex items-center justify-center">
          <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-white font-bold text-lg">¡Presupuesto enviado!</p>
          <p className="text-violet-300/70 text-sm mt-1">
            El cliente recibirá un mensaje por WhatsApp para aprobar o rechazar el presupuesto.
          </p>
        </div>
      </section>
    );
  }

  // ── Processing ────────────────────────────────────────────────────────────
  if (step === "processing") {
    return (
      <section className="mx-4 mt-4 bg-surface-card border border-surface-border rounded-2xl
                          p-8 flex flex-col items-center gap-6">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-brand/20" />
          <div className="absolute inset-0 rounded-full border-4 border-t-brand
                          border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          <div className="absolute inset-2 rounded-full border-2 border-orange-400/30 animate-spin"
               style={{ animationDirection: "reverse", animationDuration: "0.8s" }} />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">⚙️</div>
        </div>

        <div className="text-center">
          <p className="text-slate-200 font-semibold text-base min-h-[1.5rem]">
            {PROCESSING_MSGS[procMsgIdx]}
          </p>
          <p className="text-slate-500 text-sm mt-1">Esto puede tardar unos segundos</p>
        </div>

        {extractMutation.isError && (
          <div className="rounded-xl bg-red-950/40 border border-red-800/50 px-4 py-3 w-full">
            <p className="text-red-400 text-sm text-center">
              {(extractMutation.error as Error).message}
            </p>
            <button onClick={() => setStep("input")}
                    className="mt-2 w-full text-xs text-red-300 underline text-center">
              Intentar de nuevo
            </button>
          </div>
        )}
      </section>
    );
  }

  // ── Review ────────────────────────────────────────────────────────────────
  if (step === "review") {
    return (
      <section className="mx-4 mt-4 flex flex-col gap-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
            Revisión del presupuesto
          </p>
          <button
            onClick={() => { setStep("input"); setItems([newItem()]); setResumen(""); setNotes(""); }}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            ← Rehacer
          </button>
        </div>

        {/* Card A — Resumen cliente */}
        <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden">
          <div className="px-4 pt-3 pb-1.5 border-b border-surface-border/60">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Resumen para el cliente
            </p>
          </div>
          <textarea
            value={resumen}
            onChange={(e) => setResumen(e.target.value)}
            rows={3}
            placeholder="Describe el diagnóstico con palabras simples para el cliente…"
            className="w-full bg-transparent px-4 py-3 text-slate-200 text-sm leading-relaxed
                       placeholder-slate-600 focus:outline-none resize-none"
          />
        </div>

        {/* Card B — Items */}
        <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-3 pb-1.5 border-b border-surface-border/60">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Ítems del presupuesto
            </p>
            <button
              onClick={() => setItems((prev) => [...prev, newItem()])}
              className="text-[11px] text-brand hover:text-brand-hover font-semibold transition-colors"
            >
              + Agregar
            </button>
          </div>

          <div className="flex flex-col divide-y divide-surface-border/40">
            {items.map((it) => {
              const priceZero = it.unit_price === 0;
              return (
                <div key={it._key} className={priceZero ? "bg-orange-950/15" : ""}>
                  {/* Type + badge + delete */}
                  <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
                    <select
                      value={it.type}
                      onChange={(e) => updateItem(it._key, { type: e.target.value as QuoteItemType })}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border-0
                                  outline-none cursor-pointer ${TYPE_COLORS[it.type]}`}
                    >
                      {(Object.keys(TYPE_LABELS) as QuoteItemType[]).map((t) => (
                        <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                    {priceZero && (
                      <span className="text-[10px] text-orange-400 font-semibold animate-pulse">
                        precio pendiente
                      </span>
                    )}
                    <div className="flex-1" />
                    <button onClick={() => removeItem(it._key)}
                            className="text-slate-600 hover:text-red-400 transition-colors">
                      <IconX className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Description */}
                  <input
                    type="text"
                    value={it.description}
                    onChange={(e) => updateItem(it._key, { description: e.target.value })}
                    placeholder="Descripción del ítem"
                    className="w-full bg-transparent px-3 pb-1.5 text-sm text-slate-200
                               placeholder-slate-600 focus:outline-none"
                  />

                  {/* Qty + Price */}
                  <div className="flex border-t border-surface-border/30">
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 border-r border-surface-border/30">
                      <span className="text-[10px] text-slate-600 font-semibold uppercase">Cant.</span>
                      <input
                        type="number" min="0.5" step="0.5"
                        value={it.quantity}
                        onChange={(e) => updateItem(it._key, { quantity: parseFloat(e.target.value) || 1 })}
                        className="flex-1 bg-transparent text-sm text-slate-200 text-right
                                   focus:outline-none w-10 tabular-nums"
                      />
                    </div>
                    <div className={`flex-1 flex items-center gap-2 px-3 py-2 ${
                      priceZero ? "bg-orange-950/30" : ""
                    }`}>
                      <span className={`text-[10px] font-semibold uppercase ${
                        priceZero ? "text-orange-500" : "text-slate-600"
                      }`}>
                        $ P.U.
                      </span>
                      <input
                        type="number" min="0" step="1000"
                        value={it.unit_price}
                        onChange={(e) => updateItem(it._key, { unit_price: parseInt(e.target.value) || 0 })}
                        className={`flex-1 bg-transparent text-sm text-right focus:outline-none tabular-nums ${
                          priceZero ? "text-orange-400 font-bold" : "text-slate-200"
                        }`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          {subtotal > 0 && (
            <div className="border-t border-surface-border/60">
              <div className="flex justify-between px-4 py-1.5 border-b border-surface-border/40">
                <span className="text-xs text-slate-500">Subtotal</span>
                <span className="text-xs text-slate-400 tabular-nums font-mono">{formatCLP(subtotal)}</span>
              </div>
              <div className="flex justify-between px-4 py-1.5 border-b border-surface-border/40">
                <span className="text-xs text-slate-500">IVA (19%)</span>
                <span className="text-xs text-slate-400 tabular-nums font-mono">{formatCLP(tax)}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-sm font-bold text-slate-200">Total</span>
                <span className="text-base font-black text-brand tabular-nums font-mono">
                  {formatCLP(total)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {saveMutation.isError && (
          <div className="rounded-xl bg-red-950/40 border border-red-800/50 px-4 py-3">
            <p className="text-red-400 text-sm">{(saveMutation.error as Error).message}</p>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={() => saveMutation.mutate()}
          disabled={items.length === 0 || saveMutation.isPending}
          className="w-full h-16 rounded-2xl flex items-center justify-center gap-3
                     font-bold text-white text-[15px] active:scale-[0.98] transition-transform
                     disabled:opacity-50"
          style={{
            background:  "linear-gradient(135deg, #EA580C 0%, #F97316 50%, #C2410C 100%)",
            boxShadow:   "0 4px 24px rgba(249,115,22,0.45), inset 0 1px 0 rgba(255,255,255,0.12)",
          }}
        >
          {saveMutation.isPending ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Enviando…
            </>
          ) : (
            <>
              <svg className="w-5 h-5 opacity-90 flex-shrink-0" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <div className="flex flex-col items-start leading-tight">
                <span className="text-orange-200/70 text-[10px] font-semibold uppercase tracking-widest">
                  Enviar al cliente
                </span>
                <span className="text-white font-black text-[15px] leading-tight">
                  Diagnóstico y Presupuesto
                </span>
              </div>
            </>
          )}
        </button>

        {/* Bottom spacer so CTA clears the ActionBar */}
        <div className="h-2" />
      </section>
    );
  }

  // ── Input step ────────────────────────────────────────────────────────────
  return (
    <section className="mx-4 mt-4 flex flex-col gap-3">

      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
        Diagnóstico y Presupuesto
      </p>

      {/* Method toggle */}
      <div className="flex gap-1.5 bg-surface-raised rounded-2xl p-1">
        {(["voice", "manual"] as Method[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMethod(m); setVoiceError(null); }}
            className={`flex-1 h-10 rounded-xl text-sm font-semibold transition-all ${
              method === m
                ? "bg-surface-card text-slate-100 shadow-sm"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {m === "voice" ? "🎤 Dictar con IA" : "⌨️ Manual"}
          </button>
        ))}
      </div>

      {/* ─ Voice mode ─ */}
      {method === "voice" && (
        <div className="flex flex-col items-center gap-4 py-2">
          {!SR ? (
            <div className="rounded-xl bg-amber-950/40 border border-amber-800/50 px-4 py-3 w-full">
              <p className="text-amber-300 text-sm text-center">
                Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.
              </p>
            </div>
          ) : (
            <>
              {/* Transcript box */}
              {(transcript || interim || isRecording) && (
                <div className="w-full min-h-[4.5rem] rounded-xl bg-surface-raised border border-surface-border p-3">
                  <p className="text-sm text-slate-200 leading-relaxed">
                    {transcript}
                    {interim && <span className="text-slate-500 italic"> {interim}</span>}
                    {isRecording && !transcript && !interim && (
                      <span className="text-slate-600 italic">Escuchando…</span>
                    )}
                  </p>
                </div>
              )}

              {/* Progress bar while recording */}
              {isRecording && (
                <div className="flex items-center gap-3 w-full">
                  <div className="flex-1 h-1 rounded-full bg-surface-raised overflow-hidden">
                    <div
                      className="h-full bg-red-500 transition-all duration-1000 rounded-full"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-red-400 tabular-nums flex-shrink-0">
                    {MAX_SECS - seconds}s
                  </span>
                </div>
              )}

              {/* Big circular mic button */}
              <button
                onClick={() => isRecording ? stopRecording(true) : startRecording()}
                className={`w-24 h-24 rounded-full flex items-center justify-center border-4
                            transition-all duration-200 active:scale-95
                            ${isRecording
                              ? "bg-red-600/30 border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.4)]"
                              : "bg-brand/20 border-brand shadow-[0_0_30px_rgba(249,115,22,0.25)] hover:bg-brand/30"
                            }`}
              >
                {isRecording ? (
                  <svg className="w-8 h-8 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  <svg className="w-9 h-9 text-brand" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                )}
              </button>

              <p className={`text-sm font-semibold transition-colors ${
                isRecording ? "text-red-400" : "text-slate-500"
              }`}>
                {isRecording ? "Grabando… toca para detener y analizar" : "Toca para grabar el diagnóstico"}
              </p>

              {/* Analyze button once transcript is ready */}
              {!isRecording && transcript && (
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => { finalRef.current = ""; setTranscript(""); setInterim(""); }}
                    className="h-11 px-4 rounded-xl border border-surface-border
                               text-slate-400 hover:text-slate-200 text-sm font-semibold"
                  >
                    Regrabar
                  </button>
                  <button
                    onClick={() => { setStep("processing"); extractMutation.mutate(transcript.trim()); }}
                    className="flex-1 h-11 rounded-xl text-white font-bold text-sm
                               active:scale-95 transition-all"
                    style={{ background: "linear-gradient(135deg, #EA580C 0%, #F97316 100%)" }}
                  >
                    Analizar con IA →
                  </button>
                </div>
              )}
            </>
          )}

          {voiceError && (
            <div className="rounded-xl bg-red-950/40 border border-red-800/50 px-4 py-3 w-full">
              <p className="text-red-400 text-sm">{voiceError}</p>
            </div>
          )}
        </div>
      )}

      {/* ─ Manual mode ─ */}
      {method === "manual" && (
        <div className="flex flex-col gap-3">
          {/* Resumen cliente */}
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
              Resumen para el cliente
            </p>
            <textarea
              value={resumen}
              onChange={(e) => setResumen(e.target.value)}
              rows={3}
              placeholder="Explica el diagnóstico con palabras simples para el cliente…"
              className="w-full rounded-xl bg-surface-card border border-surface-border
                         text-slate-200 text-sm px-3 py-2.5 placeholder-slate-600
                         focus:outline-none focus:ring-2 focus:ring-brand resize-none"
            />
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                Ítems del presupuesto
              </p>
              <button
                onClick={() => setItems((prev) => [...prev, newItem()])}
                className="text-[11px] text-brand hover:text-brand-hover font-semibold"
              >
                + Agregar
              </button>
            </div>

            <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden">
              <div className="flex flex-col divide-y divide-surface-border/40">
                {items.map((it) => (
                  <div key={it._key}>
                    <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
                      <select
                        value={it.type}
                        onChange={(e) => updateItem(it._key, { type: e.target.value as QuoteItemType })}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border-0
                                    outline-none cursor-pointer ${TYPE_COLORS[it.type]}`}
                      >
                        {(Object.keys(TYPE_LABELS) as QuoteItemType[]).map((t) => (
                          <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                        ))}
                      </select>
                      <div className="flex-1" />
                      <button onClick={() => removeItem(it._key)}
                              className="text-slate-600 hover:text-red-400 transition-colors">
                        <IconX className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={it.description}
                      onChange={(e) => updateItem(it._key, { description: e.target.value })}
                      placeholder="Descripción"
                      className="w-full bg-transparent px-3 pb-2 text-sm text-slate-200
                                 placeholder-slate-600 focus:outline-none"
                    />

                    <div className="flex border-t border-surface-border/30">
                      <div className="flex-1 flex items-center gap-2 px-3 py-2 border-r border-surface-border/30">
                        <span className="text-[10px] text-slate-600 font-semibold uppercase">Cant.</span>
                        <input
                          type="number" min="0.5" step="0.5"
                          value={it.quantity}
                          onChange={(e) => updateItem(it._key, { quantity: parseFloat(e.target.value) || 1 })}
                          className="flex-1 bg-transparent text-sm text-slate-200 text-right
                                     focus:outline-none w-10 tabular-nums"
                        />
                      </div>
                      <div className="flex-1 flex items-center gap-2 px-3 py-2">
                        <span className="text-[10px] text-slate-600 font-semibold uppercase">$ P.U.</span>
                        <input
                          type="number" min="0" step="1000"
                          value={it.unit_price}
                          onChange={(e) => updateItem(it._key, { unit_price: parseInt(e.target.value) || 0 })}
                          className="flex-1 bg-transparent text-sm text-slate-200 text-right
                                     focus:outline-none tabular-nums"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Go to review */}
          <button
            onClick={() => setStep("review")}
            disabled={items.every((it) => !it.description.trim())}
            className="w-full h-14 rounded-2xl font-bold text-white disabled:opacity-40
                       active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #EA580C 0%, #F97316 50%, #C2410C 100%)" }}
          >
            Revisar presupuesto →
          </button>
        </div>
      )}
    </section>
  );
}
