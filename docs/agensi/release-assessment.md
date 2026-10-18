# Agensi release assessment — 2026-10-18

Status: prepared; NOT submitted, approved, published, or commercially enabled.

## Proposed asset

AgentSearch Implementation Brief, v0.1.0: an original workflow for API integration and migration decisions. It uses the existing three tools to produce a version-aware evidence ledger, a conditional/proceed/blocked decision, ordered implementation steps, proposed acceptance tests, and a usage receipt. Its differentiation is claim traceability, counterevidence, version conflict handling, and bounded research; it does not resell the MCP adapter source.

The original skill is maintained in the creator's private Skills workspace. Keep its ZIP and full source out of this public repository while pricing and distribution rights are undecided. No upstream server source, third-party documentation corpus, provider keys, or server secrets belongs in the marketplace ZIP.

## Repository and live state

- Inspected MCP base: c585fcf336bd0aa7f90e05081a13620c3402e9d4, master. No open PRs or Actions runs were present before this work.
- README, server.json, three tool schemas, proxy-secret forwarding, and soft per-IP limiter agree. The original root had no SKILL.md or LICENSE; package.json is private and has no licence field.
- GET /health returned 200 with service agentsearch-mcp. Initialize, tools/list, and one call to each tool succeeded on October 18. Search reported Brave; instant answer and extraction returned usable content. Extraction hit its requested 6000-character limit.
- These were bounded diagnostics, not proof of all-agent compatibility, absence of vulnerabilities, or billing correctness. Live responses do not identify the deployed git SHA. No successful source deployment is implied.
- Upstream AgentSearch API README describes proprietary/TBD licensing. Its source now includes search-domain controls that the MCP schema does not expose. Do not invent MCP arguments for those controls.

## Security and spending

The existing public deployment is deliberately unauthenticated. Its in-memory per-IP limit resets across cold starts and is not an aggregate or financial cap. Skill instructions alone cannot enforce seller spending limits.

This proposed server change adds an optional budgeted mode: caller bearer authentication, an atomic shared lifetime call allowance, no automatic renewal, fail-closed quota-store errors, and browser-Origin restrictions. JSON-RPC batches are rejected before SDK dispatch so they cannot bypass the call gates. Quota counters must be explicitly provisioned without expiry; missing or expiring counters are refused. Wrong credentials never touch the quota store. The proxy secret remains server-side. Outbound proxy requests reject redirects, bound response bytes, retain the timeout through body reads, and suppress upstream error bodies.

Existing discovery behavior stays the default. Therefore this PR is NOT sufficient to make the current public endpoint eligible for marketplace traffic. A separate deployment must be configured and verified in budgeted mode. No database, Redis account, subscription, quota renewal, or provider purchase has been created.

Inspected upstream src/fetch.js rejects literal local/private hostnames, but src/http.js follows redirects and src/fetch.js does not validate resolved DNS addresses. This is an SSRF hardening gap, not evidence of exploitation. Fix DNS resolution/pinning and each redirect target in the upstream before approving it for broader marketplace use. Do not conduct live private-network probes. Public docs-only skill instructions are an additional boundary, not a repair.

Upstream HTTP can retry up to twice; instant-answer fallback can add a search request. Therefore one MCP call is not necessarily one provider transaction. The quota limits tool attempts, not a dollar total. Confirm provider prices, retry/fallback behavior, and provider-side account caps before enabling a nonzero production allowance.

## Marketplace requirements and rights

Agensi requires an original ZIP with valid SKILL.md and reviews uploaded files. The seller page describes automated, AI, and human review. Paid publication requires an enabled payout method; none was verified. Submission redirected to sign-in. No account was created and no terms were accepted.

The current terms describe a 70% creator share of the net sale price excluding taxes, with a 30% platform fee and reversals for refunded sales. They also contain buyer-usage restrictions, a distribution licence, self-billing, and payout obligations. Obtain the creator's approval before accepting them. No open-source licence was added to either server repository.

The package is newly authored workflow material, with rights reserved pending commercial approval. Public availability of related server source is not itself a licence to redistribute it. This assessment does not certify every historical source contribution or third-party provider resale right.

Sources checked October 18:

- https://www.agensi.io/sell
- https://www.agensi.io/terms
- https://www.agensi.io/learn/skill-md-format-reference
- https://www.agensi.io/dashboard/submit — redirected to sign-in
- https://github.com/IsaiahDupree/agentsearch-mcp
- https://github.com/IsaiahDupree/agentsearch-api

## Costs and claims

Three live tools/call attempts were made, one per interface. No new paid infrastructure or marketplace purchase was initiated. Actual attributable API/Vercel/provider charges were not available; do not report them as zero. Agensi advertises no listing fee. No marketplace traffic, conversions, demand, revenue, or guarantee has been established. The invitation's audience claim remains unverified.

## Publication gates

1. Approve price/free model, original-asset commercial terms, and whether any hosted usage is included. Suggested review option: $19 one-time for the workflow only, with separately configured capped tool access; this is not an approved price or demand forecast.
2. Fix upstream DNS/redirect SSRF protection; configure and verify an authenticated, capped service. Verify real Redis atomic reservations and fail-closed behavior, not only mock tests.
3. Verify supporting resources are accessible in Agensi's agent-native delivery. Core skill does not require scripts, but reference/template delivery still needs an actual creator preview test.
4. Sign in to the creator account; verify seller identity and enabled payout/KYC for paid publication. User completes sensitive financial onboarding.
5. Upload the exact reviewed ZIP, inspect platform scan/preview, approve final terms where required, submit for review, and record the resulting listing ID/status. No platform security score exists yet.
