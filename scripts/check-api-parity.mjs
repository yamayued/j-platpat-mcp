#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as ts from "typescript";

const repoRoot = process.cwd();
const specPath = path.join(repoRoot, "api_reference.js");
const toolsPath = path.join(repoRoot, "src", "jpo", "tools.ts");
const shouldCreateIssue = process.argv.includes("--create-issue");
const shouldCheckRemote = process.argv.includes("--check-remote");
const remoteSpecUrl = "https://ip-data.jpo.go.jp/api_guide/api_reference.js";

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;

const API_DOMAINS = ["patent", "design", "trademark"];

main();

async function main() {
  const localSpec = extractSpecOperations(specPath);
  const apiOperations = localSpec.operations;
  const toolOperations = extractToolOperations(toolsPath);
  const remoteSpec = shouldCheckRemote ? await fetchRemoteOperations(remoteSpecUrl) : null;
  const remoteOperations = remoteSpec ? remoteSpec.operations : null;

  const remoteMissingInLocal = remoteOperations
    ? [...remoteOperations].filter((operation) => !apiOperations.has(operation)).sort()
    : [];
  const localMissingInRemote = remoteOperations
    ? [...apiOperations].filter((operation) => !remoteOperations.has(operation)).sort()
    : [];

  const missingInTools = [...apiOperations]
    .filter((operation) => !toolOperations.has(operation))
    .sort();

  const extraInTools = [...toolOperations]
    .filter((operation) => !apiOperations.has(operation))
    .sort();

  let exitCode = 0;

  if (missingInTools.length > 0) {
    exitCode = 1;
    console.error("Missing MCP tool coverage for API paths:");
    for (const operation of missingInTools) {
      console.error(`- ${operation}`);
    }
  }

  if (extraInTools.length > 0) {
    exitCode = 1;
    console.error("MCP paths not found in api_reference.js:");
    for (const path of extraInTools) {
      console.error(`- ${path}`);
    }
  }

  if (localSpec.unsupportedMethods.length > 0) {
    exitCode = 1;
    console.error("API includes non-GET methods; MCP transport is path-only GET currently:");
    for (const issue of localSpec.unsupportedMethods) {
      console.error(`- ${issue}`);
    }
  }

  if (localSpec.unsupportedRequestBodies.length > 0) {
    exitCode = 1;
    console.error("API includes request bodies; MCP parity check currently assumes path-only GET calls:");
    for (const issue of localSpec.unsupportedRequestBodies) {
      console.error(`- ${issue}`);
    }
  }

  if (localSpec.unsupportedParameterLocations.length > 0) {
    exitCode = 1;
    console.error("API includes unsupported parameter locations (only path params are supported):");
    for (const issue of localSpec.unsupportedParameterLocations) {
      console.error(`- ${issue}`);
    }
  }

  if (shouldCheckRemote && remoteMissingInLocal.length > 0) {
    exitCode = 1;
    console.error("API spec drift: operations in official api_reference.js are missing locally:");
    for (const operation of remoteMissingInLocal) {
      console.error(`- ${operation}`);
    }
  }

  if (shouldCheckRemote && localMissingInRemote.length > 0) {
    exitCode = 1;
    console.error("API spec drift: operations in local api_reference.js are not in official api_reference.js:");
    for (const operation of localMissingInRemote) {
      console.error(`- ${operation}`);
    }
  }

  if (exitCode !== 0 && shouldCreateIssue) {
    try {
      const issueResult = await createIssue({
        repo,
        token,
        missingInTools,
        extraInTools,
        unsupportedMethods: localSpec.unsupportedMethods,
        unsupportedRequestBodies: localSpec.unsupportedRequestBodies,
        unsupportedParameterLocations: localSpec.unsupportedParameterLocations,
        remoteMissingInLocal,
        localMissingInRemote,
        shouldCheckRemote
      });
      if (issueResult.skipped) {
        console.log("Existing open issue found for this parity drift; skipping new issue creation.");
      } else {
        console.log("Issue created automatically.");
      }
    } catch (error) {
      console.error(`Failed to create issue: ${error instanceof Error ? error.message : String(error)}`);
      exitCode = 1;
    }
  }

  if (exitCode === 0) {
    console.log("Parity check passed: api_reference.js and MCP tools are aligned.");
  } else {
    console.error("Parity check failed: update tools or spec mapping.");
  }

  process.exit(exitCode);
}

