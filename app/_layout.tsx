import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { HabitReminderCleanup } from "@/components/app/HabitReminderCleanup";
import { AppProviders } from "@/providers/app-providers";
import { colors } from "@/theme";

export default function RootLayout() {
  return (
    <AppProviders>
      <HabitReminderCleanup />
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </AppProviders>
  );
}
