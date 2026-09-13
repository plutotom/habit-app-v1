import {
  getHabitCreatedLocalDay,
  isHabitActiveOnDay,
  timestampToLocalDay,
} from "@/lib/dates";
import type { LocalDatabase } from "@/local/database";
import { createLocalId } from "@/local/ids";
import { computeHabitStatistics } from "@/local/statistics";
import type {
  Checkin,
  CheckinId,
  Habit,
  HabitFields,
  HabitId,
  HabitStatistics,
  Preferences,
  WorkspaceId,
} from "@/local/types";
import {
  validateHabit,
  validateLocalDay,
  validateTimezone,
} from "../../shared/validation";

const MAX_ACTIVE_HABITS = 200;
const MAX_DAY_RANGE = 31;
const OUTBOX_SCHEMA_VERSION = 1;

type RepositoryOptions = {
  now?: () => number;
  createId?: () => string;
};

type HabitRow = {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  schedule_type: "daily" | "specific_days";
  allowed_days_json: string | null;
  sort_order: number;
  is_archived: number;
  created_local_day: string;
  created_at: number;
  updated_at: number;
};

type CheckinRow = {
  id: string;
  workspace_id: string;
  habit_id: string;
  local_day: string;
  state: "completed" | "undone";
  completed_at: number | null;
  value: number;
  is_skip: number;
  note: string | null;
  created_at: number;
  updated_at: number;
};

type PreferencesRow = {
  workspace_id: string;
  timezone: string;
  week_start: "mon" | "sun";
  updated_at: number;
};

