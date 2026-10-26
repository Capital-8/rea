import {pathToFileURL} from 'node:url';
const [root,executable]=process.argv.slice(2);
const load=p=>import(pathToFileURL(root+'/'+p));
const {startRuntimeFixtureBrowser}=await load('scripts/lib/browser-runtime-fixture-lifecycle.mjs');
const {startBrowserVerifierSite}=await load('scripts/fixtures/browser-verifier-site.mjs');
const {verifyScenarioEnvironment}=await load('scripts/lib/browser-scenario-environment-e2e.mjs');
const {withVerifierCleanup}=await load('scripts/lib/verifier-cleanup.mjs');
let site,fixture;
await withVerifierCleanup(async()=>{site=await startBrowserVerifierSite();fixture=await startRuntimeFixtureBrowser(executable,site.origin+'/app');const endpoint='http://127.0.0.1:'+fixture.port;const targets=await(await fetch(endpoint+'/json/list')).json();const page=targets.find(t=>t.type==='page');console.log(JSON.stringify(await verifyScenarioEnvironment(endpoint,page.id,site.origin)));},[()=>fixture?.close(),()=>site?.close()]);
