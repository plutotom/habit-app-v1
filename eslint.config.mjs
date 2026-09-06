import { defineConfig, globalIgnores } from "eslint/config";
import expoConfig from "eslint-config-expo/flat.js";
import prettier from "eslint-config-prettier";

export default defineConfig([
  ...expoConfig,
  prettier,
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
