import fs from "node:fs";
import path from "node:path";

export interface AppConfig {
  username?: string;
  password?: string;
  baseUrl: string;
  apiBasePath: string;
  authPath: string;
  userAgent: string;
  cacheTtlMs: number;
  minIntervalMs: number;
  requestTimeoutMs: number;
}

let didLoadDotEnv = false;

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readOptionalNumber(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();

  if (!raw) {
    return fallback;
  }

  const value = Number(raw);

  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Environment variable ${name} must be a non-negative number.`);
  }

  return value;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function loadDotEnvIfPresent(): void {
  if (didLoadDotEnv) {
    return;
  }

  didLoadDotEnv = true;

  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }

    const key = match[1];
    const rest = match[2];
    if (!key || rest === undefined) {
      continue;
    }

    if (process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = stripQuotes(rest.trim());
  }
}

function stripQuotes(value: string): string {
  if (
    value.length >= 2
    && ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'")))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

export function loadConfig(): AppConfig {
  loadDotEnvIfPresent();

  const baseUrl = trimTrailingSlash(process.env.JPO_BASE_URL?.trim() || "https://ip-data.jpo.go.jp");
  const apiBasePath = process.env.JPO_API_BASE_PATH?.trim() || "/api";
  const authPath = process.env.JPO_AUTH_PATH?.trim() || "/auth/token";

  return {
    username: readOptionalEnv("JPO_USERNAME"),
    password: readOptionalEnv("JPO_PASSWORD"),
    baseUrl,
    apiBasePath: apiBasePath.startsWith("/") ? apiBasePath : `/${apiBasePath}`,
    authPath: authPath.startsWith("/") ? authPath : `/${authPath}`,
    userAgent: process.env.JPO_USER_AGENT?.trim() || "j-platpat-mcp/0.1.0",
    cacheTtlMs: readOptionalNumber("JPO_CACHE_TTL_MS", 5 * 60 * 1000),
    minIntervalMs: readOptionalNumber("JPO_MIN_INTERVAL_MS", 250),
    requestTimeoutMs: readOptionalNumber("JPO_REQUEST_TIMEOUT_MS", 30 * 1000)
  };
}
