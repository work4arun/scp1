// ─────────────────────────────────────────────────────────────────────────────
//  Postgres backup / restore helpers
// ─────────────────────────────────────────────────────────────────────────────
//  Thin wrappers around the `pg_dump` and `psql` binaries. Used by the
//  /admin/backup UI to download a full restorable .sql snapshot of the
//  database and to apply one back.
//
//  Requirements at runtime:
//    • `pg_dump` and `psql` must be on the PATH where the Next.js server runs.
//    • DATABASE_URL must be a Postgres connection string Prisma already uses.
//
//  The connection password is passed to the child process via the PGPASSWORD
//  environment variable rather than the command line so it never appears in
//  process listings.
//
//  Both functions reject if the binaries are missing — callers should surface
//  the message verbatim so the operator can install the postgresql-client
//  package on their host.
// ─────────────────────────────────────────────────────────────────────────────

import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "child_process";
import { Readable } from "stream";

export type PgConn = {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
};

export class PgToolsError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "PgToolsError";
  }
}

/**
 * Parse the standard `postgres://user:pass@host:port/db?sslmode=require` URL
 * into the components we hand to spawn() and PGPASSWORD.
 */
export function parseDatabaseUrl(raw: string | undefined): PgConn {
  if (!raw) throw new PgToolsError("ENV_MISSING", "DATABASE_URL is not set.");
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new PgToolsError("ENV_INVALID", "DATABASE_URL is not a valid URL.");
  }
  if (!parsed.protocol.startsWith("postgres")) {
    throw new PgToolsError("ENV_INVALID", "DATABASE_URL must be a postgres:// URL.");
  }
  const ssl = (parsed.searchParams.get("sslmode") ?? "").toLowerCase() === "require";
  return {
    host: parsed.hostname || "localhost",
    port: parsed.port || "5432",
    user: decodeURIComponent(parsed.username || "postgres"),
    password: decodeURIComponent(parsed.password || ""),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
    ssl,
  };
}

/** Fast check that a binary is on the PATH. Returns null on success, message on failure. */
export function checkBinary(name: "pg_dump" | "psql"): string | null {
  try {
    const r = spawnSync(name, ["--version"], { encoding: "utf8" });
    if (r.error) {
      return `Could not run ${name}: ${r.error.message}. Make sure the postgresql-client package is installed and on PATH.`;
    }
    if (r.status !== 0) {
      return `${name} exited with status ${r.status}: ${r.stderr || r.stdout}`;
    }
    return null;
  } catch (err) {
    return `Could not run ${name}: ${err instanceof Error ? err.message : String(err)}`;
  }
}

function envFor(conn: PgConn): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PGPASSWORD: conn.password,
    PGSSLMODE: conn.ssl ? "require" : process.env.PGSSLMODE ?? "prefer",
  };
}

/**
 * Spawn pg_dump and return a Readable stream of the .sql output. The output is
 * configured to be self-contained: it includes DROP TABLE IF EXISTS statements
 * before each CREATE so it can be replayed onto an existing database.
 *
 * Flags rationale:
 *   --clean             : add DROP statements before CREATE
 *   --if-exists         : skip the DROP if the object isn't there yet
 *   --no-owner          : don't ALTER ... OWNER TO (portable across users)
 *   --no-acl            : skip GRANT/REVOKE
 *   --quote-all-identifiers : robust against case-sensitive names
 *   --format=plain      : produce a .sql file we can replay with psql
 */
export function streamPgDump(): { stream: Readable; child: ChildProcessWithoutNullStreams } {
  const conn = parseDatabaseUrl(process.env.DATABASE_URL);
  const missing = checkBinary("pg_dump");
  if (missing) throw new PgToolsError("BINARY_MISSING", missing);

  const args = [
    "--host", conn.host,
    "--port", conn.port,
    "--username", conn.user,
    "--dbname", conn.database,
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-acl",
    "--quote-all-identifiers",
    "--format=plain",
  ];

  const child = spawn("pg_dump", args, { env: envFor(conn) });

  // Capture stderr so the API route can include it in error responses.
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
    // Don't blow memory on a runaway warning storm.
    if (stderr.length > 50_000) stderr = stderr.slice(-50_000);
  });

  child.on("exit", (code) => {
    if (code !== 0) {
      child.stdout.destroy(
        new PgToolsError("PG_DUMP_FAILED", `pg_dump exited with code ${code}: ${stderr.trim()}`),
      );
    }
  });

  return { stream: child.stdout, child };
}

/**
 * Apply a .sql script (typically produced by streamPgDump) back into the
 * database via psql. Wrapped in a single transaction so a partial failure
 * rolls everything back.
 *
 * Flags:
 *   -v ON_ERROR_STOP=1 : abort on the first error (don't continue past)
 *   --single-transaction : wrap the whole script in BEGIN/COMMIT
 */
export async function runPsqlRestore(sql: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const conn = parseDatabaseUrl(process.env.DATABASE_URL);
  const missing = checkBinary("psql");
  if (missing) throw new PgToolsError("BINARY_MISSING", missing);

  const args = [
    "--host", conn.host,
    "--port", conn.port,
    "--username", conn.user,
    "--dbname", conn.database,
    "-v", "ON_ERROR_STOP=1",
    "--single-transaction",
    "--quiet",
    "--no-psqlrc",
  ];

  return new Promise((resolve) => {
    const child = spawn("psql", args, { env: envFor(conn) });

    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      if (stderr.length > 100_000) stderr = stderr.slice(-100_000);
    });

    child.on("error", (err) => {
      resolve({ ok: false, error: err.message });
    });

    child.on("close", (code) => {
      if (code === 0) resolve({ ok: true });
      else resolve({ ok: false, error: `psql exited with code ${code}: ${stderr.trim() || "(no output)"}` });
    });

    child.stdin.write(sql);
    child.stdin.end();
  });
}
