# Security Policy

## Supported versions

MasonryKit is versioned together across `@masonrykit/core`, `@masonrykit/browser`, and `@masonrykit/react`. Security fixes land on the latest minor line.

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

Older minor lines stop receiving security fixes once the next minor is released.

## Reporting a vulnerability

**Please do not file public GitHub issues for security problems.**

Use GitHub's private [security advisory flow](https://github.com/masonrykit/masonrykit/security/advisories/new) to report vulnerabilities. This keeps the report confidential until a fix is available and lets us request a CVE if applicable.

What to include:

- A clear description of the issue and affected package(s) / versions
- A minimal reproduction (code snippet, repo, or steps)
- Impact — what an attacker can achieve
- (Optional) A suggested fix

We'll acknowledge the report within 72 hours and aim to publish a patched release within 14 days for high-severity issues. You'll be credited in the advisory unless you'd rather stay anonymous.

## Supply chain

All three packages are published to npm from the `release.yml` workflow via [npm Trusted Publishers](https://docs.npmjs.com/trusted-publishers) (OIDC) and ship with [sigstore provenance attestations](https://docs.npmjs.com/generating-provenance-statements). No long-lived `NPM_TOKEN` is stored in the repo.

To verify a published package's provenance locally:

```bash
npm audit signatures @masonrykit/core
```
