import { beforeEach, expect, test, vi } from "vitest";

import {
  cancelHabitReminders,
  getHabitReminderTimes,
  syncHabitReminders,
} from "../src/lib/habit-reminders";

const mocks = vi.hoisted(() => ({
  storage: new Map<string, string>(),
  schedule: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => mocks.storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      mocks.storage.set(key, value);
    }),
  },
}));
vi.mock("expo-notifications", () => ({
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: "daily", WEEKLY: "weekly" },
  cancelScheduledNotificationAsync: mocks.cancel,
  getPermissionsAsync: vi.fn(async () => ({ granted: true })),
  requestPermissionsAsync: vi.fn(async () => ({ granted: true })),
  scheduleNotificationAsync: mocks.schedule,
  setNotificationChannelAsync: vi.fn(),
  setNotificationHandler: vi.fn(),
}));

beforeEach(() => {
  mocks.storage.clear();
  mocks.schedule.mockReset();
  mocks.cancel.mockReset().mockResolvedValue(undefined);
  let next = 0;
  mocks.schedule.mockImplementation(async () => `notification-${next++}`);
});

test("habit reminders schedule, reschedule, and cancel from local state", async () => {
  await syncHabitReminders({
    habitId: "local-habit-id",
    title: "Walk",
    scheduleType: "daily",
    times: [{ hour: 9, minute: 0 }],
  });
  expect(await getHabitReminderTimes("local-habit-id")).toEqual([
    { hour: 9, minute: 0 },
  ]);

  await syncHabitReminders({
    habitId: "local-habit-id",
    title: "Evening walk",
    scheduleType: "specific_days",
    allowedDays: [1, 3],
    times: [{ hour: 18, minute: 30 }],
  });
  expect(mocks.cancel).toHaveBeenCalledWith("notification-0");
  expect(mocks.schedule).toHaveBeenCalledTimes(3);
  expect(await getHabitReminderTimes("local-habit-id")).toEqual([
    { hour: 18, minute: 30 },
  ]);

  await cancelHabitReminders("local-habit-id");
  expect(mocks.cancel).toHaveBeenCalledWith("notification-1");
  expect(mocks.cancel).toHaveBeenCalledWith("notification-2");
  expect(await getHabitReminderTimes("local-habit-id")).toEqual([]);
});
