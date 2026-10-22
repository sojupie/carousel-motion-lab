// Minimal checks of the actual handoff listeners, not a reimplementation of them.
const assert=require('node:assert/strict'),install=require('../src/touch-handoff.js');
const listeners={},calls=[];
global.document={addEventListener:(name,fn)=>listeners[name]=fn};
global.window={addEventListener:()=>{}};
global.CustomEvent=class{constructor(type,options){this.type=type;this.detail=options.detail;}};
const root={isConnected:true,dispatchEvent:e=>calls.push(['event',e.detail])};
const state={root,rtl:false,viewport:{style:{removeProperty:()=>{}},scrollTo:()=>{}},plan:{large:280,gap:8},buttons:Array(6)};
const target={closest:s=>s==='.md-carousel'?root:{}};
install({roots:new Map([[root,state]]),cancelMotion:()=>{},offset:()=>300,go:(s,i)=>calls.push(['go',i])});
const touch=(x,y=0,id=1)=>({clientX:x,clientY:y,identifier:id});
const emit=(type,time,touches)=>listeners[type]({timeStamp:time,touches,target});
function reset(){calls.length=0;state.rtl=false;}
reset();emit('touchstart',0,[touch(100)]);emit('touchmove',20,[touch(60)]);emit('touchend',30,[]);
assert.equal(calls.find(x=>x[0]==='go')[1],2,'LTR left flick projects forwards');
reset();state.rtl=true;emit('touchstart',0,[touch(60)]);emit('touchmove',20,[touch(100)]);emit('touchend',30,[]);
assert.equal(calls.find(x=>x[0]==='go')[1],2,'RTL right flick projects forwards');
reset();emit('touchstart',0,[touch(100)]);emit('touchmove',20,[touch(60)]);emit('touchend',150,[]);
assert.equal(calls.find(x=>x[0]==='go')[1],1,'paused release discards stale velocity');
for(const kind of ['tap','vertical','multi','cancel']){
 reset();emit('touchstart',0,[touch(100)]);
 if(kind==='vertical')emit('touchmove',20,[touch(100,50)]);
 if(kind==='multi')emit('touchstart',20,[touch(100),touch(150,0,2)]);
 if(kind==='cancel'){emit('touchmove',20,[touch(60)]);emit('touchcancel',25,[]);}
 emit('touchend',30,[]);assert.equal(calls.length,0,kind+' must not hand off');
}
console.log('Touch handoff: direction, stale velocity, taps, vertical gestures, multitouch and cancellation checks passed.');
