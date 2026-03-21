import { Component, ReactNode, useState } from "react";
import { SplashScreen } from "./components/SplashScreen";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Dashboard }      from "./screens/Dashboard";
import { NewOrder }       from "./screens/NewOrder";
import { OrderDetail }    from "./screens/OrderDetail";
import { PublicTracking } from "./screens/PublicTracking";
import { Login }          from "./screens/Login";
import { Profile }        from "./screens/Profile";
import { Billing }        from "./screens/Billing";
import { Team }           from "./screens/Team";
import { History }        from "./screens/History";
import { Taller }         from "./screens/Taller";
import { Register }       from "./screens/Register";
import { VerifyOtp }      from "./screens/Register/VerifyOtp";
import { Landing }        from "./screens/Landing";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuthStore }   from "./store/auth.store";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 15_000,
    },
  },
});

// ── Error boundary — catches uncaught render errors ───────────────────────────

interface EBState { hasError: boolean; message: string }

class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false, message: "" };

  static getDerivedStateFromError(err: Error): EBState {
    return { hasError: true, message: err.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-6">
          <div className="max-w-sm w-full flex flex-col gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-950/60 border border-red-900/50 flex items-center justify-center mx-auto">
              <span className="text-2xl">⚠️</span>
            </div>
            <div>
              <p className="text-slate-200 font-bold text-base">Algo salió mal</p>
              <p className="text-slate-500 text-sm mt-1 font-mono break-all">{this.state.message}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="h-10 rounded-xl bg-brand text-white font-semibold text-sm hover:bg-brand-hover transition-colors"
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Smart root ────────────────────────────────────────────────────────────────

function SmartRoot() {
  const token = useAuthStore((s) => s.token);
  return token ? <Navigate to="/dashboard" replace /> : <Landing />;
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [splashDone, setSplashDone] = useState(
    () => sessionStorage.getItem("splashShown") === "1",
  );

  function handleSplashDone() {
    sessionStorage.setItem("splashShown", "1");
    setSplashDone(true);
  }

  return (
    <ErrorBoundary>
      {!splashDone && <SplashScreen onDone={handleSplashDone} />}
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* Landing / home */}
            <Route path="/" element={<SmartRoot />} />

            {/* Public — no auth required */}
            <Route path="/login"                                element={<Login />} />
            <Route path="/register"                             element={<Register />} />
            <Route path="/verify"                               element={<VerifyOtp />} />
            <Route path="/track/:tenantSlug/:orderNumber"       element={<PublicTracking />} />

            {/* Protected — redirect to /login if no token */}
            <Route path="/dashboard"  element={<ProtectedRoute><Dashboard  /></ProtectedRoute>} />
            <Route path="/new"        element={<ProtectedRoute><NewOrder   /></ProtectedRoute>} />
            <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
            <Route path="/taller"     element={<ProtectedRoute><Taller     /></ProtectedRoute>} />
            <Route path="/history"    element={<ProtectedRoute><History    /></ProtectedRoute>} />
            <Route path="/profile"    element={<ProtectedRoute><Profile    /></ProtectedRoute>} />
            <Route path="/billing"    element={<ProtectedRoute><Billing    /></ProtectedRoute>} />
            <Route path="/team"       element={<ProtectedRoute><Team       /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
