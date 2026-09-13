// @vitest-environment node

import { afterEach, beforeEach, expect, test } from "vitest";

import {
  getActiveWorkspaceId,
  initializeLocalDatabase,
  type SqlValue,
} from "../src/local/database";
import { LocalHabitRepository } from "../src/local/repository";
import { NodeSqliteDatabase } from "./node-sqlite";

let database: NodeSqliteDatabase;
let now: number;
let nextId: number;
let repository: LocalHabitRepository;

const atNoonUtc = (day: string) => Date.parse(`${day}T12:00:00Z`);

beforeEach(async () => {
  database = new NodeSqliteDatabase();
  await initializeLocalDatabase(database, {
    now: () => atNoonUtc("2026-09-07"),
    createId: (() => {
      let id = 0;
      return () => `bootstrap-${id++}`;
    })(),
    detectedTimezone: "UTC",
  });
  now = atNoonUtc("2026-09-07");
  nextId = 0;
  repository = new LocalHabitRepository(
    database,
    await getActiveWorkspaceId(database),
    {
      now: () => now,
      createId: () => `entity-${nextId++}`,
    },
  );
});

afterEach(() => database.close());

const dailyHabit = {
  title: "Walk",
  description: "Someone who moves every day",
  scheduleType: "daily" as const,
};

test("habit creation and edits persist and coalesce their outbox snapshot", async () => {
  const habitId = await repository.createHabit(dailyHabit);
  const firstOutbox = await database.getFirstAsync<{
    operation_id: string;
  }>("SELECT operation_id FROM local_sync_outbox WHERE entity_id = ?;", [
    habitId,
  ]);

  now += 1000;
  await repository.updateHabit(habitId, {
    ...dailyHabit,
    title: "Evening walk",
  });
  const habit = await repository.getHabit(habitId);
  const outbox = await database.getFirstAsync<{
    operation_id: string;
    snapshot_json: string;
  }>(
    "SELECT operation_id, snapshot_json FROM local_sync_outbox WHERE entity_id = ?;",
    [habitId],
  );
  const count = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM local_sync_outbox WHERE entity_id = ?;",
    [habitId],
  );

  expect(habit?.title).toBe("Evening walk");
  expect(count?.count).toBe(1);
  expect(outbox?.operation_id).not.toBe(firstOutbox?.operation_id);
  expect(JSON.parse(outbox!.snapshot_json)).toMatchObject({
    schemaVersion: 1,
    entityType: "habit",
    entity: { id: habitId, title: "Evening walk" },
  });
});

test("local timezone and week-start preferences persist with an outbox snapshot", async () => {
  await repository.updatePreferences({
    timezone: "America/Chicago",
    weekStart: "sun",
  });
  expect(await repository.getPreferences()).toMatchObject({
    timezone: "America/Chicago",
    weekStart: "sun",
  });
  const outbox = await database.getFirstAsync<{
    snapshot_json: string;
  }>(
    "SELECT snapshot_json FROM local_sync_outbox WHERE entity_type = 'preferences';",
  );
  expect(JSON.parse(outbox!.snapshot_json)).toMatchObject({
    schemaVersion: 1,
    entityType: "preferences",
    entity: { timezone: "America/Chicago", weekStart: "sun" },
  });
});

test("completion, undo, and recompletion retain one deterministic row", async () => {
  const habitId = await repository.createHabit(dailyHabit);
  const expectedId = `${habitId}:2026-09-07`;
  expect(await repository.completeHabit(habitId, "2026-09-07")).toBe(
    expectedId,
  );
  await repository.undoCheckin(habitId, "2026-09-07");
  expect(await repository.getCheckinsForDays(["2026-09-07"])).toEqual([]);
  const undone = await database.getFirstAsync<{ state: string }>(
    "SELECT state FROM local_checkins WHERE id = ?;",
    [expectedId],
  );
  expect(undone?.state).toBe("undone");

  now += 1000;
  await repository.completeHabit(habitId, "2026-09-07");
  const row = await database.getFirstAsync<{ count: number; state: string }>(
    "SELECT COUNT(*) AS count, state FROM local_checkins WHERE habit_id = ?;",
    [habitId],
  );
  const outbox = await database.getFirstAsync<{
    count: number;
    snapshot_json: string;
  }>(
    "SELECT COUNT(*) AS count, snapshot_json FROM local_sync_outbox WHERE entity_type = 'checkin' AND entity_id = ?;",
    [expectedId],
  );
  expect(row).toEqual({ count: 1, state: "completed" });
  expect(outbox?.count).toBe(1);
  expect(JSON.parse(outbox!.snapshot_json)).toMatchObject({
    entity: { id: expectedId, state: "completed" },
  });
});

