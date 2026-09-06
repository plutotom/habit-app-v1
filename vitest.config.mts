import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@backend": fileURLToPath(
        new URL("./backend/_generated", import.meta.url),
      ),
    },
  },
  test: {
    environment: "edge-runtime",
    include: ["backend/**/*.test.ts", "tests/**/*.test.{ts,tsx}"],
    env: { EXPO_PUBLIC_WORKOS_CLIENT_ID: "client_test", TZ: "America/Chicago" },
  },
});
