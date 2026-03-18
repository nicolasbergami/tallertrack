import { api } from "./client";
import {
  WorkOrderDetail,
  WorkOrderStatus,
  CreateWorkOrderDTO,
  TransitionDTO,
} from "../types/work-order";

interface ListResponse {
  data: WorkOrderDetail[];
  total: number;
}

interface TransitionsResponse {
  current: WorkOrderStatus;
  available: WorkOrderStatus[];
}

interface QrJsonResponse {
  tracking_url: string;
  qr_base64: string;
}

export const workOrdersApi = {
  list: (params?: { status?: WorkOrderStatus; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.limit)  qs.set("limit",  String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const q = qs.toString();
    return api.get<ListResponse>(`/work-orders${q ? `?${q}` : ""}`);
  },

  getById: (id: string) =>
    api.get<WorkOrderDetail>(`/work-orders/${id}`),

  create: (dto: CreateWorkOrderDTO) =>
    api.post<WorkOrderDetail>("/work-orders", dto),

  transition: (id: string, dto: TransitionDTO) =>
    api.patch<WorkOrderDetail>(`/work-orders/${id}/transition`, dto),

  getAvailableTransitions: (id: string) =>
    api.get<TransitionsResponse>(`/work-orders/${id}/transitions`),

  getQrJson: (id: string) =>
    api.get<QrJsonResponse>(`/work-orders/${id}/qr.json`),

  getQrBlob: (id: string) =>
    api.getBlob(`/work-orders/${id}/qr`),
};
