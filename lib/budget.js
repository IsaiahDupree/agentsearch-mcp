// Optional, fail-closed marketplace perimeter. Discovery mode preserves legacy
// behavior; NEVER distribute that public endpoint as included marketplace usage.
import { timingSafeEqual } from 'node:crypto';

const RESERVE = `local raw=redis.call('GET',KEYS[1]);
if not raw or redis.call('TTL',KEYS[1])~=-1 then return -1 end;
local n=tonumber(raw);
if not n or n<0 or n~=math.floor(n) then return -1 end;
if n>=tonumber(ARGV[1]) then return 0 end;
redis.call('INCR',KEYS[1]); return 1`;

function equal(a, b) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function authorizeBudget(req, { env = process.env, request = fetch } = {}) {
  const mode = env.AGENTSEARCH_MCP_ACCESS_MODE || 'discovery';
  if (mode === 'discovery') return { allowed: true };
  const denied = (code, status) => ({ allowed: false, code, status });
  if (mode !== 'budgeted') return denied('budget_unconfigured', 503);
  const token = env.AGENTSEARCH_MCP_CALLER_TOKEN || '';
  const cap = Number(env.AGENTSEARCH_MCP_TOTAL_CALLS);
  const namespace = env.AGENTSEARCH_MCP_BUDGET_ID || '';
  let redis;
  try { redis = new URL(env.AGENTSEARCH_MCP_REDIS_URL); } catch { return denied('budget_unconfigured', 503); }
  if (token.length < 32 || !Number.isSafeInteger(cap) || cap < 1 || cap > 100000 ||
      !/^[a-zA-Z0-9_-]{1,80}$/.test(namespace) || !env.AGENTSEARCH_MCP_REDIS_TOKEN ||
      redis.protocol !== 'https:' || redis.username || redis.password || redis.search || redis.hash ||
      (redis.pathname !== '/' && redis.pathname !== '')) return denied('budget_unconfigured', 503);
  const auth = req.headers?.authorization;
  if (typeof auth !== 'string' || !auth.startsWith('Bearer ') || !equal(auth.slice(7), token)) {
    return denied('unauthorized', 401);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    // Atomic, shared across instances, no expiry and no automatic renewal.
    // Every attempted tools/call is reserved BEFORE any metered upstream work.
    const response = await request(redis.origin, {
      method: 'POST', redirect: 'error', signal: controller.signal,
      headers: { authorization: `Bearer ${env.AGENTSEARCH_MCP_REDIS_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify(['EVAL', RESERVE, '1', `agentsearch:budget:${namespace}`, String(cap)]),
    });
    if (!response.ok) return denied('budget_unavailable', 503);
    const data = await response.json();
    if (data?.error || (data?.result !== 0 && data?.result !== 1)) return denied('budget_unavailable', 503);
    return data.result === 1 ? { allowed: true } : denied('budget_exhausted', 429);
  } catch { return denied('budget_unavailable', 503); }
  finally { clearTimeout(timer); }
}