function mapHabit(row: HabitRow): Habit {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    description: row.description ?? undefined,
    scheduleType: row.schedule_type,
    allowedDays: row.allowed_days_json
      ? (JSON.parse(row.allowed_days_json) as number[])
      : undefined,
    order: row.sort_order,
    isArchived: row.is_archived === 1,
    createdLocalDay: row.created_local_day,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCheckin(row: CheckinRow): Checkin {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    habitId: row.habit_id,
    localDay: row.local_day,
    state: row.state,
    completedAt: row.completed_at ?? undefined,
    value: row.value,
    isSkip: row.is_skip === 1,
    note: row.note ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPreferences(row: PreferencesRow): Preferences {
  return {
    workspaceId: row.workspace_id,
    timezone: row.timezone,
    weekStart: row.week_start,
    updatedAt: row.updated_at,
  };
}

function normalizeHabitFields(fields: HabitFields): HabitFields {
  validateHabit(fields);
  return {
    title: fields.title.trim(),
    description: fields.description?.trim() || undefined,
    scheduleType: fields.scheduleType,
    allowedDays:
      fields.scheduleType === "specific_days"
        ? [...(fields.allowedDays ?? [])].sort((a, b) => a - b)
        : undefined,
  };
}

// Future sync: every mutation enqueues a snapshot; no upload consumer yet.
async function writeOutbox(
  db: LocalDatabase,
  workspaceId: string,
  entityType: "habit" | "checkin" | "preferences",
  entityId: string,
  entity: unknown,
  now: number,
  createId: () => string,
) {
  const snapshot = JSON.stringify({
    schemaVersion: OUTBOX_SCHEMA_VERSION,
    entityType,
    entity,
  });
  await db.runAsync(
    `INSERT INTO local_sync_outbox
      (workspace_id, entity_type, entity_id, operation_id, schema_version,
       snapshot_json, created_at, updated_at, attempt_count, next_attempt_at, last_error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL)
     ON CONFLICT(workspace_id, entity_type, entity_id) DO UPDATE SET
       operation_id = excluded.operation_id,
       schema_version = excluded.schema_version,
       snapshot_json = excluded.snapshot_json,
       created_at = excluded.created_at,
       updated_at = excluded.updated_at,
       attempt_count = 0,
       next_attempt_at = NULL,
       last_error = NULL;`,
    [
      workspaceId,
      entityType,
      entityId,
      createId(),
      OUTBOX_SCHEMA_VERSION,
      snapshot,
      now,
      now,
    ],
  );
}

export class LocalHabitRepository {
  private readonly now: () => number;
  private readonly createId: () => string;

  constructor(
    private readonly db: LocalDatabase,
    readonly workspaceId: WorkspaceId,
    options: RepositoryOptions = {},
  ) {
    this.now = options.now ?? Date.now;
    this.createId = options.createId ?? createLocalId;
  }

  async getPreferences(): Promise<Preferences> {
    const row = await this.db.getFirstAsync<PreferencesRow>(
      `SELECT workspace_id, timezone, week_start, updated_at
       FROM local_preferences WHERE workspace_id = ?;`,
      [this.workspaceId],
    );
    if (!row) throw new Error("Local preferences are not initialized");
    return mapPreferences(row);
  }

  async updatePreferences(fields: {
    timezone: string;
    weekStart: "mon" | "sun";
  }): Promise<void> {
    validateTimezone(fields.timezone);
    if (fields.weekStart !== "mon" && fields.weekStart !== "sun") {
      throw new Error("Choose a valid week start");
    }
    const now = this.now();
    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      const result = await transaction.runAsync(
        `UPDATE local_preferences
         SET timezone = ?, week_start = ?, updated_at = ?
         WHERE workspace_id = ?;`,
        [fields.timezone, fields.weekStart, now, this.workspaceId],
      );
      void result;
      const preferences: Preferences = {
        workspaceId: this.workspaceId,
        timezone: fields.timezone,
        weekStart: fields.weekStart,
        updatedAt: now,
      };
      await writeOutbox(
        transaction,
        this.workspaceId,
        "preferences",
        "preferences",
        preferences,
        now,
        this.createId,
      );
    });
  }

  async listHabits(): Promise<Habit[]> {
    const rows = await this.db.getAllAsync<HabitRow>(
      `SELECT * FROM local_habits
       WHERE workspace_id = ? AND is_archived = 0
       ORDER BY sort_order ASC, created_at ASC;`,
      [this.workspaceId],
    );
    return rows.map(mapHabit);
  }

  async getHabit(habitId: HabitId): Promise<Habit | null> {
    const row = await this.db.getFirstAsync<HabitRow>(
      "SELECT * FROM local_habits WHERE id = ? AND workspace_id = ?;",
      [habitId, this.workspaceId],
    );
    return row ? mapHabit(row) : null;
  }

  async createHabit(fields: HabitFields): Promise<HabitId> {
    const normalized = normalizeHabitFields(fields);
    const now = this.now();
    const habitId = this.createId();
    let createdLocalDay = "";
    let order = 0;
    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      const count = await transaction.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) AS count FROM local_habits
         WHERE workspace_id = ? AND is_archived = 0;`,
        [this.workspaceId],
      );
      if ((count?.count ?? 0) >= MAX_ACTIVE_HABITS) {
        throw new Error(
          "Archive a habit before adding more (200 active habits maximum)",
        );
      }
      const preferences = await transaction.getFirstAsync<PreferencesRow>(
        "SELECT * FROM local_preferences WHERE workspace_id = ?;",
        [this.workspaceId],
      );
      if (!preferences)
        throw new Error("Local preferences are not initialized");
      createdLocalDay = timestampToLocalDay(now, preferences.timezone);
      const orderRow = await transaction.getFirstAsync<{ next_order: number }>(
        `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
         FROM local_habits WHERE workspace_id = ? AND is_archived = 0;`,
        [this.workspaceId],
      );
      order = orderRow?.next_order ?? 0;
      const habit: Habit = {
        id: habitId,
        workspaceId: this.workspaceId,
        ...normalized,
        order,
        isArchived: false,
        createdLocalDay,
        createdAt: now,
        updatedAt: now,
      };
      await transaction.runAsync(
        `INSERT INTO local_habits
          (id, workspace_id, title, description, schedule_type,
           allowed_days_json, sort_order, is_archived, created_local_day,
           created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?);`,
        [
          habitId,
          this.workspaceId,
          normalized.title,
          normalized.description ?? null,
          normalized.scheduleType,
          normalized.allowedDays
            ? JSON.stringify(normalized.allowedDays)
            : null,
          order,
          createdLocalDay,
          now,
          now,
        ],
      );
      await writeOutbox(
        transaction,
        this.workspaceId,
        "habit",
        habitId,
        habit,
        now,
        this.createId,
      );
    });
    return habitId;
  }

  async updateHabit(habitId: HabitId, fields: HabitFields): Promise<void> {
    const normalized = normalizeHabitFields(fields);
    const now = this.now();
    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      const existing = await this.getHabitFrom(transaction, habitId);
      const habit: Habit = { ...existing, ...normalized, updatedAt: now };
      await transaction.runAsync(
        `UPDATE local_habits
         SET title = ?, description = ?, schedule_type = ?,
             allowed_days_json = ?, updated_at = ?
         WHERE id = ? AND workspace_id = ?;`,
        [
          normalized.title,
          normalized.description ?? null,
          normalized.scheduleType,
          normalized.allowedDays
            ? JSON.stringify(normalized.allowedDays)
            : null,
          now,
          habitId,
          this.workspaceId,
        ],
      );
      await writeOutbox(
        transaction,
        this.workspaceId,
        "habit",
        habitId,
        habit,
        now,
        this.createId,
      );
    });
  }

  async reorderHabits(habitIds: HabitId[]): Promise<void> {
    const current = await this.listHabits();
    if (
      habitIds.length !== current.length ||
      new Set(habitIds).size !== habitIds.length ||
      current.some((habit) => !habitIds.includes(habit.id))
    ) {
      throw new Error("Habit order must include every active habit once");
    }
    const now = this.now();
    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      for (const [order, habitId] of habitIds.entries()) {
        const existing = await this.getHabitFrom(transaction, habitId);
        const habit = { ...existing, order, updatedAt: now };
        await transaction.runAsync(
          `UPDATE local_habits SET sort_order = ?, updated_at = ?
           WHERE id = ? AND workspace_id = ? AND is_archived = 0;`,
          [order, now, habitId, this.workspaceId],
        );
        await writeOutbox(
          transaction,
          this.workspaceId,
          "habit",
          habitId,
          habit,
          now,
          this.createId,
        );
      }
    });
  }

  async archiveHabit(habitId: HabitId): Promise<void> {
    const now = this.now();
    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      const existing = await this.getHabitFrom(transaction, habitId);
      const habit = { ...existing, isArchived: true, updatedAt: now };
      await transaction.runAsync(
        `UPDATE local_habits SET is_archived = 1, updated_at = ?
         WHERE id = ? AND workspace_id = ?;`,
        [now, habitId, this.workspaceId],
      );
      await writeOutbox(
        transaction,
        this.workspaceId,
        "habit",
        habitId,
        habit,
        now,
        this.createId,
      );
    });
  }

  async getCheckinsForDays(days: string[]): Promise<Checkin[]> {
    const uniqueDays = [...new Set(days)];
    if (uniqueDays.length > MAX_DAY_RANGE) {
      throw new Error("Request at most 31 days");
    }
    uniqueDays.forEach(validateLocalDay);
    if (uniqueDays.length === 0) return [];
    const placeholders = uniqueDays.map(() => "?").join(", ");
    const rows = await this.db.getAllAsync<CheckinRow>(
      `SELECT * FROM local_checkins
       WHERE workspace_id = ? AND state = 'completed'
         AND local_day IN (${placeholders})
       ORDER BY local_day DESC;`,
      [this.workspaceId, ...uniqueDays],
    );
    return rows.map(mapCheckin);
  }

  async getCheckinsForHabit(habitId: HabitId, limit = 90): Promise<Checkin[]> {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error("Limit must be a positive integer");
    }
    await this.getHabitFrom(this.db, habitId);
    const rows = await this.db.getAllAsync<CheckinRow>(
      `SELECT * FROM local_checkins
       WHERE workspace_id = ? AND habit_id = ? AND state = 'completed'
       ORDER BY local_day DESC LIMIT ?;`,
      [this.workspaceId, habitId, Math.min(limit, 400)],
    );
    return rows.map(mapCheckin);
  }

  async completeHabit(habitId: HabitId, localDay: string): Promise<CheckinId> {
    validateLocalDay(localDay);
    const now = this.now();
    const checkinId = `${habitId}:${localDay}`;
    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      const habit = await this.getHabitFrom(transaction, habitId);
      if (habit.isArchived)
        throw new Error("Cannot complete an archived habit");
      const preferences = await this.getPreferencesFrom(transaction);
      const todayLocal = timestampToLocalDay(now, preferences.timezone);
      if (localDay > todayLocal) {
        throw new Error("Cannot complete habits in the future");
      }
      if (localDay < getHabitCreatedLocalDay(habit, preferences.timezone)) {
        throw new Error("Cannot check in before this habit was created");
      }
      if (!isHabitActiveOnDay(habit, localDay, preferences.timezone)) {
        throw new Error("Habit is not scheduled for this day");
      }
      const previous = await transaction.getFirstAsync<CheckinRow>(
        "SELECT * FROM local_checkins WHERE habit_id = ? AND local_day = ?;",
        [habitId, localDay],
      );
      const checkin: Checkin = {
        id: checkinId,
        workspaceId: this.workspaceId,
        habitId,
        localDay,
        state: "completed",
        completedAt: now,
        value: 1,
        isSkip: false,
        createdAt: previous?.created_at ?? now,
        updatedAt: now,
      };
      await transaction.runAsync(
        `INSERT INTO local_checkins
          (id, workspace_id, habit_id, local_day, state, completed_at,
           value, is_skip, note, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'completed', ?, 1, 0, NULL, ?, ?)
         ON CONFLICT(habit_id, local_day) DO UPDATE SET
           state = 'completed', completed_at = excluded.completed_at,
           value = 1, is_skip = 0, note = NULL, updated_at = excluded.updated_at;`,
        [
          checkinId,
          this.workspaceId,
          habitId,
          localDay,
          now,
          previous?.created_at ?? now,
          now,
        ],
      );
      await writeOutbox(
        transaction,
        this.workspaceId,
        "checkin",
        checkinId,
        checkin,
        now,
        this.createId,
      );
    });
    return checkinId;
  }

  async undoCheckin(habitId: HabitId, localDay: string): Promise<void> {
    validateLocalDay(localDay);
    const now = this.now();
    const checkinId = `${habitId}:${localDay}`;
    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      const habit = await this.getHabitFrom(transaction, habitId);
      const preferences = await this.getPreferencesFrom(transaction);
      if (habit.isArchived) {
        throw new Error("Cannot undo an archived habit");
      }
      if (localDay > timestampToLocalDay(now, preferences.timezone)) {
        throw new Error("Cannot undo a future day");
      }
      const previous = await transaction.getFirstAsync<CheckinRow>(
        "SELECT * FROM local_checkins WHERE habit_id = ? AND local_day = ?;",
        [habitId, localDay],
      );
      const checkin: Checkin = {
        id: checkinId,
        workspaceId: this.workspaceId,
        habitId,
        localDay,
        state: "undone",
        value: 0,
        isSkip: false,
        createdAt: previous?.created_at ?? now,
        updatedAt: now,
      };
      await transaction.runAsync(
        `INSERT INTO local_checkins
          (id, workspace_id, habit_id, local_day, state, completed_at,
           value, is_skip, note, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'undone', NULL, 0, 0, NULL, ?, ?)
         ON CONFLICT(habit_id, local_day) DO UPDATE SET
           state = 'undone', completed_at = NULL, value = 0,
           is_skip = 0, note = NULL, updated_at = excluded.updated_at;`,
        [
          checkinId,
          this.workspaceId,
          habitId,
          localDay,
          previous?.created_at ?? now,
          now,
        ],
      );
      await writeOutbox(
        transaction,
        this.workspaceId,
        "checkin",
        checkinId,
        checkin,
        now,
        this.createId,
      );
    });
  }

  async getHabitStatistics(
    habitId: HabitId,
    todayLocal: string,
  ): Promise<HabitStatistics> {
    validateLocalDay(todayLocal);
    const habit = await this.getHabitFrom(this.db, habitId);
    const preferences = await this.getPreferences();
    const rows = await this.db.getAllAsync<{ local_day: string }>(
      `SELECT local_day FROM local_checkins
       WHERE workspace_id = ? AND habit_id = ?
         AND state = 'completed' AND is_skip = 0
         AND local_day >= ? AND local_day <= ?
       ORDER BY local_day DESC;`,
      [this.workspaceId, habitId, habit.createdLocalDay, todayLocal],
    );
    const allDays = rows.map((row) => row.local_day);
    const scheduledDays = allDays.filter((day) =>
      isHabitActiveOnDay(habit, day, preferences.timezone),
    );
    return {
      ...computeHabitStatistics(
        scheduledDays,
        todayLocal,
        habit.createdLocalDay,
        habit.scheduleType,
        habit.allowedDays,
      ),
      total: allDays.length,
    };
  }

  private async getHabitFrom(
    db: LocalDatabase,
    habitId: HabitId,
  ): Promise<Habit> {
    const row = await db.getFirstAsync<HabitRow>(
      "SELECT * FROM local_habits WHERE id = ? AND workspace_id = ?;",
      [habitId, this.workspaceId],
    );
    if (!row) throw new Error("Habit not found");
    return mapHabit(row);
  }

  private async getPreferencesFrom(db: LocalDatabase): Promise<Preferences> {
    const row = await db.getFirstAsync<PreferencesRow>(
      "SELECT * FROM local_preferences WHERE workspace_id = ?;",
      [this.workspaceId],
    );
    if (!row) throw new Error("Local preferences are not initialized");
    return mapPreferences(row);
  }
}
