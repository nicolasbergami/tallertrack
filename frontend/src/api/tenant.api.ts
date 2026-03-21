import { api } from "./client";

export interface TenantSettings {
  logo_url:  string | null;
  timezone?: string;
  currency?: string;
}

export const tenantApi = {
  getSettings: () =>
    api.get<{ settings: TenantSettings }>("/tenant/settings"),

  updateLogo: (logo_url: string | null) =>
    api.patch<{ logo_url: string | null }>("/tenant/settings/logo", { logo_url }),
};
