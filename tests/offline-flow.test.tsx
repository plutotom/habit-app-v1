import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, expect, test, vi } from "vitest";

import Index from "../app/index";
import NewHabit from "../app/(app)/habits/new";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  createHabit: vi.fn(),
  syncReminders: vi.fn(),
  requestPermission: vi.fn(),
  alert: vi.fn(),
}));

vi.mock("expo-router", () => ({
  Redirect: (props: object) => React.createElement("redirect", props),
  useRouter: () => ({ replace: mocks.replace, back: vi.fn() }),
}));
vi.mock("@/local/hooks", () => ({
  useLocalMutations: () => ({ createHabit: mocks.createHabit }),
}));
vi.mock("@/lib/habit-reminders", () => ({
  requestHabitReminderPermission: mocks.requestPermission,
  syncHabitReminders: mocks.syncReminders,
}));
vi.mock("@/components/habits/HabitForm", () => ({
  HabitForm: (props: object) => React.createElement("form", props),
}));
vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "safe-area",
}));
vi.mock("react-native", () => ({
  Alert: { alert: mocks.alert },
  Pressable: "button",
  ScrollView: "scroll-view",
  StyleSheet: { create: (styles: unknown) => styles },
  Text: "span",
  View: "div",
}));

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.replace.mockReset();
  mocks.createHabit.mockReset().mockResolvedValue("local-habit-id");
  mocks.syncReminders.mockReset().mockResolvedValue(undefined);
  mocks.requestPermission.mockReset().mockResolvedValue(undefined);
  mocks.alert.mockReset();
});

test("the root route opens the offline app", async () => {
  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = create(<Index />);
  });
  expect(
    renderer!.root.find((node) => String(node.type) === "redirect").props.href,
  ).toBe("/today");
  await act(async () => renderer!.unmount());
});

test("creating a habit writes locally before scheduling its reminder", async () => {
  const calls: string[] = [];
  mocks.createHabit.mockImplementation(async () => {
    calls.push("database");
    return "local-habit-id";
  });
  mocks.requestPermission.mockImplementation(async () => {
    calls.push("permission");
  });
  mocks.syncReminders.mockImplementation(async () => {
    calls.push("reminder");
    throw new Error("notification service unavailable");
  });
  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = create(<NewHabit />);
  });
  const values = {
    title: "Walk",
    scheduleType: "daily" as const,
    reminderTimes: [{ hour: 9, minute: 0 }],
  };
  await act(async () =>
    renderer!.root
      .find((node) => String(node.type) === "form")
      .props.onSubmit(values),
  );

  expect(calls).toEqual(["permission", "database", "reminder"]);
  expect(mocks.requestPermission).toHaveBeenCalledTimes(1);
  expect(mocks.syncReminders).toHaveBeenCalledWith(
    expect.objectContaining({
      habitId: "local-habit-id",
      times: values.reminderTimes,
    }),
  );
  expect(mocks.alert).toHaveBeenCalledWith(
    "Habit saved",
    expect.stringContaining("reminder couldn’t be scheduled"),
  );
  expect(mocks.replace).toHaveBeenCalledWith("/today");
  await act(async () => renderer!.unmount());
});
