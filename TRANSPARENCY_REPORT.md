# Stage 3 Audit: Transparency Report

This document covers the full audit pass RedFlag CI went through after v2.0.0 shipped -- everything from `npm audit` through a 23-scenario adversarial stress-test sweep. The project's own recurring standard, stated first in `STRESS_TESTING.md` at 18 scenarios and repeated at every expansion since, is to hunt for real gaps deliberately and document what's found honestly rather than stop once the numbers look clean. This report is that standard applied one level up: not "does each detector work on the inputs already imagined," but "does the system as a whole hold up against inputs someone who read the public docs would specifically construct to get past it."

Nothing here is marketing. Where something was found and fixed, it's recorded as found and fixed. Where something was found and left alone on purpose, the reasoning for leaving it alone is given directly, not glossed over.

## What this audit covered

1. Dependency audit (`npm audit`) and a dead-code check
2. A full end-to-end code review, hunting for bugs, naive assumptions, and inconsistencies across every file in `backend/src`
3. A statement/branch coverage report, and confirmation of what every meaningfully-uncovered line actually did
4. A 23-scenario adversarial and boundary stress-test sweep, deliberately built by two independent sources to counter reviewer bias

A live dogfood run (installing the app on a real repo and opening a real PR) was considered and deliberately skipped for this audit. The reasoning: every behavior a live run would confirm -- webhook receipt, comment idempotency, the concurrent-request lock, baseline writes on merge, cross-PR drift detection against a real baseline -- is already exercised by this session's test suite and the stress-test sweep below, against the real production functions, not reimplementations. A live run mainly proves the deployment plumbing (ngrok, webhook URL configuration) works, which is infrastructure, not detection logic, and was already confirmed once at v1.0.0.

## 1. Dependency and dead-code audit

`npm audit` found two high-severity vulnerabilities, both in transitive dev dependencies pulled in by ESLint and Jest tooling -- `brace-expansion` and `js-yaml` -- neither reachable from any runtime code path RedFlag CI actually ships. Both were fixed with `npm audit fix`; the project now reports zero vulnerabilities.

A dead-code check via `ts-prune` flagged 13 exported symbols. Every one turned out to be used within its own file, just exported when it didn't need to be -- a minor style inconsistency, not dead code. None were removed, since the cost of tightening exports didn't outweigh the churn.

## 2. End-to-end review pass

A fresh read-through of every file in `backend/src`, checking claimed behavior against actual behavior, hunting for inconsistencies introduced across the many incremental tasks this project went through, and specifically looking for anything a strict senior engineer would flag in review. This surfaced 18 findings.

**17 were fixed:**

