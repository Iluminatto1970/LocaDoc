/**
 * Cliente HTTP único para a API do LocaDoc.
 *
 * Toda chamada à API precisa apresentar o token de sessão emitido no login
 * (o servidor não aceita mais identidade declarada pelo cliente) e uma resposta
 * 401 significa sessão inválida/expirada: o estado local é limpo na hora para
 * não manter uma sessão fantasma na interface.
 */

export const AUTH_TOKEN_KEY = 'locadoc_auth_token';
export const AUTH_USER_KEY = 'locadoc_auth_user';
export const SESSION_EXPIRED_EVENT = 'locadoc:session-expired';

export function getAuthToken(): string {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

/** Encerra a sessão local e avisa o AuthProvider (token revogado/expirado). */
export function expireLocalSession(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  } catch {
    /* storage indisponível */
  }
}

export function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getAuthToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra || {}),
  };
}

export async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const hasBody = init.body !== undefined && init.body !== null;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...authHeaders(init.headers as Record<string, string> | undefined),
    },
  });

  if (res.status === 401) expireLocalSession();
  return res;
}
