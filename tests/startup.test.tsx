import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { NodeSqliteDatabase } from "./node-sqlite";

let database: NodeSqliteDatabase;

vi.mock("expo-sqlite", () => ({
  SQLiteProvider: ({
    children,
    onInit,
  }: {
    children: React.ReactNode;
    onInit?: (db: NodeSqliteDatabase) => Promise<void>;
  }) => {
    const [ready, setReady] = React.useState(false);
    React.useEffect(() => {
      database = new NodeSqliteDatabase();
      void onInit?.(database).then(() => setReady(true));
    }, [onInit]);
    if (!ready) return null;
    return children;
  },
  useSQLiteContext: () => database,
}));
vi.mock("expo-router", () => ({
  Stack: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("stack", null, children),
}));
vi.mock("expo-status-bar", () => ({
  StatusBar: () => React.createElement("status-bar"),
}));
vi.mock("@/lib/habit-reminders", () => ({
  reconcileHabitReminders: vi.fn(async () => 0),
}));
vi.mock("@/local/hooks", () => ({
  useLocalHabits: () => [],
}));
vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "safe-area",
}));
vi.mock("react-native", () => ({
  ActivityIndicator: "activity-indicator",
  StyleSheet: { create: (styles: unknown) => styles },
  Text: "span",
  View: "div",
}));

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

afterEach(() => {
  database?.close();
});

test("root layout mounts the offline provider stack without crashing", async () => {
  const { default: RootLayout } = await import("../app/_layout");
  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = create(<RootLayout />);
  });
  await act(async () => {
    await Promise.resolve();
  });
  expect(renderer!.toJSON()).not.toBeNull();
  await act(async () => renderer!.unmount());
});
