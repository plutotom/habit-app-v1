import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { Id } from "../backend/_generated/dataModel";
import { HabitCard } from "../src/components/habits/HabitCard";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  alert: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("expo-router", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/hooks/use-habit-statistics", () => ({
  useHabitStatistics: () => ({ current: 1, longest: 1, total: 1 }),
}));
vi.mock("react-native", () => ({
  Pressable: "button",
  Text: "span",
  View: "div",
  StyleSheet: { create: (styles: unknown) => styles },
  Alert: { alert: mocks.alert },
  AppState: { addEventListener: () => ({ remove: mocks.remove }) },
}));

let renderer: ReactTestRenderer;
beforeEach(() => {
  vi.useFakeTimers();
  mocks.push.mockClear();
  mocks.alert.mockClear();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.useRealTimers();
});

const base = {
  habitId: "habit" as Id<"habits">,
  title: "Walk",
  done: false,
  localDay: "2026-09-05",
  todayLocal: "2026-09-05",
  canComplete: true,
  onUndo: async () => {},
};
async function hold() {
  const card = renderer.root.findAll(
    (node) =>
      node.type === "button" && typeof node.props.onPressIn === "function",
  )[0]!;
  await act(async () => card.props.onPressIn());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3100);
  });
}

test("a failed completion can be retried", async () => {
  const complete = vi
    .fn()
    .mockRejectedValueOnce(new Error("Offline"))
    .mockResolvedValue(undefined);
  await act(async () => {
    renderer = create(<HabitCard {...base} onComplete={complete} />);
  });
  await hold();
  expect(mocks.alert).toHaveBeenCalledTimes(1);
  expect(mocks.push).not.toHaveBeenCalled();
  await hold();
  expect(complete).toHaveBeenCalledTimes(2);
  expect(mocks.push).toHaveBeenCalledTimes(1);
});

test("completing, undoing, then completing again works without remounting the card", async () => {
  const complete = vi.fn().mockResolvedValue(undefined);
  await act(async () => {
    renderer = create(<HabitCard {...base} onComplete={complete} />);
  });
  await hold();
  await act(async () =>
    renderer.update(<HabitCard {...base} done onComplete={complete} />),
  );
  await act(async () =>
    renderer.update(<HabitCard {...base} done={false} onComplete={complete} />),
  );
  await hold();
  expect(complete).toHaveBeenCalledTimes(2);
});

test("unmounting during a hold cancels the completion timer", async () => {
  const complete = vi.fn().mockResolvedValue(undefined);
  await act(async () => {
    renderer = create(<HabitCard {...base} onComplete={complete} />);
  });
  await act(async () =>
    renderer.root
      .findAll(
        (node) =>
          node.type === "button" && typeof node.props.onPressIn === "function",
      )[0]!
      .props.onPressIn(),
  );
  await act(async () => renderer.unmount());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(4000);
  });
  expect(complete).not.toHaveBeenCalled();
});