- `transportTypeChange.ts` had reintroduced the exact `mcpServers ?? servers` short-circuit bug Task 2.1 had already fixed on DD-1 -- never ported over when the detector was built.
- Deleting a monitored file outright (`.claude/settings.json` removed entirely) produced zero findings from every detector, since each correctly returns nothing on a null head with nothing left to compare. This was the most severe finding of the pass: the single most drastic possible change to a repo's agent configuration was also the quietest. A new detector, DD-8, now reports a file deletion as its own distinct, high-severity finding.
- `hookChanged.ts` and `obfuscatedCommand.ts` were built against a hooks schema that didn't match Claude Code's real `settings.json` shape (a nested `hooks: [{ type, command }]` array under each matcher, not a flat `{ matcher, command }` pair). Confirmed against the real schema, fixed, and every hook fixture across the corpus was corrected to match.
- `unpinnedMcpDependency.ts` treated any `@`-suffixed package spec as pinned, including floating dist-tags (`@latest`, `@next`, `@canary`, `@beta`) that float identically to no pin at all. Fixed to require an actual semver-shaped version.
- `obfuscatedCommand.ts`'s base64 detection failed on a payload wrapped in quotes or immediately followed by punctuation (`;`, `)`), both realistic shapes in an actual shell command or JSON string. Fixed to strip surrounding quotes and trailing punctuation before the charset check.
- `widenedPermissions.ts` labeled a bare, unrestricted tool name (no literal `*` character) as a "wildcard" finding -- factually wrong wording, though the severity classification was already correct. Fixed the message.
- `getChangedFiles` had no pagination, silently dropping any file past the first 100 in a PR touching more than that. Now paginates through the full list.
- Two webhook deliveries processed concurrently for the same PR could both see "no existing comment" and both create one -- the exact duplication Task 6.1's idempotency logic was built to prevent, reached via a race instead of a missing check. Fixed with an in-process lock, explicitly documented as single-instance-process only: it provides no protection if this service is ever run as multiple replicas, which would need a distributed lock, out of scope for this design.
- DD-1's rename correlation compared arguments with a strict, order-sensitive check, while DD-2's own swap detection already tolerated a harmless flag reorder -- so a rename with a simultaneous flag reorder spuriously read as a brand-new server. Both detectors now share one extracted comparison function.
- A failed or unreadable baseline read and a genuinely-missing baseline were logged identically -- no way to distinguish "nothing to report" from "couldn't check." Now logged distinctly, mirroring the rate-limit logging pattern already established.
- A baseline write conflict during a merge was silently swallowed. The baseline is a full snapshot, not an incremental log, so a dropped write self-heals on the next successful merge -- the fix adds logging for the failure, not a retry, since retrying a self-healing condition would be unnecessary complexity.
- Once a PR's findings were all resolved, the check run correctly flipped to success, but the PR comment itself was never updated -- it kept showing the old, resolved findings indefinitely. Now edited to a brief resolved-state message in place.
- Four smaller, self-contained fixes: dist-tag-style floating runners beyond bare `npx` (`npx.cmd`, absolute paths, `pnpm dlx`, `yarn dlx`, `bunx`) weren't recognized as unpinned-dependency risks; a bare IPv4 regex could false-positive on version-like numeric strings; severity ordering was hand-duplicated across four files with no shared source of truth; and a stale detector-ID typo sat in the public architecture doc.

