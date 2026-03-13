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
  const normalizedRaw = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;

  for (const line of normalizedRaw.split(/\r?\n/)) {
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
  const normalizedApiBasePath = apiBasePath.startsWith("/") ? apiBasePath : `/${apiBasePath}`;
  const normalizedAuthPath = authPath.startsWith("/") ? authPath : `/${authPath}`;

  validateUrlConfig(baseUrl, normalizedApiBasePath, normalizedAuthPath);

  return {
    username: readOptionalEnv("JPO_USERNAME"),
    password: readOptionalEnv("JPO_PASSWORD"),
    baseUrl,
    apiBasePath: normalizedApiBasePath,
    authPath: normalizedAuthPath,
    userAgent: process.env.JPO_USER_AGENT?.trim() || "j-platpat-mcp/0.1.0",
    cacheTtlMs: readOptionalNumber("JPO_CACHE_TTL_MS", 5 * 60 * 1000),
    minIntervalMs: readOptionalNumber("JPO_MIN_INTERVAL_MS", 250),
    requestTimeoutMs: readOptionalNumber("JPO_REQUEST_TIMEOUT_MS", 30 * 1000)
  };
}

function validateUrlConfig(baseUrl: string, apiBasePath: string, authPath: string): void {
  let parsedBaseUrl: URL;

  try {
    parsedBaseUrl = new URL(baseUrl);
  } catch {
    throw new Error(`JPO_BASE_URL must be a valid absolute URL. Received: ${baseUrl}`);
  }

  try {
    new URL(apiBasePath, parsedBaseUrl);
  } catch {
    throw new Error(`JPO_API_BASE_PATH must be a valid URL path. Received: ${apiBasePath}`);
  }

  try {
    new URL(authPath, parsedBaseUrl);
  } catch {
    throw new Error(`JPO_AUTH_PATH must be a valid URL path. Received: ${authPath}`);
  }
}
