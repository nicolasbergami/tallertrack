import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SubscriptionPlan } from "../config/features.config";

interface User {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "mechanic" | "receptionist";
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  /** Subscription plan — populated from the login response / JWT.
   *  Defaults to "free" when absent. */
  plan?: SubscriptionPlan;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: "tallertrack-auth" }
  )
);
