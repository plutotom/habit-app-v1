// @vitest-environment node

import { afterEach, expect, test } from "vitest";

import {
  getActiveWorkspaceId,
  initializeLocalDatabase,
  LOCAL_DATABASE_VERSION,
  type LocalDatabase,
} from "../src/local/database";
import { createLocalId } from "../src/local/ids";
import { LocalHabitRepository } from "../src/local/repository";
import {
  seedV1DatabaseWithRichLegacyUsage,
  seedV1DatabaseWithSampleHabit,
} from "./fixtures/seed-v1-database";
import { NodeSqliteDatabase } from "./node-sqlite";

const databases: NodeSqliteDatabase[] = [];
afterEach(() => {
  databases.splice(0).forEach((database) => database.close());
});

function createDatabase() {
  const database = new NodeSqliteDatabase();
  databases.push(database);
  return database;
}

class SerializedNodeSqliteDatabase extends NodeSqliteDatabase {
  private transactionQueue = Promise.resolve();

  override async withExclusiveTransactionAsync(
    task: (transaction: LocalDatabase) => Promise<void>,
  ): Promise<void> {
    const previous = this.transactionQueue;
    let release!: () => void;
    this.transactionQueue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      await task(this);
    } finally {
      release();
    }
  }
}

test("local entity IDs are RFC 4122 version 4 UUIDs", () => {
  const first = createLocalId();
  const second = createLocalId();
  expect(first).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  expect(second).not.toBe(first);
});

function migrationOptions() {
  const createId = (() => {
    let next = 0;
    return () => `migration-${next++}`;
  })();
  return {
    now: () => 100,
    createId,
    detectedTimezone: "America/Chicago",
  };
}

async function getUserVersion(database: LocalDatabase) {
  const version = await database.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version;",
  );
  return version?.user_version ?? 0;
}

async function getHabitColumnNames(database: LocalDatabase) {
  const habitColumns = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(local_habits);",
  );
  return habitColumns.map((column) => column.name);
}

test("a fresh database creates the current schema and guest workspace", async () => {
  const database = createDatabase();
  await initializeLocalDatabase(database, migrationOptions());

  const version = await database.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version;",
  );
  const tables = await database.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'local_%' ORDER BY name;",
  );
  const workspace = await database.getFirstAsync<{
    id: string;
    kind: string;
  }>("SELECT id, kind FROM local_workspaces;");
  const preferences = await database.getFirstAsync<{
    timezone: string;
    week_start: string;
  }>("SELECT timezone, week_start FROM local_preferences;");
  const habitColumns = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(local_habits);",
  );

  expect(version?.user_version).toBe(LOCAL_DATABASE_VERSION);
  expect(tables.map((table) => table.name)).toEqual([
    "local_checkins",
    "local_habits",
    "local_metadata",
    "local_preferences",
    "local_sync_outbox",
    "local_workspaces",
  ]);
  expect(workspace).toEqual({ id: "migration-0", kind: "guest" });
  expect(preferences).toEqual({
    timezone: "America/Chicago",
    week_start: "mon",
  });
  expect(habitColumns.map((column) => column.name)).toContain("daily_goal");
  expect(habitColumns.map((column) => column.name)).toContain("goal_unit");
});

test("reopening at the current version does not rerun migration", async () => {
  const database = createDatabase();
  await initializeLocalDatabase(database, migrationOptions());
  await initializeLocalDatabase(database, {
    ...migrationOptions(),
    createId: () => {
      throw new Error("migration should not run");
    },
  });
  const count = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM local_workspaces;",
  );
  expect(count?.count).toBe(1);
});

test("concurrent first-open migrations are serialized", async () => {
  const database = new SerializedNodeSqliteDatabase();
  databases.push(database);

  await Promise.all([
    initializeLocalDatabase(database, migrationOptions()),
    initializeLocalDatabase(database, migrationOptions()),
  ]);

  const version = await database.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version;",
  );
  const workspaceCount = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM local_workspaces;",
  );
  expect(version?.user_version).toBe(LOCAL_DATABASE_VERSION);
  expect(workspaceCount?.count).toBe(1);
});

test("a newer local database version fails clearly", async () => {
  const database = createDatabase();
  await database.execAsync(
    `PRAGMA user_version = ${LOCAL_DATABASE_VERSION + 1};`,
  );
  await expect(initializeLocalDatabase(database)).rejects.toThrow(
    "Update the app before continuing",
  );
});

