import fs from "node:fs";
import path from "node:path";
import initSqlJs from "sql.js";

const AMOUNT_SCALE = 1_000_000n;

// Wrapper class to provide better-sqlite3-like API
class DatabaseWrapper {
  private db: any;

  constructor(sqlJsDb: any) {
    this.db = sqlJsDb;
  }

  prepare(sql: string) {
    const db = this.db;
    const filePath = databasePathCache;
    return {
      run: (...params: any[]) => {
        db.run(sql, params);
        // Write-through: persist after every mutation
        if (filePath && filePath !== ":memory:") {
          persistDatabase(db, filePath);
        }
      },
      get: (...params: any[]) => {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all: (...params: any[]) => {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const results: any[] = [];
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      },
    };
  }

  close() {
    this.db.close();
  }
}

let database: DatabaseWrapper | null = null;
let databasePathCache: string | null = null;
let initPromise: Promise<void> | null = null;

function resolveDatabasePath(): string {
  const configuredPath = process.env.DATABASE_PATH?.trim() || "./agentwise.db";
  if (configuredPath === ":memory:") return ":memory:";
  return path.resolve(process.cwd(), configuredPath);
}

function ensureParentDirectory(filePath: string): void {
  if (filePath === ":memory:") return;
  const directory = path.dirname(filePath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function persistDatabase(db: any, filePath: string): void {
  if (filePath === ":memory:") return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(filePath, buffer);
}

function parseScaledAmount(value: number | string): bigint {
  const text = typeof value === "number" ? value.toString() : value.trim();
  if (text.length === 0) {
    return 0n;
  }

  const negative = text.startsWith("-");
  const unsigned = negative ? text.slice(1) : text;
  const [wholePart = "0", fractionPart = ""] = unsigned.split(".");
  const whole = BigInt(wholePart || "0") * AMOUNT_SCALE;
  const fraction = fractionPart.slice(0, 6).padEnd(6, "0");
  const scaled = whole + BigInt(fraction || "0");
  return negative ? -scaled : scaled;
}

function formatScaledAmount(amount: bigint): string {
  const negative = amount < 0n;
  const absolute = negative ? -amount : amount;
  const whole = absolute / AMOUNT_SCALE;
  const fraction = absolute % AMOUNT_SCALE;

  if (fraction === 0n) {
    return `${negative ? "-" : ""}${whole.toString()}`;
  }

  const fractionText = fraction.toString().padStart(6, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole.toString()}.${fractionText}`;
}

export function toAmountString(value: number | string): string {
  return formatScaledAmount(parseScaledAmount(value));
}

export function amountStringToNumber(value: string): number {
  return Number.parseFloat(toAmountString(value));
}

export function addAmountStrings(left: string, right: string): string {
  return formatScaledAmount(parseScaledAmount(left) + parseScaledAmount(right));
}

export function subtractAmountStrings(left: string, right: string): string {
  return formatScaledAmount(parseScaledAmount(left) - parseScaledAmount(right));
}

export function compareAmountStrings(left: string, right: string): number {
  const difference = parseScaledAmount(left) - parseScaledAmount(right);
  if (difference < 0n) {
    return -1;
  }
  if (difference > 0n) {
    return 1;
  }
  return 0;
}

export function currentUnixSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function isoToUnixSeconds(value: string): number {
  const milliseconds = new Date(value).getTime();
  if (Number.isNaN(milliseconds)) {
    throw new Error(`Invalid ISO timestamp: ${value}`);
  }
  return Math.floor(milliseconds / 1000);
}

export function unixSecondsToIso(value: number | null | undefined): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  return new Date(value * 1000).toISOString();
}

async function initializeDatabase(): Promise<DatabaseWrapper> {
  const SQL = await initSqlJs();
  const databasePath = resolveDatabasePath();
  ensureParentDirectory(databasePath);

  let data: Buffer | undefined;
  if (databasePath !== ":memory:" && fs.existsSync(databasePath)) {
    data = fs.readFileSync(databasePath);
  }

  const sqlJsDb = new SQL.Database(data);

  // Initialize schema
  sqlJsDb.run(`
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'custom',
      target_amount TEXT NOT NULL,
      saved_amount TEXT DEFAULT '0',
      deadline INTEGER,
      auto_save_percent INTEGER DEFAULT 0,
      auto_save_amount TEXT DEFAULT '0',
      auto_save_frequency TEXT DEFAULT 'daily',
      hook_address TEXT,
      channel_id TEXT,
      status TEXT DEFAULT 'active',
      wallet_address TEXT NOT NULL,
      created_at INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER)),
      updated_at INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER))
    )
  `);

  sqlJsDb.run(`
    CREATE TABLE IF NOT EXISTS deposits (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL,
      amount TEXT NOT NULL,
      source TEXT DEFAULT 'manual',
      status TEXT DEFAULT 'pending',
      tx_hash TEXT,
      created_at INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER)),
      FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
    )
  `);

  sqlJsDb.run(`
    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      funded_amount TEXT DEFAULT '0',
      settled_amount TEXT DEFAULT '0',
      created_at INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER)),
      closed_at INTEGER,
      FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
    )
  `);

  sqlJsDb.run(`CREATE INDEX IF NOT EXISTS idx_goals_wallet_address ON goals(wallet_address)`);
  sqlJsDb.run(`CREATE INDEX IF NOT EXISTS idx_goals_goal_id ON goals(id)`);
  sqlJsDb.run(`CREATE INDEX IF NOT EXISTS idx_deposits_goal_id ON deposits(goal_id)`);
  sqlJsDb.run(`CREATE INDEX IF NOT EXISTS idx_channels_goal_id ON channels(goal_id)`);

  const wrapped = new DatabaseWrapper(sqlJsDb);
  persistDatabase(sqlJsDb, databasePath);
  return wrapped;
}

export async function initializeDb(): Promise<void> {
  if (initPromise) {
    await initPromise;
    return;
  }

  initPromise = (async () => {
    const databasePath = resolveDatabasePath();
    if (database && databasePathCache === databasePath) {
      return;
    }
    if (database) {
      database.close();
    }
    database = await initializeDatabase();
    databasePathCache = databasePath;
  })();

  await initPromise;
}

export function getDb(): DatabaseWrapper {
  if (!database) {
    throw new Error("Database not initialized. Call initializeDb() first.");
  }
  return database;
}

export function closeDb(): void {
  if (!database) return;

  const databasePath = databasePathCache;
  if (databasePath && databasePath !== ":memory:") {
    const internalDb = (database as any).db;
    persistDatabase(internalDb, databasePath);
  }

  database.close();
  database = null;
  databasePathCache = null;
  initPromise = null;
}
