import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

const STORAGE_KEY = "@habits/local-reminders/v1";
export type ReminderTime = { hour: number; minute: number };
type ReminderSchedule = { notificationIds: string[]; times: ReminderTime[] };
type StoredReminders = Record<string, ReminderSchedule>;
type SyncHabitRemindersInput = {
  habitId: string;
  title: string;
  scheduleType: "daily" | "specific_days";
  allowedDays?: number[];
  times: ReminderTime[];
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Reminder work runs one task at a time so a cleanup pass can never cancel
// notifications that another task has scheduled but not yet recorded.
let queue: Promise<unknown> = Promise.resolve();
function runExclusive<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task);
  queue = result.catch(() => undefined);
  return result;
}

function normalizeTimes(times: ReminderTime[]) {
  return Array.from(
    new Map(
      times.map((time) => [`${time.hour}:${time.minute}`, time]),
    ).values(),
  ).sort((a, b) => a.hour - b.hour || a.minute - b.minute);
}
async function getStoredReminders(): Promise<StoredReminders> {
  const value = await AsyncStorage.getItem(STORAGE_KEY);
  if (!value) return {};
  try {
    return JSON.parse(value) as StoredReminders;
  } catch {
    return {};
  }
}
async function saveStoredReminders(reminders: StoredReminders) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
}
async function cancelNotifications(notificationIds: Iterable<string>) {
  await Promise.all(
    Array.from(notificationIds, (id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined),
    ),
  );
}
export async function requestHabitReminderPermission() {
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted
    ? current
    : await Notifications.requestPermissionsAsync();
  if (!permission.granted)
    throw new Error("Allow notifications in Settings to use habit reminders.");
  if (process.env.EXPO_OS === "android")
    await Notifications.setNotificationChannelAsync("habit-reminders", {
      name: "Habit reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
    });
}
export async function getHabitReminderTimes(habitId: string) {
  return (await getStoredReminders())[habitId]?.times ?? [];
}
export function syncHabitReminders(input: SyncHabitRemindersInput) {
  return runExclusive(() => syncReminders(input));
}
export function cancelHabitReminders(habitId: string) {
  return runExclusive(() => cancelReminders(habitId));
}
/**
 * Cancels every scheduled reminder that no active habit owns. Reminders live on
 * the device while habits live in the account, so the two drift apart whenever
 * habits disappear without the app cancelling their reminders first.
 */
export function reconcileHabitReminders(activeHabitIds: string[]) {
  return runExclusive(() => reconcileReminders(activeHabitIds));
}
/** Clears every reminder on the device, for when no account owns them. */
export function cancelAllHabitReminders() {
  return runExclusive(() => cancelAllReminders());
}
async function syncReminders({
  habitId,
  title,
  scheduleType,
  allowedDays,
  times,
}: SyncHabitRemindersInput) {
  const normalizedTimes = normalizeTimes(times);
  const reminders = await getStoredReminders();
  await cancelNotifications(reminders[habitId]?.notificationIds ?? []);
  if (normalizedTimes.length === 0) {
    delete reminders[habitId];
    await saveStoredReminders(reminders);
    return;
  }
  await requestHabitReminderPermission();
  const days = scheduleType === "specific_days" ? (allowedDays ?? []) : [];
  const notificationIds: string[] = [];
  for (const time of normalizedTimes) {
    const triggers =
      scheduleType === "daily"
        ? [
            {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour: time.hour,
              minute: time.minute,
              channelId: "habit-reminders",
            } as const,
          ]
        : days.map((day) => ({
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: day + 1,
            hour: time.hour,
            minute: time.minute,
            channelId: "habit-reminders",
          }));
    for (const trigger of triggers)
      notificationIds.push(
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Habit reminder",
            body: `Time for ${title}`,
            sound: "default",
            data: { habitId },
          },
          trigger,
        }),
      );
  }
  reminders[habitId] = { notificationIds, times: normalizedTimes };
  await saveStoredReminders(reminders);
}
async function cancelReminders(habitId: string) {
  const reminders = await getStoredReminders();
  if (!reminders[habitId]) return;
  await cancelNotifications(reminders[habitId].notificationIds);
  delete reminders[habitId];
  await saveStoredReminders(reminders);
}
async function reconcileReminders(activeHabitIds: string[]) {
  const activeHabits = new Set(activeHabitIds);
  const reminders = await getStoredReminders();
  const kept: StoredReminders = {};
  const keptNotificationIds = new Set<string>();
  for (const [habitId, schedule] of Object.entries(reminders)) {
    if (!activeHabits.has(habitId)) continue;
    kept[habitId] = schedule;
    for (const id of schedule.notificationIds) keptNotificationIds.add(id);
  }
  // Pruning first keeps a failed cancellation retryable on the next pass.
  if (Object.keys(kept).length !== Object.keys(reminders).length)
    await saveStoredReminders(kept);
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const orphaned = scheduled
    .map((request) => request.identifier)
    .filter((id) => !keptNotificationIds.has(id));
  await cancelNotifications(orphaned);
  return orphaned.length;
}
async function cancelAllReminders() {
  await AsyncStorage.removeItem(STORAGE_KEY);
  await Notifications.cancelAllScheduledNotificationsAsync();
}
