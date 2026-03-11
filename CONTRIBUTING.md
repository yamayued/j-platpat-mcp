# Contributing

Thanks for contributing to `j-platpat-mcp`.

## Working Agreement

- Keep this repository public-safe at all times.
- Do not commit secrets, personal data, customer data, application forms, or private business documents.
- Follow the leak-check rules in `AGENTS.md` before every commit or push.

## Development Flow

1. Create a branch for your work.
2. Make the smallest safe change that solves the problem.
3. Run:
   - `npm run check`
   - `npm run test:mock`
4. Open a pull request with a short summary and any remaining risks.

## Pull Request Expectations

- Explain user-facing impact.
- Call out any endpoint assumptions.
- Note anything that still requires a real JPO account to validate.
- Keep docs and examples on placeholder values only.

## Review Guidelines

- Prefer small PRs that are easy to review and revert.
- Review for leaks first, behavior second, style third.
- If a change touches auth, transport, or request handling, include a concrete test note.

## What Not To Add

- Real JPO credentials
- Real applicant or case data unless explicitly confirmed public and necessary
- Filled forms or outbound administrative documents
- Screen-scraping logic for the J-PlatPat web UI
