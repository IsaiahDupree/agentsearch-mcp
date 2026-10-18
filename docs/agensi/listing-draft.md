# AgentSearch Implementation Brief

Draft only. Price, payout, service access, and commercial terms are not approved.

## Short description

Turn API and migration research into a source-backed implementation decision, with version conflicts, acceptance tests, and a finite research budget.

## Description

Before changing an integration, have your agent check the relevant official sources and separate what is verified from what still needs testing.

AgentSearch Implementation Brief guides an AgentSearch-connected agent through source discovery, optional term disambiguation, documentation extraction, counterevidence, and a practical developer handoff. You receive a proceed, conditional, or blocked recommendation; a claim-to-source evidence table; an ordered implementation plan; proposed acceptance tests; gaps; and a usage receipt.

The workflow limits each task to eight tool-call attempts, including failures. It flags version mismatches, stale or truncated extracts, and missing evidence rather than filling gaps with invented findings. These workflow limits supplement a separately enforced service quota.

Requires an agent with AgentSearch-compatible web_search, instant_answer, and fetch_url tools and operator-approved capped access. Hosted service, model usage, API credits, repository edits, deployed code, and executed acceptance tests are not included. Do not use the uncapped public discovery endpoint as included marketplace service. Service/model charges are separate and must be verified with their operators.

Includes original workflow instructions, evidence and connection references, examples, a brief template, and an optional local JSON handoff validator. Core instructions can run without the validator. Agensi's agent-native resource preview must be verified before claiming support there.

## Suggested metadata

- Category: APIs & Backend; secondary Research & Analysis, if supported.
- Tags: api-research, migration, mcp, developer-workflow, evidence.
- Version: 0.1.0.
- Author: Isaiah Dupree.
- Pricing proposal: $19 one-time, workflow only; unapproved.
- Compatibility: tested through Node HTTP/MCP diagnostics and local workflow evaluation; Claude Code, Cursor, Copilot, and Agensi runtime compatibility are not yet certified.
- Network disclosure: configured AgentSearch operator, upstream search provider, DuckDuckGo, and official page hosts; public queries/URLs only.

## Sample request

“Research the transport requirements for my explicitly version-pinned MCP client. Give me the verified constraints, an implementation plan, unexecuted acceptance tests, and anything we still need to confirm.”

## Sample output shape

Conditional decision with official-source evidence, explicit protocol version, documented extraction limit, proposed implementation/test steps, three attempted research calls, and monetary charges marked unavailable without billing receipts.

No revenue, time-saving percentage, exhaustive search coverage, successful migration, unlimited usage, or platform-approval claim is made.
