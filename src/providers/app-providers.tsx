import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { type ReactNode, useCallback, useState } from "react";
import { Text, View } from "react-native";

import { AuthProvider, useAuth } from "@/auth/auth-provider";
import { UserBootstrap } from "@/components/app/UserBootstrap";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

function useAuthFromWorkOS() {
  const { user, loading, fetchAccessToken } = useAuth();

  const wrappedFetch = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken?: boolean } = {}) => {
      return await fetchAccessToken({ forceRefreshToken });
    },
    [fetchAccessToken],
  );

  return {
    isLoading: loading,
    isAuthenticated: !!user,
    fetchAccessToken: wrappedFetch,
  };
}

function ConvexTree({ children }: { children: ReactNode }) {
  const [client] = useState(() =>
    convexUrl ? new ConvexReactClient(convexUrl) : null,
  );

  if (!client)
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
        <Text>
          The app is missing its backend configuration. Set
          EXPO_PUBLIC_CONVEX_URL and restart the app.
        </Text>
      </View>
    );

  return (
    <ConvexProviderWithAuth client={client} useAuth={useAuthFromWorkOS}>
      <UserBootstrap>{children}</UserBootstrap>
    </ConvexProviderWithAuth>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ConvexTree>{children}</ConvexTree>
    </AuthProvider>
  );
}
