(async()=>{
  const form=document.querySelector('#controls'),q=new URLSearchParams(location.search);
  const allowed={version:['original','baseline','first-token','handoff','isolation','diagnostic','native','rounded','touch-handoff'],variant:['uncontained','hero','multi-browse','full-screen'],size:['large','default','small'],width:['640','384','280','900'],direction:['ltr','rtl']};
  for(const [name,values] of Object.entries(allowed))form.elements[name].value=values.includes(q.get(name))?q.get(name):values[0];
  if(form.elements.version.value==='diagnostic'&&q.get('carousel.masks')!=='fixed'){const url=new URL(location.href);url.searchParams.set('carousel.masks','fixed');location.replace(url.href);return;}
  const config=Object.fromEntries(new FormData(form));
  let recorder;
  form.onsubmit=e=>{
    e.preventDefault();if(recorder?.active)return;
    const url=new URL(location.href);url.search='';url.hash='playground';
    for(const [name,value] of new FormData(form))url.searchParams.set(name,value);
    if(form.elements.version.value==='diagnostic')url.searchParams.set('carousel.masks','fixed');
    location.href=url.href;
  };
  const status=document.querySelector('#capture-status');
  try {
    const response=await fetch('runtimes/manifest.json',{cache:'no-cache'});if(!response.ok)throw Error(`Manifest request failed (HTTP ${response.status}).`);
    const manifest=await response.json(),source=manifest[config.version];
    document.querySelector('#mode-note').textContent=source.note;
    const css=document.createElement('link');css.rel='stylesheet';
    await new Promise((resolve,reject)=>{css.onload=resolve;css.onerror=()=>reject(Error('Styles failed to load.'));css.href='runtimes/'+config.version+'.css?v='+source.cssSHA256;document.head.append(css);});
    const root=document.createElement('section');root.className='md-carousel';root.dataset.variant=config.variant;root.dataset.size=config.size;root.dir=config.direction;root.style.inlineSize=config.width+'px';root.setAttribute('aria-label',source.label+' carousel');root.setAttribute('aria-roledescription','carousel');
    const snaps=Array.from({length:6},()=>'<span class="md-carousel-snap"></span>').join('');
    const items=Array.from({length:6},(_,i)=>`<li class="md-carousel-slot"><button type="button" class="md-carousel-item" data-carousel-index="${i}" aria-label="Item ${i+1} of 6"><span class="md-carousel-art" aria-hidden="true"><svg viewBox="0 0 240 192" preserveAspectRatio="xMidYMid slice" focusable="false"><rect width="240" height="192"></rect><circle cx="${60+i*20}" cy="58" r="35"></circle><path d="M0 192V142L76 62 142 142 190 95 240 145V192Z"></path><path d="M0 192V155L85 112 160 174 240 115V192Z"></path></svg></span><span class="md-carousel-number" aria-hidden="true">${i+1}</span></button></li>`).join('');
    root.innerHTML=`<div class="md-carousel-viewport" tabindex="0" aria-label="Carousel items"><div class="md-carousel-scroll-track"><div class="md-carousel-snaps" aria-hidden="true">${snaps}</div><ol class="md-carousel-track">${items}</ol></div></div><div class="md-carousel-controls"><button type="button" data-carousel-step="-1" aria-label="Previous item">‹</button><output aria-live="polite">Item 1 of 6</output><button type="button" data-carousel-step="1" aria-label="Next item">›</button></div>`;
    document.querySelector('#test-area').append(root);
    const viewport=root.querySelector('.md-carousel-viewport'),buttons=[...root.querySelectorAll('.md-carousel-item')];
    const start=document.querySelector('#start'),stop=document.querySelector('#stop'),download=document.querySelector('#download'),clear=document.querySelector('#clear');
    recorder=new MotionRecorder({readFrame:()=>({scrollLeft:viewport.scrollLeft,index:root.dataset.carouselIndex,settled:root.dataset.carouselSettled,
      items:buttons.map(b=>({width:b.style.width,transform:b.style.transform,left:b.style.insetInlineStart,visibility:b.style.visibility,art:b.querySelector('.md-carousel-art').style.transform}))}),onChange:reason=>{
      const active=!!recorder.active,n=recorder.captures.length;
      start.disabled=active;stop.disabled=!active;download.disabled=active||!n;clear.disabled=active||!n;
      for(const control of form.elements)control.disabled=active;
      status.toggleAttribute('data-recording',active);
      const count=`${n} recording${n===1?'':'s'} ready.`;
      const stopped={'recording limit reached':'limit reached','page hidden':'page hidden'}[reason];
      status.textContent=active?'Recording.':stopped?`Recording stopped: ${stopped}. ${count}`:n?count:reason==='recordings cleared'?'Recordings cleared.':'Ready.';
    }});
    start.onclick=()=>recorder.start({version:config.version,commit:source.baseRevision,runtimeSHA256:source.jsSHA256,cssSHA256:source.cssSHA256,config,
      environment:{ua:navigator.userAgent,dpr:devicePixelRatio,visualViewportScale:window.visualViewport?.scale,innerWidth,innerHeight,viewportWidth:viewport.clientWidth,scrollWidth:viewport.scrollWidth,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches}});
    stop.onclick=()=>recorder.stop();clear.onclick=()=>recorder.clear();
    download.onclick=()=>{
      const url=URL.createObjectURL(new Blob([JSON.stringify(recorder.report(),null,2)],{type:'application/json'}));
      const a=document.createElement('a');a.href=url;a.download='carousel-recording-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    };
    // Listeners only append data while a recording is active. They never start one.
    for(const type of ['touchstart','touchmove','touchend','touchcancel','pointerdown','pointerup','pointercancel','wheel','scroll','scrollend'])
      viewport.addEventListener(type,e=>recorder.event(type,{...(e.pointerType?{pointerType:e.pointerType}:{}),...(e.touches?{touches:e.touches.length}:{})}),{passive:true});
    // A gesture may finish outside the viewport; avoid missing that release.
    for(const type of ['touchend','touchcancel','pointerup','pointercancel'])
      window.addEventListener(type,e=>{if(!viewport.contains(e.target))recorder.event(type,{outsideViewport:true});},{passive:true});
    root.addEventListener('carousel:experiment',e=>recorder.event('experiment',e.detail));
    root.addEventListener('click',e=>{if(e.target.closest('[data-carousel-step]'))recorder.event('arrow-button',{step:e.target.closest('[data-carousel-step]').dataset.carouselStep});},true);
    root.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key))recorder.event('key',{key:e.key});},true);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)recorder.stop('page hidden');});
    const script=document.createElement('script');script.src='runtimes/'+config.version+'.js?v='+source.jsSHA256;
    await new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=()=>reject(Error('Script failed to load.'));document.body.append(script);});
    document.querySelector('#test-area').setAttribute('aria-busy','false');
    document.querySelector('#version-info').textContent=`Runtime ${source.jsSHA256.slice(0,12)} · Reduced motion ${matchMedia('(prefers-reduced-motion: reduce)').matches?'on':'off'}`;
    recorder.onChange();
  } catch(error) {
    document.querySelector('#test-area').setAttribute('aria-busy','false');
    document.querySelector('#mode-note').textContent='Experiment failed to load.';
    const reload=document.querySelector('#reload');reload.hidden=false;reload.onclick=()=>location.reload();
    status.textContent=error.message;console.error(error);
  }
})();
