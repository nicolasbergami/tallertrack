import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../../api/client";
import { useAuthStore } from "../../store/auth.store";

interface RegisterResponse {
  token:      string;
  expires_in: string;
  user: {
    id: string; email: string; full_name: string; role: string;
    tenant_id: string; tenant_name: string; tenant_slug: string;
  };
}

interface FieldError { [key: string]: string }

export function Register() {
  const navigate = useNavigate();
  const setAuth  = useAuthStore(s => s.setAuth);

  const [form, setForm] = useState({
    workshop_name: "",
    cuit:          "",
    whatsapp:      "+54",
    email:         "",
    password:      "",
    confirmPassword: "",
  });

  const [errors,  setErrors]  = useState<FieldError>({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;
      if (field === "whatsapp" && !value.startsWith("+54")) {
        value = "+54" + value.replace(/^\+54/, "");
      }
      setForm(prev => ({ ...prev, [field]: value }));
      setErrors(prev => ({ ...prev, [field]: "" }));
      setApiError("");
    };
  }

  function validate(): boolean {
    const e: FieldError = {};
    if (!form.workshop_name.trim()) e.workshop_name = "Requerido";
    if (!form.cuit.trim())          e.cuit = "Requerido";
    else if (!/^\d{2}-?\d{8}-?\d$/.test(form.cuit.replace(/\s/g,"")))
      e.cuit = "Formato: XX-XXXXXXXX-X";
    if (form.whatsapp.trim() === "+54" || !form.whatsapp.trim()) e.whatsapp = "Ingresá tu número de WhatsApp";
    if (!form.email.trim())         e.email = "Requerido";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Email inválido";
    if (!form.password)             e.password = "Requerido";
    else if (form.password.length < 8) e.password = "Mínimo 8 caracteres";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Las contraseñas no coinciden";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setApiError("");
    try {
      const res = await api.post<RegisterResponse>("/onboarding/register", {
        workshop_name: form.workshop_name.trim(),
        email:         form.email.trim(),
        password:      form.password,
        whatsapp:      form.whatsapp.trim(),
        cuit:          form.cuit.trim(),
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
      const msg = err instanceof Error ? err.message : "Error al registrarse";
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a7 7 0 100 14A7 7 0 0011 4zM21 21l-4.35-4.35" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Crear cuenta en TallerTrack</h1>
          <p className="text-slate-400 mt-1 text-sm">1 mes gratis · Sin tarjeta de crédito</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-800 rounded-2xl p-6 space-y-4 border border-slate-700">

          {apiError && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3">
              {apiError}
            </div>
          )}

          <Field label="Nombre del Taller" error={errors.workshop_name}>
            <input
              type="text" value={form.workshop_name} onChange={set("workshop_name")}
              placeholder="Ej: Taller Mecánico García"
              className={inputClass(errors.workshop_name)}
            />
          </Field>

          <Field label="CUIT / CUIL" error={errors.cuit}>
            <input
              type="text" value={form.cuit} onChange={set("cuit")}
              placeholder="20-12345678-9"
              className={inputClass(errors.cuit)}
            />
          </Field>

          <Field label="WhatsApp del Taller" error={errors.whatsapp}>
            <input
              type="tel" value={form.whatsapp} onChange={set("whatsapp")}
              placeholder="+5491112345678"
              className={inputClass(errors.whatsapp)}
            />
          </Field>

          <Field label="Email" error={errors.email}>
            <input
              type="email" value={form.email} onChange={set("email")}
              placeholder="admin@mitaller.com"
              className={inputClass(errors.email)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Contraseña" error={errors.password}>
              <input
                type="password" value={form.password} onChange={set("password")}
                placeholder="Mín. 8 caracteres"
                className={inputClass(errors.password)}
              />
            </Field>
            <Field label="Confirmar" error={errors.confirmPassword}>
              <input
                type="password" value={form.confirmPassword} onChange={set("confirmPassword")}
                placeholder="Repetir contraseña"
                className={inputClass(errors.confirmPassword)}
              />
            </Field>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full h-12 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors mt-2"
          >
            {loading ? "Creando cuenta…" : "Crear cuenta →"}
          </button>

          <p className="text-center text-slate-500 text-sm pt-1">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="text-blue-400 hover:underline">Iniciar sesión</Link>
          </p>
        </form>

        <p className="text-center text-slate-600 text-xs mt-6">
          Al registrarte aceptas los Términos de Servicio y la Política de Privacidad.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------
function inputClass(error?: string) {
  return [
    "w-full bg-slate-700 border rounded-lg px-3 py-2.5 text-white text-sm",
    "placeholder-slate-500 focus:outline-none focus:ring-2 transition-colors",
    error
      ? "border-red-500 focus:ring-red-500/30"
      : "border-slate-600 focus:ring-blue-500/40 focus:border-blue-500",
  ].join(" ");
}

function Field({ label, error, children }: {
  label: string; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
