// PUBLIC_INTERFACE
export function getToken(): string | null {
  /** Get the saved auth token from localStorage (if present). */
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('auth_token');
  } catch {
    return null;
  }
}

// PUBLIC_INTERFACE
export function setToken(token: string): void {
  /** Save the auth token to localStorage. */
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('auth_token', token);
  } catch {
    // ignore storage errors
  }
}

// PUBLIC_INTERFACE
export function clearToken(): void {
  /** Clear the auth token from localStorage. */
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('auth_token');
  } catch {
    // ignore
  }
}

// PUBLIC_INTERFACE
export function isAuthenticated(): boolean {
  /** Check whether the user has an auth token. */
  const token = getToken();
  return !!token;
}
