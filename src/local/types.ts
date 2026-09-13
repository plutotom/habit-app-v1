import type { WeekStart } from "@/lib/dates";

export type WorkspaceId = string;
export type HabitId = string;
export type CheckinId = string;
export type ScheduleType = "daily" | "specific_days";

export type Preferences = {
  workspaceId: WorkspaceId;
  timezone: string;
  weekStart: WeekStart;
  updatedAt: number;
};

export type Habit = {
  id: HabitId;
  workspaceId: WorkspaceId;
  title: string;
  description?: string;
  scheduleType: ScheduleType;
  allowedDays?: number[];
  order: number;
  isArchived: boolean;
  createdLocalDay: string;
  createdAt: number;
  updatedAt: number;
};

export type Checkin = {
  id: CheckinId;
  workspaceId: WorkspaceId;
  habitId: HabitId;
  localDay: string;
  state: "completed" | "undone";
  completedAt?: number;
  value: number;
  isSkip: boolean;
  note?: string;
  createdAt: number;
  updatedAt: number;
};

export type HabitStatistics = {
  current: number;
  longest: number;
  total: number;
};

export type HabitFields = {
  title: string;
  description?: string;
  scheduleType: ScheduleType;
  allowedDays?: number[];
};
