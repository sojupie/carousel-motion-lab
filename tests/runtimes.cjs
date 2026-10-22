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
test('page ships a self-contained Material subset and three deferred 16:9 recordings',()=>{
 const css=read('site/material.css').toString(),html=read('site/index.html').toString();
 const declared=new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m=>m[1]));
 for(const source of [css,read('site/styles.css').toString()])
  for(const [,token] of source.matchAll(/var\((--md-[\w-]+)/g))assert.ok(declared.has(token),'Missing Material token '+token);
 assert.ok(require('node:zlib').gzipSync(css).length<12000);
 assert.equal((html.match(/<video controls muted playsinline preload="none" width="1280" height="720"/g)||[]).length,3);
 assert.match(read('site/app.js').toString(),/viewBox="0 -960 960 960"/);
 assert.ok(!html.includes('theme.css'));
 assert.ok(html.includes('assets/settling-edge.webp'));
 assert.ok(html.includes('https://tokencatalog.dev/md3/'));
 execFileSync(process.execPath,['--check',path.join(root,'site/fields.js')]);
 assert.match(read('site/app.js').toString(),/form.requestSubmit/);
});
test('release data retains native holds, continuous custom positions and the late correction',()=>{
 const {duration,traces}=JSON.parse(read('site/assets/settling-traces.json'));
 assert.equal(duration,800);assert.equal(traces.length,4);
 for(const t of traces){
  assert.deepEqual(Object.keys(t).sort(),['id','note','samples','target','title']);
  t.samples.forEach((s,i)=>{assert.ok(!i||s[0]>t.samples[i-1][0]);assert.ok(Number.isFinite(s[1]));assert.ok(s[2]===null||Number.isFinite(s[2]));});
 }
 for(const id of ['native','rounded']){
  const t=traces.find(t=>t.id===id),lastOne=t.samples.find(s=>s[1]===t.target-1),finish=t.samples.find(s=>s[0]>lastOne[0]&&s[1]===t.target);
  assert.equal(finish[0]-lastOne[0],100,id+' final recorded hold');
 }
 const good=traces.find(t=>t.id==='handoff'),end=good.samples.findIndex(s=>s[2]===good.target);
 for(let i=1;i<=end;i++)assert.notEqual(good.samples[i][2],good.samples[i-1][2]);
 assert.ok(good.samples.slice(end).every(s=>s[2]===good.target));
 const bad=traces.find(t=>t.id==='correction'),land=bad.samples.findIndex(s=>s[2]===bad.target);
 assert.equal(bad.samples[land+1][1]-bad.target,6);
 execFileSync(process.execPath,['--check',path.join(root,'site/timeline.js')]);
});
