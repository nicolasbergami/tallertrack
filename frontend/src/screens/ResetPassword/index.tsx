import { useState, FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../api/client";
import { IconEye, IconEyeOff } from "../../components/ui/Icons";

export function ResetPassword() {
  const navigate               = useNavigate();
  const [searchParams]         = useSearchParams();
  const token                  = searchParams.get("token") ?? "";

  const [password,   setPassword]   = useState("");
  const [confirm,    setConfirm]    = useState("");
  const [showPass,   setShowPass]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // Token ausente — mostrar error directo
  if (!token) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm bg-surface-card rounded-2xl border border-surface-border p-7 text-center flex flex-col gap-4 shadow-xl">
          <p className="text-red-400 text-sm">Enlace inválido o expirado.</p>
          <Link to="/forgot-password" className="text-brand text-sm font-semibold hover:text-brand-hover transition-colors">
            Solicitar nuevo enlace →
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setSuccess(true);
      setTimeout(() => navigate("/login", { replace: true }), 2500);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4">

      {/* Logo */}
      <div className="mb-8 text-center">
        <img src="/logo.png" alt="TallerTrack" className="h-20 w-auto mx-auto mb-2" />
        <p className="text-gray-400 text-sm mt-1">Panel de gestión del taller</p>
      </div>

      <div className="w-full max-w-sm bg-surface-card rounded-2xl border border-surface-border p-7 flex flex-col gap-5 shadow-xl">

        {success ? (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <div className="w-14 h-14 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
              <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">¡Contraseña actualizada!</h2>
              <p className="text-slate-400 text-sm mt-2">Redirigiendo al login…</p>
            </div>
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-white font-bold text-xl">Nueva contraseña</h1>
              <p className="text-slate-400 text-sm mt-1">Elegí una contraseña segura de al menos 8 caracteres.</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              {/* Nueva contraseña */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    required
                    autoComplete="new-password"
                    className="h-12 w-full rounded-xl bg-surface-raised border border-surface-border text-white
                               px-4 pr-12 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    {showPass ? <IconEyeOff className="w-5 h-5" /> : <IconEye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirmar contraseña */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Confirmar contraseña
                </label>
                <input
                  type={showPass ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repetí la contraseña"
                  required
                  autoComplete="new-password"
                  className="h-12 rounded-xl bg-surface-raised border border-surface-border text-white
                             px-4 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="h-12 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-sm
                           flex items-center justify-center transition-all active:scale-95
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : "Guardar contraseña"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
