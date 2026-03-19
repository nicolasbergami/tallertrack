import { useNavigate, Link } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { useAuthStore } from "../../store/auth.store";
import { IconLogout, IconChevronRight, IconTeam } from "../../components/ui/Icons";
import { WhatsAppSection } from "./WhatsAppSection";

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
            <InfoRow label="ID de taller" value={user.tenantId.slice(0, 8) + "…"} mono />
          </div>
        </section>

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
