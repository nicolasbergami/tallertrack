import { api } from "./client";

export interface TenantSettings {
  logo_url:  string | null;
  timezone?: string;
  currency?: string;
}

export const tenantApi = {
  getSettings: () =>
    api.get<{ settings: TenantSettings }>("/tenant/settings"),

  uploadLogo: (file: File) => {
    const form = new FormData();
    form.append("logo", file);
    return api.patchForm<{ logo_url: string }>("/tenant/settings/logo", form);
  },

  removeLogo: () =>
    api.delete<{ logo_url: null }>("/tenant/settings/logo"),
};
