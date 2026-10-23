(async()=>{
 // MD3 standard easing: cubic-bezier(0.2, 0, 0, 1), over 300 ms.
 function targetProgress(ms){
  const x=Math.max(0,Math.min(1,ms/300));if(x===0||x===1)return x;
  let lo=0,hi=1;
  for(let i=0;i<28;i++){const u=(lo+hi)/2;if(.6*u*(1-u)*(1-u)+u*u*u<x)lo=u;else hi=u;}
  const u=(lo+hi)/2;return 3*(1-u)*u*u+u*u*u;
 }
 function readCaptures(report){
  const captures=Array.isArray(report?.captures)?report.captures:report?.frames?[report]:[];
  if(!captures.length||captures.length>100)throw Error('Choose a carousel recording JSON with captures and frames.');
  for(const capture of captures){
   if(!capture||!Array.isArray(capture.frames)||!capture.frames.length||capture.frames.length>100000)throw Error('Each capture needs 1–100,000 frames.');
   let previous=-Infinity;
   for(const frame of capture.frames){
    if(!Number.isFinite(frame.t)||!Number.isFinite(frame.scrollLeft)||frame.t<previous)throw Error('Frame timestamps must be ordered and scroll offsets must be finite numbers.');
    previous=frame.t;
   }
  }
  return captures;
 }
 function itemPosition(item){
  if(!item)return null;
  const transform=/^translateX\(\s*([-+\d.e]+)px\s*\)$/i.exec(item.transform||'');
  const value=transform?Number(transform[1]):/^[-+\d.e]+px$/i.test(item.left||'')?Number.parseFloat(item.left):null;
  return Number.isFinite(value)?value:null;
 }
 function captureTrace(capture,{release,target,item=0,duration=1000}){
  if(!Number.isFinite(release)||!Number.isFinite(target)||!Number.isFinite(duration)||duration<100||duration>60000)throw Error('Enter a release time, target offset, and a window between 100 and 60,000 ms.');
  const frames=capture.frames,last=frames.at(-1);
  if(release<frames[0].t||release>last.t)throw Error('Release time must fall within the recorded frames.');
  const samples=frames.filter(f=>f.t>=release-100&&f.t<=release+duration).map(f=>[f.t-release,f.scrollLeft,itemPosition(f.items?.[item])]);
  if(!samples.length)throw Error('No frames in this time window. Move time zero or extend the window.');
  return {title:capture.versionLabel||capture.version||'Imported recording',input:'manual alignment',release,start:-100,duration,target,cssTarget:itemPosition(last.items?.[item]),samples,
   note:`Card ${item+1} CSS edge target: last frame at ${last.t.toFixed(1)} ms. Native scroll target: ${target} CSS px.`};
 }
 if(typeof module!=='undefined')module.exports={targetProgress,readCaptures,captureTrace};
 if(typeof document==='undefined')return;
 const root=document.querySelector('#release-timeline');if(!root)return;
 try{
  const response=await fetch('assets/settling-traces.json');if(!response.ok)throw Error('Timeline data failed to load.');
  const {traces}=await response.json(),rows=root.querySelector('.trace-rows');
  const ns='http://www.w3.org/2000/svg',svgNode=(tag,attrs)=>{const e=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);return e;};
  function renderTrace(trace,container=rows){
   const {start,duration,samples,target}=trace,span=duration-start;
   const columnTarget=column=>column===2?(trace.cssTarget??target):target;
   const row=document.createElement('article');row.className='trace-row';row.dataset.traceGroup=trace.group;row.dataset.platform=trace.platform;
   const title=document.createElement('h4');title.textContent=trace.title;row.append(title);
   const origin=document.createElement('p');origin.className='trace-origin';origin.textContent=`Zero: ${trace.input} at ${trace.release} ms in the recording`;row.append(origin);
   const note=document.createElement('p');note.textContent=trace.note;row.append(note);
   const zoomLabel=document.createElement('label');zoomLabel.className='trace-zoom';
   const zoom=document.createElement('input');zoom.type='checkbox';zoom.checked=false;zoomLabel.append(zoom,'Magnify final 10 CSS px');row.append(zoomLabel);
   const fullScale=Math.ceil(samples.reduce((max,s)=>Math.max(max,Math.abs(target-s[1]),s[2]===null?0:Math.abs(columnTarget(2)-s[2])),0)/10)*10||10;
   function path(column){
    const limit=zoom.checked?10:fullScale;let d='';
    for(const s of samples){if(s[column]===null)continue;const x=s[0]-start,y=90-Math.abs(columnTarget(column)-s[column])/limit*80;d+=d?'H'+x+'V'+y:'M'+x+','+y;}
    return d;
   }
   const release=samples.findLast(s=>s[0]<=0)||samples[0],releasePosition=release[2]??release[1];
   function targetPath(){
    const limit=zoom.checked?10:fullScale,distance=Math.abs(columnTarget(release[2]===null?1:2)-releasePosition);let d='';
    for(let t=0;t<=duration;t+=2){const x=t-start,y=90-distance*(1-targetProgress(t))/limit*80;d+=(d?'L':'M')+x+','+y;}
    return d;
   }
   const scale=document.createElement('p');scale.className='trace-scale';row.append(scale);
   const chart=document.createElement('div');chart.className='trace-chart';
   const svg=svgNode('svg',{viewBox:`0 0 ${span} 104`,preserveAspectRatio:'none',role:'img','aria-label':trace.title+': distance to target over time'});
   svg.append(svgNode('path',{d:`M0 90H${span}`,class:'trace-axis'}));
   for(let t=0;t<=duration;t+=100)svg.append(svgNode('path',{d:`M${t-start} 8V94`,class:t===0?'trace-release':'trace-grid'}));
   const referencePath=svgNode('path',{d:targetPath(),class:'trace-target'});svg.append(referencePath);
   const nativePath=svgNode('path',{d:path(1),class:'trace-native'});svg.append(nativePath);
   const cssPath=!samples.some(s=>s[2]!==null)?null:svgNode('path',{d:path(2),class:'trace-css'});if(cssPath)svg.append(cssPath);
   chart.append(svg);
   row.append(chart);
   const ticks=document.createElement('div');ticks.className='trace-ticks';for(let t=0;t<=duration;t+=200){const e=document.createElement('span');e.style.left=(t-start)/span*100+'%';e.textContent=String(t);if(t===duration)e.style.transform='translateX(-100%)';ticks.append(e);}row.append(ticks);
   const axisLabel=document.createElement('p');axisLabel.className='trace-axis-label';axisLabel.textContent='Time after release (ms)';row.append(axisLabel);
   const holds=document.createElement('div');holds.className='trace-holds';holds.setAttribute('aria-label','Repeated sampled positions');
   const col=cssPath?2:1;let run=0;
   for(let i=1;i<samples.length;i++)if(samples[i][col]!==samples[run][col]){
    const elapsed=samples[i][0]-samples[run][0];
    if(samples[run][col]!==null&&samples[run][0]>=0&&i-run>1&&elapsed>=30){
     const hold=document.createElement('span');hold.className='trace-hold';hold.style.left=(samples[run][0]-start)/span*100+'%';hold.style.width=elapsed/span*100+'%';
     hold.textContent=Math.round(elapsed)+' ms';hold.title=`${i-run} samples at ${samples[run][col]} CSS px, ${Math.round(elapsed)} ms before the next change`;holds.append(hold);
    }run=i;
   }
   row.append(holds);
   container.append(row);
   function rescale(){referencePath.setAttribute('d',targetPath());nativePath.setAttribute('d',path(1));cssPath?.setAttribute('d',path(2));scale.textContent=`Distance to target: 0–${zoom.checked?10:fullScale} CSS px`+(zoom.checked?' · Larger distances clipped':'');}
   zoom.addEventListener('change',rescale);rescale();
  }
  for(const trace of traces)renderTrace(trace);
  const action=root.querySelector('#trace-action'),platform=root.querySelector('#trace-platform');function filter(){let shown=0;for(const row of rows.children){row.hidden=row.dataset.traceGroup!==action.value||(platform.value!=='all'&&row.dataset.platform!==platform.value);if(!row.hidden)shown++;}empty.hidden=shown>0;}const empty=document.createElement('p');empty.textContent='No captures for this device and gesture.';root.querySelector('#trace-recorded').append(empty);action.addEventListener('change',filter);platform.addEventListener('change',filter);filter();
  const recordedButton=root.querySelector('#trace-show-recorded'),loadButton=root.querySelector('#trace-load-json'),recorded=root.querySelector('#trace-recorded'),upload=root.querySelector('#trace-upload');
  recordedButton.addEventListener('click',()=>{recorded.hidden=false;upload.hidden=true;recordedButton.setAttribute('aria-pressed','true');loadButton.setAttribute('aria-pressed','false');});
  loadButton.addEventListener('click',()=>{recorded.hidden=true;upload.hidden=false;recordedButton.setAttribute('aria-pressed','false');loadButton.setAttribute('aria-pressed','true');});
  const file=root.querySelector('#trace-file'),captureSelect=root.querySelector('#trace-capture'),eventSelect=root.querySelector('#trace-event'),itemSelect=root.querySelector('#trace-item'),
   releaseInput=root.querySelector('#trace-release'),targetInput=root.querySelector('#trace-target'),durationInput=root.querySelector('#trace-duration'),
   controls=root.querySelector('#trace-align'),importRows=root.querySelector('.trace-import-rows'),status=root.querySelector('#trace-import-status');
  root.querySelector('#trace-choose-file').addEventListener('click',()=>file.click());
  let captures=[];
  const option=(value,text)=>{const e=document.createElement('option');e.value=value;e.textContent=text;return e;};
  function drawImport(){
   try{
    const trace=captureTrace(captures[Number(captureSelect.value)],{release:releaseInput.valueAsNumber,target:targetInput.valueAsNumber,item:Number(itemSelect.value),duration:durationInput.valueAsNumber});
    trace.input=eventSelect.value==='manual'?'manual alignment':eventSelect.selectedOptions[0].textContent.split(' · ')[0];
    importRows.replaceChildren();renderTrace(trace,importRows);status.textContent='';
   }catch(error){importRows.replaceChildren();status.textContent=error.message;}
  }
  function selectCapture(){
   const capture=captures[Number(captureSelect.value)],frames=capture.frames;
   const events=(Array.isArray(capture.events)?capture.events:[]).filter(e=>['touchend','pointerup','arrow-button','key'].includes(e.type)&&!e.outsideViewport&&Number.isFinite(e.t)&&e.t>=frames[0].t&&e.t<=frames.at(-1).t);
   eventSelect.replaceChildren(option('manual','Manual'));
   for(const e of events)eventSelect.append(option(String(e.t),`${e.type} · ${e.t.toFixed(1)} ms`));
   eventSelect.value=events.length?String(events[0].t):'manual';
   releaseInput.min=frames[0].t;releaseInput.max=frames.at(-1).t;releaseInput.value=events[0]?.t??frames[0].t;
   targetInput.value=frames.at(-1).scrollLeft;
   const count=frames.at(-1).items?.length||0;
   itemSelect.replaceChildren();for(let i=0;i<count;i++)itemSelect.append(option(String(i),`Card ${i+1}`));
   if(!count)itemSelect.append(option('0','No CSS edge recorded'));
   itemSelect.value=String(Math.max(0,count-1));drawImport();
  }
  file.addEventListener('change',async()=>{
   const selected=file.files[0];if(!selected)return;
   root.querySelector('#trace-filename').textContent=selected.name;
   controls.hidden=true;importRows.replaceChildren();status.textContent='Reading JSON…';
   try{
    if(selected.size>50*1024*1024)throw Error('File exceeds 50 MB. Choose a smaller recording.');
    captures=readCaptures(JSON.parse(await selected.text()));
    captureSelect.replaceChildren(...captures.map((c,i)=>option(String(i),`${i+1} · ${c.versionLabel||c.version||'Recording'} · ${c.config?.variant||'layout unspecified'}`)));
    controls.hidden=false;selectCapture();
   }catch(error){status.textContent=error instanceof SyntaxError?'Invalid JSON. Choose a recording exported by the playground.':error.message;}
  });
  captureSelect.addEventListener('change',selectCapture);
  eventSelect.addEventListener('change',()=>{if(eventSelect.value!=='manual')releaseInput.value=eventSelect.value;drawImport();});
  releaseInput.addEventListener('input',()=>{eventSelect.value='manual';drawImport();});
  for(const control of [targetInput,durationInput,itemSelect])control.addEventListener('input',drawImport);

 }catch(error){const message=document.createElement('p');message.textContent=error.message;root.append(message);}
})();
