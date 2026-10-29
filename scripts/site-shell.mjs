import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=await mkdtemp(path.join(tmpdir(),'carousel-site-shell-'));
try {
 execFileSync('go',['-C',path.resolve(root,'../tokens'),'run','./cmd/tokens','site-shell','--out',out],{stdio:'inherit'});
 let html=await readFile(path.join(root,'site/index.html'),'utf8');
 for(const region of ['header','footer']) {
  const fragment=await readFile(path.join(out,`site-${region}.html`),'utf8');
  const marker=new RegExp(`<!-- site-${region}:start -->[\\s\\S]*?<!-- site-${region}:end -->`);
  if(!marker.test(html))throw Error(`Missing shared ${region} markers`);
  html=html.replace(marker,`<!-- site-${region}:start -->\n${fragment}\n<!-- site-${region}:end -->`);
 }
 await writeFile(path.join(root,'site/index.html'),html);
 for(const file of ['site.css','site.js','site-logo.svg','site-logo.png','site-logo.webp'])await copyFile(path.join(out,file),path.join(root,'site',file));
} finally { await rm(out,{recursive:true,force:true}); }
