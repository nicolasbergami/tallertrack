import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Dashboard }       from "./screens/Dashboard";
import { NewOrder }        from "./screens/NewOrder";
import { OrderDetail }     from "./screens/OrderDetail";
import { PublicTracking }  from "./screens/PublicTracking";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 15_000, // 15 seconds before re-fetching
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/"           element={<Dashboard />}  />
          <Route path="/new"        element={<NewOrder />}   />
          <Route path="/orders/:id"                        element={<OrderDetail />} />
          <Route path="/track/:tenantSlug/:orderNumber"   element={<PublicTracking />} />
          <Route path="*"                                 element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
