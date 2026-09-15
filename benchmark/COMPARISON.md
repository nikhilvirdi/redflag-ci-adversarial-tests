# RedFlag CI v1 vs. mcp-scan: A Live-Run Comparison

## Methodology, stated explicitly

This is a **live run**, not a documentation-only comparison, with one honest exception noted throughout: the compared tool's actual security *verdicts* require a Snyk cloud account I don't have and did not create. Everything short of that -- installation, invocation, and observing exactly how the tool handles all 18 real corpus files -- was actually executed in this sandbox, not simulated or guessed at. No results below are fabricated; where the tool produced no opinion, that is reported as "no opinion," not papered over with an assumed verdict.

## Tool chosen, and why

COMPETITIVE_LANDSCAPE.md names two candidates: **AgentShield** (a February 2026 hackathon project shipping as CLI/GitHub Action/GitHub App) and **mcp-scan** (Invariant Labs, described as "close to a category standard" for MCP tool-poisoning detection). Both turned out to be genuinely installable here -- I verified an npm package matching AgentShield's hackathon description exists (`ecc-agentshield`, keywords `claude-code, security, ai-agent, mcp, hackathon, opus, anthropic, scanner, audit`, repo `github.com/affaan-m/agentshield`) before deciding not to use it, rather than assuming it away.

**I picked mcp-scan**, for two reasons: it's the tool COMPETITIVE_LANDSCAPE.md itself frames as the more established, broadly-recognized reference point in this space, and running one comparison thoroughly and honestly is worth more than a shallow pass at two. This is a deliberate choice between two real options, not a fallback because the alternative wasn't viable.

## What "mcp-scan" turned out to actually be

`pip install mcp-scan` installs version 0.4.3, which is **a redirect package**: PyPI states plainly that "This package has been renamed to snyk-agent-scan. This is a redirect package that installs snyk-agent-scan and forwards the mcp-scan CLI to it." So the live run below is against **Snyk Agent Scan v0.5.16**, the current identity of the tool COMPETITIVE_LANDSCAPE.md calls "mcp-scan." This is itself a real, current fact about the competitive landscape worth recording: Invariant Labs' standalone tool has been absorbed into Snyk's product line, which also independently confirms COMPETITIVE_LANDSCAPE.md's separate mention of "Snyk ships its own open-source agent/skill scanner" -- as of this comparison, that scanner and "mcp-scan" are the same codebase.

## A safety decision made before running anything

Snyk Agent Scan's own README states plainly: "Scanning MCP configurations will execute the commands defined in them," and recommends running against untrusted configs only inside a sandbox, with the interactive consent prompt reviewed carefully. Two of this corpus's `.mcp.json` fixtures deliberately reference **fabricated package names** built for the DD-1/DD-2 test scenarios: `@some-org/mcp-browser-automation` and `@modelcontextprotocol/server-filesystem-v2-totally-legit`. Neither is a real package I control or have verified is unclaimed on the npm registry -- and per the same supply-chain logic RedFlag CI itself exists to guard against, blindly executing an arbitrary, unverified package name via `npx` is a real risk, not a theoretical one.

**Decision: `--dangerously-run-mcp-servers` was never used, for any scenario, including the ones with only genuine, official `@modelcontextprotocol/*` packages.** This means the tool never actually launched any MCP server subprocess during this comparison. As shown below, this turned out not to matter for the outcome -- the tool's own CLI reports that reaching an actual verdict requires a `SNYK_TOKEN` regardless, which was not created for this task (creating a real third-party account is the same category of out-of-scope action as registering a real GitHub App).

## Live run: exhaustive result across all 18 corpus scenarios

Every scenario's `after` file was run through `snyk-agent-scan inspect <file> --no-bootstrap --print-errors --json`, with stdin explicitly closed so the interactive consent prompt could not be answered (matching how this tool would actually behave invoked headlessly in a CI pipeline, RedFlag CI's own deployment context). Full raw JSON output was captured and is summarized here, not paraphrased from memory.

