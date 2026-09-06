import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { AppState } from "react-native";

import {
  REDIRECT_URI,
  clearSession,
  getAccessToken,
  getLogoutUrl,
  getSessionId,
  getSignInUrl,
  getUser,
  handleCallback,
  type User,
} from "@/lib/auth";

WebBrowser.maybeCompleteAuthSession();

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  fetchAccessToken: (options?: {
    forceRefreshToken?: boolean;
  }) => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isCallbackUrl(url: string): boolean {
  const parsed = Linking.parse(url);
  const path = parsed.path ?? "";
  return (
    parsed.hostname === "callback" ||
    path === "callback" ||
    path === "/callback"
  );
}

function codeFromUrl(url: string): {
  code?: string;
  error?: string;
  errorDescription?: string;
} {
  const parsed = Linking.parse(url);
  const code = parsed.queryParams?.code;
  const error = parsed.queryParams?.error;
  const errorDescription = parsed.queryParams?.error_description;
  return {
    code: typeof code === "string" ? code : undefined,
    error: typeof error === "string" ? error : undefined,
    errorDescription:
      typeof errorDescription === "string" ? errorDescription : undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenRetry, setTokenRetry] = useState(0);
  const needsTokenRetry = useRef(false);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setTokenRetry((value) => value + 1);
    });
    // A new fetch callback lets Convex recover after a temporary refresh failure.
    const timer = setInterval(() => {
      if (needsTokenRetry.current) setTokenRetry((value) => value + 1);
    }, 30_000);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    getUser()
      .then(setUser)
      .catch((error: unknown) => {
        console.error("Failed to load stored session:", error);
      })
      .finally(() => setLoading(false));
  }, []);

  const consumeCallbackUrl = useCallback(async (url: string) => {
    if (!isCallbackUrl(url)) return;
    const { code, error, errorDescription } = codeFromUrl(url);
    if (error) {
      console.error("OAuth error:", error, errorDescription);
      return;
    }
    if (!code) {
      console.error("No authorization code in callback");
      return;
    }
    setLoading(true);
    try {
      setUser(await handleCallback(code));
    } catch (err) {
      console.error("Auth callback failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      void consumeCallbackUrl(url);
    });
    void Linking.getInitialURL().then((url) => {
      if (url) void consumeCallbackUrl(url);
    });
    return () => subscription.remove();
  }, [consumeCallbackUrl]);

  const signIn = useCallback(async () => {
    try {
      setLoading(true);
      const url = await getSignInUrl();
      const result = await WebBrowser.openAuthSessionAsync(url, REDIRECT_URI);
      if (result.type !== "success" || !("url" in result) || !result.url) {
        return { success: false, error: "Authentication was cancelled" };
      }
      const { code, error, errorDescription } = codeFromUrl(result.url);
      if (error) {
        return { success: false, error: errorDescription || error };
      }
      if (!code) {
        return { success: false, error: "No authorization code received" };
      }
      setUser(await handleCallback(code));
      return { success: true };
    } catch (error) {
      console.error("Sign in failed:", error);
      return { success: false, error: String(error) };
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const sessionId = await getSessionId();
      await clearSession();
      setUser(null);
      if (sessionId) {
        await WebBrowser.openBrowserAsync(getLogoutUrl(sessionId));
      }
      return { success: true };
    } catch (error) {
      console.error("Sign out failed:", error);
      return { success: false, error: String(error) };
    }
  }, []);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken?: boolean } = {}) => {
      if (!user) return null;
      try {
        const token = await getAccessToken(forceRefreshToken === true);
        needsTokenRetry.current = false;
        if (!token) setUser(null);
        return token;
      } catch (error) {
        needsTokenRetry.current = true;
        console.error(
          `Failed to get access token (retry ${tokenRetry}):`,
          error,
        );
        return null;
      }
    },
    // tokenRetry deliberately changes callback identity after reconnect/foreground.
    [user, tokenRetry],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      signIn,
      signOut,
      fetchAccessToken,
    }),
    [user, loading, signIn, signOut, fetchAccessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
