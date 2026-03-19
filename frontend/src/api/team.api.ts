import { api } from "./client";

export interface TeamMember {
  id:            string;
  full_name:     string;
  email:         string;
  role:          string;
  status:        string;
  last_login_at: string | null;
  created_at:    string;
}

export interface TeamListResponse {
  members:   TeamMember[];
  total:     number;
  max_users: number;
  can_add:   boolean;
}

export interface CreateMemberDTO {
  full_name: string;
  email:     string;
  password:  string;
  role:      "mechanic" | "receptionist" | "admin";
}

export interface UpdateMemberDTO {
  full_name?: string;
  role?:      "mechanic" | "receptionist" | "admin";
  status?:    "active" | "inactive";
}

export const teamApi = {
  list:   ()                                    => api.get<TeamListResponse>("/team"),
  create: (dto: CreateMemberDTO)                => api.post<TeamMember>("/team", dto),
  update: (id: string, dto: UpdateMemberDTO)    => api.patch<TeamMember>(`/team/${id}`, dto),
  remove: (id: string)                          => api.delete<void>(`/team/${id}`),
};
