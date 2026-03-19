import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useAuthStore } from "../../store/auth.store";

interface LocationState {
  registration_id: string;
  whatsapp_hint:   string;
  expires_in_min:  number;
}

interface VerifyResponse {
  token: string;
  expires_in: string;
  user: {
    id: string; email: string; full_name: string; role: string;
    tenant_id: string; tenant_name: string; tenant_slug: string;
  };
}

const CODE_LENGTH = 6;

export function VerifyOtp() {
  const location = useLocation();
  const navigate  = useNavigate();
  const setAuth   = useAuthStore(s => s.setAuth);

  const state = location.state as LocationState | null;
  const [digits,    setDigits]    = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown,  setCooldown]  = useState(0);
  const [timeLeft,  setTimeLeft]  = useState((state?.expires_in_min ?? 10) * 60);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirigir si no hay estado (acceso directo a /verify)
  useEffect(() => {
    if (!state?.registration_id) navigate("/register", { replace: true });
  }, [state, navigate]);

  // Cuenta regresiva del OTP
  useEffect(() => {
    const t = setInterval(() => setTimeLeft(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  // Cooldown del botón "Reenviar"
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function handleDigit(idx: number, val: string) {
    // Pegar código completo
    if (val.length === CODE_LENGTH && /^\d{6}$/.test(val)) {
      const next = val.split("");
      setDigits(next);
      inputs.current[CODE_LENGTH - 1]?.focus();
      return;
    }
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = digit;
    setDigits(next);
    setError("");
    if (digit && idx < CODE_LENGTH - 1) inputs.current[idx + 1]?.focus();
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  }

  async function handleVerify() {
    const code = digits.join("");
    if (code.length < CODE_LENGTH) { setError("Ingresa los 6 dígitos del código."); return; }
    if (!state) return;

    setLoading(true);
    setError("");
    try {
      const res = await api.post<VerifyResponse>("/onboarding/verify", {
        registration_id: state.registration_id,
        otp_code:        code,
      });
      setAuth(res.token, {
        id:         res.user.id,
        email:      res.user.email,
        name:       res.user.full_name,
        role:       res.user.role as "owner",
        tenantId:   res.user.tenant_id,
        tenantName: res.user.tenant_name,
        tenantSlug: res.user.tenant_slug,
      });
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Código incorrecto");
      setDigits(Array(CODE_LENGTH).fill(""));
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!state || cooldown > 0) return;
    setResending(true);
    setError("");
    try {
      await api.post("/onboarding/resend-otp", { registration_id: state.registration_id });
      setTimeLeft(10 * 60);
      setCooldown(60);
      setDigits(Array(CODE_LENGTH).fill(""));
      inputs.current[0]?.focus();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo reenviar el código");
    } finally {
      setResending(false);
    }
  }

  if (!state) return null;

  const codeComplete = digits.every(d => d !== "");
  const expired = timeLeft === 0;

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-600 mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">Verificar WhatsApp</h1>
          <p className="text-slate-400 text-sm mt-1">
            Enviamos un código a <span className="text-white font-medium">{state.whatsapp_hint}</span>
          </p>
        </div>

        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 space-y-5">

          {/* Temporizador */}
          <div className={`text-center text-sm font-mono font-semibold ${expired ? "text-red-400" : "text-slate-400"}`}>
            {expired ? "⏱ Código expirado" : `Expira en ${formatTime(timeLeft)}`}
          </div>

          {/* Inputs OTP */}
          <div className="flex justify-center gap-2">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { inputs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={d}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onFocus={e => e.target.select()}
                disabled={loading || expired}
                className={[
                  "w-11 h-14 text-center text-xl font-bold rounded-xl border-2 bg-slate-700 text-white",
                  "focus:outline-none transition-colors",
                  error ? "border-red-500" : "border-slate-600 focus:border-blue-500",
                  (loading || expired) ? "opacity-50" : "",
                ].join(" ")}
              />
            ))}
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            onClick={handleVerify}
            disabled={loading || !codeComplete || expired}
            className="w-full h-12 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
          >
            {loading ? "Verificando…" : "Verificar y entrar →"}
          </button>

          {/* Reenviar */}
          <div className="text-center">
            <button
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              className="text-sm text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {resending
                ? "Reenviando…"
                : cooldown > 0
                  ? `Reenviar en ${cooldown}s`
                  : "¿No recibiste el código? Reenviar"}
            </button>
          </div>

          <button
            onClick={() => navigate("/register")}
            className="w-full text-sm text-slate-500 hover:text-slate-300 transition-colors py-1"
          >
            ← Volver al registro
          </button>
        </div>
      </div>
    </div>
  );
}
