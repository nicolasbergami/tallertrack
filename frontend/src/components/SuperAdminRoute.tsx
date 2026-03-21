import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";

/**
 * Route guard for the /backoffice panel.
 * Redirects to /login if unauthenticated, to /dashboard if not a system admin.
 */
export function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const user  = useAuthStore((s) => s.user);

  if (!token) return <Navigate to="/login" replace />;
  if (!user?.is_system_admin) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
