import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";

export function ForgotPassword() {
  const [email,     setEmail]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [sent,      setSent]      = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      setSent(true);
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

        {sent ? (
          /* ── Estado: enviado ── */
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <div className="w-14 h-14 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
              <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Revisá tu email</h2>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                Si <span className="text-slate-200">{email}</span> está registrado, te enviamos un enlace para restablecer tu contraseña. Válido por 1 hora.
              </p>
            </div>
            <Link
              to="/login"
              className="mt-2 text-brand text-sm font-semibold hover:text-brand-hover transition-colors"
            >
              ← Volver al login
            </Link>
          </div>
        ) : (
          /* ── Formulario ── */
          <>
            <div>
              <h1 className="text-white font-bold text-xl">Recuperar contraseña</h1>
              <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                Ingresá tu email y te enviamos un enlace para crear una nueva contraseña.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  autoComplete="email"
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
                ) : "Enviar enlace"}
              </button>
            </form>

            <Link
              to="/login"
              className="text-slate-500 hover:text-slate-300 text-sm text-center transition-colors"
            >
              ← Volver al login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
