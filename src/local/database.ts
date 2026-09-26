import { createLocalId } from "@/local/ids";

export const LOCAL_DATABASE_NAME = "habit-local-v1.db";
export const LOCAL_DATABASE_VERSION = 2;

// Future sync: local_workspaces.kind, remote_account_id, and local_sync_outbox
// are scaffolded for account import but have no consumer in the guest-first app.

export type SqlValue = string | number | null;

export interface LocalDatabase {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params?: SqlValue[]): Promise<unknown>;
  getFirstAsync<T>(source: string, params?: SqlValue[]): Promise<T | null>;
  getAllAsync<T>(source: string, params?: SqlValue[]): Promise<T[]>;
  withExclusiveTransactionAsync(
    task: (transaction: LocalDatabase) => Promise<void>,
  ): Promise<void>;
}

type MigrationOptions = {
  now?: () => number;
  createId?: () => string;
  detectedTimezone?: string;
  /** Test-only escape hatch for creating an older database fixture. */
  targetVersion?: 1 | 2;
};

const V1_SCHEMA = `
CREATE TABLE local_workspaces (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('guest', 'account')),
  remote_account_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX local_workspaces_remote_account
  ON local_workspaces(remote_account_id)
  WHERE remote_account_id IS NOT NULL;

CREATE TABLE local_preferences (
  workspace_id TEXT PRIMARY KEY NOT NULL,
  timezone TEXT NOT NULL,
  week_start TEXT NOT NULL CHECK (week_start IN ('mon', 'sun')),
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES local_workspaces(id) ON DELETE CASCADE
);

CREATE TABLE local_habits (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'specific_days')),
  allowed_days_json TEXT,
  sort_order INTEGER NOT NULL,
  is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
  created_local_day TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (id, workspace_id),
  FOREIGN KEY (workspace_id) REFERENCES local_workspaces(id) ON DELETE CASCADE
);

CREATE INDEX local_habits_active_order
  ON local_habits(workspace_id, is_archived, sort_order);

CREATE TABLE local_checkins (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL,
  habit_id TEXT NOT NULL,
  local_day TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('completed', 'undone')),
  completed_at INTEGER,
  value REAL NOT NULL DEFAULT 1,
  is_skip INTEGER NOT NULL DEFAULT 0 CHECK (is_skip IN (0, 1)),
  note TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (habit_id, local_day),
  FOREIGN KEY (workspace_id) REFERENCES local_workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (habit_id, workspace_id)
    REFERENCES local_habits(id, workspace_id) ON DELETE CASCADE
);

CREATE INDEX local_checkins_workspace_day
  ON local_checkins(workspace_id, local_day);
CREATE INDEX local_checkins_habit_day
  ON local_checkins(habit_id, local_day);

CREATE TABLE local_sync_outbox (
  workspace_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('habit', 'checkin', 'preferences')),
  entity_id TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER,
  last_error TEXT,
  PRIMARY KEY (workspace_id, entity_type, entity_id),
  FOREIGN KEY (workspace_id) REFERENCES local_workspaces(id) ON DELETE CASCADE
);

CREATE TABLE local_metadata (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

const V2_HABIT_GOALS_MIGRATION = `
ALTER TABLE local_habits
  ADD COLUMN daily_goal REAL NOT NULL DEFAULT 1 CHECK (daily_goal > 0);
ALTER TABLE local_habits
  ADD COLUMN goal_unit TEXT NOT NULL DEFAULT 'times';
ALTER TABLE local_habits
  ADD COLUMN custom_unit TEXT;
`;

export function getDetectedTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export async function initializeLocalDatabase(
  db: LocalDatabase,
  options: MigrationOptions = {},
): Promise<void> {
  await db.execAsync("PRAGMA foreign_keys = ON;");
  await db.execAsync("PRAGMA journal_mode = WAL;");
  await db.execAsync("PRAGMA busy_timeout = 5000;");

  const targetVersion = options.targetVersion ?? LOCAL_DATABASE_VERSION;

  await db.withExclusiveTransactionAsync(async (transaction) => {
    // Read the version after acquiring the exclusive lock. On a fresh install,
    // two providers can otherwise both observe version 0 and race to create
    // the schema, leaving the second initializer with "table already exists".
    const versionRow = await transaction.getFirstAsync<{
      user_version: number;
    }>("PRAGMA user_version;");
    const version = versionRow?.user_version ?? 0;
    if (version > targetVersion) {
      throw new Error(
        `This local database is version ${version}, but this app supports up to version ${targetVersion}. Update the app before continuing.`,
      );
    }
    if (version === targetVersion) return;

    const now = options.now?.() ?? Date.now();
    const createId = options.createId ?? createLocalId;
    const workspaceId = version === 0 ? createId() : "";
    const installationId = version === 0 ? createId() : "";
    const timezone = options.detectedTimezone ?? getDetectedTimezone();

    if (version === 0) {
      await transaction.execAsync(V1_SCHEMA);
      await transaction.runAsync(
        `INSERT INTO local_workspaces
          (id, kind, remote_account_id, created_at, updated_at)
         VALUES (?, 'guest', NULL, ?, ?);`,
        [workspaceId, now, now],
      );
      await transaction.runAsync(
        `INSERT INTO local_preferences
          (workspace_id, timezone, week_start, updated_at)
         VALUES (?, ?, 'mon', ?);`,
        [workspaceId, timezone, now],
      );
      await transaction.runAsync(
        "INSERT INTO local_metadata (key, value, updated_at) VALUES ('active_workspace_id', ?, ?);",
        [workspaceId, now],
      );
      await transaction.runAsync(
        "INSERT INTO local_metadata (key, value, updated_at) VALUES ('installation_id', ?, ?);",
        [installationId, now],
      );
    }
    if (version < 2 && targetVersion >= 2) {
      await transaction.execAsync(V2_HABIT_GOALS_MIGRATION);
    }
    await transaction.execAsync(`PRAGMA user_version = ${targetVersion};`);
  });
}

export async function getActiveWorkspaceId(db: LocalDatabase): Promise<string> {
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM local_metadata WHERE key = 'active_workspace_id';",
  );
  if (!row?.value) throw new Error("Local workspace is not initialized");
  return row.value;
}
