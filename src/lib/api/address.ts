// lib/api/address.ts
import api from "@/lib/api";

/* ------------------------------ types ------------------------------ */

/** Shape of an address row returned by the backend (plain JSON, string ids). */
export interface ApiAddress {
  _id: string;
  userId?: string;
  label: string;
  street: string;
  city: string;
  state?: string | null;
  postalCode: string;
  country?: string;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [k: string]: any;
}

/** Payload accepted by POST/PATCH /api/addresses (validated server-side). */
export interface AddressInput {
  label: string;
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country?: string;
  isDefault?: boolean;
}

export interface AddressMutationResult {
  success: boolean;
  address?: ApiAddress;
  message?: string;
}

/* ----------------------------- helpers ----------------------------- */

function statusOf(err: any): number | undefined {
  return err?.response?.status;
}

/** Flattens the backend's `{ errors: { field: [msg] } }` payload, if present. */
function toMessage(err: any): string {
  const payload = err?.response?.data;
  if (payload?.errors && typeof payload.errors === "object") {
    const flat = Object.entries(payload.errors as Record<string, unknown>)
      .flatMap(([field, msgs]) =>
        Array.isArray(msgs) ? msgs.map((m) => `${field}: ${m}`) : [],
      )
      .join("; ");
    if (flat) return flat;
  }
  return payload?.message || err?.message || "Request failed";
}

/**
 * Builds the request payload from the `AddressForm`'s `FormData`, keeping the
 * coercion rules the old server action used (`isDefault` checkbox, country
 * default, empty state → undefined).
 */
export function addressInputFromFormData(formData: FormData): AddressInput {
  const field = (key: string): string => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };

  return {
    label: field("label"),
    street: field("street"),
    city: field("city"),
    state: field("state") || undefined,
    postalCode: field("postalCode"),
    country: field("country") || "Cameroon",
    isDefault:
      formData.get("isDefault") === "on" ||
      formData.get("isDefault") === "true",
  };
}

/* ------------------------------- CRUD ------------------------------ */

/** GET /api/addresses — scoped to the authenticated user. */
export async function getUserAddresses(): Promise<ApiAddress[]> {
  const res = await api.get<{ data: ApiAddress[] }>("/addresses");
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

/** POST /api/addresses — scoped to the authenticated user. */
export async function createAddress(
  input: AddressInput,
): Promise<AddressMutationResult> {
  try {
    const res = await api.post<{ success: boolean; data: ApiAddress }>(
      "/addresses",
      input,
    );
    return { success: true, address: res.data.data };
  } catch (err) {
    throw new Error(toMessage(err));
  }
}

/** PATCH /api/addresses/:id — scoped to the authenticated user. */
export async function updateAddress(
  addressId: string,
  input: AddressInput,
): Promise<AddressMutationResult> {
  try {
    const res = await api.patch<{ success: boolean; data: ApiAddress }>(
      `/addresses/${encodeURIComponent(addressId)}`,
      input,
    );
    return { success: true, address: res.data.data };
  } catch (err) {
    if (statusOf(err) === 404) {
      throw new Error("Address not found or unauthorized");
    }
    throw new Error(toMessage(err));
  }
}

/**
 * DELETE /api/addresses/:id — scoped to the authenticated user.
 * The backend refuses (409) while a credit card still references the address.
 */
export async function deleteAddress(
  addressId: string,
): Promise<AddressMutationResult> {
  try {
    const res = await api.delete<{ success: boolean; message?: string }>(
      `/addresses/${encodeURIComponent(addressId)}`,
    );
    return { success: true, message: res.data?.message };
  } catch (err) {
    if (statusOf(err) === 409) {
      throw new Error(
        "Cannot delete this address because it is linked to an existing credit card. Please remove the card first.",
      );
    }
    if (statusOf(err) === 404) {
      throw new Error("Address not found or unauthorized");
    }
    throw new Error(toMessage(err));
  }
}

/** PATCH /api/addresses/:id/default — clears any other default server-side. */
export async function setDefaultAddress(
  addressId: string,
): Promise<AddressMutationResult> {
  try {
    const res = await api.patch<{ success: boolean; data: ApiAddress }>(
      `/addresses/${encodeURIComponent(addressId)}/default`,
    );
    return { success: true, address: res.data.data };
  } catch (err) {
    if (statusOf(err) === 404) {
      throw new Error("Address not found or unauthorized");
    }
    throw new Error(toMessage(err));
  }
}
