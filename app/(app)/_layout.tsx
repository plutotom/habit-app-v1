import { Redirect, Slot, usePathname } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/auth/auth-provider";
import { BottomNav } from "@/components/app/BottomNav";
import { PageLoading } from "@/components/ui/Spinner";
import { colors } from "@/theme";

export default function AppGroupLayout() {
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();

  if (loading) return <PageLoading />;
  if (!isAuthenticated) return <Redirect href="/sign-in" />;

  const hideNav = pathname.includes("/completed");

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={[styles.main, hideNav && styles.mainFull]}>
          <Slot />
        </View>
      </SafeAreaView>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
  main: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 96,
  },
  mainFull: { paddingBottom: 0, paddingHorizontal: 0, paddingTop: 0 },
});
