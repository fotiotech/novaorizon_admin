// lib/api/contact.ts
import api from "@/lib/api";

export type ContactStatus = "new" | "read" | "replied" | "archived";

export interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: ContactStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ContactListResponse {
  messages: ContactMessage[];
  total: number;
  totalPages: number;
  currentPage: number;
  counts: {
    all: number;
    new: number;
    read: number;
    replied: number;
    archived: number;
  };
}

/** GET /api/contact — admin only */
export async function fetchContactMessages(params: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<ContactListResponse> {
  const res = await api.get<{ data: ContactListResponse }>("/contact", {
    params: {
      status:
        params.status && params.status !== "all" ? params.status : undefined,
      search: params.search || undefined,
      page: params.page ?? 1,
      limit: params.limit ?? 10,
    },
  });
  return res.data.data;
}

/** GET /api/contact/:id — admin only */
export async function fetchContactMessage(id: string): Promise<ContactMessage> {
  const res = await api.get<{ data: ContactMessage }>(`/contact/${id}`);
  return res.data.data;
}

/** PATCH /api/contact/:id/status — admin only */
export async function updateContactStatus(
  id: string,
  status: ContactStatus,
): Promise<{ success: boolean; data: { _id: string; status: ContactStatus } }> {
  const res = await api.patch<{
    success: boolean;
    data: { _id: string; status: ContactStatus };
  }>(`/contact/${id}/status`, { status });
  return res.data;
}

/** DELETE /api/contact/:id — admin only */
export async function deleteContactMessage(
  id: string,
): Promise<{ success: boolean }> {
  const res = await api.delete<{ success: boolean }>(`/contact/${id}`);
  return res.data;
}

/** GET /api/contact/new-count — admin only */
export async function fetchNewContactCount(): Promise<number> {
  const res = await api.get<{ data: { count: number } }>("/contact/new-count");
  return res.data.data.count;
}
