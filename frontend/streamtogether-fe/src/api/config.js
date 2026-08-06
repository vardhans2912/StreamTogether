// Single source of truth for the mock/real boundary and shared auth storage.

export const USE_MOCK = String(import.meta.env.VITE_USE_MOCK ?? "true") !== "false";
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8888";

// STOMP endpoint for realtime playback/chat/presence. It lives on stream-service
// (Eureka id MEDIA-SERVICE) and is reached through the gateway like everything
// else, so by default it is just the API base URL over ws://.
export const WS_URL = import.meta.env.VITE_WS_URL || defaultWebSocketUrl();

function defaultWebSocketUrl() {
  const base = API_BASE_URL.replace(/^http/, "ws").replace(/\/+$/, "");
  return `${base}/media-service/ws`;
}

// localStorage keys shared by the auth context and the API layer.
export const TOKEN_KEY = "streamtogether.token";
export const USER_KEY = "streamtogether.user";

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** The current user's id — needed by the mock backend to attribute actions. */
export function getCurrentUserId() {
  return getStoredUser()?.id ?? null;
}

export function storeAuth(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
