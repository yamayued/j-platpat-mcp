import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const child = spawn(process.execPath, ["--enable-source-maps", "dist/index.js"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    JPO_USERNAME: process.env.JPO_USERNAME || "dummy-user",
    JPO_PASSWORD: process.env.JPO_PASSWORD || "dummy-password"
  },
  stdio: ["pipe", "pipe", "pipe"]
});

const pending = new Map();
let stdoutBuffer = "";
let stderrBuffer = "";

const checks = [
  {
    id: 2,
    name: "global document accepts compact publication number",
    request: {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "get_patent_global_document",
        arguments: {
          applicationNumber: "JP7650560B1",
          documentId: "A/B&C"
        }
      }
    },
    verify(message) {
      assert.equal(message.result.isError, true);
      assert.equal(
        message.result.structuredContent.path,
        "/patent/v1/global_doc_cont/JP.7650560.B1/A%2FB%26C"
      );
      assert.match(message.result.content[0].text, /tool: get_patent_global_document/);
    }
  },
  {
    id: 3,
    name: "family publication accepts compact publication number",
    request: {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "get_patent_family",
        arguments: {
          relation: "publication",
          caseNumber: "JP7650560B1"
        }
      }
    },
    verify(message) {
      assert.equal(message.result.isError, true);
      assert.equal(
        message.result.structuredContent.path,
        "/patent/v1/family/publication/JP.7650560.B1"
      );
      assert.match(message.result.content[0].text, /tool: get_patent_family/);
    }
  }
];

for (const check of checks) {
  pending.set(check.id, check);
}

child.stdout.on("data", (chunk) => {
  stdoutBuffer += chunk.toString("utf8");
  drainStdout();
});

child.stderr.on("data", (chunk) => {
  stderrBuffer += chunk.toString("utf8");
});

child.on("exit", (code, signal) => {
  if (pending.size > 0) {
    const names = [...pending.values()].map((check) => check.name).join(", ");
    fail(`MCP smoke test ended before responses arrived. code=${code} signal=${signal} pending=${names}\nstderr:\n${stderrBuffer}`);
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
      name: "mcp-tool-smoke-test",
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

    const message = JSON.parse(line);
    handleMessage(message);
  }
}

function handleMessage(message) {
  if (message.id === 1) {
    send({
      jsonrpc: "2.0",
      method: "initialized",
      params: {}
    });

    for (const check of checks) {
      send(check.request);
    }
    return;
  }

  const check = pending.get(message.id);
  if (!check) {
    return;
  }

  assert.ok(!message.error, `${check.name}: unexpected JSON-RPC error ${JSON.stringify(message.error)}`);
  check.verify(message);
  pending.delete(message.id);

  if (pending.size === 0) {
    console.log("mcp tool smoke test passed");
    cleanup(0);
  }
}

function send(message) {
  child.stdin.write(`${JSON.stringify(message)}\n`);
}

function cleanup(code) {
  child.stdin.destroy();
  child.kill();
  process.exit(code);
}

function fail(message) {
  console.error(message);
  cleanup(1);
}
