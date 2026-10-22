import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),read=path=>readFile(new URL(path,root),'utf8');
const baseline=await read('src/baseline.js'),css=await read('src/carousel.css');
function replaceOnce(source,before,after){
 if(source.split(before).length!==2)throw Error('Baseline injection point changed: '+before);
 return source.replace(before,after);
}
const entries={
 baseline:{label:'Current baseline',note:'Plain sticky track with overscroll clamping. Earlier changes improved desktop motion, but slow dragging and settling still need comparison across devices and inputs.',js:baseline,css},
 native:{label:'1 · Native scrolling',note:'Fixed-width cards move in normal flow. Swipe to compare browser scrolling with the masked baseline. This control has no custom mouse dragging or changing masks.',js:await read('src/native.js'),css:css+'\n'+await read('src/native.css')},
 rounded:{label:'2 · Rounded clock',note:'Use the arrow buttons. This deliberately rounds the custom animation’s paint input to whole CSS pixels. Finger swipes use the unchanged baseline path.',js:replaceOnce(baseline,'paint(state,motion.position);','paint(state,Math.round(motion.position));'),css},
 'touch-handoff':{label:'3 · Touch handoff',note:'Native finger dragging hands release to the fractional MD3 animation clock. It can still jump or rubber-band because native scrolling may continue. This is an experiment, not a completed fix.',js:replaceOnce(baseline,'  let drag;',await read('src/touch-handoff.js')+'\n  installTouchHandoff({roots,cancelMotion,offset,go});\n  let drag;'),css},
};
const history={
 original:{label:'Original · native smooth scrolling',baseRevision:'96600ee',note:'Original implementation: native smooth scrolling for controls, scroll-driven mask geometry, and queued frame updates. Stuttering was reported on desktop and iOS. Compare slow dragging, release and arrow buttons.'},
 'first-token':{label:'Token clock · first implementation',baseRevision:'eab1d19',note:'Introduces MD3-timed custom settling and translateX positioning. Native offsets are still written during each custom animation frame. Touch release remains native.'},
 handoff:{label:'One visual clock · explicit artwork positioning',baseRevision:'4263d47',note:'Removes per-frame native scroll writes from custom settling and positions artwork with explicit fractional coordinates. Desktop behavior improved, while touch jitter and settling problems remained.'},
 isolation:{label:'Overscroll clamp · layout hints',baseRevision:'890dc78',note:'Clamps native offsets at the boundaries and adds layout containment/compositing hints. This addressed reported directional jitter, not the remaining settling stutter.'},
 diagnostic:{label:'Fixed masks · diagnostic',baseRevision:'512e9f1',note:'Freezes mask widths and artwork offsets while keeping positional updates. Gaps and overlaps are expected. It did not resolve the reported stutter; this is a confounded diagnostic, not a finished layout.'},
};
for(const [key,info] of Object.entries(history))entries[key]={...info,js:await read('src/history/'+key+'.js'),css:await read('src/history/'+key+'.css')};
await mkdir(new URL('site/runtimes/',root),{recursive:true});
const manifest={};
for(const [key,{js,css,...info}] of Object.entries(entries)){
 const hash=content=>createHash('sha256').update(content).digest('hex');
 manifest[key]={...info,jsSHA256:hash(js),cssSHA256:hash(css),baseRevision:info.baseRevision??'c13bc6a'};
 await writeFile(new URL('site/runtimes/'+key+'.js',root),js);
 await writeFile(new URL('site/runtimes/'+key+'.css',root),css);
}
await writeFile(new URL('site/runtimes/manifest.json',root),JSON.stringify(manifest,null,2)+'\n');
// Version the page assets too: an old app must not drive a new version selector.
const pageAssets={};
for(const file of ['app.js','recorder.js','styles.css','fixture.css'])
 pageAssets[file]=createHash('sha256').update(await read('site/'+file)).digest('hex').slice(0,12);
const html=(await read('site/index.html')).replace(/(href|src)="(app\.js|recorder\.js|styles\.css|fixture\.css)(?:\?v=[a-f0-9]+)?"/g,(_,attribute,file)=>`${attribute}="${file}?v=${pageAssets[file]}"`);
await writeFile(new URL('site/index.html',root),html);
console.log('Built nine static implementation and diagnostic runtimes.');
