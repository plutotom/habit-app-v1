import { Redirect, Slot } from "expo-router";

import { useAuth } from "@/auth/auth-provider";
import { PageLoading } from "@/components/ui/Spinner";

export default function AuthGroupLayout() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <PageLoading />;
  if (isAuthenticated) return <Redirect href="/today" />;
  return <Slot />;
}
