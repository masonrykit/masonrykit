<!--
Thanks for contributing! A few notes to help reviewers:
- CI runs lint, typecheck, tests (unit + browser), build, publint, attw,
  bundle-size budget, and knip on every PR. All must pass.
- If you changed anything in `packages/*/src/`, add a changeset: `pnpm changeset`.
- Keep PRs small and focused. Multiple concerns = multiple PRs.
-->

## Summary

<!-- What does this PR do, in 1-3 sentences? -->

## Why

<!-- What problem does it solve? Link issues with `Closes #NN` if applicable. -->

## How

<!-- Any non-obvious implementation choices reviewers should know about. -->

## Test plan

<!-- Bulleted checklist of how you verified this. Delete boxes that don't apply. -->

- [ ] Unit tests added / updated
- [ ] Browser tests added / updated
- [ ] Type-level tests added / updated (`*.test-d.ts`)
- [ ] Demo(s) exercised manually — describe what you toggled
- [ ] Verified with `pnpm vitest run` locally

## Checklist

- [ ] Changeset added (`pnpm changeset`) if `packages/*/src/` changed
- [ ] Public API changes reflected in the package's README
- [ ] No dead code / unused exports (knip will catch these)
- [ ] No `console.log` / commented-out code left behind
