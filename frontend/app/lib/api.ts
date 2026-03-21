/**
 * Base URL for backend API. Default `/api` uses Vite dev proxy (same origin → cookies work).
 * Override with VITE_API_BASE_URL (e.g. https://api.example.com) for production.
 */
const raw = import.meta.env.VITE_API_BASE_URL;

export const API_BASE_URL =
  typeof raw === "string" && raw.length > 0 ? raw.replace(/\/$/, "") : "/api";

/** Parse FastAPI error body (detail string or validation array). */
export function getFastApiErrorDetail(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const detail = (payload as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const first = detail[0];
    if (first && typeof first === "object" && "msg" in first) {
      return String((first as { msg: string }).msg);
    }
  }
  return "";
}
