import { api } from "./client";

// ---------------------------------------------------------------------------
// Types mirrored from backend/src/modules/backoffice/backoffice.types.ts
// ---------------------------------------------------------------------------

export interface BackofficeDashboard {
  mrr:                    number;
  total_tenants:          number;
  active_tenants:         number;
  trialing_tenants:       number;
  free_tenants:           number;
  new_tenants_this_month: number;
  new_tenants_last_month: number;
  total_users:            number;
}

export interface BackofficeTenant {
  id:                     string;
  name:                   string;
  slug:                   string;
  plan:                   string;
  sub_status:             string;
  trial_ends_at:          string | null;
  sub_current_period_end: string | null;
  created_at:             string;
  user_count:             number;
  active_work_orders:     number;
}

export interface TenantListResponse {
  tenants:     BackofficeTenant[];
  total:       number;
  page:        number;
  total_pages: number;
}

export interface RecentActivity {
  id:         string;
  name:       string;
  slug:       string;
  plan:       string;
  sub_status: string;
  created_at: string;
}

export interface TenantsFilter {
  page?:   number;
  limit?:  number;
  search?: string;
  plan?:   string;
  status?: string;
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export const backofficeApi = {
  getDashboard: () =>
    api.get<BackofficeDashboard>("/backoffice/dashboard"),

  getTenants: (filters: TenantsFilter = {}) => {
    const params = new URLSearchParams();
    if (filters.page)   params.set("page",   String(filters.page));
    if (filters.limit)  params.set("limit",  String(filters.limit));
    if (filters.search) params.set("search", filters.search);
    if (filters.plan)   params.set("plan",   filters.plan);
    if (filters.status) params.set("status", filters.status);
    const qs = params.toString();
    return api.get<TenantListResponse>(`/backoffice/tenants${qs ? `?${qs}` : ""}`);
  },

  getActivity: (days = 30) =>
    api.get<{ activity: RecentActivity[] }>(`/backoffice/activity?days=${days}`),

  updatePlanPrice: (slug: string, price_ars: number) =>
    api.patch<{ success: boolean }>(`/backoffice/plans/${slug}`, { price_ars }),

  updateTenantPlan: (
    id:                     string,
    plan:                   string,
    sub_status:             string,
    trial_ends_at?:          string | null,
    sub_current_period_end?: string | null,
  ) =>
    api.patch<{ success: boolean }>(`/backoffice/tenants/${id}/plan`, {
      plan,
      sub_status,
      trial_ends_at,
      sub_current_period_end,
    }),
};
