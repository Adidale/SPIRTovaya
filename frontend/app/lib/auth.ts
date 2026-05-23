export const AUTH_STORAGE_KEY = "spirtovaya-authenticated";

export function isAuthenticatedLocally(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(AUTH_STORAGE_KEY) === "true";
}

export function getLoginRedirectUrl(returnPath: string): string {
  return `/login?redirect=${encodeURIComponent(returnPath)}`;
}
