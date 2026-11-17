// lib/api/attribute-set.ts
import api from "@/lib/api";

export interface ApiAttributeSet {
  _id: string;
  title: string;
  code: string;
  description?: string | null;
  sortOrder?: number;
  [k: string]: any;
}

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Flatten the ValidationError / AppError envelopes into a single string. */
function toMessage(err: any): string {
  const payload = err?.response?.data;
  if (payload?.errors) {
    const flat = Object.entries(payload.errors as Record<string, unknown>)
      .flatMap(([field, msgs]) =>
        Array.isArray(msgs) ? msgs.map((m) => `${field}: ${m}`) : [],
      )
      .join("; ");
    if (flat) return flat;
  }
  return payload?.message || err?.message || "Request failed";
}

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { success: true, data: await fn() };
  } catch (err) {
    return { success: false, error: toMessage(err) };
  }
}

/** GET /api/attribute-sets */
export async function getAttributeSets(): Promise<
  ActionResult<ApiAttributeSet[]>
> {
  return run(async () => {
    const res = await api.get<{ data: ApiAttributeSet[] }>("/attribute-sets");
    return Array.isArray(res.data?.data) ? res.data.data : [];
  });
}

/** GET /api/attribute-sets/:id */
export async function getAttributeSet(
  id: string,
): Promise<ActionResult<ApiAttributeSet>> {
  return run(async () => {
    const res = await api.get<{ data: ApiAttributeSet }>(
      `/attribute-sets/${id}`,
    );
    return res.data.data;
  });
}

/** POST /api/attribute-sets */
export async function createAttributeSet(payload: {
  title: string;
  code: string;
  description?: string;
  sortOrder?: number;
}): Promise<ActionResult<ApiAttributeSet>> {
  return run(async () => {
    const res = await api.post<{ success: boolean; data: ApiAttributeSet }>(
      "/attribute-sets",
      payload,
    );
    return res.data.data;
  });
}

/** PATCH /api/attribute-sets/:id */
export async function updateAttributeSet(
  id: string,
  payload: {
    title: string;
    code: string;
    description?: string;
    sortOrder?: number;
  },
): Promise<ActionResult<ApiAttributeSet>> {
  return run(async () => {
    const res = await api.patch<{ success: boolean; data: ApiAttributeSet }>(
      `/attribute-sets/${id}`,
      payload,
    );
    return res.data.data;
  });
}

/** DELETE /api/attribute-sets/:id */
export async function deleteAttributeSet(id: string): Promise<ActionResult> {
  return run(async () => {
    await api.delete(`/attribute-sets/${id}`);
  });
}
