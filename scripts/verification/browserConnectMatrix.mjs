import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir,platform,arch} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const [chromePath,oldPackage,newPackage,out,display='headless',productionRoot]=process.argv.slice(2);
const implementations=[['pinned-default',createRequire(oldPackage+'/package.json')('./index.js').chromium,{}],['upstream-default',createRequire(newPackage+'/package.json')('./index.js').chromium,{}],['upstream-noDefaults',createRequire(newPackage+'/package.json')('./index.js').chromium,{noDefaults:true}]];
const home=await mkdtemp(join(tmpdir(),'rea-7167-matrix-'));const profile=join(home,'profile');
const child=spawn(chromePath,[...(display==='headless'?['--headless']:[]),'--no-sandbox','--no-first-run','--disable-dev-shm-usage','--disable-background-networking','--disable-default-apps','--disable-extensions','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{detached:true,env:{HOME:home,PATH:process.env.PATH},stdio:['ignore','ignore','pipe']});
let stderr='';child.stderr.on('data',b=>{if(stderr.length<64000)stderr+=b});const results=[];let endpoint;
const get=async path=>{const r=await fetch(endpoint+path,{signal:AbortSignal.timeout(4000)});assert.ok(r.ok,String(r.status));return r};
try{for(let n=0;n<100;n++){try{endpoint='http://127.0.0.1:'+(await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break}catch{await new Promise(r=>setTimeout(r,100))}}assert.ok(endpoint);const version=await(await get('/json/version')).json();
for(const state of ['live-page','zero-pages']){if(state==='zero-pages'){for(const t of await(await get('/json/list')).json())if(t.type==='page')await get('/json/close/'+t.id);for(let n=0;n<100;n++){if(!(await(await get('/json/list')).json()).some(t=>t.type==='page'))break;await new Promise(r=>setTimeout(r,50))}}
for(const [name,launcher,options] of implementations){const before=(await(await get('/json/list')).json()).filter(t=>t.type==='page').map(t=>t.id).sort();let browser;const started=performance.now();let error=null;
try{browser=await launcher.connectOverCDP(endpoint,{timeout:8000,...options});assert.equal(browser.contexts().length,1);if(state==='live-page'){assert.equal(browser.contexts()[0].pages().length,1);assert.equal(await browser.contexts()[0].pages()[0].title(),'');}}catch(e){error=String(e)}finally{await browser?.close()}
const after=(await(await get('/json/list')).json()).filter(t=>t.type==='page').map(t=>t.id).sort();assert.deepEqual(after,before);results.push({state,name,elapsedMs:performance.now()-started,error,before,after});}
if(productionRoot&&state==='zero-pages'){
 const {pathToFileURL}=await import('node:url');
 const {openPlaywrightScenarioBrowser}=await import(pathToFileURL(productionRoot+'/dist/browser/PlaywrightScenarioBrowser.js'));
 const {browserScenarioSchema}=await import(pathToFileURL(productionRoot+'/dist/domain/browserScenario.js'));
 const scenario=browserScenarioSchema.parse({browser:{mode:'connect',cdp_endpoint:endpoint,target_id:'missing-selected-target'},start_url:{url:'http://127.0.0.1:1'},environment:{service_workers:'allow'},actions:[{step_id:'unused',action:'wait_for_timeout',duration_ms:1}],command_timeout_ms:8000});
 const started=performance.now();let reason;const leases=[];
 try{const opened=await openPlaywrightScenarioBrowser(scenario,{}, {retainCleanup:lease=>leases.push(lease)});await opened.cleanup.close();assert.fail('Missing target unexpectedly opened')}catch(e){reason=e.reason;assert.equal(reason,'target_not_found',String(e))}
 const cleanup=await Promise.allSettled(leases.map(lease=>lease.release()));
 const after=(await(await get('/json/list')).json()).filter(t=>t.type==='page').map(t=>t.id);assert.deepEqual(after,[]);
 results.push({state,name:'production-owner',reason,elapsedMs:performance.now()-started,after,cleanupFailures:cleanup.filter(r=>r.status==='rejected').length});
}}

await writeFile(out,JSON.stringify({platform:platform(),arch:arch(),display,chrome:version.Browser,results},null,2));console.log(JSON.stringify({platform:platform(),arch:arch(),display,chrome:version.Browser,results}));
}finally{if(child.exitCode===null){child.kill('SIGTERM');await Promise.race([once(child,'exit'),new Promise(r=>setTimeout(r,3000))]);}try{process.kill(-child.pid,'SIGKILL')}catch(e){if(e.code!=='ESRCH')throw e}await rm(home,{recursive:true,force:true});await writeFile(out+'.stderr',stderr)}
