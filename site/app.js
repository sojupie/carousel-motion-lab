(async()=>{
  const form=document.querySelector('#controls'),q=new URLSearchParams(location.search);
  const allowed={version:['original','baseline','first-token','handoff','isolation','diagnostic','native','rounded','touch-handoff'],variant:['uncontained','hero','multi-browse','full-screen'],size:['large','default','small'],width:['640','384','280','900']};
  for(const [name,values] of Object.entries(allowed))form.elements[name].value=values.includes(q.get(name))?q.get(name):values[0];
  if(q.has('direction')){q.delete('direction');history.replaceState(null,'',location.pathname+(q.size?'?'+q.toString():'')+location.hash);}
  // Same filter-pill anatomy and fields runtime as the component previews.
  for(const select of [...form.querySelectorAll('select')]){
    const label=select.parentElement.firstChild.textContent.trim(),id=select.name;
    const wrapper=document.createElement('div');wrapper.className='tokens-preview-filter';wrapper.dataset.fieldExample='';wrapper.dataset.populated='true';
    const choice=select.selectedOptions[0].textContent;
    const options=[...select.options].map((o,i)=>`<li role="presentation"><div class="md-menu-item" id="${id}-option-${i}" role="option" aria-selected="${o.selected}" data-field-option="${o.textContent}" data-field-value="${o.value}"><span>${o.textContent}</span><span data-slot="trailing-icon" aria-hidden="true"><svg viewBox="0 -960 960 960" focusable="false"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"></path></svg></span></div></li>`).join('');
    wrapper.innerHTML=`<button type="button" class="md-filter-chip" id="filter-${id}" role="combobox" aria-label="${label}" aria-expanded="false" aria-haspopup="listbox" aria-controls="${id}-options" aria-autocomplete="none" value="${choice}" data-field-combo data-field-select><span>${label}:</span><span data-field-display>${choice}</span><span data-slot="trailing-icon" aria-hidden="true"><svg viewBox="0 -960 960 960" focusable="false"><path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z"></path></svg></span></button><input type="hidden" name="${id}" value="${select.value}" data-field-value><div class="md-field-menu md-menu tokens-catalog-menu" data-variant="standard" data-orientation="vertical" id="${id}-options" role="listbox" aria-label="${label}" popover="auto"><section><ul role="presentation">${options}</ul></section><p class="md-field-empty" role="option" aria-disabled="true" hidden>No matches</p></div>`;
    select.parentElement.replaceWith(wrapper);
  }
  form.addEventListener('change',()=>form.requestSubmit());
  if(form.elements.version.value==='diagnostic'&&q.get('carousel.masks')!=='fixed'){const url=new URL(location.href);url.searchParams.set('carousel.masks','fixed');location.replace(url.href);return;}
  const config=Object.fromEntries(new FormData(form));
  let recorder;
  form.onsubmit=e=>{
    e.preventDefault();if(recorder?.active)return;
    const url=new URL(location.href);url.search='';url.hash='playground';
    for(const [name,value] of new FormData(form))url.searchParams.set(name,value);
    if(form.elements.version.value==='diagnostic')url.searchParams.set('carousel.masks','fixed');
    try{recorder?.saveForNavigation(sessionStorage);}catch{status.textContent='Recordings could not be preserved. Download JSON before changing settings.';return;}
    location.href=url.href;
  };
  const status=document.querySelector('#capture-status');
  try {
    const response=await fetch('runtimes/manifest.json',{cache:'no-cache'});if(!response.ok)throw Error(`Manifest request failed (HTTP ${response.status}).`);
    const manifest=await response.json(),source=manifest[config.version];
    document.querySelector('#mode-note').textContent=source.note;
    const css=document.createElement('link');css.rel='stylesheet';
    await new Promise((resolve,reject)=>{css.onload=resolve;css.onerror=()=>reject(Error('Styles failed to load.'));css.href='runtimes/'+config.version+'.css?v='+source.cssSHA256;document.head.append(css);});
    const root=document.createElement('section');root.className='md-carousel';root.dataset.variant=config.variant;root.dataset.size=config.size;root.dir='ltr';root.style.inlineSize=config.width+'px';root.setAttribute('aria-label',source.label+' carousel');root.setAttribute('aria-roledescription','carousel');
    const snaps=Array.from({length:6},()=>'<span class="md-carousel-snap"></span>').join('');
    const items=Array.from({length:6},(_,i)=>`<li class="md-carousel-slot"><button type="button" class="md-carousel-item" data-carousel-index="${i}" aria-label="Item ${i+1} of 6"><span class="md-carousel-art" aria-hidden="true"><svg viewBox="0 0 240 192" preserveAspectRatio="xMidYMid slice" focusable="false"><rect width="240" height="192"></rect><circle cx="${60+i*20}" cy="58" r="35"></circle><path d="M0 192V142L76 62 142 142 190 95 240 145V192Z"></path><path d="M0 192V155L85 112 160 174 240 115V192Z"></path></svg></span><span class="md-carousel-number" aria-hidden="true">${i+1}</span></button></li>`).join('');
    // Google Material Symbols Outlined, 24px chevrons (Apache-2.0), embedded without a font.
    root.innerHTML=`<div class="md-carousel-viewport" tabindex="0" aria-label="Carousel items"><div class="md-carousel-scroll-track"><div class="md-carousel-snaps" aria-hidden="true">${snaps}</div><ol class="md-carousel-track">${items}</ol></div></div><div class="md-carousel-controls"><button type="button" data-carousel-step="-1" aria-label="Previous item" class="md-icon-button md-tonal-icon-button"><svg class="material-symbol" viewBox="0 -960 960 960" aria-hidden="true" focusable="false"><path d="M560-240 320-480l240-240 56 56-184 184 184 184-56 56Z"></path></svg></button><output aria-live="polite">Item 1 of 6</output><button type="button" data-carousel-step="1" aria-label="Next item" class="md-icon-button md-tonal-icon-button"><svg class="material-symbol" viewBox="0 -960 960 960" aria-hidden="true" focusable="false"><path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"></path></svg></button></div>`;
    document.querySelector('#test-area').append(root);
    const viewport=root.querySelector('.md-carousel-viewport'),buttons=[...root.querySelectorAll('.md-carousel-item')];
    const start=document.querySelector('#start'),stop=document.querySelector('#stop'),download=document.querySelector('#download'),clear=document.querySelector('#clear');
    let captures=[];try{captures=MotionRecorder.restore(sessionStorage);}catch(error){status.textContent=error.message;}
    recorder=new MotionRecorder({captures,readFrame:()=>({scrollLeft:viewport.scrollLeft,index:root.dataset.carouselIndex,settled:root.dataset.carouselSettled,
      items:buttons.map(b=>({width:b.style.width,transform:b.style.transform,left:b.style.insetInlineStart,visibility:b.style.visibility,art:b.querySelector('.md-carousel-art').style.transform}))}),onChange:reason=>{
      const active=!!recorder.active,n=recorder.captures.length;
      start.disabled=active;stop.disabled=!active;download.disabled=active||!n;clear.disabled=active||!n;
      for(const control of form.elements)control.disabled=active;
      status.toggleAttribute('data-recording',active);
      const count=`${n} recording${n===1?'':'s'} ready.`;
      const stopped={'recording limit reached':'limit reached','page hidden':'page hidden'}[reason];
      status.textContent=active?'Recording.':stopped?`Recording stopped: ${stopped}. ${count}`:n?count:reason==='recordings cleared'?'Recordings cleared.':'Ready.';
    }});
    start.onclick=()=>recorder.start({version:config.version,versionLabel:source.label,commit:source.baseRevision,runtimeSHA256:source.jsSHA256,cssSHA256:source.cssSHA256,config,
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
