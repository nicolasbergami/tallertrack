import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Dashboard }      from "./screens/Dashboard";
import { NewOrder }       from "./screens/NewOrder";
import { OrderDetail }    from "./screens/OrderDetail";
import { PublicTracking } from "./screens/PublicTracking";
import { Login }          from "./screens/Login";
import { Profile }        from "./screens/Profile";
import { Billing }        from "./screens/Billing";
import { History }        from "./screens/History";
import { Register }       from "./screens/Register";
import { VerifyOtp }      from "./screens/Register/VerifyOtp";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 15_000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public — no auth required */}
          <Route path="/login"                                element={<Login />} />
          <Route path="/register"                             element={<Register />} />
          <Route path="/verify"                               element={<VerifyOtp />} />
          <Route path="/track/:tenantSlug/:orderNumber"       element={<PublicTracking />} />

          {/* Protected — redirect to /login if no token */}
          <Route path="/"           element={<ProtectedRoute><Dashboard  /></ProtectedRoute>} />
          <Route path="/new"        element={<ProtectedRoute><NewOrder   /></ProtectedRoute>} />
          <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
          <Route path="/history"    element={<ProtectedRoute><History    /></ProtectedRoute>} />
          <Route path="/profile"    element={<ProtectedRoute><Profile    /></ProtectedRoute>} />
          <Route path="/billing"    element={<ProtectedRoute><Billing    /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
