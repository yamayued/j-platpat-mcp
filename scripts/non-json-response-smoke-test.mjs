import assert from "node:assert/strict";

import { JpoClient } from "../dist/jpo/client.js";
import { JpoTokenManager } from "../dist/jpo/auth.js";

const originalFetch = globalThis.fetch;

try {
  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url.endsWith("/auth/token")) {
      return new Response("<html>blocked</html>", {
        status: 200,
        headers: {
          "content-type": "text/html"
        }
      });
    }

    return new Response("<html>upstream maintenance</html>", {
      status: 200,
      headers: {
        "content-type": "text/html"
      }
    });
  };

  const config = {
    username: "dummy-user",
    password: "dummy-password",
    baseUrl: "https://ip-data.jpo.go.jp",
    apiBasePath: "/api",
    authPath: "/auth/token",
    userAgent: "j-platpat-mcp/non-json-test",
    cacheTtlMs: 0,
    minIntervalMs: 0,
    requestTimeoutMs: 5_000
  };

  const tokenManager = new JpoTokenManager(config);
  await assert.rejects(
    () => tokenManager.getAccessToken(),
    /JPO auth returned non-JSON response \(200, content-type: text\/html, url: https:\/\/ip-data\.jpo\.go\.jp\/auth\/token\): <html>blocked<\/html>/
  );

  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);

    if (url.endsWith("/auth/token")) {
      return new Response(JSON.stringify({
        access_token: "access-token-1",
        expires_in: 3600,
        refresh_expires_in: 28800,
        refresh_token: "refresh-token-1",
        token_type: "Bearer"
      }), {
        status: 200,
        headers: {
          "content-type": "application/json"
        }
      });
    }

    assert.equal(String(init.headers?.authorization), "Bearer access-token-1");

    return new Response("<html>upstream maintenance</html>", {
      status: 200,
      headers: {
        "content-type": "text/html"
      }
    });
  };

  const client = new JpoClient(config);
  await assert.rejects(
    () => client.get("/patent/v1/app_progress/2020008423"),
    /JPO API request returned non-JSON response \(200, content-type: text\/html\): <html>upstream maintenance<\/html>/
  );

  console.log("non-json response smoke test passed");
} finally {
  globalThis.fetch = originalFetch;
}