function extractSpecOperations(specFilePath) {
  const raw = fs.readFileSync(specFilePath, "utf8");
  return extractSpecOperationsFromText(raw, `local file ${specFilePath}`);
}

function extractSpecOperationsFromText(raw, sourceLabel) {
  const operations = new Set();
  const unsupportedMethods = [];
  const unsupportedRequestBodies = [];
  const unsupportedParameterLocations = [];

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error(`Could not parse JSON object from ${sourceLabel}`);
  }

  const spec = JSON.parse(raw.slice(start, end + 1));

  for (const [rawPath, pathOperations] of Object.entries(spec.paths || {})) {
    if (!isDomainPath(rawPath) || !pathOperations || typeof pathOperations !== "object") {
      continue;
    }

    const inheritedParameters = Array.isArray(pathOperations.parameters) ? pathOperations.parameters : [];

    for (const [method, operation] of Object.entries(pathOperations)) {
      if (method === "parameters") {
        continue;
      }

      const upperMethod = method.toUpperCase();
      const normalized = canonicalize(rawPath);
      operations.add(`${upperMethod} ${normalized}`);

      if (upperMethod !== "GET") {
        unsupportedMethods.push(`${upperMethod} ${normalized}`);
      }

      if (operation && typeof operation === "object" && operation.requestBody) {
        unsupportedRequestBodies.push(`${upperMethod} ${normalized}`);
      }

      if (operation && typeof operation === "object" && Array.isArray(operation.parameters)) {
        for (const parameter of operation.parameters) {
          if (!parameter || typeof parameter !== "object" || !parameter.in) {
            continue;
          }

          if (parameter.in !== "path") {
            unsupportedParameterLocations.push(`${upperMethod} ${normalized} uses ${parameter.in}`);
          }
        }
      }

      for (const parameter of inheritedParameters) {
        if (!parameter || typeof parameter !== "object" || !parameter.in) {
          continue;
        }

        if (parameter.in !== "path") {
          unsupportedParameterLocations.push(`${upperMethod} ${normalized} uses ${parameter.in}`);
        }
      }
    }
  }

  return {
    operations,
    unsupportedMethods,
    unsupportedRequestBodies,
    unsupportedParameterLocations
  };
}

function extractToolOperations(toolsFilePath) {
  const raw = fs.readFileSync(toolsFilePath, "utf8");
  const toolPaths = new Set();
  const source = ts.createSourceFile("tools.ts", raw, ts.ScriptTarget.ES2022, true);

  const addIfMatch = (segment) => {
    if (!segment) {
      return;
    }

    if (!isDomainPath(segment)) return;

    const normalized = canonicalize(segment);
    const hasDomainTemplate = normalized.startsWith("/{id}/v1/");
    if (hasDomainTemplate) {
      for (const domain of API_DOMAINS) {
        toolPaths.add(`GET ${normalized.replace("/{id}/v1/", `/${domain}/v1/`)}`);
      }
    } else {
      toolPaths.add(`GET ${normalized}`);
    }
  };

  const visitNode = (node) => {
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression) && node.expression.text === "buildToolResult") {
        const pathArg = node.arguments?.[1];
        addIfMatch(extractStringPath(pathArg));
      } else {
        const member = node.expression;
        if (
          ts.isPropertyAccessExpression(member)
          && ts.isIdentifier(member.name)
          && member.name.text === "buildToolResult"
        ) {
          const pathArg = node.arguments?.[1];
          addIfMatch(extractStringPath(pathArg));
        }
      }
    }

    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      addIfMatch(node.text);
    } else if (ts.isTemplateExpression(node)) {
      addIfMatch(extractTemplateValue(node));
    }

    ts.forEachChild(node, visitNode);
  };

  visitNode(source);

  return toolPaths;
}

function extractStringPath(node) {
  if (!node) {
    return null;
  }

  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }

  if (ts.isTemplateExpression(node)) {
    return extractTemplateValue(node);
  }

  return null;
}

function extractTemplateValue(node) {
  let value = node.head.text;
  for (const span of node.templateSpans) {
    value += "{id}" + span.literal.text;
  }

  return value;
}

