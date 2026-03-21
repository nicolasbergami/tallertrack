import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../../store/auth.store";
import { IconEye, IconEyeOff } from "../../components/ui/Icons";

async function loginRequest(email: string, password: string) {
  const res = await fetch("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body as {
    token: string;
    user: { id: string; full_name: string; email: string; role: "owner" | "admin" | "mechanic" | "receptionist"; tenant_id: string; tenant_name: string; tenant_slug: string };
  };
}

export function Login() {
  const navigate   = useNavigate();
  const setAuth    = useAuthStore((s) => s.setAuth);

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [success,  setSuccess]  = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { token, user } = await loginRequest(email.trim(), password);
      setAuth(token, {
        id:         user.id,
        name:       user.full_name,
        email:      user.email,
        role:       user.role,
        tenantId:   user.tenant_id,
        tenantName: user.tenant_name,
        tenantSlug: user.tenant_slug ?? "",
      });
      // Brief success animation before navigating
      setSuccess(true);
      sessionStorage.removeItem("splashShown"); // reset splash for next session
      setTimeout(() => navigate("/dashboard", { replace: true }), 600);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4">

      {/* Login success overlay */}
      {success && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "#0F172A",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          animation: "loginFadeIn 0.4s ease forwards",
        }}>
          <img src="/logo.png" alt="TallerTrack" style={{
            height: 120, width: "auto",
            animation: "splashLogo 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
          }} />
          <style>{`
            @keyframes loginFadeIn {
              from { opacity: 0; } to { opacity: 1; }
            }
            @keyframes splashLogo {
              from { opacity: 0; transform: scale(0.8); }
              to   { opacity: 1; transform: scale(1);   }
            }
          `}</style>
        </div>
      )}

      {/* Logo */}
      <div className="mb-8 text-center">
        <img src="/logo.png" alt="TallerTrack" className="h-20 w-auto mx-auto mb-2" />
        <p className="text-gray-400 text-sm mt-1">Panel de gestión del taller</p>
      </div>

      {/* Card */}
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-surface-card rounded-2xl border border-surface-border p-7 flex flex-col gap-5 shadow-xl"
      >
        <h1 className="text-white font-bold text-xl">Iniciar sesión</h1>

        {/* Email */}
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

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Contraseña
          </label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
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

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="h-14 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-base
                     flex items-center justify-center gap-2 transition-all active:scale-95
                     disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-900/30"
        >
          {loading ? (
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : "Ingresar"}
        </button>

        {/* Dev hint */}
        {import.meta.env.DEV && (
          <button
            type="button"
            onClick={() => { setEmail("owner@tallertrack.com"); setPassword("Admin1234!"); }}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors text-center"
          >
            Usar credenciales de demo
          </button>
        )}
      </form>

      <p className="mt-6 text-sm text-slate-500">
        ¿No tenés cuenta?{" "}
        <Link to="/register" className="text-brand font-semibold hover:text-brand-hover transition-colors">
          Registrá tu taller gratis
        </Link>
      </p>

      <p className="mt-4 text-xs text-gray-600">
        © {new Date().getFullYear()} TallerTrack
      </p>
    </div>
  );
}
