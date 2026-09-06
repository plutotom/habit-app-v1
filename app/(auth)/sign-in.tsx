import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/auth/auth-provider";
import { colors, fonts } from "@/theme";

export default function SignInScreen() {
  const { signIn, loading } = useAuth();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <Text style={styles.title}>Habits</Text>
        <Text style={styles.sub}>Simple tracking. Hold to complete.</Text>
        <Pressable
          onPress={() => void signIn()}
          disabled={loading}
          style={[styles.button, loading && styles.disabled]}
        >
          <Text style={styles.buttonText}>
            {loading ? "Signing in…" : "Sign in with WorkOS"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 40,
    color: colors.foreground,
  },
  sub: { fontSize: 16, color: colors.muted, marginBottom: 24 },
  button: {
    backgroundColor: colors.foreground,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: "600" },
  disabled: { opacity: 0.6 },
});
