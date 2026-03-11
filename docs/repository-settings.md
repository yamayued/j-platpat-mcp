# Repository Settings

This file documents the recommended GitHub settings for collaborative maintenance.

## Collaborator Access

Add maintainers in GitHub repository settings with `Write` or `Maintain` access.

- `Write` is enough for normal branch + PR work
- `Maintain` is useful for people who should manage labels, discussions, and settings short of admin

## Recommended Branch Protection For `main`

- Require a pull request before merging
- Require status checks to pass before merging
- Required status checks:
  - `test`
- Dismiss stale pull request approvals when new commits are pushed
- Block force pushes
- Block branch deletion

## Keep Merging Flexible

If you want several people to merge without creating a single-review bottleneck:

- do not require CODEOWNERS review
- do not require approval from one specific person only
- use at least one approval, or zero approvals if your team prefers lightweight merges

## Security Recommendations

- Enable dependency graph
- Enable Dependabot alerts
- Enable Dependabot security updates
- Enable secret scanning and push protection if your GitHub plan supports them

## Suggested Merge Policy

- Squash merge for small feature and fix PRs
- Rebase merge if you want a linear history
- Avoid force-pushing `main`
