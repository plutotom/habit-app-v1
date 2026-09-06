import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { ReactNode } from "react";
import { PageLoading } from "@/components/ui/Spinner";

import { api } from "@backend/api";
import { useAuth } from "@/auth/auth-provider";

export function UserBootstrap({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useConvexAuth();
  const { user } = useAuth();
  const getOrCreate = useMutation(api.users.getOrCreate);
  const profile = useQuery(api.users.current, isAuthenticated ? {} : "skip");
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || profile !== null) return;
    let cancelled = false;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    void getOrCreate({ email: user?.email, timezone }).catch(() => {
      if (!cancelled) setError(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, profile, user?.email, getOrCreate, attempt]);

  if (!user) return <>{children}</>;
  if (error || !isAuthenticated)
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
        }}
      >
        <Text>
          {error
            ? "Couldn't prepare your account."
            : "Connecting to your account…"}
        </Text>
        <Text>Please check your connection.</Text>
        {error ? (
          <Pressable
            onPress={() => {
              setError(false);
              setAttempt((value) => value + 1);
            }}
          >
            <Text>Try again</Text>
          </Pressable>
        ) : null}
      </View>
    );
  if (!profile) return <PageLoading />;
  return <>{children}</>;
}