**1 was confirmed as an intentional, permanent scope limitation, not fixed:** RF-1/RF-2's extension to JSON keys covers server names and permission entries, but not a hook's `matcher` field -- a homoglyph or invisible character hidden in a matcher is only ever caught on the PR that introduces it (via DD-4's raw-text diff), and becomes permanently invisible once merged, since nothing re-scans it as current state. This matches the design's stated scope; expanding it would mean re-scanning every monitored file on every PR regardless of whether that PR touched it, a real cost-benefit tradeoff not taken on without evidence it's worth it.

## 3. Coverage report

A statement/branch coverage run before this phase showed 94.95% statements, 87.54% branches, 99.31% functions, 94.87% lines overall. Every meaningfully-uncovered line across the five weakest files was read and explained, not assumed to be safe.

This surfaced one real bug: `suspiciousNetworkTarget.ts` skipped its bare-IP check for both `http://` and `https://` prefixes, when only `http://` needed the exemption (already caught by the separate insecure-HTTP finding). A bare IP behind HTTPS -- which still bypasses domain validation, TLS certificate checks, and DNS governance -- was silently passing through both checks with zero findings. Fixed by narrowing the skip to `http://` only.

It also surfaced five genuine coverage gaps, each closed with a real test rather than a forced one:

- `webhookSignature.ts`'s length-mismatch guard had never actually executed in any existing test, since every prior "bad signature" test happened to use a same-length wrong signature. A malformed header of the wrong length could have thrown an uncaught error instead of cleanly rejecting the request. The guard turned out to already be correct -- the new test proves it, rather than fixing a bug that wasn't there.
- `hookChanged.ts` had no test for a hook where both `command` and `matcher` change together, and none for a matcher changing while the command stays the same -- the exact CVE-2025-59536 pattern of a hook's reach broadening without its command changing at all.
- `config.ts`'s `getWebhookSecret` had no direct test of its own; its happy path was only ever incidentally exercised through unrelated app-level test setup.
- `githubApp.ts`'s rate-limit retry decision logic was wired in but never actually invoked by any test -- only its presence was confirmed, not its behavior.
- One line in `suspiciousNetworkTarget.ts` turned out to be genuinely unreachable dead code: a colon-stripping branch fed by a regex whose own capture group structurally excludes the colon character. Removed rather than tested around.

Coverage after this phase: 96.27% statements, 89.52% branches, 100% functions, 96.22% lines.

## 4. Adversarial and boundary stress-test sweep

23 scenarios, generated from two deliberately independent sources to counter a specific, real risk: a single author reviewing their own work tends to construct test cases shaped like the mental model they already have, not like an attacker's. 11 scenarios were built with full knowledge of the implementation. The remaining 12 came from a genuinely separate conversation, given only the project's public-facing design docs -- README and `architecture.md` -- and explicitly instructed to attack the *stated* design without seeing any source code.

21 of the 23 were expressible as real tests against real production code (never a reimplementation of the logic being tested). Two were confirmed to have no code path to even point a test at: an attacker uninstalling the GitHub App itself, and a pure social-engineering attempt conducted entirely through PR comment text that no function in this codebase ever reads.

**4 scenarios surfaced something genuinely new.** Two were fixed:

- A path-traversal sequence built with the fullwidth Unicode solidus (`／`, U+FF0F) instead of the ASCII `/` rendered as a near-identical slash to a human reviewer but was invisible to a regex that only recognized ASCII path separators. Fixed by extending the pattern to recognize the fullwidth forms alongside the ASCII ones.
- A baseline snapshot could have a correctly-computed hash over content that was itself unparseable JSON -- a case the existing tamper-detection logic never checked for, since it validated the wrapper and the hash but not what was actually inside. This produced complete silence: no tamper warning, no read-failure warning, nothing. Fixed to check the stored content's own parseability and log distinctly when it fails, the same pattern already used for every other baseline failure mode.

**Two were left as documented, permanent tradeoffs, matching the standard already applied elsewhere in this project:**

- A base64-encoded payload split across two separate argument entries, each individually under the detector's length threshold, evades detection even though the same payload as one unsplit token would fire. Closing this would mean tracking and simulating concatenation across independent values, a materially heavier capability than a deterministic pattern check was ever meant to have -- the same reasoning already applied to why RF-2 doesn't gain natural-language awareness.
- A composed attack chaining two individually-already-known facts: the confusables table doesn't cover the Mathematical Bold Fraktur Unicode block, and the JSON-key homoglyph scan only reads specific known fields (server names, permission array values), not arbitrary fabricated sibling keys. Neither fact alone was new; the combination -- a homoglyph-disguised fake `"allow"` key sitting next to the real one -- is a genuinely realistic evasion, but closing it fully would mean either a much larger confusables table (which the project's own ADR already notes makes the opposite problem, legitimate multilingual false positives, worse) or scanning every JSON key indiscriminately, a scope expansion not taken on without more evidence it's worth the added surface.

**Nineteen scenarios confirmed existing, already-documented behavior** -- either a limitation already written down in `STRESS_TESTING.md` or the ADR (a hook's target script being unmonitored, an upstream registry compromise, a config format not on the monitored list, cross-repo drift being invisible to a per-repo baseline), or a positive confirmation that a specific piece of logic holds at a scale or shape it hadn't been explicitly tested at before (the remove/add correlation logic holding cleanly across 14 simultaneous narrowings plus one genuine new addition; a long-idle PR correctly picking up a fresh baseline rather than a stale cached one on its next event).

## Where this leaves the project

- **138 corpus scenarios plus 1 (DD-8's own scenario) = 139**, precision 1.000, recall 1.000, unchanged through every single commit in this entire audit.
- **481 unit and integration tests**, all passing, across 35 test suites.
- **0 known npm vulnerabilities.**
- **17 of 18 code-review findings fixed; the 18th confirmed as an intentional, stated scope boundary.**
- **6 of 6 coverage gaps investigated, 1 real bug fixed, 5 given genuine new coverage.**
- **4 of 23 stress-test scenarios surfaced something new; 2 fixed, 2 recorded as permanent, deliberate tradeoffs with the same reasoning already applied elsewhere in this project's own design decisions.**

None of this is a claim that RedFlag CI now catches everything. The project's own precision-over-recall design, stated from the first ADR onward, accepts that some attacks will get through in exchange for a false-positive rate low enough that developers keep the tool turned on. What this audit adds is evidence, not assurance: every gap named above is named because someone -- two genuinely independent someones, in the stress-test sweep -- went looking for it on purpose and wrote down exactly what they found, whether or not it flattered the project.
