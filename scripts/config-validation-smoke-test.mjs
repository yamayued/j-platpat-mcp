import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const configModuleUrl = pathToFileURL(path.join(process.cwd(), "dist", "config.js")).href;

const invalidBaseUrlResult = await runNodeScript({
  JPO_BASE_URL: ":invalid",
  JPO_USERNAME: "",
  JPO_PASSWORD: ""
});

assert.notEqual(invalidBaseUrlResult.code, 0);
assert.match(invalidBaseUrlResult.stderr, /JPO_BASE_URL must be a valid absolute URL/);

const bomDir = await fs.mkdtemp(path.join(os.tmpdir(), "jplatpat-bom-"));
await fs.writeFile(
  path.join(bomDir, ".env"),
  "\uFEFFJPO_USERNAME=bom-user\nJPO_PASSWORD=bom-pass\n",
  "utf8"
);

const bomEnvResult = await runNodeScript({
  JPO_BASE_URL: "https://ip-data.jpo.go.jp"
}, bomDir);

assert.equal(bomEnvResult.code, 0);
assert.match(bomEnvResult.stdout, /bom-user/);
assert.match(bomEnvResult.stdout, /bom-pass/);

await fs.rm(bomDir, { recursive: true, force: true });

console.log("config validation smoke test passed");

function runNodeScript(envOverrides, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        "-e",
        `import { loadConfig } from ${JSON.stringify(configModuleUrl)}; const c = loadConfig(); console.log(JSON.stringify({ username: c.username, password: c.password }));`
      ],
      {
        cwd,
        env: {
          ...process.env,
          ...envOverrides
        },
        stdio: ["pipe", "pipe", "pipe"]
      }
    );

    let stdout = "";
    let stderr = "";
    child.stdin.end();

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      resolve({
        code,
        stdout,
        stderr
      });
    });
  });
}
