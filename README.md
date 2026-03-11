# j-platpat-mcp

`j-platpat-mcp` is a public MCP server scaffold for the official JPO patent information acquisition API (`特許情報取得API`).

This repository intentionally wraps the official API layer and does not scrape the J-PlatPat web UI.

## What This Repo Is

- A stdio MCP server for local MCP clients such as Codex, Claude Desktop, Cline, and similar tools.
- A retrieval-oriented wrapper around the official JPO endpoints for patent, trademark, and selected shared utilities.
- A starting point for an internal-first architecture where search is handled by a separate bulk-data index.

## What This Repo Is Not

- Not a J-PlatPat browser automation project.
- Not a full-text patent search engine.
- Not a substitute for reading and complying with the JPO / INPIT terms of use.

## Why This Shape

The official API is strongest when you already know a case number, applicant, or document family you want to retrieve. It is not a drop-in replacement for J-PlatPat's interactive UI search.

That makes a practical architecture look like this:

1. Use the official JPO API as the evidence-grade retrieval layer.
2. Add a separate internal search/index layer later for natural-language or broader discovery workflows.

This repository implements step 1 cleanly so step 2 can be added later without throwing away the MCP interface.

## Included Tools

The current scaffold exposes these MCP tools:

- `lookup_number_relation`
- `get_patent_progress`
- `get_patent_citations`
- `get_patent_documents`
- `get_patent_registration`
- `get_trademark_progress`
- `get_trademark_registration`
- `get_trademark_documents`
- `resolve_applicant_code`
- `get_jplatpat_permalink`

The document tools map the official split endpoints into one MCP tool with a `documentKind` switch:

- `opinion_amendment`
- `refusal_reason`
- `refusal_reason_decision`

## Features

- Password grant and refresh-token grant support against `https://ip-data.jpo.go.jp/auth/token`
- Automatic bearer token handling
- In-memory cache for repeated reads
- Simple minimum-interval throttling per process
- TypeScript + current MCP TypeScript SDK scaffold

## Requirements

- Node.js 20+
- A registered JPO API account
- JPO-issued ID and password

Official registration and documents:

- [JPO: API を利用した特許情報の試行提供](https://www.jpo.go.jp/system/laws/sesaku/data/api-provision.html)
- [JPO API 情報提供サイト](https://ip-data.jpo.go.jp/pages/top.html)
- [利用の手引き 第2.0版 PDF](https://www.jpo.go.jp/system/laws/sesaku/data/document/api-provision/api_handbook_v2.0.pdf)

## Setup

Install dependencies:

```bash
npm install
```

Copy the example environment file:

```powershell
Copy-Item .env.example .env
```

Fill in your credentials in `.env`:

```dotenv
JPO_USERNAME=your-issued-id
JPO_PASSWORD=your-issued-password
JPO_BASE_URL=https://ip-data.jpo.go.jp
JPO_API_BASE_PATH=/api
JPO_AUTH_PATH=/auth/token
JPO_USER_AGENT=j-platpat-mcp/0.1.0
JPO_CACHE_TTL_MS=300000
JPO_MIN_INTERVAL_MS=250
JPO_REQUEST_TIMEOUT_MS=30000
```

Run in development:

```bash
npm run dev:local
```

Build for production:

```bash
npm run build
```

Run the built server with local `.env` loading:

```bash
npm run start:local
```

## MCP Client Example

Most MCP clients want explicit environment variables in their config. Example:

```json
{
  "mcpServers": {
    "j-platpat": {
      "command": "node",
      "args": [
        "C:/path/to/j-platpat-mcp/dist/index.js"
      ],
      "env": {
        "JPO_USERNAME": "your-issued-id",
        "JPO_PASSWORD": "your-issued-password",
        "JPO_BASE_URL": "https://ip-data.jpo.go.jp",
        "JPO_API_BASE_PATH": "/api",
        "JPO_AUTH_PATH": "/auth/token",
        "JPO_USER_AGENT": "j-platpat-mcp/0.1.0",
        "JPO_CACHE_TTL_MS": "300000",
        "JPO_MIN_INTERVAL_MS": "250",
        "JPO_REQUEST_TIMEOUT_MS": "30000"
      }
    }
  }
}
```

## Compliance Notes

- This repository is designed around the official JPO API, not J-PlatPat screen scraping.
- You must obtain credentials and follow the API terms and handbook.
- Access counts are managed per ID, so cache and rate control are enabled by default.
- `resolve_applicant_code` uses exact-match applicant names because that is how the official endpoint works.

If you plan to publish a third-party SaaS or multi-tenant service, review the JPO terms very carefully before doing so.

## Current Limits

- No bulk-data ingestion layer yet
- No free-text search index yet
- No design-specific MCP retrieval tools yet, although shared tools already support `design` where the official API does
- No fixture-based tests yet

## Roadmap

- Add bulk-data ingestion for `特許情報標準データ` / download service snapshots
- Build a separate search index layer for natural-language and exploratory workflows
- Add design retrieval tools mirroring the current patent / trademark set
- Add response fixtures and regression tests
- Add optional Streamable HTTP transport for remote internal deployment

## Publishing Checklist

- Adjust `package.json` author metadata if you want a different display name
- Update the MCP client path example for your actual install path
- Decide whether you want MIT as-is or another license
- Add your own issue templates, CI gates, and release process

## Official References

These are the main sources this scaffold follows:

- [JPO API を利用した特許情報の試行提供](https://www.jpo.go.jp/system/laws/sesaku/data/api-provision.html)
- [JPO API 情報提供サイト](https://ip-data.jpo.go.jp/pages/top.html)
- [JPO API 仕様書 (Swagger UI)](https://ip-data.jpo.go.jp/api_guide/api_reference.html)

Notable confirmed details reflected in this scaffold:

- Access tokens are obtained at `/auth/token`
- Refresh uses the same `/auth/token` endpoint with `grant_type=refresh_token`
- Access token validity is 1 hour and refresh token validity is 8 hours
- The official notice dated 2026-03-02 states domestic API access limits were relaxed

## License

MIT
