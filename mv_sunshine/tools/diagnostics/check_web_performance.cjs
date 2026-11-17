// Browser-only regression audit. Writes JSON and still images, never a video.
const fs=require('node:fs/promises');
const path=require('node:path');
const {createRequire}=require('node:module');
const req=createRequire('/Users/weckham/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const {chromium}=req('playwright');
const target=process.argv[2]||'http://localhost:6280/mv_sunshine.html?headless=1&q=low';
const output=path.resolve(process.argv[3]||path.join(__dirname,'../../diagnostics/web_performance'));
const realtime=process.argv.includes('--realtime');

(async()=>{
  await fs.mkdir(output,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-unsafe-swiftshader']});
  try{
    const page=await browser.newPage({viewport:{width:720,height:960}}),errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(target);
    await page.waitForFunction(()=>window.__SUNSHINE_READY__||window.__SUNSHINE_BOOT_ERROR__,null,{timeout:120000});
    await page.evaluate(async()=>{
      if(window.__SUNSHINE_BOOT_ERROR__)throw new Error(window.__SUNSHINE_BOOT_ERROR__);
      const THREE=await import('three');
      const {SceneQueries}=await import('./mv_sunshine/tools/diagnostics/scene_queries.js');
      const {ArmSurfaceCheck}=await import('./mv_sunshine/tools/diagnostics/arm_surface_check.js');
      const bounds=new THREE.Box3(new THREE.Vector3(-130,2,940),new THREE.Vector3(-20,48,1090));
      window.webAudit={surface:new ArmSurfaceCheck(SUNSHINE_MV.princess),town:new SceneQueries(SUNSHINE_MV.town,bounds,2),props:new SceneQueries(['teaTable','rocker','readingDesk','chairCorner'].map(k=>SUNSHINE_MV.scannedSets.stageObjects[k]),bounds,1),run:(await import('./mv_sunshine/tools/diagnostics/character_shot_audit.js')).auditCharacterShot};
    });
    const ids=await page.evaluate(()=>SUNSHINE_MV.director.timeline.shots.filter(s=>s.mode!=='unmanned').map(s=>s.id)),shots=[];
    for(const id of ids){
      const result=await page.evaluate(({id,realtime})=>{
        const {surface,town,props,run}=webAudit,g=SUNSHINE_MV;
        return run(g,g.director.timeline.shots.find(s=>s.id===id),surface,town,props,60,{realtime});
      },{id,realtime});
      for(let i=0;i<result.snapshots.length;i++){
        const frame=result.snapshots[i],file=`${id}_${i}.jpg`;
        await fs.writeFile(path.join(output,file),Buffer.from(frame.base64,'base64'));
        result.snapshots[i]={t:frame.t,file};
      }
      shots.push(result);
      console.log(`${id}: ${result.samples} poses, body intersections ${result.armSurfaceIntersections}, scene contacts ${result.armSceneContacts.length}`);
    }
    const shaders=await page.evaluate(()=>SUNSHINE_MV.renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).length);
    await fs.writeFile(path.join(output,'character_audit.json'),JSON.stringify({date:new Date().toISOString(),realtime,scope:'Sleeve/hand versus torso surfaces; intentional 0.23m shoulder join excluded. Sampled poses, not a universal cloth collision proof.',errors,shaders,shots},null,2));
    if(errors.length||shaders||shots.some(s=>s.armSurfaceIntersections||s.armSceneContacts.length||s.occlusions.length||s.maxScreenX>.95||s.maxScreenY>.95||s.maxHandError>.01||s.minCameraClearance<.15))throw new Error('A check failed; see character_audit.json');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
