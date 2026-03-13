# AGENTS.md

This repository is public. Treat all work here as public-by-default.

## Hard Rules

- Never commit secrets.
- Never commit personal data.
- Never commit customer data.
- Never commit private business documents.
- Never commit real credentials, tokens, cookies, keys, passwords, or connection strings.
- Never commit filled application forms, outbound email drafts, invoices, contracts, account numbers, or identity documents.

## Safe Defaults

- Use placeholder values only in docs, examples, tests, and screenshots.
- Keep `.env` out of git. Only update `.env.example`.
- If a file contains any doubtfully private information, add it to `.gitignore` before creating or editing it.
- Prefer creating external-submission documents outside this repository. If that is not possible, keep them gitignored at all times.

## Required Leak Check Before Commit Or Push

Before every `git add`, commit, push, PR, or release, perform an extreme leak check.

Minimum checklist:

1. Run `git status --short` and inspect every changed file.
2. Run `git diff -- .` and inspect the full patch.
3. Run `git diff --cached -- .` before commit.
4. Check untracked files and make sure no private files are about to be added.
5. Verify `.gitignore` covers local private work files.
6. If there is any uncertainty, do not commit or push.
7. On any public release-related change (docs, scripts, config), run a final "公開最終監査" checklist:
   - Confirm only placeholder credentials and placeholder values remain in docs/examples.
   - Confirm no new real customer, applicant, or filing data exists in git-tracked files.
   - Confirm no personal/business sensitive files are newly added outside `.gitignore`.
   - If uncertain, stop and ask a reviewer before proceeding.

## Sensitive Data Heuristics

Treat the following as sensitive unless explicitly confirmed public and appropriate for the repository:

- Real names tied to private context
- Personal email addresses
- Direct phone numbers
- Home or office addresses
- Birth dates
- Bank account details
- Corporate IDs not needed for the codebase
- Legal, finance, HR, or application paperwork
- Internal-only URLs, IDs, and operational notes

## Decision Rule

If you cannot confidently say "this is safe for a public GitHub repository", do not commit it.

## 2026-03-13 Security Reminder

For public repo safety, we should assume that every change is externally reviewable.
Before push:

- Never commit unredacted private docs, application forms, IDs, phone numbers, addresses, account numbers, or screenshots containing them.
- Do not commit personal environment variable files (including `.env`, `.env.local` variants).
- Keep `package-lock.json` aligned with source changes before release, and ensure no private file appears only by transitive side effects.
- If another person requests code review, share only redacted snippets and keep raw sensitive artifacts outside the repo.