test("past scheduled days can be completed and undone, but future days cannot", async () => {
  now = atNoonUtc("2026-09-01");
  const habitId = await repository.createHabit(dailyHabit);
  now = atNoonUtc("2026-09-07");
  expect(await repository.completeHabit(habitId, "2026-09-06")).toBe(
    `${habitId}:2026-09-06`,
  );
  expect(await repository.getCheckinsForDays(["2026-09-06"])).toHaveLength(1);
  await repository.undoCheckin(habitId, "2026-09-06");
  expect(await repository.getCheckinsForDays(["2026-09-06"])).toEqual([]);
  await expect(repository.completeHabit(habitId, "2026-09-08")).rejects.toThrow(
    "Cannot complete habits in the future",
  );
  await expect(repository.undoCheckin(habitId, "2026-09-08")).rejects.toThrow(
    "Cannot undo a future day",
  );
});

test("archiving removes an active habit without deleting its history", async () => {
  const habitId = await repository.createHabit(dailyHabit);
  await repository.completeHabit(habitId, "2026-09-07");
  await repository.archiveHabit(habitId);
  expect(await repository.listHabits()).toEqual([]);
  expect(await repository.getCheckinsForHabit(habitId)).toHaveLength(1);
});

test("workspace scoping prevents cross-workspace reads", async () => {
  const secondWorkspace = "workspace-two";
  await database.runAsync(
    "INSERT INTO local_workspaces (id, kind, created_at, updated_at) VALUES (?, 'guest', ?, ?);",
    [secondWorkspace, now, now],
  );
  await database.runAsync(
    "INSERT INTO local_preferences (workspace_id, timezone, week_start, updated_at) VALUES (?, 'UTC', 'mon', ?);",
    [secondWorkspace, now],
  );
  const secondRepository = new LocalHabitRepository(database, secondWorkspace, {
    now: () => now,
    createId: () => "second-habit",
  });
  const secondHabitId = await secondRepository.createHabit(dailyHabit);

  expect(await repository.getHabit(secondHabitId)).toBeNull();
  expect(await repository.listHabits()).toEqual([]);
  expect(await secondRepository.listHabits()).toHaveLength(1);
});

test("daily and weekday schedules compute current, longest, and total locally", async () => {
  now = atNoonUtc("2026-09-07");
  const dailyId = await repository.createHabit(dailyHabit);
  await repository.completeHabit(dailyId, "2026-09-07");
  now = atNoonUtc("2026-09-08");
  await repository.completeHabit(dailyId, "2026-09-08");
  now = atNoonUtc("2026-09-10");
  await repository.completeHabit(dailyId, "2026-09-10");
  expect(await repository.getHabitStatistics(dailyId, "2026-09-10")).toEqual({
    current: 1,
    longest: 2,
    total: 3,
  });

  now = atNoonUtc("2026-09-07");
  const weekdayId = await repository.createHabit({
    title: "Weekday practice",
    scheduleType: "specific_days",
    allowedDays: [1, 3, 5],
  });
  await repository.completeHabit(weekdayId, "2026-09-07");
  now = atNoonUtc("2026-09-09");
  await repository.completeHabit(weekdayId, "2026-09-09");
  now = atNoonUtc("2026-09-11");
  await repository.completeHabit(weekdayId, "2026-09-11");
  expect(await repository.getHabitStatistics(weekdayId, "2026-09-13")).toEqual({
    current: 3,
    longest: 3,
    total: 3,
  });
});

test("a failed transaction leaves neither a habit nor an outbox row", async () => {
  class FailingOutboxDatabase extends NodeSqliteDatabase {
    failOutbox = false;

    override async runAsync(
      source: string,
      params: SqlValue[] = [],
    ): Promise<unknown> {
      if (this.failOutbox && source.includes("INSERT INTO local_sync_outbox")) {
        throw new Error("injected outbox failure");
      }
      return await super.runAsync(source, params);
    }
  }
  database.close();
  const failingDatabase = new FailingOutboxDatabase();
  database = failingDatabase;
  await initializeLocalDatabase(database, {
    now: () => now,
    createId: (() => {
      let id = 0;
      return () => `failure-bootstrap-${id++}`;
    })(),
    detectedTimezone: "UTC",
  });
  repository = new LocalHabitRepository(
    database,
    await getActiveWorkspaceId(database),
    { now: () => now, createId: () => "failed-habit" },
  );
  failingDatabase.failOutbox = true;

  await expect(repository.createHabit(dailyHabit)).rejects.toThrow(
    "injected outbox failure",
  );
  const habits = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM local_habits;",
  );
  const outbox = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM local_sync_outbox;",
  );
  expect(habits?.count).toBe(0);
  expect(outbox?.count).toBe(0);
});
