import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  IconOrders, IconPlus, IconHistory, IconUser, IconBack, IconChart,
} from "../ui/Icons";
import { GlobalAlertBanner } from "../alerts/GlobalAlertBanner";
import { useAuthStore } from "../../store/auth.store";

interface Props {
  children: ReactNode;
  title?: string;
  backTo?: string;
  action?: ReactNode;
  footer?: ReactNode;
}

export function AppShell({ children, title, backTo, action, footer }: Props) {
  const navigate   = useNavigate();
  const user       = useAuthStore((s) => s.user);

  return (
    <div className="min-h-screen bg-surface flex flex-col max-w-2xl mx-auto">

      {/* ── Top Bar ── */}
      <header
        className="sticky top-0 z-40 bg-surface/95 backdrop-blur
                   border-b border-surface-border flex items-center gap-3 px-4 pt-safe"
        style={{ minHeight: "3.5rem" }}
      >
        {backTo ? (
          <button
            onClick={() => navigate(backTo)}
            className="w-9 h-9 flex items-center justify-center rounded-xl
                       hover:bg-surface-raised active:scale-95 transition-all
                       text-slate-400 hover:text-slate-200 -ml-1"
          >
            <IconBack className="w-5 h-5" />
          </button>
        ) : (
          <img src="/logo.png" alt="TallerTrack" className="h-12 w-auto" />
        )}

        {/* Title + plan badge */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <h1 className="font-semibold text-sm text-slate-300 truncate">
            {title ?? ""}
          </h1>
          {/* Badge only on root screens (no back button) */}
          {!backTo && user && (
            <PlanBadge
              plan={user.plan}
              subStatus={user.sub_status}
              onClick={() => navigate("/billing")}
            />
          )}
        </div>

        {action && <div className="flex-shrink-0">{action}</div>}
      </header>

      {/* ── Global alert banners ── */}
      <GlobalAlertBanner />

      {/* ── Content ── */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* ── Footer slot (e.g. sticky FAB above nav) ── */}
      {footer && <div className="flex-shrink-0">{footer}</div>}

      {/* ── Bottom Nav ── */}
      <nav className="sticky bottom-0 border-t border-surface-border bg-surface/95 backdrop-blur
                      grid grid-cols-5 pb-safe z-40">
        <NavItem to="/dashboard" Icon={IconOrders}  label="Órdenes"  />
        <NavItem to="/new"       Icon={IconPlus}    label="Nueva"    highlight />
        <NavItem to="/taller"    Icon={IconChart}   label="Taller"   />
        <NavItem to="/history"   Icon={IconHistory} label="Historial" />
        <NavItem to="/profile"   Icon={IconUser}    label="Perfil"   />
      </nav>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlanBadge — shows current plan in the topbar; links to /billing
// ---------------------------------------------------------------------------

interface PlanBadgeProps {
  plan?:      string;
  subStatus?: string;
  onClick:    () => void;
}

function PlanBadge({ plan, subStatus, onClick }: PlanBadgeProps) {
  const isTrialing = subStatus === "trialing";

  // Don't render if no plan info available
  if (!plan && !isTrialing) return null;

  let label: string;
  let cls:   string;

  if (isTrialing) {
    label = "14 Días de Prueba";
    cls   = "bg-orange-500/20 text-orange-300 border-orange-500/40 hover:bg-orange-500/30";
  } else if (plan === "enterprise") {
    label = "Plan Platinum";
    cls   = "bg-violet-500/15 text-violet-400 border-violet-500/35 hover:bg-violet-500/25";
  } else if (plan === "professional") {
    label = "Plan Pro";
    cls   = "bg-brand/15 text-brand border-brand/30 hover:bg-brand/25";
  } else if (plan === "starter") {
    label = "Plan Independiente";
    cls   = "bg-slate-700/50 text-slate-400 border-slate-600/50 hover:bg-slate-700/70";
  } else {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-1.5 py-[3px] rounded-md border
                  text-[9px] font-black uppercase tracking-wider
                  whitespace-nowrap transition-all active:scale-95
                  ${cls}`}
    >
      {label}
    </button>
  );
}

interface NavItemProps {
  to: string;
  Icon: React.FC<{ className?: string }>;
  label: string;
  highlight?: boolean;
}

function NavItem({ to, Icon, label, highlight }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={to === "/dashboard"}
      className={({ isActive }) => `
        flex flex-col items-center justify-center gap-1 py-2.5 min-h-[3.5rem]
        text-[11px] font-semibold tracking-wide transition-colors touch-feedback
        ${isActive
          ? "text-brand"
          : highlight
            ? "text-brand/50 hover:text-brand/80"
            : "text-slate-500 hover:text-slate-400"
        }
      `}
    >
      {({ isActive }) => (
        <>
          {/* Icon container — metallic orb when active */}
          <span
            className="flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200"
            style={isActive ? (
              highlight
                ? {
                    background: "linear-gradient(145deg, #2D1F08 0%, #1A1205 60%, #2D1F08 100%)",
                    boxShadow: "0 2px 12px rgba(249,115,22,0.3), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.3)",
                    border: "1px solid rgba(249,115,22,0.45)",
                  }
                : {
                    background: "linear-gradient(145deg, #2D3748 0%, #1A202C 60%, #2D3748 100%)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.3)",
                    border: "1px solid rgba(71,85,105,0.4)",
                  }
            ) : {}}
          >
            <Icon className="w-[1.125rem] h-[1.125rem]" />

            {/* Orange pulse dot — active + highlight only */}
            {isActive && highlight && (
              <span
                className="absolute w-1 h-1 rounded-full animate-pulse"
                style={{
                  background: "#F97316",
                  boxShadow: "0 0 4px #F97316",
                  marginTop: "18px",
                  marginLeft: "18px",
                }}
              />
            )}
          </span>

          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}
