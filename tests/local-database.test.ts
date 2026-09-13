// @vitest-environment node

import { afterEach, expect, test } from "vitest";

import {
  getActiveWorkspaceId,
  initializeLocalDatabase,
  LOCAL_DATABASE_VERSION,
} from "../src/local/database";
import { createLocalId } from "../src/local/ids";
import { LocalHabitRepository } from "../src/local/repository";
import { seedV1DatabaseWithSampleHabit } from "./fixtures/seed-v1-database";
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

test("a fresh database creates the v1 schema and guest workspace", async () => {
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
});

test("reopening v1 does not rerun a migration", async () => {
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

  await initializeLocalDatabase(database, {
    ...migrationOptions(),
    createId: () => {
      throw new Error("migration should not run on an existing v1 database");
    },
  });

  const repository = new LocalHabitRepository(
    database,
    await getActiveWorkspaceId(database),
  );
  const habit = await repository.getHabit(seeded.habitId);
  const checkins = await repository.getCheckinsForHabit(seeded.habitId, 10);

  expect(habit?.title).toBe("Walk");
  expect(checkins).toHaveLength(1);
  expect(checkins[0]?.state).toBe("completed");
  expect(checkins[0]?.localDay).toBe(seeded.completedLocalDay);
});

test("a failed migration rolls back schema and user_version", async () => {
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
