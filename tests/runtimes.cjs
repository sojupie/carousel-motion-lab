const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p)),manifest=JSON.parse(read('site/runtimes/manifest.json'));
test('all nine versions are published, hashed and syntactically valid',()=>{
 assert.deepEqual(Object.keys(manifest).sort(),['original','first-token','handoff','isolation','baseline','diagnostic','native','rounded','touch-handoff'].sort());
 for(const [key,entry]of Object.entries(manifest)){
  for(const ext of ['js','css'])assert.equal(crypto.createHash('sha256').update(read('site/runtimes/'+key+'.'+ext)).digest('hex'),entry[ext+'SHA256']);
  execFileSync(process.execPath,['--check',path.join(root,'site/runtimes/'+key+'.js')]);
 }
 for(const key of ['original','first-token','handoff','isolation','diagnostic']){
  for(const ext of ['js','css'])assert.deepEqual(read('site/runtimes/'+key+'.'+ext),read('src/history/'+key+'.'+ext),key+' snapshot must remain unchanged');
 }
 assert.deepEqual(read('site/runtimes/baseline.js'),read('src/baseline.js'));
});
test('page ships a self-contained Material subset and eight deferred 16:9 recordings',()=>{
 const css=read('site/material.css').toString(),html=read('site/index.html').toString();
 const declared=new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m=>m[1]));
 for(const source of [css,read('site/styles.css').toString()])
  for(const [,token] of source.matchAll(/var\((--md-[\w-]+)/g))assert.ok(declared.has(token),'Missing Material token '+token);
 assert.ok(require('node:zlib').gzipSync(css).length<12000);
 assert.equal((html.match(/<video controls muted playsinline preload="none" width="1280" height="720"/g)||[]).length,8);
 assert.match(read('site/app.js').toString(),/viewBox="0 -960 960 960"/);
 assert.ok(!html.includes('theme.css'));
 assert.ok(html.includes('assets/settling-edge.webp'));
 assert.ok(html.includes('https://tokencatalog.dev/md3/'));
 execFileSync(process.execPath,['--check',path.join(root,'site/fields.js')]);
 assert.match(read('site/app.js').toString(),/form.requestSubmit/);
});
test('release traces use in-viewport touchend times and retain the full-item rollback',()=>{
 const {traces}=JSON.parse(read('site/assets/settling-traces.json'));
 assert.equal(traces.length,19);
 for(const t of traces){
  assert.equal(t.start,-100);assert.ok(Number.isFinite(t.release));
  assert.ok(t.samples.some(s=>s[0]<0));assert.ok(t.samples.some(s=>s[0]>0));
  t.samples.forEach((s,i)=>{assert.ok(!i||s[0]>t.samples[i-1][0]);assert.ok(Number.isFinite(s[1]));assert.ok(s[2]===null||Number.isFinite(s[2]));});
 }
 for(const [id,release,finish,hold] of [['native',1332,725,101],['rounded',5837,731,100]]){
  const t=traces.find(t=>t.id===id),lastOne=t.samples.find(s=>s[0]>=0&&s[1]===t.target+1),end=t.samples.find(s=>s[0]>lastOne[0]&&s[1]===t.target);
  assert.equal(t.release,release);assert.equal(end[0],finish);assert.equal(end[0]-lastOne[0],hold);
 }
 const original=traces.find(t=>t.id==='original-return'),baseline=traces.find(t=>t.id==='baseline-return');
 assert.equal(original.release,3266);assert.equal(baseline.release,2378);
 assert.equal(original.samples.find(s=>s[0]>=0&&s[1]===0)[0],748);
 assert.equal(baseline.samples.find(s=>s[0]>=0&&s[1]===0)[0],739);
 const good=traces.find(t=>t.id==='handoff'),fs=good.samples.filter(s=>s[0]>=0),end=fs.findIndex(s=>s[2]===good.target);
 assert.equal(good.release,408);assert.equal(fs[end][0],332);
 for(let i=1;i<=end;i++)assert.notEqual(fs[i][2],fs[i-1][2]);
 assert.ok(fs.slice(end).every(s=>s[2]===good.target));
 const bad=traces.find(t=>t.id==='correction'),before=bad.samples.find(s=>s[0]===307),after=bad.samples.find(s=>s[0]===324);
 assert.equal(bad.release,3276);assert.equal(bad.target,1312);
 assert.ok(Math.abs(before[2]-after[2]-330.796431)<.000001);
 assert.equal(bad.samples.at(-1)[2],984);
 execFileSync(process.execPath,['--check',path.join(root,'site/timeline.js')]);
});
test('annotations exclude dragging and leave the successful return unflagged',()=>{
 const recordings=JSON.parse(read('site/assets/recordings/ios-measurements.json'));
 const smooth=recordings.find(r=>r.name==='ios-touch-return');
 assert.equal(smooth.segments.length,1);assert.equal(smooth.segments[0].start,.6);
 assert.deepEqual(smooth.segments[0].holds,[]);
 for(const r of recordings)for(const s of r.segments)for(const h of s.holds){
  assert.ok(h.n>1,'a lone frame is not a repeated position');
  assert.ok(h.t>=s.start-.00001&&h.t+h.duration_ms/1000<=s.end+.001,'hold outside the selected motion');
 }
 for(const name of ['ios-original','ios-baseline']){
  const r=recordings.find(r=>r.name===name);
  assert.equal(r.segments.length,3);
  assert.ok(r.segments.reduce((sum,s)=>sum+s.end-s.start,0)/r.speed+r.finalFreeze<10);
 }
});
test('target reference follows the 300 ms MD3 standard curve',()=>{
 const {targetProgress}=require('../site/timeline.js');
 assert.equal(targetProgress(0),0);assert.equal(targetProgress(300),1);assert.equal(targetProgress(1000),1);
 assert.ok(targetProgress(150)>.85&&targetProgress(150)<.9);
 for(let t=2;t<=300;t+=2)assert.ok(targetProgress(t)>=targetProgress(t-2));
 assert.ok(!read('site/timeline.js').toString().includes("range.type='range'"));
});
test('PC traces distinguish mouse release from Native arrow-button timing',()=>{
 const traces=JSON.parse(read('site/assets/settling-traces.json')).traces;
 const pc=traces.filter(t=>t.platform==='pc');assert.equal(pc.length,9);
 assert.equal(pc.filter(t=>t.input==='pointerup'&&t.group==='return').length,8);
 const native=pc.find(t=>t.id==='pc-native');assert.equal(native.input,'arrow-button');assert.equal(native.group,'button');
 assert.ok(pc.every(t=>t.samples.some(s=>s[0]<=0)&&t.samples.some(s=>s[0]>0)));
 assert.ok(traces.filter(t=>t.platform==='ios').every(t=>t.input==='touchend'));
});


