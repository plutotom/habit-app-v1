import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { getFunctionName } from "convex/server";
import Today from "../app/(app)/today";

const mocks = vi.hoisted(() => ({
  days: [] as string[],
  foreground: undefined as undefined | ((state: string) => void),
}));
vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
  useQuery: (
    reference: Parameters<typeof getFunctionName>[0],
    args?: { days: string[] },
  ) => {
    const name = getFunctionName(reference);
    if (name === "users:current")
      return { timezone: "America/Chicago", weekStart: "mon" };
    if (name === "habits:list")
      return [
        {
          _id: "habit",
          title: "Walk",
          scheduleType: "daily",
          createdLocalDay: "2020-01-01",
          createdAt: 0,
        },
      ];
    mocks.days = args!.days;
    return args!.days.includes("2026-09-05")
      ? [{ habitId: "habit", localDay: "2026-09-05", isSkip: false }]
      : [];
  },
}));
vi.mock("expo-router", () => ({
  useRouter: () => ({ push: vi.fn(), setParams: vi.fn() }),
  useLocalSearchParams: () => ({}),
}));
vi.mock("@/components/habits/DateStrip", () => ({
  DateStrip: (props: object) => React.createElement("aside", props),
}));
vi.mock("@/components/habits/HabitCard", () => ({
  HabitCard: (props: object) => React.createElement("article", props),
}));
vi.mock("@/components/ui/Spinner", () => ({
  PageLoading: () => null,
  Spinner: () => null,
}));
vi.mock("react-native", () => ({
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Text: "Text",
  View: "View",
  StyleSheet: { create: (styles: unknown) => styles, absoluteFill: {} },
  AppState: {
    addEventListener: (_: string, callback: (state: string) => void) => {
      mocks.foreground = callback;
      return { remove: vi.fn() };
    },
  },
}));

let renderer: ReactTestRenderer;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-05T18:00:00Z"));
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.useRealTimers();
});

test("browsing another week retains the selected day's completion data", async () => {
  await act(async () => {
    renderer = create(<Today />);
  });
  await act(async () =>
    renderer.root.find((node) => node.type === "aside").props.onPrevWeek(),
  );
  expect(mocks.days).toContain("2026-09-05");
  expect(renderer.root.find((node) => node.type === "article").props.done).toBe(
    true,
  );
});

test("returning after midnight refreshes the selected day and week strip", async () => {
  await act(async () => {
    renderer = create(<Today />);
  });
  vi.setSystemTime(new Date("2026-09-07T06:00:00Z"));
  await act(async () => mocks.foreground?.("active"));
  expect(
    renderer.root.find((node) => node.type === "article").props.localDay,
  ).toBe("2026-09-07");
  expect(
    renderer.root.find((node) => node.type === "aside").props.days[0].localDay,
  ).toBe("2026-09-07");
});
