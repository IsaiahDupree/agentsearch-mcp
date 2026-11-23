// MCP tools use an explicitly configured upstream and preserve their input/output contracts.

import { z } from 'zod';
import { upstreamConfig } from './config.js';

const PROXY_SECRET = process.env.AGENTSEARCH_MCP_PROXY_SECRET || '';

const asText = (obj) => ({ content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] });
const asError = (err) => ({
  isError: true,
  content: [{ type: 'text', text: `Error: ${err.message || String(err)}` }],
});

// Every AgentSearch tool only reads public web data — never writes, never touches
// a caller's account (there is no account). openWorldHint is true because the
// underlying data comes from the live web (an open, changing world outside this
// server's control).
const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

function buildUrl(path, params = {}) {
  const config = upstreamConfig();
  if (!config.ok) throw new Error(`AgentSearch upstream unavailable (${config.reason}).`);
  const url = new URL(config.baseUrl + path);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }
  return url;
}

async function callUpstream(path, params) {
  const url = buildUrl(path, params);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  let res;
  let text;
  try {
    const headers = { accept: 'application/json' };
    if (PROXY_SECRET) headers['X-RapidAPI-Proxy-Secret'] = PROXY_SECRET;
    res = await fetch(url, { headers, signal: controller.signal, redirect: 'error' });
    text = await res.text();
  } catch (e) {
    throw new Error(`AgentSearch API request failed (${url.pathname}${url.search}): ${e.message || e}`);
  } finally {
    clearTimeout(timeout);
  }

  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }

  if (!res.ok) {
    const message = body?.error?.message || `AgentSearch API returned HTTP ${res.status} for ${url.pathname}${url.search}`;
    const err = new Error(message);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

// Wraps a (args) => { path, params } mapper into an MCP tool handler that calls
// AgentSearch and returns the JSON as tool-result content, or a typed error.
function forward(tool, mapper) {
  return async (args = {}) => {
    try {
      const allowed = new Set((process.env.AGENTSEARCH_MCP_ALLOWED_TOOLS || '').split(',').map(s => s.trim()).filter(Boolean));
      if (!allowed.has(tool)) throw new Error(`AgentSearch tool ${tool} is disabled by the operator.`);
      const { path, params } = mapper(args);
      return asText(await callUpstream(path, params));
    } catch (err) {
      return asError(err);
    }
  };
}

export function registerTools(server) {
  server.registerTool(
    'web_search',
    {
      title: 'Web search (SERP)',
      description:
        'Search the web via a provider-abstracted backend (Brave or Serper, configured operator-side). Returns normalized results, each with position, title, url, snippet, source, and domain, plus a meta envelope (cache state, provider, took_ms). Returns a provider_required error if no search provider key is configured upstream. Use this for a full web SERP; use instant_answer for quick facts/definitions.',
      inputSchema: {
        q: z.string().describe('Search query.'),
        provider: z.enum(['brave', 'serper']).optional().describe('Force a specific provider. Omit to use whichever is configured operator-side.'),
        limit: z.number().int().min(1).max(20).optional().describe('Max results, clamped to 1-20. Default 10.'),
        country: z.string().optional().describe('ISO-3166 alpha-2 region, lowercase. Default us.'),
      },
      annotations: RO,
    },
    forward('web_search', ({ q, provider, limit, country }) => ({
      path: '/v1/search',
      params: { q, provider, limit, country },
    }))
  );

  server.registerTool(
    'instant_answer',
    {
      title: 'Instant answer (keyless)',
      description:
        'DuckDuckGo Instant Answer API — definitions, entities, and quick facts. Returns a normalized answer with heading, type (abstract/answer/disambiguation), source, sourceUrl, optional image/definition, and relatedTopics, plus a meta envelope. Not a full web SERP; use web_search for that. Works with no API key.',
      inputSchema: {
        q: z.string().describe('Query.'),
      },
      annotations: RO,
    },
    forward('instant_answer', ({ q }) => ({
      path: '/v1/answer',
      params: { q },
    }))
  );

  server.registerTool(
    'fetch_url',
    {
      title: 'Fetch a URL as clean text/markdown (RAG-ready)',
      description:
        'Fetches any public http(s) URL, strips boilerplate (scripts, nav, footer, ads), and returns clean text or markdown ready for an LLM context window. SSRF-guarded — refuses private/loopback/internal hosts. Returns url, title, format, length, content (and finalUrl when redirected, plus up to 50 extracted links when links=true), with a meta envelope. Works with no API key.',
      inputSchema: {
        url: z.string().describe('The URL to fetch (public http/https only).'),
        format: z.enum(['text', 'markdown']).optional().describe('Output format. Default text.'),
        maxChars: z.number().int().min(500).max(500000).optional().describe('Max characters of content returned, clamped 500-500000. Default 100000.'),
        links: z.boolean().optional().describe('Also return up to 50 extracted links. Default false.'),
      },
      annotations: RO,
    },
    forward('fetch_url', ({ url, format, maxChars, links }) => ({
      path: '/v1/fetch',
      params: { url, format, maxChars, links },
    }))
  );
}

export function upstreamStatus() {
  const config = upstreamConfig();
  return config.ok ? { configured: true, kind: config.kind, baseUrl: config.baseUrl } : { configured: false, reason: config.reason };
}
