import axios from "axios";

export const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_SERVER_URL}/api`,
  // Critical for cookies: tells the browser to include them on every
  // cross-origin request. Backend has `credentials: true` on CORS.
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

/**
 * No token interceptor needed — the session cookie travels automatically.
 * Adding an `Authorization: Bearer` header here would be redundant AND
 * less secure (localStorage theft risk we just moved away from).
 *
 * If you ever need to support an API-token-mode (mobile app, CLI), that
 * client lives in a separate module with its own token storage.
 */
export default api;