| Scenario | File type | RedFlag CI verdict | Snyk Agent Scan result |
|---|---|---|---|
| `dd1-new-server` | `.mcp.json` | TP (DD-1 fires) | 2 servers found, both `user_declined` -- no verdict |
| `dd2-command-swap` | `.mcp.json` | TP (DD-2 fires) | 1 server found, `user_declined` -- no verdict |
| `benign-mcp-reorder` | `.mcp.json` | TN | 2 servers found, both `user_declined` -- no verdict |
| `near-miss-args-reorder` | `.mcp.json` | FP (documented) | 1 server found, `user_declined` -- no verdict |
| `near-miss-mcp-server-rename` | `.mcp.json` | FP (documented) | 1 server found, `user_declined` -- no verdict |
| `dd3-wildcard-added` | `.claude/settings.json` | TP (DD-3 fires) | `no mcp servers or skills found` -- schema doesn't cover permissions |
| `dd3-plain-allow-added` | `.claude/settings.json` | TP (DD-3 fires) | `no mcp servers or skills found` |
| `dd4-hook-added` | `.claude/settings.json` | TP (DD-4 fires) | `no mcp servers or skills found` -- schema doesn't cover hooks |
| `dd4-hook-command-changed` | `.claude/settings.json` | TP (DD-4 fires) | `no mcp servers or skills found` |
| `near-miss-hook-removed` | `.claude/settings.json` | TN | `no mcp servers or skills found` |
| `benign-permissions-narrowing` | `.claude/settings.json` | TN | `no mcp servers or skills found` |
| `rf1-zero-width-space` | `CLAUDE.md` | TP (RF-1 fires) | parse error (`X005`): not a JSON/JSON5 file, treated as not applicable |
| `rf2-cyrillic-homoglyph` | `.cursor/rules/*.md` | TP (RF-2 fires) | parse error: not applicable |
| `benign-claude-md-doc-addition` | `CLAUDE.md` | TN | parse error: not applicable |
| `benign-copilot-instructions-edit` | `.github/copilot-instructions.md` | TN | parse error: not applicable |
| `near-miss-bom` | `CLAUDE.md` | TN | parse error: not applicable |
| `near-miss-legit-cyrillic-text` | `CLAUDE.md` | FP (documented) | parse error: not applicable |
| `known-gap-uncommon-homoglyph` | `.cursor/rules/*.md` | FN (documented) | parse error: not applicable |

## Metrics: precision and recall are not computable from this run, and that itself is the finding

RedFlag CI's Task 7.1 benchmark against this exact corpus produced 8 TP, 3 FP, 6 TN, 1 FN (precision 0.727, recall 0.889; see `RESULTS.md`). Snyk Agent Scan, run the same way against the same 18 files, produced:

- **0 true positives, 0 false positives, 0 true negatives, 0 false negatives.**
- **18 of 18 scenarios: no security opinion rendered.**

This is not "the tool performed worse" in the sense of a bad precision/recall number -- it's that the tool never got to the point of rendering a classifiable verdict on a single one of the 18 scenarios, under the exact conditions RedFlag CI itself runs in (headless, no human present to click a consent prompt, no pre-provisioned third-party account). Reporting a precision or recall figure here would imply a comparison that didn't actually happen; the honest statement is that this run produced no comparable data, for three distinct, verifiable reasons below.

## Why this happened, broken down by root cause

**7 of 18 (all RF-1/RF-2 rule-file scenarios): out of scope by file format, not by detection logic.** Snyk Agent Scan expects an MCP JSON/JSON5 config file as input. Every `CLAUDE.md`, `.cursor/rules/*.md`, and `copilot-instructions.md` fixture failed to parse (`pyjson5.Json5IllegalCharacter`) and was reported as "could not parse file... no mcp servers or skills found." This confirms, empirically rather than just by reading its docs, that rule-file injection is not a format the tool has any way to reason about -- it isn't that it looked and found nothing, it structurally cannot look.

**6 of 18 (all `.claude/settings.json` permissions/hooks scenarios): parses successfully, but the schema doesn't include these fields.** These files ARE valid JSON the tool can read, and it says so, but its config model only extracts an `mcpServers` (and skills) section. Permission allow/deny lists and hooks -- DD-3 and DD-4's entire domain, including the CVE-2025-59536 hook-injection pattern -- are outside its data model entirely. Every one of these six came back "no mcp servers or skills found," identical to the rule-file case, despite being a completely different, well-formed, in-scope-for-MCP-tooling file.

**5 of 18 (all `.mcp.json` scenarios): correctly recognized, but blocked on execution consent and cloud authentication.** This is the one category actually inside the tool's intended scope, and it worked as far as it could: it read the config, listed every `mcpServers` entry by name and command. Then it stopped. Its detection model requires launching each stdio server as a real subprocess to inspect live tool descriptions (the prompt-injection surface it's built to catch) -- exactly the behavior its README warns to sandbox. With that consent declined (a decision made here for real safety reasons, not tool avoidance), every server came back `user_declined`, and the CLI's own message on completion was explicit: "To use Agent Scan, set the SNYK_TOKEN environment variable." No token, no verdict, regardless of consent.

## Honest assessment: where RedFlag CI's approach actually differs

COMPETITIVE_LANDSCAPE.md makes four claims about what separates RedFlag CI from existing tools. This live run gives direct, first-hand evidence for three of them, not just documentation to cite:

