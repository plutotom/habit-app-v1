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
export async function syncHabitReminders({
  habitId,
  title,
  scheduleType,
  allowedDays,
  times,
}: SyncHabitRemindersInput) {
  const normalizedTimes = normalizeTimes(times);
  const reminders = await getStoredReminders();
  await Promise.all(
    (reminders[habitId]?.notificationIds ?? []).map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined),
    ),
  );
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
export async function cancelHabitReminders(habitId: string) {
  const reminders = await getStoredReminders();
  if (!reminders[habitId]) return;
  await Promise.all(
    reminders[habitId].notificationIds.map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined),
    ),
  );
  delete reminders[habitId];
  await saveStoredReminders(reminders);
}
