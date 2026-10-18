# Budgeted endpoint deployment

Prepare a separate creator-controlled deployment rather than expanding public discovery use. This document describes configuration, not an executed deployment.

## Server-only settings

| Variable | Value / purpose |
|---|---|
| AGENTSEARCH_MCP_ACCESS_MODE | budgeted |
| AGENTSEARCH_MCP_CALLER_TOKEN | Random caller bearer token, at least 32 characters; store in client secure headers |
| AGENTSEARCH_MCP_REDIS_URL | Operator-approved HTTPS Redis REST origin; no URL credentials or query |
| AGENTSEARCH_MCP_REDIS_TOKEN | Server-only quota-store credential |
| AGENTSEARCH_MCP_BUDGET_ID | Stable namespace shared by every deployment/replica serving this allowance |
| AGENTSEARCH_MCP_TOTAL_CALLS | Fixed lifetime tool-attempt cap, integer 1..100000; choose only after cost review |
| AGENTSEARCH_MCP_ALLOWED_ORIGINS | Optional exact comma-separated browser origins; absent means deny Origin-bearing requests |
| AGENTSEARCH_MCP_PROXY_SECRET | Existing server-only upstream credential |
| AGENTSEARCH_MCP_API_BASE_URL | Approved upstream HTTPS origin |

Explicitly seed Redis key agentsearch:budget:BUDGET_ID to integer 0 using SET NX, without expiration. Do this once through the operator's secure administration channel, not through the skill or public MCP tools. Do not reset the key during deploys, rotate namespaces automatically, add TTL, or silently reseed after data loss. Missing, invalid, or expiring counters are refused. Prevent untrusted mutation of quota keys and use durable storage. Restoring an older backup can restore quota; reconciling or closing the allowance is an operator responsibility.

Each authorized tools/call reserves one unit before upstream. Failed/invalid calls consume reservations conservatively. Exhaustion returns HTTP 429; quota-store failure returns 503; wrong bearer returns 401. Handshake and discovery do not consume upstream quota. There are no automatic retries or quota renewals in the gate.

The token is a service access credential, not the upstream proxy secret. The same token shared across buyers creates a common allowance; use separate deployments/credentials or a reviewed per-caller design if individual entitlements are needed. No buyer isolation/billing system is included.

## Release verification

Run npm ci --ignore-scripts and npm test. Those tests use in-process fake Redis REST responses; they are not live Redis certification. Before enabling actual paid access, use a nonproduction upstream fixture and a real approved quota store to verify concurrent requests share the cap, missing/TTL counters fail closed, Redis outages never reach upstream, and a cold restart does not reset usage. Confirm discovery mode is not the selected marketplace deployment.

Then verify all three tools through the actual agent client and platform creator preview, with a small explicitly approved allowance. Record provider prices and possible upstream retries/fallback, hosting and Redis charges, actual usage receipts, and an operator-selected financial cap. Fix upstream DNS/redirect SSRF handling first. No secrets should enter a ZIP, commit, prompt, or listing.
