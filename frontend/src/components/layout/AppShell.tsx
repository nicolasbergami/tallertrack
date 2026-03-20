import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  IconOrders, IconPlus, IconHistory, IconUser, IconBack,
} from "../ui/Icons";

interface Props {
  children: ReactNode;
  title?: string;
  backTo?: string;
  action?: ReactNode;
}

export function AppShell({ children, title, backTo, action }: Props) {
  const navigate = useNavigate();

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
          <span className="font-black text-base tracking-tight select-none">
            <span className="text-brand">Taller</span>
            <span className="text-slate-200">Track</span>
          </span>
        )}

        <h1 className="flex-1 font-semibold text-sm text-slate-300 truncate">
          {title ?? ""}
        </h1>

        {action && <div className="flex-shrink-0">{action}</div>}
      </header>

      {/* ── Content ── */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* ── Bottom Nav ── */}
      <nav className="sticky bottom-0 border-t border-surface-border bg-surface/95 backdrop-blur
                      grid grid-cols-4 pb-safe z-40">
        <NavItem to="/dashboard" Icon={IconOrders}  label="Órdenes"  />
        <NavItem to="/new"       Icon={IconPlus}    label="Nueva"    highlight />
        <NavItem to="/history"   Icon={IconHistory} label="Historial" />
        <NavItem to="/profile"   Icon={IconUser}    label="Perfil"   />
      </nav>
    </div>
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