1. **Diff-aware vs. single-shot.** Snyk Agent Scan's `CONFIG_FILE` argument takes one file, one point in time. There is no base/head comparison anywhere in its CLI surface -- confirmed by reading its full `scan --help` and `inspect --help` output, neither of which has a second-file or diff argument. A silent MCPoison-style command swap on an already-trusted server (RedFlag CI's DD-2, the actual CVE-2025-54136 pattern) is invisible to a tool that only ever looks at the current state: it would see a normal, well-formed `mcpServers` entry and, consent or token permitting, evaluate that one entry -- it has no concept of "this used to say something else."
2. **Rule-file injection as a first-class detector pair vs. not represented at all.** This wasn't a close call or a matter of degree: 7 of 7 rule-file fixtures produced a parse error, because the tool's data model doesn't have a slot for this file type. RF-1 and RF-2 aren't an area where Snyk Agent Scan is weaker; it's an area it doesn't operate in.
3. **Deterministic, local, zero-config vs. a cloud-verification dependency.** COMPETITIVE_LANDSCAPE.md's claim that "LLM-based scanners... leave the local machine" is here confirmed directly rather than by citation: this tool's own CLI, unprompted, told this session to go create a Snyk account and API token to get a verdict, and separately builds a JSON payload of scanned server configs addressed to `api.snyk.io` as a normal part of its flow. RedFlag CI's six detectors need no equivalent step; the corresponding `RESULTS.md` numbers were produced with zero network calls and zero credentials.
4. **Built for the PR author, not requiring a security team's tooling investment.** Getting Snyk Agent Scan to a real verdict requires, at minimum, a Snyk account, an API token wired into CI secrets, and -- for the two `.mcp.json`-scoped detectors to mean anything -- a decision about whether to grant a CI job permission to execute every MCP server referenced in a config it's scanning. That is a materially heavier adoption bar than RedFlag CI's stated zero-config install-and-it-works design.

The one claim not newly confirmed here is DD-3/DD-4's specific coverage of permissions and hooks -- COMPETITIVE_LANDSCAPE.md doesn't claim mcp-scan should cover these (it names AgentShield, not mcp-scan, as the tool already scanning `.claude/` configuration and hooks). This run shows Snyk Agent Scan's `mcpServers`-only schema doesn't reach permissions or hooks at all, which is consistent with, not contradictory to, the competitive research already on record.

## What this comparison does not show

This is an 18-scenario synthetic corpus and a single tool, evaluated once, in one specific (headless, no-token) configuration. It does not show that Snyk Agent Scan is a bad tool -- its actual target (prompt injection hidden in a live MCP server's tool descriptions, discoverable only by running the server) is a real problem RedFlag CI does not attempt at all, and if it were run by someone with a Snyk token in an environment where executing the referenced servers is acceptable, it would very plausibly catch real issues neither RedFlag CI nor this comparison can speak to. The fair conclusion is narrower and matches what was actually observed: on this specific corpus, run the way RedFlag CI itself runs (headless, no account, no server execution), Snyk Agent Scan and RedFlag CI are not competing for the same PRs -- their coverage barely overlaps.

## Reproduction

```bash
cd backend
python -m venv .mcp-scan-venv && source .mcp-scan-venv/Scripts/activate  # isolate from global site-packages
pip install mcp-scan   # installs snyk-agent-scan 0.5.16 and forwards the mcp-scan CLI to it
snyk-agent-scan inspect benchmark/corpus/<scenario-id>/after.<ext> --no-bootstrap --print-errors --json < /dev/null
deactivate && rm -rf .mcp-scan-venv   # clean up when done
```

Run against every scenario directory under `benchmark/corpus/` for the full 18-file picture in the table above. `--dangerously-run-mcp-servers` and `SNYK_TOKEN` were deliberately not used or created; see "A safety decision made before running anything" above for why.

**Environment note**: this comparison's own install was done into the global Python environment, not a venv, and pulled in `starlette` 1.4.1 as a transitive dependency of `snyk-agent-scan`. That environment already had an unrelated, pre-existing version conflict between two other installed packages (`fastapi` 0.111.0, which needs `starlette<0.38.0`, and `sse-starlette` 3.4.8, which needs `starlette>=0.49.1` -- no single version satisfies both). Installing and later uninstalling `mcp-scan` surfaced this but did not create it. `mcp-scan`/`snyk-agent-scan` were uninstalled after this comparison; `starlette` was left at 1.4.1 rather than guessed back to an unknown prior version, since no choice here fully resolves a conflict between two unrelated pre-existing packages. The venv approach above avoids this class of problem entirely and is what should be used for any future one-off tool installs like this one.
