import { ActivityIndicator, StyleSheet, View } from "react-native";

import { colors } from "@/theme";

export function Spinner({
  light = false,
  size = "large",
}: {
  light?: boolean;
  size?: "small" | "large";
}) {
  return (
    <ActivityIndicator
      size={size}
      color={light ? colors.white : colors.foreground}
    />
  );
}

export function PageLoading() {
  return (
    <View style={styles.wrap}>
      <Spinner />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
});
