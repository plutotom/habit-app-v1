// @vitest-environment node

import {
  getActiveWorkspaceId,
  initializeLocalDatabase,
  type LocalDatabase,
} from "../../src/local/database";

export type SeededV1Database = {
  workspaceId: string;
  habitId: string;
  completedLocalDay: string;
};

export type SeededV1RichDatabase = SeededV1Database & {
  archivedHabitId: string;
  specificDaysHabitId: string;
  partialProgressDay: string;
};

type SeedOptions = {
  now?: () => number;
  createId?: () => string;
  detectedTimezone?: string;
};

const defaultDay = "2026-09-07";
const atNoonUtc = (day: string) => Date.parse(`${day}T12:00:00Z`);

/**
 * Seeds a v1 database the way a real device looks after first use: migrated
 * schema, guest workspace, one habit, and one completed check-in.
 */
export async function seedV1DatabaseWithSampleHabit(
  database: LocalDatabase,
  options: SeedOptions = {},
): Promise<SeededV1Database> {
  let nextEntityId = 0;
  const now = options.now ?? (() => atNoonUtc(defaultDay));
  const createId = options.createId ?? (() => `seed-entity-${nextEntityId++}`);

  await initializeLocalDatabase(database, {
    now,
    createId: (() => {
      let migrationId = 0;
      return () => `seed-migration-${migrationId++}`;
    })(),
    detectedTimezone: options.detectedTimezone ?? "America/Chicago",
    targetVersion: 1,
  });

  const workspaceId = await getActiveWorkspaceId(database);
  const habitId = createId();
  const timestamp = now();
  await database.runAsync(
    `INSERT INTO local_habits
      (id, workspace_id, title, description, schedule_type,
       allowed_days_json, sort_order, is_archived, created_local_day,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, 'daily', NULL, 0, 0, ?, ?, ?);`,
    [
      habitId,
      workspaceId,
      "Walk",
      "Morning walk",
      defaultDay,
      timestamp,
      timestamp,
    ],
  );
  await database.runAsync(
    `INSERT INTO local_checkins
      (id, workspace_id, habit_id, local_day, state, completed_at,
       value, is_skip, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'completed', ?, 1, 0, NULL, ?, ?);`,
    [
      `${habitId}:${defaultDay}`,
      workspaceId,
      habitId,
      defaultDay,
      timestamp,
      timestamp,
      timestamp,
    ],
  );

  return { workspaceId, habitId, completedLocalDay: defaultDay };
}

/**
 * Older install with varied habits and check-ins (archived, specific days,
 * partial numeric progress) before goal columns existed.
 */
export async function seedV1DatabaseWithRichLegacyUsage(
  database: LocalDatabase,
  options: SeedOptions = {},
): Promise<SeededV1RichDatabase> {
  const base = await seedV1DatabaseWithSampleHabit(database, options);
  let nextEntityId = 100;
  const createId = options.createId ?? (() => `seed-rich-${nextEntityId++}`);
  const now = options.now ?? (() => atNoonUtc(defaultDay));
  const timestamp = now();
  const partialProgressDay = "2026-09-08";

  const archivedHabitId = createId();
  await database.runAsync(
    `INSERT INTO local_habits
      (id, workspace_id, title, description, schedule_type,
       allowed_days_json, sort_order, is_archived, created_local_day,
       created_at, updated_at)
     VALUES (?, ?, ?, NULL, 'daily', NULL, 1, 1, ?, ?, ?);`,
    [
      archivedHabitId,
      base.workspaceId,
      "Old habit",
      defaultDay,
      timestamp,
      timestamp,
    ],
  );

  const specificDaysHabitId = createId();
  await database.runAsync(
    `INSERT INTO local_habits
      (id, workspace_id, title, description, schedule_type,
       allowed_days_json, sort_order, is_archived, created_local_day,
       created_at, updated_at)
     VALUES (?, ?, ?, NULL, 'specific_days', ?, 2, 0, ?, ?, ?);`,
    [
      specificDaysHabitId,
      base.workspaceId,
      "Gym",
      JSON.stringify(["mon", "wed", "fri"]),
      defaultDay,
      timestamp,
      timestamp,
    ],
  );

  await database.runAsync(
    `INSERT INTO local_checkins
      (id, workspace_id, habit_id, local_day, state, completed_at,
       value, is_skip, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'completed', ?, 2500, 0, 'steps', ?, ?);`,
    [
      `${base.habitId}:${partialProgressDay}`,
      base.workspaceId,
      base.habitId,
      partialProgressDay,
      timestamp,
      timestamp,
      timestamp,
    ],
  );

  return {
    ...base,
    archivedHabitId,
    specificDaysHabitId,
    partialProgressDay,
  };
}
