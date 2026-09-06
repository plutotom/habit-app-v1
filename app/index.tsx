import { Redirect } from "expo-router";

import { useAuth } from "@/auth/auth-provider";
import { PageLoading } from "@/components/ui/Spinner";

export default function Index() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <PageLoading />;
  return <Redirect href={isAuthenticated ? "/today" : "/sign-in"} />;
}
