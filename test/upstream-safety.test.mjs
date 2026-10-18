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
