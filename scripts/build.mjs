import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),read=path=>readFile(new URL(path,root),'utf8');
const baseline=await read('src/baseline.js'),css=await read('src/carousel.css');
function replaceOnce(source,before,after){
 if(source.split(before).length!==2)throw Error('Baseline injection point changed: '+before);
 return source.replace(before,after);
}
const entries={
 baseline:{label:'Baseline',note:'Native touch scrolling drives a sticky layer of masked cards. Release can settle in visible steps on iOS.',js:baseline,css},
 native:{label:'1 · Native scrolling',note:'Fixed-width cards move in normal flow. Swipe to compare browser scrolling with the masked baseline. This control has no custom mouse dragging or changing masks.',js:await read('src/native.js'),css:css+'\n'+await read('src/native.css')},
 rounded:{label:'2 · Rounded clock',note:'Use the arrow buttons. This deliberately rounds the custom animation’s paint input to whole CSS pixels. Finger swipes use the unchanged baseline path.',js:replaceOnce(baseline,'paint(state,motion.position);','paint(state,Math.round(motion.position));'),css},
 'touch-handoff':{label:'3 · Touch handoff',note:'Native finger dragging hands release to the fractional MD3 animation clock. It can still jump or rubber-band because native scrolling may continue. This is an experiment, not a completed fix.',js:replaceOnce(baseline,'  let drag;',await read('src/touch-handoff.js')+'\n  installTouchHandoff({roots,cancelMotion,offset,go});\n  let drag;'),css},
};
await mkdir(new URL('site/runtimes/',root),{recursive:true});
const manifest={};
for(const [key,{js,css,...info}] of Object.entries(entries)){
 const hash=content=>createHash('sha256').update(content).digest('hex');
 manifest[key]={...info,jsSHA256:hash(js),cssSHA256:hash(css),baseRevision:'c13bc6a'};
 await writeFile(new URL('site/runtimes/'+key+'.js',root),js);
 await writeFile(new URL('site/runtimes/'+key+'.css',root),css);
}
await writeFile(new URL('site/runtimes/manifest.json',root),JSON.stringify(manifest,null,2)+'\n');
console.log('Built four static experiment runtimes.');
