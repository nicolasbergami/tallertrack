import { useAuthStore } from "../store/auth.store";

// Resolve the backend base URL.
// 1. Build-time: VITE_API_URL baked in by Vite (from Vercel env var or .env.production).
// 2. Runtime fallback: detect known hostnames so QA works even if the env var
//    didn't reach the build (Vercel Preview env var injection issues).
// 3. Default "": local dev uses the Vite proxy configured in vite.config.ts.
function resolveApiBase(): string {
  if (typeof window !== "undefined") {
    const h = window.location.hostname;
    if (h.includes("tallertrack-qa")) return "https://tallertrack-qa.up.railway.app";
  }
  const configured = import.meta.env.VITE_API_URL as string | undefined;
  if (configured) return configured;
  return "";
}

const BASE_URL = `${resolveApiBase()}/api/v1`;

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;

  const isFormData = init.body instanceof FormData;
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      // Omit Content-Type for FormData — browser sets it with the correct multipart boundary
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (response.status === 401) {
    useAuthStore.getState().logout();
    window.location.replace("/login");
    return undefined as T;
  }

  if (response.status === 402) {
    window.location.replace("/billing");
    return undefined as T;
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      (body as { error?: string })?.error ?? `HTTP ${response.status}`,
      body
    );
  }

  // 204 No Content
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  get:      <T>(path: string)                => request<T>(path),
  post:     <T>(path: string, body: unknown) => request<T>(path, { method: "POST",  body: JSON.stringify(body) }),
  patch:    <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete:   <T>(path: string)                => request<T>(path, { method: "DELETE" }),
  /** Multipart upload — does NOT set Content-Type so the browser adds the boundary */
  postForm:  <T>(path: string, form: FormData) => request<T>(path, { method: "POST",  body: form }),
  patchForm: <T>(path: string, form: FormData) => request<T>(path, { method: "PATCH", body: form }),
  getBlob: async (path: string): Promise<Blob>  => {
    const token = useAuthStore.getState().token;
    const r = await fetch(`${BASE_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!r.ok) throw new ApiError(r.status, `HTTP ${r.status}`);
    return r.blob();
  },
};