test("existing v1 habits and checkins survive the next app launch", async () => {
  const database = createDatabase();
  const seeded = await seedV1DatabaseWithSampleHabit(database);

  expect(await getUserVersion(database)).toBe(1);
  expect(await getHabitColumnNames(database)).not.toContain("daily_goal");

  await initializeLocalDatabase(database, migrationOptions());

  expect(await getUserVersion(database)).toBe(LOCAL_DATABASE_VERSION);
  expect(await getHabitColumnNames(database)).toEqual(
    expect.arrayContaining(["daily_goal", "goal_unit", "custom_unit"]),
  );

  const repository = new LocalHabitRepository(
    database,
    await getActiveWorkspaceId(database),
  );
  const habit = await repository.getHabit(seeded.habitId);
  const checkins = await repository.getCheckinsForHabit(seeded.habitId, 10);

  expect(habit).toMatchObject({
    title: "Walk",
    dailyGoal: 1,
    goalUnit: "times",
  });
  expect(checkins).toHaveLength(1);
  expect(checkins[0]?.state).toBe("completed");
  expect(checkins[0]?.localDay).toBe(seeded.completedLocalDay);
});

test("rich v1 usage survives upgrade to the current schema", async () => {
  const database = createDatabase();
  const seeded = await seedV1DatabaseWithRichLegacyUsage(database);

  await initializeLocalDatabase(database, migrationOptions());

  expect(await getUserVersion(database)).toBe(LOCAL_DATABASE_VERSION);

  const repository = new LocalHabitRepository(
    database,
    await getActiveWorkspaceId(database),
  );

  const walk = await repository.getHabit(seeded.habitId);
  const archived = await repository.getHabit(seeded.archivedHabitId);
  const gym = await repository.getHabit(seeded.specificDaysHabitId);
  const walkCheckins = await repository.getCheckinsForHabit(seeded.habitId, 10);

  expect(walk).toMatchObject({
    title: "Walk",
    dailyGoal: 1,
    goalUnit: "times",
    isArchived: false,
  });
  expect(archived).toMatchObject({
    title: "Old habit",
    dailyGoal: 1,
    isArchived: true,
  });
  expect(gym).toMatchObject({
    title: "Gym",
    scheduleType: "specific_days",
    allowedDays: ["mon", "wed", "fri"],
    dailyGoal: 1,
  });
  expect(walkCheckins.map((checkin) => checkin.localDay).sort()).toEqual(
    [seeded.completedLocalDay, seeded.partialProgressDay].sort(),
  );
  const partial = walkCheckins.find(
    (checkin) => checkin.localDay === seeded.partialProgressDay,
  );
  expect(partial?.value).toBe(2500);
  expect(partial?.note).toBe("steps");
});

test("a failed v2 migration rolls back user_version and schema changes", async () => {
  class FailingV2MigrationDatabase extends NodeSqliteDatabase {
    override async execAsync(source: string): Promise<void> {
      if (source.includes("ADD COLUMN daily_goal")) {
        throw new Error("injected v2 migration failure");
      }
      await super.execAsync(source);
    }
  }

  const database = new FailingV2MigrationDatabase();
  databases.push(database);
  await seedV1DatabaseWithSampleHabit(database);

  await expect(
    initializeLocalDatabase(database, migrationOptions()),
  ).rejects.toThrow("injected v2 migration failure");

  expect(await getUserVersion(database)).toBe(1);
  expect(await getHabitColumnNames(database)).not.toContain("daily_goal");
});

test("a failed initial migration rolls back schema and user_version", async () => {
  class FailingMigrationDatabase extends NodeSqliteDatabase {
    override async execAsync(source: string): Promise<void> {
      await super.execAsync(source);
      if (source.includes("CREATE TABLE local_workspaces")) {
        throw new Error("injected migration failure");
      }
    }
  }
  const database = new FailingMigrationDatabase();
  databases.push(database);

  await expect(
    initializeLocalDatabase(database, migrationOptions()),
  ).rejects.toThrow("injected migration failure");
  const version = await database.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version;",
  );
  const table = await database.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'local_habits';",
  );
  expect(version?.user_version).toBe(0);
  expect(table).toBeNull();
});
