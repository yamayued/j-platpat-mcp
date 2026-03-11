import { setTimeout as delay } from "node:timers/promises";

import type { AppConfig } from "../config.js";
import { JpoTokenManager } from "./auth.js";
import type { JpoApiResponse } from "./types.js";

interface CacheEntry {
  expiresAt: number;
  response: JpoApiResponse;
}

export class JpoClient {
  private readonly tokenManager: JpoTokenManager;
  private readonly cache = new Map<string, CacheEntry>();
  private nextRequestNotBefore = 0;
  private activeChain = Promise.resolve();

  constructor(private readonly config: AppConfig) {
    this.tokenManager = new JpoTokenManager(config);
  }

  async get(pathname: string): Promise<JpoApiResponse> {
    const cacheKey = pathname;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.response;
    }

    const response = await this.enqueue(async () => this.executeGet(pathname));

    if (this.config.cacheTtlMs > 0) {
      this.cache.set(cacheKey, {
        expiresAt: Date.now() + this.config.cacheTtlMs,
        response
      });
    }

    return response;
  }

  private async enqueue<T>(work: () => Promise<T>): Promise<T> {
    const run = async (): Promise<T> => {
      const waitMs = Math.max(this.nextRequestNotBefore - Date.now(), 0);

      if (waitMs > 0) {
        await delay(waitMs);
      }

      this.nextRequestNotBefore = Date.now() + this.config.minIntervalMs;
      return work();
    };

    const result = this.activeChain.then(run, run);
    this.activeChain = result.then(() => undefined, () => undefined);
    return result;
  }

  private async executeGet(pathname: string): Promise<JpoApiResponse> {
    const response = await this.performAuthorizedFetch(pathname);

    if (response.status === 401) {
      this.tokenManager.invalidateAccessToken();
      const retriedResponse = await this.performAuthorizedFetch(pathname);
      return this.parseResponse(retriedResponse);
    }

    return this.parseResponse(response);
  }

  private async performAuthorizedFetch(pathname: string): Promise<Response> {
    const token = await this.tokenManager.getAccessToken();
    const url = new URL(`${this.config.apiBasePath}${pathname}`, this.config.baseUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);

    try {
      return await fetch(url, {
        method: "GET",
        headers: {
          authorization: `Bearer ${token}`,
          "user-agent": this.config.userAgent
        },
        signal: controller.signal
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`JPO API request timed out after ${this.config.requestTimeoutMs}ms.`);
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async parseResponse(response: Response): Promise<JpoApiResponse> {
    if (!response.ok) {
      const text = await safeReadText(response);
      throw new Error(`JPO API request failed (${response.status}): ${text}`);
    }

    return (await response.json()) as JpoApiResponse;
  }
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "Unable to read response body.";
  }
}
