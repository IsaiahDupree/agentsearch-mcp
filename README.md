# AgentSearch MCP

A stateless streamable-HTTP MCP adapter for the existing AgentSearch API. It retains the `web_search`, `instant_answer`, and `fetch_url` tool names and input/output contracts. The adapter does not start a scheduler; a call can cause the API to use network services, including paid search providers.

## Spending and access defaults

- Every MCP POST requires a bearer token in `AGENTSEARCH_MCP_CLIENT_TOKEN`. It must be at least 32 bytes. With no valid server token the endpoint returns 503; missing or incorrect caller tokens return 401. Health is an unauthenticated liveness/configuration endpoint and does not call the upstream.
- No tools may execute by default. `AGENTSEARCH_MCP_ALLOWED_TOOLS` is a comma-separated list of the exact enabled tool names. Tool discovery remains available to authenticated clients; disabled calls return an MCP error without contacting the API.
- `AGENTSEARCH_MCP_API_BASE_URL` must be configured. Only `http://127.0.0.1`, `http://localhost`, or `http://[::1]` (with an optional port), or HTTPS equivalents, are accepted by default. Remote upstreams require HTTPS and `AGENTSEARCH_MCP_ALLOW_REMOTE_UPSTREAM=1`. Redirects are refused. No cloud workload is authorized merely by these switches; enable a remote endpoint or tool only for the owner's explicitly authorized workload and expense.
- `AGENTSEARCH_MCP_PROXY_SECRET` is forwarded only to the configured upstream as the upstream API's RapidAPI proxy header. The MCP caller token and this upstream credential are different secrets. Never put either in source control or logs.
- The local development server binds to `127.0.0.1`. The existing in-memory rate limit remains best-effort per instance and is not a billing cap or a substitute for authentication.

A local upstream is not automatically free: AgentSearch API can call Brave or Serper for `web_search`, and its `instant_answer` may fall back to those providers. Its own provider credentials and all downstream actions must be governed separately. This connector's configuration cannot limit direct API clients or guarantee a dollar cap. Existing public clients will need a token after this change; hosted deployment and its compatibility are not yet verified.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `AGENTSEARCH_MCP_CLIENT_TOKEN` | unset | Owner-provisioned bearer, at least 32 bytes |
| `AGENTSEARCH_MCP_API_BASE_URL` | unset | Explicit AgentSearch API origin; loopback by default |
| `AGENTSEARCH_MCP_ALLOWED_TOOLS` | unset | Comma-separated enabled tool names |
| `AGENTSEARCH_MCP_ALLOW_REMOTE_UPSTREAM` | unset | `1` permits an HTTPS non-loopback upstream after separate authorization |
| `AGENTSEARCH_MCP_PROXY_SECRET` | unset | Separate upstream proxy credential |
| `AGENTSEARCH_MCP_RATE_LIMIT` | `30` | Best-effort tool calls per IP per hour per instance |
| `PORT` | `3900` | Local loopback listener port |

Use a securely generated secret through the local environment or secret manager, never as a command-line argument. The live-lookup smoke test requires the token and `SMOKE_ALLOW_REAL_LOOKUP=1`; it makes a real upstream request and must only be run for an explicitly authorized workload. Run `AGENTSEARCH_API_ROOT=/path/to/agentsearch-api npm run check:local` to start the actual local API with provider keys absent and verify its provider-unavailable response without a remote lookup. The test uses random temporary credentials and stops its child processes.
