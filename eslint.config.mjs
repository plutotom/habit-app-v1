import { defineConfig, globalIgnores } from "eslint/config";
import expoConfig from "eslint-config-expo/flat.js";
import prettier from "eslint-config-prettier";

const liveAppFiles = [
  "app/**/*.{js,jsx,ts,tsx}",
  "src/components/**/*.{js,jsx,ts,tsx}",
  "src/providers/**/*.{js,jsx,ts,tsx}",
  "src/local/**/*.{js,jsx,ts,tsx}",
  "src/lib/**/*.{js,jsx,ts,tsx}",
  "src/hooks/**/*.{js,jsx,ts,tsx}",
];

export default defineConfig([
  ...expoConfig,
  prettier,
  {
    files: liveAppFiles,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "convex/react",
              message:
                "Convex is sync-only. Use src/local hooks in the live app.",
            },
            {
              name: "convex/browser",
              message:
                "Convex is sync-only. Use src/local hooks in the live app.",
            },
          ],
          patterns: [
            {
              group: ["@/sync", "@/sync/*"],
              message:
                "src/sync is not wired into the live app. Keep sync code isolated.",
            },
            {
              group: ["@/auth", "@/auth/*"],
              message: "Auth lives in src/sync for the future sync slice.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    "backend/_generated/**",
    ".expo/**",
    ".next/**",
    ".vercel/**",
    "ios/**",
    "android/**",
    "dist/**",
    "node_modules/**",
    "coverage/**",
  ]),
]);
