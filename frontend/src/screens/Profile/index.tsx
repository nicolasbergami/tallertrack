import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppShell } from "../../components/layout/AppShell";
import { useAuthStore } from "../../store/auth.store";
import { IconLogout, IconChevronRight, IconTeam } from "../../components/ui/Icons";
import { WhatsAppSection } from "./WhatsAppSection";
import { tenantApi } from "../../api/tenant.api";
import { useSubscription } from "../../config/features.config";
import { PremiumModal } from "../../components/ui/PremiumModal";

const ROLE_LABELS: Record<string, string> = {
  owner:        "Propietario",
  admin:        "Administrador",
  mechanic:     "Mecánico",
  receptionist: "Recepcionista",
};

export function Profile() {
  const navigate = useNavigate();
  const user     = useAuthStore((s) => s.user);
  const logout   = useAuthStore((s) => s.logout);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <AppShell title="Perfil">
      <div className="flex flex-col gap-4 p-4 animate-slide-up">

        {/* Avatar + name */}
        <div className="bg-surface-card rounded-2xl border border-surface-border p-5
                        flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand/20 border border-brand/30
                          flex items-center justify-center flex-shrink-0">
            <span className="text-brand font-black text-xl">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-slate-100 font-bold text-base truncate">{user.name}</p>
            <p className="text-slate-400 text-sm">{user.email}</p>
            <span className="inline-block mt-1 text-[11px] font-semibold text-brand/80
                             bg-brand/10 px-2 py-0.5 rounded-md">
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          </div>
        </div>

        {/* Tenant */}
        <section>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-1 mb-2">
            Taller
          </p>
          <div className="bg-surface-card rounded-2xl border border-surface-border divide-y divide-surface-border">
            <InfoRow label="Nombre" value={user.tenantName} />
            <CopyRow label="ID de taller" display={user.tenantId.slice(0, 8) + "…"} fullValue={user.tenantId} />
          </div>
        </section>

        {/* Brand logo — only visible to owner/admin */}
        {(user.role === "owner" || user.role === "admin") && (
          <LogoBrandingSection />
        )}

        {/* Account */}
        <section>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-1 mb-2">
            Cuenta
          </p>
          <div className="bg-surface-card rounded-2xl border border-surface-border divide-y divide-surface-border">
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Rol" value={ROLE_LABELS[user.role] ?? user.role} />
          </div>
        </section>

        {/* Team — only for owner/admin */}
        {(user.role === "owner" || user.role === "admin") && (
          <section>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-1 mb-2">
              Gestión
            </p>
            <Link to="/team"
              className="flex items-center justify-between gap-3 w-full p-4
                         bg-surface-card rounded-2xl border border-surface-border
                         hover:bg-slate-700/40 transition-colors text-slate-200 group active:scale-[0.99]">
              <div className="flex items-center gap-3">
                <IconTeam className="w-5 h-5 text-brand" />
                <span className="font-semibold text-sm">Mi equipo</span>
              </div>
              <IconChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
            </Link>
          </section>
        )}

        {/* Subscription */}
        <section>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-1 mb-2">
            Plan
          </p>
          <Link to="/billing"
            className="flex items-center justify-between gap-3 w-full p-4
                       bg-surface-card rounded-2xl border border-surface-border
                       hover:bg-slate-700/40 transition-colors text-slate-200 group active:scale-[0.99]">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span className="font-semibold text-sm">Suscripción y facturación</span>
            </div>
            <IconChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
          </Link>
        </section>

        {/* WhatsApp connection */}
        <WhatsAppSection />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center justify-between gap-3 w-full p-4
                     bg-surface-card rounded-2xl border border-surface-border
                     hover:bg-red-950/30 hover:border-red-900/50 transition-colors
                     text-red-400 group active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <IconLogout className="w-5 h-5" />
            <span className="font-semibold text-sm">Cerrar sesión</span>
          </div>
          <IconChevronRight className="w-4 h-4 text-red-600 group-hover:text-red-400 transition-colors" />
        </button>

        <p className="text-center text-[11px] text-slate-600 pb-2">
          TallerTrack · v1.0.0
        </p>
      </div>
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// LogoBrandingSection
// ---------------------------------------------------------------------------

function LogoBrandingSection() {
  const { canAccess } = useSubscription();
  const hasAccess     = canAccess("brand_logo");
  const [urlInput, setUrlInput] = useState("");
  const [paywallOpen, setPaywallOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["tenant-settings"],
    queryFn:  () => tenantApi.getSettings(),
    enabled:  hasAccess,
  });

  const currentLogoUrl = data?.settings?.logo_url ?? null;

  // Pre-fill input once data loads
  const [synced, setSynced] = useState(false);
  if (!synced && currentLogoUrl && !urlInput) {
    setUrlInput(currentLogoUrl);
    setSynced(true);
  }

  const mutation = useMutation({
    mutationFn: () => tenantApi.updateLogo(urlInput.trim() || null),
    onSuccess: () => {
      setSynced(false); // refetch will re-sync
    },
  });

  return (
    <section>
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-1 mb-2">
        Marca del Taller
      </p>

      <div className="bg-surface-card rounded-2xl border border-surface-border p-4 flex flex-col gap-4">

        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎨</span>
            <p className="text-slate-200 font-semibold text-sm">Logo del Taller</p>
          </div>
          {!hasAccess && (
            <span className="text-[10px] font-black uppercase tracking-wider text-violet-400
                             bg-violet-500/15 border border-violet-500/30 px-2 py-1 rounded-full">
              Plan Pro
            </span>
          )}
        </div>

        {hasAccess ? (
          <>
            {/* Logo preview */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl border border-surface-border bg-slate-800
                              flex items-center justify-center flex-shrink-0 overflow-hidden">
                {currentLogoUrl ? (
                  <img
                    src={currentLogoUrl}
                    alt="Logo del taller"
                    className="w-full h-full object-contain p-1"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <span className="text-2xl opacity-40">🏪</span>
                )}
              </div>
              <div>
                <p className="text-slate-300 text-sm font-medium">
                  {currentLogoUrl ? "Logo configurado" : "Sin logo"}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  Se muestra en los presupuestos de tus clientes
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="h-10 bg-slate-800 rounded-xl animate-pulse" />
            ) : (
              <div className="flex flex-col gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://mi-taller.com/logo.png"
                  className="w-full h-10 px-3 rounded-xl bg-slate-800 border border-surface-border
                             text-slate-200 text-sm placeholder-slate-600
                             focus:outline-none focus:ring-2 focus:ring-brand"
                />
                {mutation.isError && (
                  <p className="text-red-400 text-xs">
                    {(mutation.error as Error).message}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => mutation.mutate()}
                    disabled={mutation.isPending}
                    className="flex-1 h-10 rounded-xl bg-brand hover:bg-brand-hover
                               text-white font-semibold text-sm transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {mutation.isPending ? "Guardando…" : mutation.isSuccess ? "¡Guardado!" : "Guardar logo"}
                  </button>
                  {currentLogoUrl && (
                    <button
                      onClick={() => { setUrlInput(""); mutation.mutate(); }}
                      disabled={mutation.isPending}
                      className="h-10 px-4 rounded-xl border border-slate-700 text-slate-400
                                 hover:text-red-400 hover:border-red-900/50 text-sm transition-colors"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Locked state */
          <button
            onClick={() => setPaywallOpen(true)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3
                       rounded-xl border border-dashed border-slate-700 bg-slate-800/40
                       hover:border-violet-700/50 hover:bg-violet-950/20
                       transition-all group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl border border-slate-700 bg-slate-800
                              flex items-center justify-center flex-shrink-0">
                <span className="text-xl opacity-40">🏪</span>
              </div>
              <div className="text-left">
                <p className="text-slate-400 text-sm font-medium">Subí el logo de tu taller</p>
                <p className="text-slate-600 text-xs">Disponible en Plan Taller Pro</p>
              </div>
            </div>
            <span className="text-slate-500 group-hover:text-violet-400 transition-colors text-xl">
              🔒
            </span>
          </button>
        )}
      </div>

      <PremiumModal
        isOpen={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        feature="brand_logo"
      />
    </section>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-sm text-slate-200 font-medium truncate max-w-[60%] text-right ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}

// Inline copy icon SVG
function IconCopy({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function CopyRow({ label, display, fullValue }: { label: string; display: string; fullValue: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(fullValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 group"
        title="Copiar ID completo"
      >
        <span className="text-sm text-slate-200 font-mono">{display}</span>
        {copied ? (
          <span className="text-[11px] font-semibold text-green-400 transition-all">
            ¡Copiado!
          </span>
        ) : (
          <IconCopy className="w-3.5 h-3.5 text-slate-600 group-hover:text-brand transition-colors" />
        )}
      </button>
    </div>
  );
}
