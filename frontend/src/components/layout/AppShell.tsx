import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth.store";

interface Props {
  children: ReactNode;
  title?: string;
  backTo?: string;
  action?: ReactNode;
}

export function AppShell({ children, title, backTo, action }: Props) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface flex flex-col max-w-2xl mx-auto">
      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur border-b border-surface-border
                         flex items-center gap-3 px-4 pt-safe" style={{ minHeight: "3.75rem" }}>
        {backTo ? (
          <button
            onClick={() => navigate(backTo)}
            className="w-10 h-10 flex items-center justify-center rounded-xl
                       hover:bg-surface-raised active:scale-95 transition-all text-slate-300"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        ) : (
          <span className="text-brand font-black text-xl tracking-tight">TT</span>
        )}

        <h1 className="flex-1 font-bold text-lg text-slate-100 truncate">
          {title ?? "TallerTrack"}
        </h1>

        {action && <div className="flex-shrink-0">{action}</div>}
      </header>

      {/* ── Content ── */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* ── Bottom Nav ── */}
      <nav className="sticky bottom-0 border-t border-surface-border bg-surface-card/95 backdrop-blur
                      grid grid-cols-4 pb-safe">
        <NavItem to="/"        icon="🔧" label="Órdenes" />
        <NavItem to="/new"     icon="➕" label="Nueva" highlight />
        <NavItem to="/history" icon="📋" label="Historial" />
        <NavItem to="/profile" icon={user?.name?.[0] ?? "👤"} label={user?.name?.split(" ")[0] ?? "Perfil"} />
      </nav>
    </div>
  );
}

interface NavItemProps {
  to: string;
  icon: string;
  label: string;
  highlight?: boolean;
}

function NavItem({ to, icon, label, highlight }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `
        flex flex-col items-center justify-center gap-0.5 py-2 min-h-touch
        text-xs font-semibold transition-colors touch-feedback
        ${highlight
          ? isActive ? "text-brand" : "text-brand/70"
          : isActive ? "text-brand"  : "text-slate-500 hover:text-slate-300"
        }
      `}
    >
      <span className="text-xl leading-none">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}
