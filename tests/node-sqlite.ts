/// <reference types="node" />

import { DatabaseSync } from "node:sqlite";

import type { LocalDatabase, SqlValue } from "../src/local/database";

export class NodeSqliteDatabase implements LocalDatabase {
  protected readonly database = new DatabaseSync(":memory:");

  async execAsync(source: string): Promise<void> {
    this.database.exec(source);
  }

  async runAsync(source: string, params: SqlValue[] = []): Promise<unknown> {
    return this.database.prepare(source).run(...params);
  }

  async getFirstAsync<T>(
    source: string,
    params: SqlValue[] = [],
  ): Promise<T | null> {
    return (
      (this.database.prepare(source).get(...params) as T | undefined) ?? null
    );
  }

  async getAllAsync<T>(source: string, params: SqlValue[] = []): Promise<T[]> {
    return this.database.prepare(source).all(...params) as T[];
  }

  async withExclusiveTransactionAsync(
    task: (transaction: LocalDatabase) => Promise<void>,
  ): Promise<void> {
    this.database.exec("BEGIN IMMEDIATE;");
    try {
      await task(this);
      this.database.exec("COMMIT;");
    } catch (error) {
      this.database.exec("ROLLBACK;");
      throw error;
    }
  }

  close() {
    this.database.close();
  }
}
