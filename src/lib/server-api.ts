import "server-only";

import { cookies } from "next/headers";

/**
 * Server-side client for the Express backend.
 *
 * Every Server Action / Server Component that talks to the API goes through
 * here. It forwards the browser's session cookies so the backend can
 * authenticate the call — no secrets, Mongo connection or mongoose model is
 * needed inside the Next.js app anymore.
 */

const BASE = (
  process.env.SERVER_API_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3000"
).replace(/\/+$/, "");

const API_PREFIX = process.env.SERVER_API_PREFIX || "/api";

/** Cookies that the backend understands. */
const FORWARDED_COOKIES = ["session", "guestId", "cart_sid"];

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function buildCookieHeader(): Promise<string | undefined> {
  try {
    const store = await cookies();
    const parts = store
      .getAll()
      .filter((c) => FORWARDED_COOKIES.includes(c.name))
      .map((c) => `${c.name}=${c.value}`);
    return parts.length > 0 ? parts.join("; ") : undefined;
  } catch {
    // Called outside a request scope (e.g. a build-time script) — anonymous.
    return undefined;
  }
}

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** JSON body. Ignored when `formData` is provided. */
  body?: unknown;
  /** Multipart body (file uploads). */
  formData?: FormData;
  /** Extra headers merged over the defaults. */
  headers?: Record<string, string>;
  /** Next.js cache behaviour. Defaults to "no-store". */
  cache?: RequestCache;
  /** Explicit bearer token (defaults to none — the cookie is forwarded). */
  token?: string;
  /** Query string parameters; `undefined`/`null` values are dropped. */
  query?: Record<string, string | number | boolean | undefined | null>;
}

function buildUrl(path: string, query?: ApiRequestOptions["query"]): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${BASE}${API_PREFIX}${clean}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/**
 * Performs the request and returns the raw Response. Throws `ApiError` for
 * non-2xx responses so callers can `try/catch` a single error type.
 */
export async function apiRequest(
  path: string,
  options: ApiRequestOptions = {},
): Promise<Response> {
  const {
    method = "GET",
    body,
    formData,
    headers = {},
    cache = "no-store",
    token,
    query,
  } = options;

  const finalHeaders: Record<string, string> = { Accept: "application/json", ...headers };

  const cookieHeader = await buildCookieHeader();
  if (cookieHeader) finalHeaders.Cookie = cookieHeader;
  if (token) finalHeaders.Authorization = `Bearer ${token}`;

  let payload: BodyInit | undefined;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(buildUrl(path, query), {
    method,
    headers: finalHeaders,
    body: payload,
    cache,
    // Server-to-server: send the forwarded cookies, never the Next.js ones.
    credentials: "omit",
    // Never let a build-time or SSR request hang when the API is down.
    signal: AbortSignal.timeout(
      Number(process.env.SERVER_API_TIMEOUT_MS) || 10_000,
    ),
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let fieldErrors: Record<string, string[]> | undefined;
    try {
      const parsed = (await res.json()) as {
        error?: string;
        message?: string;
        fieldErrors?: Record<string, string[]>;
      };
      message = parsed.error || parsed.message || message;
      fieldErrors = parsed.fieldErrors;
    } catch {
      /* non-JSON body — keep the default message */
    }
    throw new ApiError(message, res.status, fieldErrors);
  }

  return res;
}

/** Performs the request and parses the JSON envelope. */
export async function apiFetch<T = any>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const res = await apiRequest(path, options);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

/**
 * Performs the request and unwraps the `data` field — the shape most of the
 * backend endpoints return (`{ data }`, `{ success, data }`, `{ message, data }`).
 */
export async function apiData<T = any>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const body = await apiFetch<{ data?: T }>(path, options);
  return (body?.data ?? body) as T;
}

export { BASE as API_BASE_URL };