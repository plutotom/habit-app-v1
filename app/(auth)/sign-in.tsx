import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, fonts } from "@/theme";

export default function SignInScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <Text style={styles.title}>Habits</Text>
        <Text style={styles.sub}>Simple tracking. Hold to complete.</Text>
        <Text style={styles.note}>
          Account connection is coming in the sync update. You can use every
          core habit feature offline now.
        </Text>
        <Pressable
          onPress={() => router.replace("/today")}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Continue offline</Text>
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
  sub: { fontSize: 16, color: colors.muted, marginBottom: 12 },
  note: {
    maxWidth: 320,
    textAlign: "center",
    lineHeight: 20,
    color: colors.muted,
    marginBottom: 24,
  },
  button: {
    backgroundColor: colors.foreground,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: "600" },
});
