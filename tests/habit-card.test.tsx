import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { HabitCard } from "../src/components/habits/HabitCard";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  alert: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("expo-router", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/local/hooks", () => ({
  useLocalHabitStatistics: () => ({ current: 1, longest: 1, total: 1 }),
}));
vi.mock("react-native", () => ({
  Pressable: "button",
  Text: "span",
  TextInput: "input",
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
  habitId: "habit",
  title: "Walk",
  dailyGoal: 1,
  goalUnit: "times" as const,
  progress: 0,
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
    await vi.advanceTimersByTimeAsync(2100);
  });
}

test("completes after about two seconds of holding", async () => {
  const addProgress = vi.fn().mockResolvedValue(undefined);
  await act(async () => {
    renderer = create(<HabitCard {...base} onAddProgress={addProgress} />);
  });
  const card = renderer.root.findAll(
    (node) =>
      node.type === "button" && typeof node.props.onPressIn === "function",
  )[0]!;

  await act(async () => card.props.onPressIn());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1900);
  });
  expect(addProgress).not.toHaveBeenCalled();

  await act(async () => {
    await vi.advanceTimersByTimeAsync(100);
  });
  expect(addProgress).toHaveBeenCalledWith(1);
});

test("holding a multi-unit habit does not celebrate until the goal is met", async () => {
  const addProgress = vi.fn().mockResolvedValue(undefined);
  await act(async () => {
    renderer = create(
      <HabitCard
        {...base}
        dailyGoal={3}
        progress={0}
        onAddProgress={addProgress}
      />,
    );
  });
  await hold();
  expect(addProgress).toHaveBeenCalledWith(1);
  expect(mocks.push).not.toHaveBeenCalled();

  await act(async () =>
    renderer.update(
      <HabitCard
        {...base}
        dailyGoal={3}
        progress={2}
        onAddProgress={addProgress}
      />,
    ),
  );
  await hold();
  expect(mocks.push).toHaveBeenCalledTimes(1);
});

test("log amount close dismisses the progress input", async () => {
  const addProgress = vi.fn().mockResolvedValue(undefined);
  await act(async () => {
    renderer = create(<HabitCard {...base} onAddProgress={addProgress} />);
  });
  const event = { stopPropagation: vi.fn() };
  const logButton = renderer.root.find(
    (node) => node.props.accessibilityLabel === "Log a specific amount",
  );
  await act(async () => logButton.props.onPress(event));
  expect(renderer.root.findAll((node) => node.type === "input")).toHaveLength(
    1,
  );

  await act(async () => logButton.props.onPress(event));
  expect(renderer.root.findAll((node) => node.type === "input")).toHaveLength(
    0,
  );
});

test("can log a larger measured amount", async () => {
  const addProgress = vi.fn().mockResolvedValue(undefined);
  await act(async () => {
    renderer = create(
      <HabitCard
        {...base}
        dailyGoal={4000}
        goalUnit="steps"
        onAddProgress={addProgress}
      />,
    );
  });
  const event = { stopPropagation: vi.fn() };
  const logButton = renderer.root.find(
    (node) => node.props.accessibilityLabel === "Log a specific amount",
  );
  await act(async () => logButton.props.onPress(event));
  const input = renderer.root.find((node) => node.type === "input");
  await act(async () => input.props.onChangeText("4000"));
  const addButton = renderer.root.find(
    (node) => node.props.accessibilityLabel === "Add progress",
  );
  await act(async () => addButton.props.onPress(event));

  expect(addProgress).toHaveBeenCalledWith(4000);
});

test("a failed completion can be retried", async () => {
  const addProgress = vi
    .fn()
    .mockRejectedValueOnce(new Error("Offline"))
    .mockResolvedValue(undefined);
  await act(async () => {
    renderer = create(<HabitCard {...base} onAddProgress={addProgress} />);
  });
  await hold();
  expect(mocks.alert).toHaveBeenCalledTimes(1);
  expect(mocks.alert.mock.calls.flat().join(" ")).not.toMatch(
    /connection|network/i,
  );
  expect(mocks.push).not.toHaveBeenCalled();
  await hold();
  expect(addProgress).toHaveBeenCalledTimes(2);
  expect(mocks.push).toHaveBeenCalledTimes(1);
});

test("completing, undoing, then completing again works without remounting the card", async () => {
  const addProgress = vi.fn().mockResolvedValue(undefined);
  await act(async () => {
    renderer = create(<HabitCard {...base} onAddProgress={addProgress} />);
  });
  await hold();
  await act(async () =>
    renderer.update(<HabitCard {...base} done onAddProgress={addProgress} />),
  );
  await act(async () =>
    renderer.update(
      <HabitCard {...base} done={false} onAddProgress={addProgress} />,
    ),
  );
  await hold();
  expect(addProgress).toHaveBeenCalledTimes(2);
});

test("unmounting during a hold cancels the completion timer", async () => {
  const addProgress = vi.fn().mockResolvedValue(undefined);
  await act(async () => {
    renderer = create(<HabitCard {...base} onAddProgress={addProgress} />);
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
  expect(addProgress).not.toHaveBeenCalled();
});
