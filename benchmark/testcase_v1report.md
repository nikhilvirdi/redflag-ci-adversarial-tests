# RedFlag CI v1 -- Full Corpus Audit Ledger (testcase_v1report.md)

Generated: 2026-08-06T12:24:03.250Z

Granular, per-scenario companion to `RESULTS.md`. Where `RESULTS.md` reports aggregate precision/recall, this file records, for every one of the 120 corpus scenarios individually: its category, its ground truth, the actual detector output from this run, and a verdict of **MATCH** (the actual result equals what the scenario was built to demonstrate, whether that is a clean detection, a clean non-detection, or a deliberately documented miss) or **DISCREPANCY** (the actual result was not anticipated by any prior session's notes). For DISCREPANCY entries, a one-line note distinguishes a known/accepted limitation from something that requires review.

**Total: 120 scenarios. MATCH: 120. DISCREPANCY: 0.**

Every false positive and false negative this run produced (20 total, listed individually below within their categories) was already predicted, in writing, by the manifest note attached to that scenario at the time it was built -- confirmed by cross-referencing this run's real output against each note's own prediction. None required treatment as a new defect. The two closest candidates for a genuine surprise were dd3-wildcard-narrowed-to-specific and dd3-narrowing-syntax-rewrite, whose Session 1 notes hedged with "see task report for whether this reproduced" -- this run resolves that hedge: both reproduce exactly as predicted. See the Session 4 category section for one small, non-blocking documentation-staleness note on `dd3-narrowing-syntax-rewrite`.

## Original 18 (Phase 7 baseline) (18 scenarios)

The first benchmark corpus, built when v1's six detectors first shipped: one clean-firing example per detector, four benign no-op controls, three deliberately adversarial near-misses probing a specific documented tradeoff each (args reorder, a legitimate Cyrillic sentence, a server rename), and one known-gap homoglyph outside RF-2's table. This category is the historical baseline every later session's corpus expansion was measured against.

| ID | Ground truth | Actual | Verdict | Note |
|---|---|---|---|---|
| `dd1-new-server` | positive (should fire) | TP -- diff-drift.new-mcp-server [warning]: New MCP server 'browser-automation' added | MATCH | -- |
| `dd2-command-swap` | positive (should fire) | TP -- diff-drift.swapped-mcp-server [high]: MCP server 'filesystem' definition changed (args) | MATCH | -- |
| `dd3-wildcard-added` | positive (should fire) | TP -- diff-drift.widened-permissions [high]: Wildcard permission 'Bash(*)' added to allow-list | MATCH | -- |
| `dd3-plain-allow-added` | positive (should fire) | TP -- diff-drift.widened-permissions [warning]: Permission 'Write(.env)' added to allow-list | MATCH | -- |
| `dd4-hook-added` | positive (should fire) | TP -- diff-drift.hook-changed [high]: New hook 'PostToolUse' added | MATCH | -- |
| `dd4-hook-command-changed` | positive (should fire) | TP -- diff-drift.hook-changed [high]: Hook 'PreToolUse' command changed | MATCH | -- |
| `rf1-zero-width-space` | positive (should fire) | TP -- rule-file.invisible-unicode [high]: Invisible Unicode character (U+200B) found | MATCH | -- |
| `rf2-cyrillic-homoglyph` | positive (should fire) | TP -- rule-file.homoglyph [high]: Cyrillic look-alike character (U+0430) found | MATCH | -- |
| `benign-mcp-reorder` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `benign-claude-md-doc-addition` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `benign-permissions-narrowing` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `benign-copilot-instructions-edit` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `near-miss-args-reorder` | negative (should stay quiet) | FP -- diff-drift.swapped-mcp-server [high]: MCP server 'filesystem' definition changed (args) | MATCH | Known/accepted (original 18): DD-2 args comparison is deliberately order-sensitive; documented tradeoff. |
| `near-miss-hook-removed` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `near-miss-bom` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `near-miss-legit-cyrillic-text` | negative (should stay quiet) | FP -- rule-file.homoglyph [high]: Cyrillic look-alike character (U+0440) found; rule-file.homoglyph [high]: Cyrillic look-alike character (U+0435) found; rule-file.homoglyph [high]: Cyrillic look-alike character (U+0420) found; rule-file.homoglyph [high]: Cyrillic look-alike character (U+0430) found; rule-file.homoglyph [high]: Cyrillic look-alike character (U+0435) found; rule-file.homoglyph [high]: Cyrillic look-alike character (U+0430) found; rule-file.homoglyph [high]: Cyrillic look-alike character (U+0441) found; rule-file.homoglyph [high]: Cyrillic look-alike character (U+0435) found; rule-file.homoglyph [high]: Cyrillic look-alike character (U+0441) found | MATCH | Known/accepted (original 18): RF-2 is a pure character-class check with no natural-language awareness. |
| `near-miss-mcp-server-rename` | negative (should stay quiet) | FP -- diff-drift.new-mcp-server [warning]: New MCP server 'filesystem-server' added | MATCH | Known/accepted (original 18): DD-1 diffs by key name only, cannot distinguish rename from new entry. |
| `known-gap-uncommon-homoglyph` | positive (should fire) | FN -- (none) | MATCH | Known/accepted (original 18): confusable outside RF-2's table; precision-over-recall tradeoff. |

## DD-1-DD-4 deep coverage (Session 1) (21 scenarios)

21 scenarios stress-testing the four diff-drift detectors' edge cases: schema-key variants, minimal configs, multiple simultaneous additions, unicode/whitespace in server names, env-var and version/hash swaps, deny-removal and multi-entry permission changes, and hook-shape variations (array vs. object, whitespace-only command changes). This session is also where the DD-3 wildcard-escalation bug (dd3-narrowing-syntax-rewrite) was originally found via stress-testing and then fixed in a dedicated follow-up task.

| ID | Ground truth | Actual | Verdict | Note |
|---|---|---|---|---|
| `dd1-servers-key-variant` | positive (should fire) | TP -- diff-drift.new-mcp-server [warning]: New MCP server 'docs' added | MATCH | -- |
| `dd1-minimal-config` | positive (should fire) | TP -- diff-drift.new-mcp-server [warning]: New MCP server 'notify' added | MATCH | -- |
| `dd1-multiple-servers-added` | positive (should fire) | TP -- diff-drift.new-mcp-server [warning]: New MCP server 'browser' added; diff-drift.new-mcp-server [warning]: New MCP server 'database' added | MATCH | -- |
| `dd1-unicode-server-name` | positive (should fire) | TP -- diff-drift.new-mcp-server [warning]: New MCP server 'café tools' added | MATCH | -- |
| `dd1-server-added-trailing-whitespace-key` | positive (should fire) | TP -- diff-drift.new-mcp-server [warning]: New MCP server 'filesystem ' added | MATCH | -- |
| `dd2-args-only-change` | positive (should fire) | TP -- diff-drift.swapped-mcp-server [high]: MCP server 'filesystem' definition changed (args) | MATCH | -- |
| `dd2-both-changed` | positive (should fire) | TP -- diff-drift.swapped-mcp-server [high]: MCP server 'filesystem' definition changed (command, args) | MATCH | -- |
| `dd2-env-var-change` | positive (should fire) | FN -- (none) | MATCH | Known/accepted (Session 1): DD-2's PINNED_FIELDS never included 'env'; documented scope gap. |
| `dd2-version-hash-change` | positive (should fire) | TP -- diff-drift.swapped-mcp-server [high]: MCP server 'filesystem' definition changed (version) | MATCH | -- |
| `dd3-deny-removed-plain` | positive (should fire) | TP -- diff-drift.widened-permissions [warning]: Deny rule 'Bash(curl)' removed | MATCH | -- |
| `dd3-multiple-allow-added` | positive (should fire) | TP -- diff-drift.widened-permissions [warning]: Permission 'Write(/tmp)' added to allow-list; diff-drift.widened-permissions [warning]: Permission 'Bash(git status)' added to allow-list | MATCH | -- |
| `dd3-permissions-block-newly-created` | positive (should fire) | TP -- diff-drift.widened-permissions [warning]: Permission 'Bash(npm test)' added to allow-list | MATCH | -- |
| `dd3-allow-and-deny-both-changed` | positive (should fire) | TP -- diff-drift.widened-permissions [warning]: Permission 'Write(/tmp)' added to allow-list; diff-drift.widened-permissions [warning]: Deny rule 'Bash(rm)' removed | MATCH | -- |
| `dd3-wildcard-narrowed-to-specific` | negative (should stay quiet) | FP -- diff-drift.widened-permissions [warning]: Permission 'Bash(npm test)' added to allow-list | MATCH | Known/accepted (Session 1, hedged "see task report" at construction time): DD-3 does not correlate a removed entry with an added one; Session 6 confirms the predicted FP reproduces. |
| `dd3-narrowing-syntax-rewrite` | negative (should stay quiet) | FP -- diff-drift.widened-permissions [warning]: Permission 'Write(./dist/**)' added to allow-list | MATCH | Known/accepted (Session 1, hedged "see task report" at construction time): same add/remove-correlation gap as above. Session 6 confirms the FP reproduces; note: the manifest's own note text predicts this would escalate to HIGH severity via the old WILDCARD_CHAR substring check, but that check was replaced by isUnrestrictedWildcard in a later fix -- actual severity is correctly `warning`, not `high`. The note text is stale relative to the fix (which predates this session and was already tested), not a new problem. |
| `dd4-multiple-hooks-changed` | positive (should fire) | TP -- diff-drift.hook-changed [high]: Hook 'PreToolUse[0]' command changed; diff-drift.hook-changed [high]: Hook 'PreToolUse[1]' command changed | MATCH | -- |
| `dd4-hook-removed-single` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `dd4-matcher-changed-command-same` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `dd4-command-whitespace-only-change` | negative (should stay quiet) | FP -- diff-drift.hook-changed [high]: Hook 'PreToolUse' command changed | MATCH | Known/accepted (Session 1): DD-4 command comparison has no whitespace normalization; documented judgment call. |
| `dd4-array-vs-object-shape` | positive (should fire) | TP -- diff-drift.hook-changed [high]: New hook 'PreToolUse' added | MATCH | -- |
| `dd4-new-hook-event-type` | positive (should fire) | TP -- diff-drift.hook-changed [high]: New hook 'SessionStart' added | MATCH | -- |

## RF-1/RF-2 deep coverage + judgment calls (Session 2) (19 scenarios)

19 scenarios: the first half exercises RF-1/RF-2 edge cases (additional bidi/zero-width variants, Greek and mixed-script homoglyphs, homoglyphs inside code fences and URLs); the second half is ten explicit "judgment call" scenarios probing debatable tradeoffs in DD-1 through DD-4 and RF-1/RF-2 -- schema-key precedence, wildcard-then-narrowed in one PR, whitespace-only hook changes, and a Latin loanword embedded in genuine Cyrillic prose.

| ID | Ground truth | Actual | Verdict | Note |
|---|---|---|---|---|
| `rf1-zero-width-joiner` | positive (should fire) | TP -- rule-file.invisible-unicode [high]: Invisible Unicode character (U+200D) found | MATCH | -- |
| `rf1-zero-width-non-joiner` | positive (should fire) | TP -- rule-file.invisible-unicode [high]: Invisible Unicode character (U+200C) found | MATCH | -- |
| `rf1-bidi-rlo-specific` | positive (should fire) | TP -- rule-file.invisible-unicode [high]: Invisible Unicode character (U+202E) found | MATCH | -- |
| `rf1-multiple-bidi-variants-one-file` | positive (should fire) | TP -- rule-file.invisible-unicode [high]: Invisible Unicode character (U+202A) found; rule-file.invisible-unicode [high]: Invisible Unicode character (U+202D) found; rule-file.invisible-unicode [high]: Invisible Unicode character (U+2066) found | MATCH | -- |
| `rf2-greek-homoglyph` | positive (should fire) | TP -- rule-file.homoglyph [high]: Greek look-alike character (U+03BF) found | MATCH | -- |
| `rf2-multiple-scripts-mixed` | positive (should fire) | TP -- rule-file.homoglyph [high]: Cyrillic look-alike character (U+0430) found; rule-file.homoglyph [high]: Greek look-alike character (U+03BF) found | MATCH | -- |
| `rf2-homoglyph-in-code-fence` | positive (should fire) | TP -- rule-file.homoglyph [high]: Cyrillic look-alike character (U+0430) found | MATCH | -- |
| `rf2-homoglyph-adjacent-attack-text` | positive (should fire) | TP -- rule-file.homoglyph [high]: Cyrillic look-alike character (U+043E) found | MATCH | -- |
| `rf2-homoglyph-in-url` | positive (should fire) | TP -- rule-file.homoglyph [high]: Cyrillic look-alike character (U+0456) found | MATCH | -- |
| `judgment-dd3-deny-removed-had-wildcard` | positive (should fire) | TP -- diff-drift.widened-permissions [warning]: Deny rule 'Bash(*)' removed | MATCH | -- |
| `judgment-dd1-server-re-added-identically` | positive (should fire) | TP -- diff-drift.new-mcp-server [warning]: New MCP server 'cache' added | MATCH | -- |
| `judgment-dd2-args-reorder-with-real-semantics` | positive (should fire) | TP -- diff-drift.swapped-mcp-server [high]: MCP server 'deploy' definition changed (args) | MATCH | -- |
| `judgment-dd4-hook-whitespace-only` | negative (should stay quiet) | FP -- diff-drift.hook-changed [high]: Hook 'PreToolUse' command changed | MATCH | Known/accepted (Session 2): explicitly re-confirms dd4-command-whitespace-only-change with independent fixture. |
| `judgment-dd1-both-schema-keys-present` | positive (should fire) | FN -- (none) | MATCH | Known/accepted (Session 2): nullish coalescing in parseMcpServers means 'servers' is never read once 'mcpServers' exists at all, even empty; documented as a low-realism judgment call. |
| `judgment-rf1-invisible-char-in-security-docs` | positive (should fire) | TP -- rule-file.invisible-unicode [high]: Invisible Unicode character (U+200B) found | MATCH | -- |
| `judgment-dd3-wildcard-added-then-narrowed-same-pr` | positive (should fire) | TP -- diff-drift.widened-permissions [high]: Wildcard permission 'Write(*)' added to allow-list; diff-drift.widened-permissions [warning]: Permission 'Bash(npm test)' added to allow-list | MATCH | -- |
| `judgment-rf2-latin-loanword-in-cyrillic-context` | negative (should stay quiet) | FP -- rule-file.homoglyph [high]: Cyrillic look-alike character (U+041A) found; rule-file.homoglyph [high]: Cyrillic look-alike character (U+043E) found; rule-file.homoglyph [high]: Cyrillic look-alike character (U+0430) found; rule-file.homoglyph [high]: Cyrillic look-alike character (U+0430) found; rule-file.homoglyph [high]: Cyrillic look-alike character (U+0441) found; rule-file.homoglyph [high]: Cyrillic look-alike character (U+043E) found; rule-file.homoglyph [high]: Cyrillic look-alike character (U+0445) found; rule-file.homoglyph [high]: Cyrillic look-alike character (U+0440) found; rule-file.homoglyph [high]: Cyrillic look-alike character (U+0430) found; rule-file.homoglyph [high]: Cyrillic look-alike character (U+0435) found | MATCH | Known/accepted (Session 2): symmetric to near-miss-legit-cyrillic-text; genuine Cyrillic prose trips RF-2 regardless of an embedded Latin loanword. |
| `judgment-dd4-hook-command-becomes-empty-string` | positive (should fire) | TP -- diff-drift.hook-changed [high]: Hook 'PreToolUse' command changed | MATCH | -- |
| `judgment-dd3-permission-entry-case-difference` | positive (should fire) | TP -- diff-drift.widened-permissions [warning]: Permission 'Bash(NPM TEST)' added to allow-list | MATCH | -- |

## Fail-open stress + scale (Session 3) (20 scenarios)

20 scenarios: 14 fail-open cases feeding detectors truncated JSON, wrong JSON types, empty files, trailing commas, null bytes, and non-UTF-8 bytes, confirming architecture.md 2's fail-open principle holds (malformed input never throws, never blocks, always reports nothing) -- plus one large-file case that legitimately fires despite its size. 6 scale cases confirm detectors still fire correctly against large allow-lists, deeply nested hook configs, many MCP servers, a buried invisible character in a long file, and minified single-line JSON, plus one negative control (repeated identical hooks).

| ID | Ground truth | Actual | Verdict | Note |
|---|---|---|---|---|
| `failopen-truncated-json-head` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `failopen-truncated-json-base` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `failopen-wrong-type-array-head` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `failopen-wrong-type-string-head` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `failopen-wrong-type-number-head` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `failopen-wrong-type-null-head` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `failopen-empty-file-head` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `failopen-empty-file-base` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `failopen-trailing-comma-json` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `failopen-deeply-nested-unexpected-structure` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `failopen-null-byte-embedded` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `failopen-non-utf8-bytes` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `failopen-large-file-500kb` | positive (should fire) | TP -- diff-drift.new-mcp-server [warning]: New MCP server 'monitoring-agent' added | MATCH | -- |
| `failopen-both-sides-malformed` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `scale-large-allow-list-20-entries` | positive (should fire) | TP -- diff-drift.widened-permissions [high]: Wildcard permission 'Bash(*)' added to allow-list | MATCH | -- |
| `scale-deeply-nested-hook-config` | positive (should fire) | TP -- diff-drift.hook-changed [high]: Hook 'PostToolUse' command changed | MATCH | -- |
| `scale-long-file-buried-invisible-char` | positive (should fire) | TP -- rule-file.invisible-unicode [high]: Invisible Unicode character (U+200B) found | MATCH | -- |
| `scale-many-mcp-servers` | positive (should fire) | TP -- diff-drift.new-mcp-server [warning]: New MCP server 'monitoring-agent' added | MATCH | -- |
| `scale-repeated-identical-hooks` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `scale-minified-single-line-json` | positive (should fire) | TP -- diff-drift.new-mcp-server [warning]: New MCP server 'monitoring' added | MATCH | -- |

## Encoding/near-miss + multi-detector collision (Session 4) (21 scenarios)

21 scenarios (the task specified 20; one was split into two fixture IDs since this corpus is one file-pair per scenario). 14 exercise RF-1/RF-2 against unusual encodings -- UTF-16 BOMs, NFC/NFD normalization, and eight code points from scripts/blocks entirely outside RF-1/RF-2's coverage (fullwidth Latin, mathematical alphanumeric, Armenian, Cherokee, combining diacriticals, RLM, soft hyphen, Unicode tags), most DELIBERATELY constructed to miss, documenting known gaps rather than bugs. 7 exercise multiple detectors or multiple servers colliding within one file or PR, confirming detectors fire independently without suppressing each other.

| ID | Ground truth | Actual | Verdict | Note |
|---|---|---|---|---|
| `encoding-utf16-bom-le` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `encoding-utf16-bom-be` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `encoding-bom-not-at-start` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `encoding-mixed-crlf-lf` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `encoding-nfc-vs-nfd-homoglyph` | positive (should fire) | TP -- rule-file.homoglyph [high]: Greek look-alike character (U+03BF) found | MATCH | -- |
| `encoding-fullwidth-latin-homoglyph` | positive (should fire) | FN -- (none) | MATCH | Known/accepted (Session 4): FN-expected known gap, Halfwidth/Fullwidth Forms block outside RF-2's table. |
| `encoding-mathematical-alphanumeric-symbol` | positive (should fire) | FN -- (none) | MATCH | Known/accepted (Session 4): FN-expected known gap, astral-plane block outside the confusable table. |
| `encoding-zwsp-in-diffdrift-file` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `encoding-armenian-homoglyph` | positive (should fire) | FN -- (none) | MATCH | Known/accepted (Session 4): FN-expected known gap, Armenian block outside RF-2's table. |
| `encoding-cherokee-homoglyph` | positive (should fire) | FN -- (none) | MATCH | Known/accepted (Session 4): FN-expected known gap, Cherokee block outside RF-2's table. |
| `encoding-combining-diacritical-invisible` | positive (should fire) | FN -- (none) | MATCH | Known/accepted (Session 4): FN-expected known gap, Combining Diacritical Marks block outside RF-1's ranges. |
| `encoding-rlm-standalone` | positive (should fire) | FN -- (none) | MATCH | Known/accepted (Session 4): documents actual behavior, U+200F sits just outside RF-1's covered ranges. |
| `encoding-soft-hyphen` | positive (should fire) | FN -- (none) | MATCH | Known/accepted (Session 4): FN-expected known gap, Latin-1 Supplement block outside RF-1's ranges. |
| `encoding-unicode-tag-characters` | positive (should fire) | FN -- (none) | MATCH | Known/accepted (Session 4): FN-expected known gap, astral-plane Tags block outside RF-1's ranges. |
| `multi-new-and-modified-server` | positive (should fire) | TP -- diff-drift.swapped-mcp-server [high]: MCP server 'filesystem' definition changed (command, args); diff-drift.new-mcp-server [warning]: New MCP server 'browser' added | MATCH | -- |
| `multi-wildcard-and-hook` | positive (should fire) | TP -- diff-drift.widened-permissions [high]: Wildcard permission 'Bash(*)' added to allow-list; diff-drift.hook-changed [high]: New hook 'PostToolUse' added | MATCH | -- |
| `multi-deny-removed-and-allow-added` | positive (should fire) | TP -- diff-drift.widened-permissions [warning]: Permission 'Write(/tmp)' added to allow-list; diff-drift.widened-permissions [warning]: Deny rule 'Bash(rm)' removed | MATCH | -- |
| `multi-rf1-and-rf2-same-file` | positive (should fire) | TP -- rule-file.invisible-unicode [high]: Invisible Unicode character (U+200B) found; rule-file.homoglyph [high]: Cyrillic look-alike character (U+0430) found | MATCH | -- |
| `multi-three-servers-mixed-changes` | positive (should fire) | TP -- diff-drift.swapped-mcp-server [high]: MCP server 'git' definition changed (command, args); diff-drift.new-mcp-server [warning]: New MCP server 'browser' added | MATCH | -- |
| `multi-all-four-diffdrift-one-pr-mcp` | positive (should fire) | TP -- diff-drift.swapped-mcp-server [high]: MCP server 'filesystem' definition changed (command, args); diff-drift.new-mcp-server [warning]: New MCP server 'browser' added | MATCH | -- |
| `multi-all-four-diffdrift-one-pr-settings` | positive (should fire) | TP -- diff-drift.widened-permissions [high]: Wildcard permission 'Bash(*)' added to allow-list; diff-drift.hook-changed [high]: New hook 'SessionStart' added | MATCH | -- |

## Benign + adversarial evasion (Session 5) (21 scenarios)

21 scenarios (again one task item split into two fixture IDs, for the same one-file-pair-per-scenario reason). 10 "benign" scenarios confirm genuinely harmless changes stay quiet, EXCEPT where the task explicitly calls for firing to be correct behavior even on a harmless change (a routine version bump, a real lint hook, a whitespace-equivalent hook rewrite) -- precision over recall does not mean suppressing findings that legitimately match a trigger condition. 10 adversarial scenarios probe evasion attempts against detector mechanics specifically (key renames masking a swap, bare non-wildcard broad grants, cross-file payload splitting, homoglyphs placed where DD-4 never looks), several DELIBERATELY succeeding at evading detection to document structural, accepted limitations grounded in architecture.md 9's non-goals and the stateless-in-v1 principle.

| ID | Ground truth | Actual | Verdict | Note |
|---|---|---|---|---|
| `benign-version-bump-in-args` | positive (should fire) | TP -- diff-drift.swapped-mcp-server [high]: MCP server 'git' definition changed (args) | MATCH | -- |
| `benign-new-unrelated-toplevel-key` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `benign-hook-added-for-linting` | positive (should fire) | TP -- diff-drift.hook-changed [high]: New hook 'PostToolUse' added | MATCH | -- |
| `benign-multiple-permissions-narrowed` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `benign-claude-md-typo-fix` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `benign-cursor-rules-new-clean-file` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `benign-copilot-instructions-formatting-only` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `benign-comment-like-key-added` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `benign-settings-unrelated-section-added` | negative (should stay quiet) | TN -- (none) | MATCH | -- |
| `benign-hooks-reorganized-same-behavior` | positive (should fire) | TP -- diff-drift.hook-changed [high]: Hook 'PreToolUse' command changed | MATCH | -- |
| `adversarial-cross-file-attack-split` | positive (should fire) | TP -- diff-drift.hook-changed [high]: New hook 'PostToolUse' added | MATCH | -- |
| `adversarial-rename-masks-swap` | positive (should fire) | TP -- diff-drift.new-mcp-server [warning]: New MCP server 'new-fs' added | MATCH | -- |
| `adversarial-broad-non-wildcard-pattern` | positive (should fire) | TP -- diff-drift.widened-permissions [warning]: Permission 'Bash' added to allow-list | MATCH | -- |
| `adversarial-homoglyph-plus-invisible-combo` | positive (should fire) | TP -- rule-file.invisible-unicode [high]: Invisible Unicode character (U+200B) found; rule-file.homoglyph [high]: Cyrillic look-alike character (U+0430) found | MATCH | -- |
| `adversarial-split-command-across-args` | positive (should fire) | TP -- diff-drift.swapped-mcp-server [high]: MCP server 'git' definition changed (args) | MATCH | -- |
| `adversarial-benign-name-malicious-command` | positive (should fire) | TP -- diff-drift.new-mcp-server [warning]: New MCP server 'linter' added | MATCH | -- |
| `adversarial-gradual-drift-two-prs-pr1` | positive (should fire) | TP -- diff-drift.widened-permissions [warning]: Permission 'Bash(git diff)' added to allow-list | MATCH | -- |
| `adversarial-gradual-drift-two-prs-pr2` | positive (should fire) | TP -- diff-drift.widened-permissions [warning]: Permission 'Bash(git *)' added to allow-list | MATCH | -- |
| `adversarial-homoglyph-in-hook-key-not-command` | positive (should fire) | FN -- (none) | MATCH | Known/accepted (Session 5): FN by design, DD-4 only ever reads the 'command' field, never 'matcher'; RF-1/RF-2 never run on .claude/settings.json at all. |
| `adversarial-encoded-payload-in-args` | positive (should fire) | TP -- diff-drift.swapped-mcp-server [high]: MCP server 'filesystem' definition changed (args) | MATCH | -- |
| `adversarial-mimics-approved-pattern` | positive (should fire) | TP -- diff-drift.new-mcp-server [warning]: New MCP server 'filesystem-v2' added | MATCH | -- |
