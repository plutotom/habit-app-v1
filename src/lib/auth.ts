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

export async function handleCallback(code: string): Promise<User> {
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
  await SecureStore.setItemAsync(KEYS.SESSION, JSON.stringify(session));
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

async function refreshSession(
  session: StoredSession,
): Promise<StoredSession | null> {
  requireClientId();
  try {
    const refreshed = await workos.userManagement.authenticateWithRefreshToken({
      refreshToken: session.refreshToken,
    });
    const next: StoredSession = {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      user: toUser(refreshed.user),
    };
    await persistSession(next);
    return next;
  } catch {
    await clearSession();
    return null;
  }
}

export async function getUser(): Promise<User | null> {
  const session = await readSession();
  if (!session) return null;
  if (!isExpired(session.accessToken)) return session.user;
  const refreshed = await refreshSession(session);
  return refreshed?.user ?? null;
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
  await SecureStore.deleteItemAsync(KEYS.SESSION);
  await SecureStore.deleteItemAsync(KEYS.PKCE);
}
