import assert from "node:assert/strict";

import { JpoClient } from "../dist/jpo/client.js";

const mockConfig = {
  username: "dummy-user",
  password: "dummy-password",
  baseUrl: "https://ip-data.jpo.go.jp",
  apiBasePath: "/api",
  authPath: "/auth/token",
  userAgent: "j-platpat-mcp/mock-test",
  cacheTtlMs: 60_000,
  minIntervalMs: 0,
  requestTimeoutMs: 5_000
};

let authCallCount = 0;
let apiCallCount = 0;
let bearerTokens = [];

const originalFetch = globalThis.fetch;

globalThis.fetch = async (input, init = {}) => {
  const url = String(input);

  if (url.endsWith("/auth/token")) {
    authCallCount += 1;
    const body = new URLSearchParams(String(init.body ?? ""));
    const grantType = body.get("grant_type");

    if (grantType === "password") {
      return jsonResponse({
        access_token: "access-token-1",
        expires_in: 3600,
        refresh_expires_in: 28800,
        refresh_token: "refresh-token-1",
        token_type: "Bearer"
      });
    }

    if (grantType === "refresh_token") {
      return jsonResponse({
        access_token: "access-token-2",
        expires_in: 3600,
        refresh_expires_in: 28800,
        refresh_token: "refresh-token-2",
        token_type: "Bearer"
      });
    }

    return textResponse(400, "unexpected grant_type");
  }

  if (url.endsWith("/api/patent/v1/app_progress/2020008423")) {
    apiCallCount += 1;
    const bearer = String(init.headers?.authorization ?? "");
    bearerTokens.push(bearer);

    if (apiCallCount === 1) {
      return textResponse(401, "expired token");
    }

    return jsonResponse({
      result: {
        statusCode: "100",
        errorMessage: "",
        remainAccessCount: "799",
        data: {
          applicationNumber: "2020008423",
          inventionTitle: "Mock invention"
        }
      }
    });
  }

  return textResponse(404, `unhandled mock URL: ${url}`);
};

try {
  const client = new JpoClient(mockConfig);

  const first = await client.get("/patent/v1/app_progress/2020008423");
  const second = await client.get("/patent/v1/app_progress/2020008423");

  assert.equal(first.result.statusCode, "100");
  assert.equal(first.result.data.applicationNumber, "2020008423");
  assert.deepEqual(second, first);

  assert.equal(authCallCount, 2, "expected password grant + refresh grant");
  assert.equal(apiCallCount, 2, "expected first 401 + second successful retry");
  assert.deepEqual(bearerTokens, [
    "Bearer access-token-1",
    "Bearer access-token-2"
  ]);

  console.log("mock smoke test passed");
  console.log(JSON.stringify({
    authCallCount,
    apiCallCount,
    bearerTokens
  }, null, 2));
} finally {
  globalThis.fetch = originalFetch;
}

function jsonResponse(value) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: {
      "content-type": "application/json"
    }
  });
}

function textResponse(status, value) {
  return new Response(value, {
    status,
    headers: {
      "content-type": "text/plain"
    }
  });
}
