import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

test('real HTTP MCP handler rejects unauthorized/exhausted calls before upstream',async()=>{
  const originalFetch=globalThis.fetch;
  const token='test-only-caller-token-with-more-than-32-characters';
  Object.assign(process.env,{
    AGENTSEARCH_MCP_ACCESS_MODE:'budgeted',AGENTSEARCH_MCP_CALLER_TOKEN:token,
    AGENTSEARCH_MCP_TOTAL_CALLS:'2',AGENTSEARCH_MCP_BUDGET_ID:'http-test',
    AGENTSEARCH_MCP_REDIS_URL:'https://quota.test',AGENTSEARCH_MCP_REDIS_TOKEN:'test-store',
    AGENTSEARCH_MCP_API_BASE_URL:'https://upstream.test',AGENTSEARCH_MCP_PROXY_SECRET:'test-upstream',
  });
  let reservations=0,upstream=0,storeFails=false;
  globalThis.fetch=async(url,opts)=>{
    const u=new URL(url);
    if(u.hostname==='quota.test'){
      if(storeFails) throw Error('simulated outage');
      return new Response(JSON.stringify({result:reservations++<2?1:0}));
    }
    if(u.hostname==='upstream.test'){
      upstream++;
      assert.equal(opts.headers['X-RapidAPI-Proxy-Secret'],'test-upstream');
      return new Response(JSON.stringify({query:u.searchParams.get('q'),answer:'fixture answer'}));
    }
    return originalFetch(url,opts);
  };
  const {default:handler}=await import('../api/mcp.js');
  const server=http.createServer(async(req,res)=>{
    res.status=code=>{res.statusCode=code;return res;};
    res.json=obj=>{res.setHeader('content-type','application/json');res.end(JSON.stringify(obj));};
    let body=''; for await(const chunk of req)body+=chunk;
    req.body=body?JSON.parse(body):undefined;
    await handler(req,res);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const endpoint='http://127.0.0.1:'+server.address().port;
  async function rpc(method,auth,extraHeaders={},batch=false){
    const response=await originalFetch(endpoint,{method:'POST',
      headers:{'content-type':'application/json',accept:'application/json, text/event-stream',...(auth?{authorization:'Bearer '+auth}:{}),...extraHeaders},
      body:JSON.stringify(batch ? [{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'instant_answer',arguments:{q:'fixture'}}}] : {jsonrpc:'2.0',id:1,method,params:method==='tools/call'?{name:'instant_answer',arguments:{q:'fixture'}}:{}})});
    const text=await response.text();
    const line=text.split('\n').find(x=>x.startsWith('data:'));
    return {status:response.status,body:JSON.parse(line?line.slice(5):text)};
  }
  try{
    assert.equal((await rpc('tools/list')).body.result.tools.length,3);
    assert.equal(reservations,0); assert.equal(upstream,0);
    assert.equal((await rpc('tools/call',undefined,{},true)).status,400);
    assert.equal((await rpc('tools/call',token,{},true)).status,400);
    assert.equal((await rpc('tools/call',token,{origin:'https://unapproved.example'})).status,403);
    assert.equal(reservations,0); assert.equal(upstream,0);
    assert.equal((await rpc('tools/call')).status,401);
    assert.equal(reservations,0); assert.equal(upstream,0);
    assert.equal((await rpc('tools/call',token)).body.result.isError,undefined);
    assert.equal((await rpc('tools/call',token)).status,200);
    assert.equal(upstream,2);
    assert.equal((await rpc('tools/call',token)).status,429); assert.equal(upstream,2);
    storeFails=true;
    assert.equal((await rpc('tools/call',token)).status,503); assert.equal(upstream,2);
  }finally{
    globalThis.fetch=originalFetch;
    await new Promise(resolve=>server.close(resolve));
    server.closeAllConnections();
  }
});
