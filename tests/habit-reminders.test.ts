import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  store: new Map<string, string>(),
  scheduled: new Set<string>(),
  nextId: 0,
  beforeSetItem: null as null | (() => Promise<void>),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => mocks.store.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      await mocks.beforeSetItem?.();
      mocks.store.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      mocks.store.delete(key);
    }),
  },
}));

const cancelScheduledNotificationAsync = vi.fn(async (id: string) => {
  mocks.scheduled.delete(id);
});

vi.mock("expo-notifications", () => ({
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: "daily", WEEKLY: "weekly" },
  setNotificationHandler: vi.fn(),
  setNotificationChannelAsync: vi.fn(async () => undefined),
  getPermissionsAsync: vi.fn(async () => ({ granted: true })),
  requestPermissionsAsync: vi.fn(async () => ({ granted: true })),
  scheduleNotificationAsync: vi.fn(async () => {
    const id = `scheduled-${++mocks.nextId}`;
    mocks.scheduled.add(id);
    return id;
  }),
  cancelScheduledNotificationAsync,
  cancelAllScheduledNotificationsAsync: vi.fn(async () => {
    mocks.scheduled.clear();
  }),
  getAllScheduledNotificationsAsync: vi.fn(async () =>
    Array.from(mocks.scheduled, (identifier) => ({ identifier })),
  ),
}));

const STORAGE_KEY = "@habits/local-reminders/v1";

function seedReminders(reminders: Record<string, string[]>) {
  for (const ids of Object.values(reminders))
    for (const id of ids) mocks.scheduled.add(id);
  mocks.store.set(
    STORAGE_KEY,
    JSON.stringify(
      Object.fromEntries(
        Object.entries(reminders).map(([habitId, notificationIds]) => [
          habitId,
          { notificationIds, times: [{ hour: 9, minute: 0 }] },
        ]),
      ),
    ),
  );
}

function storedHabitIds() {
  return Object.keys(JSON.parse(mocks.store.get(STORAGE_KEY) ?? "{}"));
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.resetModules();
  mocks.store.clear();
  mocks.scheduled.clear();
  mocks.nextId = 0;
  mocks.beforeSetItem = null;
  cancelScheduledNotificationAsync.mockClear();
});

test("habit reminders schedule, reschedule, and cancel from local state", async () => {
  const { cancelHabitReminders, getHabitReminderTimes, syncHabitReminders } =
    await import("@/lib/habit-reminders");

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
  expect(cancelScheduledNotificationAsync).toHaveBeenCalledWith("scheduled-1");
  expect(mocks.scheduled).toEqual(new Set(["scheduled-2", "scheduled-3"]));
  expect(await getHabitReminderTimes("local-habit-id")).toEqual([
    { hour: 18, minute: 30 },
  ]);

  await cancelHabitReminders("local-habit-id");
  expect(cancelScheduledNotificationAsync).toHaveBeenCalledWith("scheduled-2");
  expect(cancelScheduledNotificationAsync).toHaveBeenCalledWith("scheduled-3");
  expect(await getHabitReminderTimes("local-habit-id")).toEqual([]);
});

test("reminders for deleted habits are cancelled", async () => {
  seedReminders({ kept: ["kept-1"], deleted: ["deleted-1", "deleted-2"] });
  const { reconcileHabitReminders } = await import("@/lib/habit-reminders");

  const cancelled = await reconcileHabitReminders(["kept"]);

  expect(cancelled).toBe(2);
  expect(Array.from(mocks.scheduled)).toEqual(["kept-1"]);
  expect(storedHabitIds()).toEqual(["kept"]);
});

test("scheduled reminders the app no longer tracks are cancelled", async () => {
  mocks.scheduled.add("untracked");
  const { reconcileHabitReminders } = await import("@/lib/habit-reminders");

  await reconcileHabitReminders(["habit"]);

  expect(mocks.scheduled.size).toBe(0);
});

test("cancelAllHabitReminders clears stored and scheduled reminders", async () => {
  seedReminders({ habit: ["habit-1"] });
  const { cancelAllHabitReminders } = await import("@/lib/habit-reminders");

  await cancelAllHabitReminders();

  expect(mocks.scheduled.size).toBe(0);
  expect(mocks.store.has(STORAGE_KEY)).toBe(false);
});

test("cleanup running alongside a save keeps the newly scheduled reminders", async () => {
  const { reconcileHabitReminders, syncHabitReminders } =
    await import("@/lib/habit-reminders");
  // Hold the save open so cleanup starts after the reminder is scheduled with
  // the OS but before the device has recorded which habit owns it.
  const reachedSave = deferred();
  const releaseSave = deferred();
  mocks.beforeSetItem = async () => {
    mocks.beforeSetItem = null;
    reachedSave.resolve();
    await releaseSave.promise;
  };

  const sync = syncHabitReminders({
    habitId: "habit",
    title: "Walk",
    scheduleType: "daily",
    times: [{ hour: 7, minute: 30 }],
  });
  await reachedSave.promise;
  const reconcile = reconcileHabitReminders(["habit"]);
  releaseSave.resolve();
  await Promise.all([sync, reconcile]);

  expect(Array.from(mocks.scheduled)).toEqual(["scheduled-1"]);
  expect(storedHabitIds()).toEqual(["habit"]);
});
