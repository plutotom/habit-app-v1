/**
 * WorkOS AuthKit public-client PKCE flow.
 * Follows https://github.com/workos/expo-authkit-example
 * Requires the WebCrypto polyfill in src/polyfills.ts.
 */
import { WorkOS } from "@workos-inc/node";
import * as SecureStore from "expo-secure-store";

const WORKOS_CLIENT_ID = process.env.EXPO_PUBLIC_WORKOS_CLIENT_ID ?? "";
const PKCE_TTL_MS = 10 * 60 * 1000;

export const REDIRECT_URI =
  process.env.EXPO_PUBLIC_WORKOS_REDIRECT_URI ?? "habits://callback";

const workos = new WorkOS({ clientId: WORKOS_CLIENT_ID });

const KEYS = {
  SESSION: "habits.workos.session.v1",
  PKCE: "habits.workos.pkce.v1",
} as const;

export type User = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl: string | null;
};

type StoredSession = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

let sessionGeneration = 0;
let refreshInFlight: Promise<StoredSession | null> | null = null;
let callbackInFlight: { code: string; promise: Promise<User> } | null = null;

type PkceState = {
  codeVerifier: string;
  expiresAt: number;
};

function requireClientId() {
  if (!WORKOS_CLIENT_ID) {
    throw new Error("EXPO_PUBLIC_WORKOS_CLIENT_ID is not set");
  }
}

function toUser(workosUser: {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  profilePictureUrl?: string | null;
}): User {
  return {
    id: workosUser.id,
    email: workosUser.email,
    firstName: workosUser.firstName ?? null,
    lastName: workosUser.lastName ?? null,
    profilePictureUrl: workosUser.profilePictureUrl ?? null,
  };
}

export async function getSignInUrl(): Promise<string> {
  requireClientId();
  const { url, codeVerifier } =
    await workos.userManagement.getAuthorizationUrlWithPKCE({
      redirectUri: REDIRECT_URI,
      provider: "authkit",
    });

  const pkceState: PkceState = {
    codeVerifier,
    expiresAt: Date.now() + PKCE_TTL_MS,
  };
  await SecureStore.setItemAsync(KEYS.PKCE, JSON.stringify(pkceState));
  return url;
}

export function handleCallback(code: string): Promise<User> {
  if (callbackInFlight?.code === code) return callbackInFlight.promise;
  const promise = exchangeCallback(code);
  callbackInFlight = { code, promise };
  // Both the linking listener and auth browser may deliver the same callback.
  void promise.catch(() => {
    if (callbackInFlight?.promise === promise) callbackInFlight = null;
  });
  return promise;
}

async function exchangeCallback(code: string): Promise<User> {
  requireClientId();
  const pkceData = await SecureStore.getItemAsync(KEYS.PKCE);
  if (!pkceData) {
    throw new Error("No PKCE state found — please try signing in again");
  }

  const pkceState = JSON.parse(pkceData) as PkceState;
  if (pkceState.expiresAt < Date.now()) {
    await SecureStore.deleteItemAsync(KEYS.PKCE);
    throw new Error("Authentication session expired — please try again");
  }

  const auth = await workos.userManagement.authenticateWithCode({
    code,
    codeVerifier: pkceState.codeVerifier,
  });

  await SecureStore.deleteItemAsync(KEYS.PKCE);

  const session: StoredSession = {
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
    user: toUser(auth.user),
  };
  sessionGeneration++;
  await persistSession(session);
  return session.user;
}

function parseJwtPayload(token: string): Record<string, unknown> {
  const part = token.split(".")[1];
  if (!part) throw new Error("Invalid access token");
  const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(normalized)) as Record<string, unknown>;
}

function isExpired(accessToken: string): boolean {
  const payload = parseJwtPayload(accessToken);
  const exp = payload.exp;
  if (typeof exp !== "number") return true;
  return Date.now() > exp * 1000 - 10_000;
}

async function readSession(): Promise<StoredSession | null> {
  const sessionData = await SecureStore.getItemAsync(KEYS.SESSION);
  if (!sessionData) return null;
  return JSON.parse(sessionData) as StoredSession;
}

async function persistSession(session: StoredSession): Promise<void> {
  await SecureStore.setItemAsync(KEYS.SESSION, JSON.stringify(session));
}

function isRevokedSession(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const details = error as {
    code?: string;
    error?: string;
    status?: number;
    statusCode?: number;
    rawData?: { error?: string };
  };
  return (
    details.code === "invalid_grant" ||
    details.error === "invalid_grant" ||
    details.rawData?.error === "invalid_grant" ||
    details.status === 401 ||
    details.statusCode === 401
  );
}

async function performRefresh(
  session: StoredSession,
): Promise<StoredSession | null> {
  requireClientId();
  const generation = sessionGeneration;
  try {
    const refreshed = await workos.userManagement.authenticateWithRefreshToken({
      refreshToken: session.refreshToken,
    });
    const next: StoredSession = {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      user: toUser(refreshed.user),
    };
    if (generation !== sessionGeneration) return null;
    await persistSession(next);
    return next;
  } catch (error) {
    if (generation !== sessionGeneration) return null;
    if (isRevokedSession(error)) {
      await clearSession();
      return null;
    }
    // Offline, rate-limited, or provider failure: keep refresh credentials for retry.
    throw error;
  }
}

function refreshSession(session: StoredSession): Promise<StoredSession | null> {
  if (!refreshInFlight) {
    const pending = performRefresh(session).finally(() => {
      if (refreshInFlight === pending) refreshInFlight = null;
    });
    refreshInFlight = pending;
  }
  return refreshInFlight;
}

export async function getUser(): Promise<User | null> {
  const session = await readSession();
  if (!session) return null;
  if (!isExpired(session.accessToken)) return session.user;
  try {
    const refreshed = await refreshSession(session);
    return refreshed?.user ?? null;
  } catch {
    // Retain the local user during an outage; Convex still requires a valid JWT.
    return session.user;
  }
}

export async function getAccessToken(
  forceRefresh = false,
): Promise<string | null> {
  const session = await readSession();
  if (!session) return null;
  if (!forceRefresh && !isExpired(session.accessToken)) {
    return session.accessToken;
  }
  const refreshed = await refreshSession(session);
  return refreshed?.accessToken ?? null;
}

export async function getSessionId(): Promise<string | null> {
  const session = await readSession();
  if (!session) return null;
  try {
    const payload = parseJwtPayload(session.accessToken);
    return typeof payload.sid === "string" ? payload.sid : null;
  } catch {
    return null;
  }
}

export function getLogoutUrl(sessionId: string): string {
  return `https://api.workos.com/user_management/sessions/logout?session_id=${sessionId}`;
}

export async function clearSession(): Promise<void> {
  sessionGeneration++;
  refreshInFlight = null;
  callbackInFlight = null;
  await SecureStore.deleteItemAsync(KEYS.SESSION);
  await SecureStore.deleteItemAsync(KEYS.PKCE);
}
