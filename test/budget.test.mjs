import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeBudget } from '../lib/budget.js';

const token = 'test-only-caller-token-with-more-than-32-characters';
const env = {
  AGENTSEARCH_MCP_ACCESS_MODE:'budgeted', AGENTSEARCH_MCP_CALLER_TOKEN:token,
  AGENTSEARCH_MCP_TOTAL_CALLS:'3', AGENTSEARCH_MCP_BUDGET_ID:'test-v1',
  AGENTSEARCH_MCP_REDIS_URL:'https://quota.example', AGENTSEARCH_MCP_REDIS_TOKEN:'test-only-store-token',
};
const req = {headers:{authorization:'Bearer '+token}};
const result = value => new Response(JSON.stringify({result:value}), {status:200});

test('discovery preserves existing behavior; invalid mode fails closed', async()=>{
  assert.deepEqual(await authorizeBudget({}, {env:{}}), {allowed:true});
  assert.equal((await authorizeBudget({}, {env:{AGENTSEARCH_MCP_ACCESS_MODE:'typo'}})).code,'budget_unconfigured');
});
test('configuration errors fail closed before contacting quota store', async()=>{
  for (const patch of [{AGENTSEARCH_MCP_TOTAL_CALLS:'NaN'},{AGENTSEARCH_MCP_TOTAL_CALLS:'0'},
    {AGENTSEARCH_MCP_TOTAL_CALLS:'1.5'},{AGENTSEARCH_MCP_TOTAL_CALLS:'100001'},
    {AGENTSEARCH_MCP_CALLER_TOKEN:''},{AGENTSEARCH_MCP_REDIS_TOKEN:''},
    {AGENTSEARCH_MCP_REDIS_URL:'http://quota.example'},
    {AGENTSEARCH_MCP_REDIS_URL:'https://user:password@quota.example'},
    {AGENTSEARCH_MCP_REDIS_URL:'https://quota.example/?token=bad'},
    {AGENTSEARCH_MCP_BUDGET_ID:'unsafe/path'}]) {
    const gate = await authorizeBudget(req,{env:{...env,...patch},request:()=>assert.fail('network called')});
    assert.equal(gate.code,'budget_unconfigured');
  }
});
test('missing/wrong caller credentials do not touch store', async()=>{
  for (const headers of [{},{authorization:'Bearer wrong'},{authorization:['invalid']}]){
    const gate = await authorizeBudget({headers},{env,request:()=>assert.fail('store called')});
    assert.equal(gate.status,401);
  }
});
test('atomic reservation request has no expiry or automatic replenishment', async()=>{
  const gate = await authorizeBudget(req,{env,request:async(url,options)=>{
    assert.equal(url,'https://quota.example');
    assert.equal(options.redirect,'error');
    assert.equal(options.headers.authorization,'Bearer test-only-store-token');
    const [command,lua,keyCount,key,cap]=JSON.parse(options.body);
    assert.equal(command,'EVAL'); assert.equal(keyCount,'1');
    assert.equal(key,'agentsearch:budget:test-v1'); assert.equal(cap,'3');
    assert.match(lua,/INCR/); assert.match(lua,/not raw/);
    assert.match(lua,/TTL/); assert.doesNotMatch(lua,/EXPIRE|DEL|SETEX/i);
    return result(1);
  }});
  assert.equal(gate.allowed,true);
});
test('quota exhaustion returns 429',async()=>{
  assert.equal((await authorizeBudget(req,{env,request:async()=>result(0)})).status,429);
});
test('store failure and malformed results fail closed',async()=>{
  for(const request of [async()=>{throw Error('secret must not escape');},
    async()=>new Response('denied',{status:503}),async()=>new Response('not json'),
    async()=>result('1'),async()=>result(-1),async()=>new Response('{"error":"private data"}')]){
    const gate=await authorizeBudget(req,{env,request});
    assert.equal(gate.code,'budget_unavailable'); assert.equal(gate.status,503);
    assert.doesNotMatch(JSON.stringify(gate),/private data|secret must/);
  }
});
test('simulated concurrent reservations share the same fixed aggregate cap',async()=>{
  let used=0;
  const request=async()=>result(used++<3?1:0);
  const gates=await Promise.all(Array.from({length:30},()=>authorizeBudget(req,{env,request})));
  assert.equal(gates.filter(g=>g.allowed).length,3);
  // This verifies caller contract only; real Redis atomicity is tested separately before deployment.
});