test('imported recordings align to a chosen release and retain separate native and CSS targets',()=>{
 const {readCaptures,captureTrace}=require('../site/timeline.js');
 const capture={version:'baseline',events:[{t:150,type:'touchend'}],frames:[
  {t:100,scrollLeft:40,items:[{left:'120px'}]},
  {t:150,scrollLeft:30,items:[{transform:'translateX(110.5px)'}]},
  {t:200,scrollLeft:10,items:[{transform:'translateX(90px)'}]},
  {t:300,scrollLeft:0,items:[{transform:'translateX(80px)'}]}
 ]};
 assert.deepEqual(readCaptures({captures:[capture]}),[capture]);
 assert.deepEqual(readCaptures(capture),[capture]);
 const trace=captureTrace(capture,{release:150,target:0,duration:1000});
 assert.deepEqual(trace.samples[1],[0,30,110.5]);assert.equal(trace.cssTarget,80);
 const shifted=captureTrace(capture,{release:200,target:10,duration:100});
 assert.deepEqual(shifted.samples.at(-1),[100,0,80]);assert.equal(shifted.target,10);
 assert.throws(()=>readCaptures({captures:[]}));
 assert.throws(()=>readCaptures({frames:[{t:0,scrollLeft:'bad'}]}));
 assert.throws(()=>readCaptures({frames:[{t:2,scrollLeft:0},{t:1,scrollLeft:0}]}));
 assert.throws(()=>captureTrace(capture,{release:500,target:0}));
 const native=captureTrace({frames:[{t:0,scrollLeft:20},{t:100,scrollLeft:0}]},{release:0,target:0});
 assert.equal(native.cssTarget,null);assert.ok(native.samples.every(s=>s[2]===null));
});


test('shared button feedback loads with its motion dependency and ripple styles',()=>{
 const html=read('site/index.html').toString(),css=read('site/material.css').toString(),buttons=read('site/buttons.js').toString();
 assert.ok(html.indexOf('src="motion.js')<html.indexOf('src="buttons.js'));
 assert.match(css,/\.md-button-ripple/);
 assert.match(css,/--_motion-fast-effects-duration:\s*[\d.]+ms/);
 assert.match(css,/--md-comp-button-small-pressed-container-corner-size-motion-spring-damping:/);
 const selector=buttons.match(/"\.md-button,\.md-icon-button,[^"]+"/)[0];
 assert.equal(selector,'".md-button,.md-icon-button,.md-filter-chip,.md-menu-item"');
 for(const file of ['motion.js','buttons.js'])execFileSync(process.execPath,['--check',path.join(root,'site',file)]);
});