async function fetchRemoteOperations(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "j-platpat-mcp-parity-check",
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to fetch remote api_reference.js: ${response.status} ${response.statusText}: ${body}`);
  }

  const remoteRaw = await response.text();
  return extractSpecOperationsFromText(remoteRaw, `remote ${url}`);
}

function isDomainPath(value) {
  return /\/(?:patent|design|trademark|\$\{domain\}|{id})\/v1\//.test(value);
}

function canonicalize(value) {
  return value
    .replace(/^\/opdapi\//, "/")
    .replaceAll(/\$\{[^}]+\}/g, "{id}")
    .replaceAll(/{[^}]+}/g, "{id}");
}

async function hasOpenIssue(repo, token, title) {
  const headers = {
    "Authorization": `token ${token}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };

  for (let page = 1; page <= 10; page++) {
    const response = await fetch(`https://api.github.com/repos/${repo}/issues?state=open&per_page=100&page=${page}`, {
      method: "GET",
      headers
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GitHub API error while checking existing issues: ${response.status} ${response.statusText}: ${text}`);
    }

    const issues = await response.json();
    if (!Array.isArray(issues)) {
      throw new Error("GitHub API response for issues listing was not an array.");
    }

    if (issues.some((issue) => issue.title === title)) {
      return true;
    }

    if (issues.length < 100) {
      break;
    }
  }

  return false;
}

async function createIssue({
  repo,
  token,
  missingInTools,
  extraInTools,
  unsupportedMethods,
  unsupportedRequestBodies,
  unsupportedParameterLocations,
  remoteMissingInLocal,
  localMissingInRemote,
  shouldCheckRemote
}) {
  if (!repo || !token) {
    throw new Error("Missing GITHUB_REPOSITORY or GITHUB_TOKEN for issue creation.");
  }

  const fingerprint = crypto
    .createHash("sha1")
    .update(JSON.stringify({
      missingInTools,
      extraInTools,
      unsupportedMethods,
      unsupportedRequestBodies,
      unsupportedParameterLocations,
      remoteMissingInLocal,
      localMissingInRemote,
      shouldCheckRemote
    }))
    .digest("hex")
    .slice(0, 12);
  const title = `API parity drift detected (${fingerprint})`;

  if (await hasOpenIssue(repo, token, title)) {
    return {
      skipped: true,
      title
    };
  }

  const bodyLines = [];
  bodyLines.push("Automated API parity check found drift between `api_reference.js` and MCP tool mappings.");
  bodyLines.push("");

  if (missingInTools.length > 0) {
    bodyLines.push("## Missing tool coverage (API has endpoints not implemented in MCP)");
    for (const item of missingInTools) {
      bodyLines.push(`- ${item}`);
    }
    bodyLines.push("");
  }

  if (extraInTools.length > 0) {
    bodyLines.push("## Extra MCP operations not present in spec");
    for (const item of extraInTools) {
      bodyLines.push(`- ${item}`);
    }
    bodyLines.push("");
  }

  if (unsupportedMethods.length > 0) {
    bodyLines.push("## MCP transport gap: Non-GET methods");
    for (const item of unsupportedMethods) {
      bodyLines.push(`- ${item}`);
    }
    bodyLines.push("");
  }

  if (unsupportedRequestBodies.length > 0) {
    bodyLines.push("## MCP transport gap: request bodies required");
    for (const item of unsupportedRequestBodies) {
      bodyLines.push(`- ${item}`);
    }
    bodyLines.push("");
  }

  if (unsupportedParameterLocations.length > 0) {
    bodyLines.push("## MCP transport gap: unsupported parameter locations");
    for (const item of unsupportedParameterLocations) {
      bodyLines.push(`- ${item}`);
    }
    bodyLines.push("");
  }

  if (shouldCheckRemote && remoteMissingInLocal.length > 0) {
    bodyLines.push("## Official api_reference.js has operations not in local api_reference.js");
    for (const item of remoteMissingInLocal) {
      bodyLines.push(`- ${item}`);
    }
    bodyLines.push("");
  }

  if (shouldCheckRemote && localMissingInRemote.length > 0) {
    bodyLines.push("## Local api_reference.js has operations not in official api_reference.js");
    for (const item of localMissingInRemote) {
      bodyLines.push(`- ${item}`);
    }
    bodyLines.push("");
  }

  if (shouldCheckRemote) {
    bodyLines.push("- Remote spec check enabled (`--check-remote`).");
  }

  bodyLines.push(`- Fingerprint: ${fingerprint}`);

  const issueBody = bodyLines.join("\n");

  return fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      "Authorization": `token ${token}`,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    body: JSON.stringify({
      title,
      body: issueBody
    })
  }).then(async (response) => {
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}: ${text}`);
    }

    return {
      skipped: false,
      title
    };
  });
}
