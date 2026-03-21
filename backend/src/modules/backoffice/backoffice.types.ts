// ---------------------------------------------------------------------------
// Backoffice — TypeScript types
// ---------------------------------------------------------------------------

export interface BackofficeDashboard {
  mrr:                    number;   // Monthly Recurring Revenue (active subs only)
  total_tenants:          number;
  active_tenants:         number;   // sub_status = 'active'
  trialing_tenants:       number;   // sub_status = 'trialing'
  free_tenants:           number;   // everything else
  new_tenants_this_month: number;
  new_tenants_last_month: number;   // for comparison
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

export interface PlanUpdateDTO {
  plan:                   string;
  sub_status:             string;
  trial_ends_at?:          string | null;
  sub_current_period_end?: string | null;
}
