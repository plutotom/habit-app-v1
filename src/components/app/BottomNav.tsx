import { usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/theme";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (pathname.includes("/completed")) return null;

  const homeActive = pathname === "/today" || pathname === "/";
  const profileActive = pathname === "/profile";

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(12, insets.bottom) }]}>
      <Pressable
        onPress={() => router.replace("/today")}
        style={styles.item}
        accessibilityLabel="Home"
      >
        <Text style={[styles.icon, homeActive && styles.active]}>⌂</Text>
        <Text style={[styles.label, homeActive && styles.active]}>Home</Text>
      </Pressable>
      <Pressable
        onPress={() => router.push("/habits/new")}
        style={styles.plusWrap}
        accessibilityLabel="New habit"
      >
        <View style={styles.plus}>
          <Text style={styles.plusText}>+</Text>
        </View>
      </Pressable>
      <Pressable
        onPress={() => router.replace("/profile")}
        style={styles.item}
        accessibilityLabel="Profile"
      >
        <Text style={[styles.icon, profileActive && styles.active]}>○</Text>
        <Text style={[styles.label, profileActive && styles.active]}>
          Profile
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.95)",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    paddingTop: 8,
    paddingHorizontal: 24,
  },
  item: {
    alignItems: "center",
    gap: 4,
    paddingBottom: 4,
    minWidth: 64,
  },
  icon: {
    fontSize: 20,
    color: colors.muted,
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.muted,
  },
  active: {
    color: colors.foreground,
  },
  plusWrap: {
    marginTop: -20,
  },
  plus: {
    height: 44,
    width: 44,
    borderRadius: 22,
    backgroundColor: colors.foreground,
    alignItems: "center",
    justifyContent: "center",
  },
  plusText: {
    color: colors.white,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "400",
  },
});
