import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const child = spawn(process.execPath, ["--enable-source-maps", "dist/index.js"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    JPO_USERNAME: "",
    JPO_PASSWORD: ""
  },
  stdio: ["pipe", "pipe", "pipe"]
});

let stdoutBuffer = "";
let stderrBuffer = "";
let finished = false;

child.stdout.on("data", (chunk) => {
  stdoutBuffer += chunk.toString("utf8");
  drainStdout();
});

child.stderr.on("data", (chunk) => {
  stderrBuffer += chunk.toString("utf8");
});

child.on("exit", (code, signal) => {
  if (!finished) {
    fail(`Process exited unexpectedly. code=${code} signal=${signal}\nstderr:\n${stderrBuffer}`);
  }
});

send({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: {
      name: "missing-credentials-smoke-test",
      version: "0.1.0"
    }
  }
});

setTimeout(() => {
  fail(`Timed out waiting for MCP responses.\nstderr:\n${stderrBuffer}`);
}, 15_000);

function drainStdout() {
  let newlineIndex = stdoutBuffer.indexOf("\n");

  while (newlineIndex >= 0) {
    const line = stdoutBuffer.slice(0, newlineIndex).trim();
    stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
    newlineIndex = stdoutBuffer.indexOf("\n");

    if (!line) {
      continue;
    }

    handleMessage(JSON.parse(line));
  }
}

function handleMessage(message) {
  if (message.id === 1) {
    send({
      jsonrpc: "2.0",
      method: "initialized",
      params: {}
    });
    send({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "get_patent_progress",
        arguments: {
          applicationNumber: "2020008423"
        }
      }
    });
    return;
  }

  if (message.id !== 2) {
    return;
  }

  assert.ok(!message.error, `unexpected JSON-RPC error ${JSON.stringify(message.error)}`);
  assert.equal(message.result.isError, true);
  assert.match(
    message.result.content[0].text,
    /JPO API credentials are not configured/
  );
  assert.equal(
    message.result.structuredContent.error,
    "JPO API credentials are not configured. Set JPO_USERNAME and JPO_PASSWORD to use official JPO API tools."
  );

  console.log("missing credentials smoke test passed");
  cleanup(0);
}

function send(message) {
  child.stdin.write(`${JSON.stringify(message)}\n`);
}

function cleanup(code) {
  finished = true;
  child.stdin.destroy();
  child.kill();
  process.exit(code);
}

function fail(message) {
  console.error(message);
  cleanup(1);
}
