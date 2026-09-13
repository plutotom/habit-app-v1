// @vitest-environment node

import {
  getActiveWorkspaceId,
  initializeLocalDatabase,
  type LocalDatabase,
} from "../../src/local/database";
import { LocalHabitRepository } from "../../src/local/repository";

export type SeededV1Database = {
  workspaceId: string;
  habitId: string;
  completedLocalDay: string;
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
  });

  const workspaceId = await getActiveWorkspaceId(database);
  const repository = new LocalHabitRepository(database, workspaceId, {
    now,
    createId,
  });
  const habitId = await repository.createHabit({
    title: "Walk",
    description: "Morning walk",
    scheduleType: "daily",
  });
  await repository.completeHabit(habitId, defaultDay);

  return { workspaceId, habitId, completedLocalDay: defaultDay };
}
