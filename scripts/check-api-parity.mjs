#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const specPath = path.join(repoRoot, "api_reference.js");
const toolsPath = path.join(repoRoot, "src", "jpo", "tools.ts");

const API_DOMAINS = ["patent", "design", "trademark"];

const apiPaths = extractSpecPaths(specPath);
const toolPaths = extractToolPaths(toolsPath);

const missingInTools = [...apiPaths]
  .filter((path) => !toolPaths.has(path))
  .sort();

const extraInTools = [...toolPaths]
  .filter((path) => !apiPaths.has(path))
  .sort();

let exitCode = 0;

if (missingInTools.length > 0) {
  exitCode = 1;
  console.error("Missing MCP tool coverage for API paths:");
  for (const path of missingInTools) {
    console.error(`- ${path}`);
  }
}

if (extraInTools.length > 0) {
  exitCode = 1;
  console.error("MCP paths not found in api_reference.js:");
  for (const path of extraInTools) {
    console.error(`- ${path}`);
  }
}

if (exitCode === 0) {
  console.log("Parity check passed: api_reference.js and MCP tools are aligned.");
} else {
  console.error("Parity check failed: update tools or spec mapping.");
}

process.exit(exitCode);

function extractSpecPaths(specFilePath) {
  const raw = fs.readFileSync(specFilePath, "utf8");
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error(`Could not parse JSON object from ${specFilePath}`);
  }

  const spec = JSON.parse(raw.slice(start, end + 1));
  const paths = spec.paths ? Object.keys(spec.paths) : [];

  return new Set(
    paths
      .filter(isDomainPath)
      .map((value) => canonicalize(value))
  );
}

function extractToolPaths(toolsFilePath) {
  const raw = fs.readFileSync(toolsFilePath, "utf8");
  const toolPaths = new Set();

  const addIfMatch = (segment) => {
    if (!isDomainPath(segment)) return;
    const hasDomainTemplate = segment.includes("${domain}");
    if (hasDomainTemplate) {
      for (const domain of API_DOMAINS) {
        toolPaths.add(canonicalize(segment.replace("${domain}", domain)));
      }
    } else {
      toolPaths.add(canonicalize(segment));
    }
  };

  for (const match of raw.matchAll(/["'`][^"'`]*?\/(?:patent|design|trademark|\$\{domain\})\/v1\/[A-Za-z0-9_]+(?:\/(?:\$\{[^}]+\}|{[^}]+}))*[^"'`]*?["'`]/g)) {
    const segment = match[0].slice(1, -1);
    addIfMatch(segment);
  }

  return toolPaths;
}

function isDomainPath(value) {
  return /\/(?:patent|design|trademark|\$\{domain\})\/v1\//.test(value);
}

function canonicalize(value) {
  return value
    .replace(/^\/opdapi\//, "/")
    .replaceAll(/\$\{[^}]+\}/g, "{id}")
    .replaceAll(/{[^}]+}/g, "{id}");
}
