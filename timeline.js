(async()=>{
 const root=document.querySelector('#release-timeline');if(!root)return;
 try{
  const response=await fetch('assets/settling-traces.json');if(!response.ok)throw Error('Timeline data failed to load.');
  const {duration,traces}=await response.json(),range=root.querySelector('#release-time'),clock=root.querySelector('output'),zoom=root.querySelector('#trace-zoom'),rows=root.querySelector('.trace-rows');
  const ns='http://www.w3.org/2000/svg',svgNode=(tag,attrs)=>{const e=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);return e;};
  const path=(samples,column,target)=>{
   let d='';for(const [i,s]of samples.entries()){
    if(s[column]===null)continue;const x=s[0],y=90-Math.min(zoom.checked?10:220,Math.abs(target-s[column]))/(zoom.checked?10:220)*80;
    d+=i?'H'+x+'V'+y:'M'+x+','+y;
   }return d;
  };
  for(const trace of traces){
   const row=document.createElement('article');row.className='trace-row';
   const title=document.createElement('h4');title.textContent=trace.title;row.append(title);
   const note=document.createElement('p');note.textContent=trace.note;row.append(note);
   const chart=document.createElement('div');chart.className='trace-chart';
   const svg=svgNode('svg',{viewBox:`0 0 ${duration} 104`,preserveAspectRatio:'none',role:'img','aria-label':trace.title+': distance to target over time'});
   svg.append(svgNode('path',{d:`M0 90H${duration}`,class:'trace-axis'}));
   for(let t=0;t<=duration;t+=100)svg.append(svgNode('path',{d:`M${t} 8V94`,class:'trace-grid'}));
   const nativePath=svgNode('path',{d:path(trace.samples,1,trace.target),class:'trace-native'});svg.append(nativePath);trace.nativePath=nativePath;
   if(trace.samples[0][2]!==null){trace.cssPath=svgNode('path',{d:path(trace.samples,2,trace.target),class:'trace-css'});svg.append(trace.cssPath);}
   chart.append(svg);
   const cursor=document.createElement('span');cursor.className='trace-cursor';chart.append(cursor);row.append(chart);
   const holds=document.createElement('div');holds.className='trace-holds';holds.setAttribute('aria-label','Repeated sampled positions');
   trace.holds=[];const col=trace.samples[0][2]===null?1:2;let start=0;
   for(let i=1;i<trace.samples.length;i++)if(trace.samples[i][col]!==trace.samples[start][col]){
    const elapsed=trace.samples[i][0]-trace.samples[start][0];
    if(i-start>1&&elapsed>=30){
     trace.holds.push({start:trace.samples[start][0],end:trace.samples[i][0],duration:Math.round(elapsed)});
     const hold=document.createElement('span');hold.className='trace-hold';hold.style.left=trace.samples[start][0]/duration*100+'%';hold.style.width=elapsed/duration*100+'%';
     hold.textContent=Math.round(elapsed)+' ms';hold.title=`${i-start} samples at ${trace.samples[start][col]} CSS px, ${Math.round(elapsed)} ms before the next change`;holds.append(hold);
    }start=i;
   }
   row.append(holds);
   const readout=document.createElement('p');readout.className='trace-readout';row.append(readout);rows.append(row);
   trace.cursor=cursor;trace.readout=readout;
  }
  const ticks=root.querySelector('.trace-ticks');for(let t=0;t<=duration;t+=100){const e=document.createElement('span');e.textContent=t;ticks.append(e);}
  function update(){const t=Number(range.value);clock.textContent=t+' ms after release';for(const trace of traces){const s=trace.samples.findLast(s=>s[0]<=t)||trace.samples[0];trace.cursor.style.left=t/duration*100+'%';trace.readout.textContent=`Scroll offset ${s[1].toFixed(2)} px`+(s[2]===null?'':` · CSS position ${s[2].toFixed(2)} px`)+` · Target ${trace.target} px`;const hold=trace.holds.find(h=>h.start<=t&&t<h.end);if(hold)trace.readout.textContent+=` · ${hold.duration} ms recorded hold`;}}
  zoom.addEventListener('change',()=>{for(const trace of traces){trace.nativePath.setAttribute('d',path(trace.samples,1,trace.target));trace.cssPath?.setAttribute('d',path(trace.samples,2,trace.target));}});
  range.max=duration;range.disabled=false;range.addEventListener('input',update);update();
 }catch(error){root.querySelector('output').textContent=error.message;}
})();
