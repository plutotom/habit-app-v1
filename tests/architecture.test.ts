// @vitest-environment node

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

const liveRoots = [
  "app",
  "src/components",
  "src/providers",
  "src/local",
  "src/lib",
  "src/hooks",
];

const forbiddenImportPatterns = [
  { pattern: /from ["']convex\/react["']/, label: "convex/react" },
  { pattern: /from ["']convex\/browser["']/, label: "convex/browser" },
  { pattern: /from ["']@\/sync(?:\/|["'])/, label: "@/sync/*" },
  { pattern: /from ["']@\/auth(?:\/|["'])/, label: "@/auth/*" },
];

function listSourceFiles(directory: string): string[] {
  const absolute = join(repoRoot, directory);
  const entries = readdirSync(absolute);
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(absolute, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      files.push(...listSourceFiles(join(directory, entry)));
      continue;
    }
    if (path.endsWith(".ts") || path.endsWith(".tsx")) files.push(path);
  }
  return files;
}

for (const root of liveRoots) {
  test(`live app tree ${root} does not import sync-only modules`, () => {
    const violations: string[] = [];
    for (const file of listSourceFiles(root)) {
      const source = readFileSync(file, "utf8");
      for (const { pattern, label } of forbiddenImportPatterns) {
        if (pattern.test(source)) {
          violations.push(`${relative(repoRoot, file)} imports ${label}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
}

test("root layout stays on the offline provider stack", () => {
  const layout = readFileSync(join(repoRoot, "app/_layout.tsx"), "utf8");
  expect(layout).toContain("AppProviders");
  expect(layout).toContain("HabitReminderCleanup");
  expect(layout).not.toMatch(/ConvexProvider|AuthProvider|UserBootstrap/);
});

test("app providers only mount local storage", () => {
  const providers = readFileSync(
    join(repoRoot, "src/providers/app-providers.tsx"),
    "utf8",
  );
  expect(providers).toContain("LocalDatabaseProvider");
  expect(providers).not.toMatch(/ConvexProvider|AuthProvider/);
});

test("default dev script does not require Convex", () => {
  const packageJson = JSON.parse(
    readFileSync(join(repoRoot, "package.json"), "utf8"),
  ) as { scripts: Record<string, string> };
  expect(packageJson.scripts.dev).not.toContain("convex dev");
});
