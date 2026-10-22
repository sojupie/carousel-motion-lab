import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),read=path=>readFile(new URL(path,root),'utf8');
const baseline=await read('src/baseline.js'),css=await read('src/carousel.css');
function replaceOnce(source,before,after){
 if(source.split(before).length!==2)throw Error('Baseline injection point changed: '+before);
 return source.replace(before,after);
}
const entries={
 baseline:{label:'Current baseline',note:'Sticky track and boundary clamping without layout hints. Smoother desktop motion with remaining touch settling steps.',js:baseline,css},
 native:{label:'1 · Native scrolling',note:'Fixed-width cards in normal flow for touch and trackpad input. Smoother phone motion without changing card widths.',js:await read('src/native.js'),css:css+'\n'+await read('src/native.css')},
 rounded:{label:'2 · Rounded clock',note:'Whole-pixel positions during custom settling. Arrow-button comparison against Current baseline.',js:replaceOnce(baseline,'paint(state,motion.position);','paint(state,Math.round(motion.position));'),css},
 'touch-handoff':{label:'3 · Touch handoff',note:'Native dragging followed by fractional custom settling. Smoother initial motion with late corrections and boundary overscroll.',js:replaceOnce(baseline,'  let drag;',await read('src/touch-handoff.js')+'\n  installTouchHandoff({roots,cancelMotion,offset,go});\n  let drag;'),css},
};
const history={
 original:{label:'Original · native smooth scrolling',baseRevision:'96600ee',note:'Queued geometry updates from native scroll events. Stutter on desktop and iOS.'},
 'first-token':{label:'Token clock · first implementation',baseRevision:'eab1d19',note:'MD3-timed settling with native scroll writes on each frame. Remaining roughness during settling.'},
 handoff:{label:'One visual clock · explicit artwork positioning',baseRevision:'4263d47',note:'Fractional settling and artwork offsets with native synchronization at completion. Smoother desktop motion with remaining touch jitter and stutter.'},
 isolation:{label:'Overscroll clamp · layout hints',baseRevision:'890dc78',note:'Boundary clamping with layout containment and compositor hints. Reduced directional jitter with remaining settling stutter.'},
 diagnostic:{label:'Fixed masks · diagnostic',baseRevision:'512e9f1',note:'Fixed mask widths and artwork offsets with scroll-driven positions. Remaining stutter, gaps, and overlaps.'},
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
