import { setTimeout as delay } from "node:timers/promises";

import type { AppConfig } from "../config.js";
import type { JpoTokenResponse } from "./types.js";

interface TokenState {
  accessToken: string;
  accessTokenExpiresAt: number;
  refreshToken: string;
  refreshTokenExpiresAt: number;
  tokenType: string;
}

export class JpoTokenManager {
  private tokenState?: TokenState;
  private tokenPromise?: Promise<string>;

  constructor(private readonly config: AppConfig) {}

  async getAccessToken(): Promise<string> {
    if (this.hasValidAccessToken()) {
      return this.tokenState!.accessToken;
    }

    if (!this.tokenPromise) {
      this.tokenPromise = this.refreshOrLogin()
        .finally(() => {
          this.tokenPromise = undefined;
        });
    }

    return this.tokenPromise;
  }

  invalidateAccessToken(): void {
    if (!this.tokenState) {
      return;
    }

    this.tokenState.accessTokenExpiresAt = 0;
  }

  private hasValidAccessToken(): boolean {
    return Boolean(this.tokenState && this.tokenState.accessTokenExpiresAt > Date.now());
  }

  private hasValidRefreshToken(): boolean {
    return Boolean(this.tokenState && this.tokenState.refreshTokenExpiresAt > Date.now());
  }

  private async refreshOrLogin(): Promise<string> {
    if (this.hasValidRefreshToken()) {
      try {
        return await this.refreshWithRefreshToken();
      } catch {
        this.tokenState = undefined;
      }
    }

    return this.loginWithPasswordGrant();
  }

  private async refreshWithRefreshToken(): Promise<string> {
    const refreshToken = this.tokenState?.refreshToken;

    if (!refreshToken) {
      throw new Error("Missing refresh token.");
    }

    const payload = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken
    });

    return this.issueToken(payload);
  }

  private async loginWithPasswordGrant(): Promise<string> {
    if (!this.config.username || !this.config.password) {
      throw new Error(
        "JPO API credentials are not configured. Set JPO_USERNAME and JPO_PASSWORD to use official JPO API tools."
      );
    }

    const payload = new URLSearchParams({
      grant_type: "password",
      username: this.config.username,
      password: this.config.password
    });

    return this.issueToken(payload);
  }

  private async issueToken(payload: URLSearchParams): Promise<string> {
    const response = await this.fetchWithTimeout(
      new URL(this.config.authPath, this.config.baseUrl),
      {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "user-agent": this.config.userAgent
        },
        body: payload.toString()
      }
    );

    if (!response.ok) {
      const details = await safeReadText(response);
      throw new Error(`JPO auth failed (${response.status}): ${details}`);
    }

    const json = (await response.json()) as JpoTokenResponse;

    if (!json.access_token || !json.refresh_token) {
      throw new Error("JPO auth response did not include access_token and refresh_token.");
    }

    const now = Date.now();
    const expirySafetyWindowMs = 60 * 1000;

    this.tokenState = {
      accessToken: json.access_token,
      accessTokenExpiresAt: now + Math.max((json.expires_in * 1000) - expirySafetyWindowMs, 1000),
      refreshToken: json.refresh_token,
      refreshTokenExpiresAt: now + Math.max((json.refresh_expires_in * 1000) - expirySafetyWindowMs, 1000),
      tokenType: json.token_type || "Bearer"
    };

    return this.tokenState.accessToken;
  }

  private async fetchWithTimeout(input: URL, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);

    try {
      return await fetch(input, {
        ...init,
        signal: controller.signal
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`JPO auth request timed out after ${this.config.requestTimeoutMs}ms.`);
      }

      throw error;
    } finally {
      clearTimeout(timeout);

      // Yield once so rapid retry loops do not hammer the auth endpoint.
      await delay(0);
    }
  }
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "Unable to read response body.";
  }
}
