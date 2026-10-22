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
