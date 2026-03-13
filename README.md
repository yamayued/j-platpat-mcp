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

For a direct map of MCP tools to wrapped JPO endpoints, see [docs/tool-coverage.md](./docs/tool-coverage.md).
For contribution and maintenance guidance, see [CONTRIBUTING.md](./CONTRIBUTING.md) and [docs/repository-settings.md](./docs/repository-settings.md).

## Included Tools

The current scaffold exposes these MCP tools:

- `lookup_number_relation`
- `get_patent_progress`
- `get_patent_progress_simple`
- `get_patent_citations`
- `get_patent_documents`
- `get_patent_registration`
- `get_patent_divisional_app_info`
- `get_patent_family`
- `get_patent_family_list`
- `get_patent_global_cite_class`
- `get_patent_global_doc_list`
- `get_patent_global_document`
- `get_patent_jp_document`
- `get_patent_pct_national_phase_application_number`
- `get_patent_priority_right_app_info`
- `get_design_progress`
- `get_design_progress_simple`
- `get_design_registration`
- `get_design_documents`
- `get_design_priority_right_app_info`
- `get_trademark_progress`
- `get_trademark_progress_simple`
- `get_trademark_registration`
- `get_trademark_documents`
- `get_trademark_priority_right_app_info`
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
- Mock smoke test for auth / retry / cache behavior without live JPO credentials
- TypeScript + current MCP TypeScript SDK scaffold

## Practical Use Cases

This server is most useful after a person has already identified a target case and wants to retrieve official records quickly.

- Patent or trademark teams checking prosecution progress for a known application number
- Attorney or paralegal workflows that need registration details and official document bundles
- Internal tools that want a stable J-PlatPat permalink for case handoff or record review
- Applicant-name or applicant-code resolution before pulling detailed case data

In other words, this repository is realistic as a retrieval MCP for known cases. It is not yet a replacement for exploratory prior-art search or similar-mark search.

## Requirements

- Node.js 20+
- A registered JPO API account
- JPO-issued ID and password

Official registration and documents:

- [JPO: API を利用した特許情報の試行提供](https://www.jpo.go.jp/system/laws/sesaku/data/api-provision.html)
- [JPO API 情報提供サイト](https://ip-data.jpo.go.jp/pages/top.html)
- [利用の手引き 第2.0版 PDF](https://www.jpo.go.jp/system/laws/sesaku/data/document/api-provision/api_handbook_v2.0.pdf)

## 利用申請

この MCP は J-PlatPat の画面をスクレイピングせず、特許庁の公式 `特許情報取得API` を使います。

利用には、特許庁から発行される ID / パスワードが必要です。2026年3月11日時点では、特許庁の案内ページにある利用申込書を記入し、`PA0630@jpo.go.jp` へメール送付して申請します。

申請案内:

- [APIを利用した特許情報の試行提供](https://www.jpo.go.jp/system/laws/sesaku/data/api-provision.html)

技術資料:

- [API情報提供サイト](https://ip-data.jpo.go.jp/pages/top.html)
- [API仕様書](https://ip-data.jpo.go.jp/api_guide/api_reference.html)
- [利用の手引き 第2.0版 PDF](https://www.jpo.go.jp/system/laws/sesaku/data/document/api-provision/api_handbook_v2.0.pdf)

認証まわりの要点:

- トークン取得先は `https://ip-data.jpo.go.jp/auth/token`
- `grant_type=password` でアクセストークン取得
- `grant_type=refresh_token` でアクセストークン再取得
- アクセストークンは 1 時間
- リフレッシュトークンは 8 時間

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

Run the mock smoke test without real JPO credentials:

```bash
npm run test:mock
```

What this verifies today:

- password-grant login
- refresh-token re-authentication
- bearer-token attachment on API calls
- one retry after `401`
- cache hits on repeated reads

Run the built server with local `.env` loading:

```bash
npm run start:local
```

## 動作確認

ID / パスワード発行後は、まず `.env` を埋めてから起動します。

```dotenv
JPO_USERNAME=your-issued-id
JPO_PASSWORD=your-issued-password
```

最初の確認としては、MCP を経由する前に JPO API 自体へログインできるかを見るのが確実です。

PowerShell 例:

```powershell
$body = @{
  grant_type = "password"
  username = "your-issued-id"
  password = "your-issued-password"
}

Invoke-RestMethod `
  -Method Post `
  -Uri "https://ip-data.jpo.go.jp/auth/token" `
  -ContentType "application/x-www-form-urlencoded" `
  -Body $body
```

`access_token` が返れば認証成功です。

その後、このリポジトリの MCP を起動します。

```bash
npm run dev:local
```

このサーバは次のような「番号が分かっている案件」の取得に向いています。

- `get_patent_progress`
- `get_design_progress`
- `get_patent_registration`
- `get_design_registration`
- `get_trademark_progress`
- `lookup_number_relation`

例えば `get_patent_progress` では、10桁の出願番号を渡して公式 API の `patent/v1/app_progress/{出願番号}` を呼びます。

## 利用上の注意

このリポジトリは検索 UI の代替ではありません。公式 API は取得系が中心なので、自由語検索や探索的な検索は別途インデックス層を足す前提です。

また、アクセス数は ID 単位で管理されるため、キャッシュと簡易レート制御を入れています。

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
- No fixture-based tests yet
- No live verification against a JPO-issued production account in this repository

## Validation Status

This repository has not yet been verified in a live production JPO API environment.

What has been validated locally:

- `npm run check`
- `npm run build`
- `npm run test:mock`
- stdio MCP startup with missing-env failure behavior

What still needs a real JPO account:

- live `/auth/token` verification
- response-shape confirmation against production data
- access-count behavior under real usage
- end-to-end checks for each wrapped endpoint

## Roadmap

- Add bulk-data ingestion for `特許情報標準データ` / download service snapshots
- Build a separate search index layer for natural-language and exploratory workflows
- Add coverage for any remaining official endpoint families not in the public endpoint list
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
