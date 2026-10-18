import test from 'node:test';
import assert from 'node:assert/strict';
import { registerTools } from '../lib/tools.js';
const handlers={};
registerTools({registerTool:(name,config,handler)=>{handlers[name]=handler;}});

test('forwarder rejects redirects and sanitizes upstream failures',async()=>{
  const original=globalThis.fetch;
  try {
    globalThis.fetch=async(url,opts)=>{
      assert.equal(opts.redirect,'error');
      throw Error('private-token-and-query');
    };
    let r=await handlers.instant_answer({q:'private-query'});
    assert.equal(r.isError,true);
    assert.doesNotMatch(r.content[0].text,/private-token|private-query/);
    globalThis.fetch=async()=>new Response('{"error":{"message":"secret-body"}}',{status:403});
    r=await handlers.instant_answer({q:'test'});
    assert.match(r.content[0].text,/HTTP 403/);
    assert.doesNotMatch(r.content[0].text,/secret-body/);
    const previousBase=process.env.AGENTSEARCH_MCP_API_BASE_URL;
    const previousSecret=process.env.AGENTSEARCH_MCP_PROXY_SECRET;
    let unsafe;
    try {
      process.env.AGENTSEARCH_MCP_API_BASE_URL='http://insecure.example';
      process.env.AGENTSEARCH_MCP_PROXY_SECRET='test-only-proxy-secret';
      unsafe=await import('../lib/tools.js?insecure-config-test');
    } finally {
      if(previousBase===undefined)delete process.env.AGENTSEARCH_MCP_API_BASE_URL;else process.env.AGENTSEARCH_MCP_API_BASE_URL=previousBase;
      if(previousSecret===undefined)delete process.env.AGENTSEARCH_MCP_PROXY_SECRET;else process.env.AGENTSEARCH_MCP_PROXY_SECRET=previousSecret;
    }
    let insecureHandler;
    unsafe.registerTools({registerTool:(name,config,handler)=>{if(name==='instant_answer')insecureHandler=handler;}});
    globalThis.fetch=async()=>assert.fail('secret sent to insecure upstream');
    r=await insecureHandler({q:'test'});
    assert.equal(r.isError,true);
    assert.match(r.content[0].text,/configuration invalid/);
    assert.doesNotMatch(r.content[0].text,/test-only-proxy-secret/);
  } finally {globalThis.fetch=original;}
});
test('empty, oversized, malformed, and nested-error responses are errors',async()=>{
  const original=globalThis.fetch;
  try {
    for(const payload of ['', 'not-json', 'x'.repeat(2000001), '{"error":{"message":"not successful"}}']){
      globalThis.fetch=async()=>new Response(payload);
      assert.equal((await handlers.instant_answer({q:'test'})).isError,true);
    }
  } finally {globalThis.fetch=original;}
});
