import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import Today from "../app/(app)/today";

const mocks = vi.hoisted(() => ({
  days: [] as string[],
  foreground: undefined as undefined | ((state: string) => void),
  params: {} as { day?: string },
}));
vi.mock("@/local/hooks", () => ({
  useLocalPreferences: () => ({
    timezone: "America/Chicago",
    weekStart: "mon",
  }),
  useLocalHabits: () => [
    {
      id: "habit",
      title: "Walk",
      scheduleType: "daily",
      createdLocalDay: "2020-01-01",
      createdAt: 0,
    },
  ],
  useLocalCheckinsForDays: (days: string[]) => {
    mocks.days = days;
    return days.includes("2026-09-05")
      ? [
          {
            id: "habit:2026-09-05",
            habitId: "habit",
            localDay: "2026-09-05",
          },
        ]
      : [];
  },
  useLocalMutations: () => ({
    completeHabit: vi.fn(),
    undoCheckin: vi.fn(),
  }),
}));
vi.mock("expo-router", () => ({
  useRouter: () => ({ push: vi.fn(), setParams: vi.fn() }),
  useLocalSearchParams: () => mocks.params,
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
  mocks.params = {};
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

test("previous days can still be marked done", async () => {
  mocks.params = { day: "2026-09-04" };
  await act(async () => {
    renderer = create(<Today />);
  });
  const card = renderer.root.find((node) => node.type === "article");
  expect(card.props.localDay).toBe("2026-09-04");
  expect(card.props.canComplete).toBe(true);
  expect(card.props.done).toBe(false);
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
