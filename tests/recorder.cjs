const test=require('node:test'),assert=require('node:assert/strict');
const Recorder=require('../site/recorder.js');
test('recording requires explicit start, survives idle, and stops explicitly',()=>{
 let now=10,next,id=0;const canceled=[];
 const recorder=new Recorder({now:()=>now,requestFrame:fn=>(next=fn,++id),cancelFrame:n=>canceled.push(n),readFrame:()=>({scrollLeft:12.5})});
 recorder.event('touchstart');assert.equal(recorder.active,null);assert.equal(recorder.captures.length,0);
 assert.equal(recorder.start({version:'baseline'}),true);assert.equal(recorder.start({}),false);
 now=26;next(now);assert.equal(recorder.active.frames[0].scrollLeft,12.5);
 now=4026;next(now);assert.ok(recorder.active,'idle must not stop a manual recording');
 recorder.event('touchend');now=4100;assert.equal(recorder.stop(),true);
 assert.equal(recorder.active,null);assert.equal(recorder.captures[0].events.at(-1).type,'recording-stop');
 const n=recorder.captures[0].frames.length;next(4200);recorder.event('scroll');assert.equal(recorder.captures[0].frames.length,n);
 assert.equal(recorder.report().schema,2);assert.ok(canceled.length);
 for(let i=0;i<6;i++){recorder.start({version:String(i)});recorder.stop();}
 assert.equal(recorder.captures.length,5);assert.equal(recorder.captures[0].version,'1');
 recorder.start({});assert.equal(recorder.clear(),false);recorder.stop();recorder.clear();assert.equal(recorder.captures.length,0);
});
test('recording limit stops and preserves the report',()=>{
 let next;const recorder=new Recorder({now:()=>0,requestFrame:fn=>(next=fn,1),cancelFrame:()=>{},readFrame:()=>({scrollLeft:0})});
 recorder.start({});next(60001);assert.equal(recorder.active,null);assert.equal(recorder.captures.length,1);assert.equal(recorder.captures[0].events.at(-1).reason,'recording limit reached');
});
