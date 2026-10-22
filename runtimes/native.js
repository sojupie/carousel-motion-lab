(() => {
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  // Keylines map logical, equally spaced item centers to visible masked centers.
  // Media keeps its full size as the button's visible window changes width.
  function layout(width,preferred,gap,variant,count) {
    if(variant==='uncontained'||variant==='full-screen'||width<176||count<3) {
      const large=variant==='full-screen'?width:Math.min(preferred,width);
      return {large,gap,width,variant:'uncontained',keylines:[]};
    }
    const small=56;
    let large,big=1;
    if(variant==='hero')large=width-2*(small+gap);
    else {
      let best=Infinity;
      for(let n=1;n<=Math.min(count-2,8);n++) {
        const candidate=(width-1.5*small-(n+1)*gap)/(n+.5);
        if(candidate<small*2)continue;
        const cost=Math.abs(candidate-preferred);
        if(cost<best){large=candidate;big=n;best=cost;}
      }
      if(!large)return layout(width,preferred,gap,'uncontained',count);
    }
    const keylines=[];
    if(variant==='hero') {
      keylines.push({i:-1,x:small/2,size:small},{i:0,x:width/2,size:large},{i:1,x:width-small/2,size:small});
    } else {
      keylines.push({i:-1,x:-small/2-gap,size:small});
      for(let i=0;i<big;i++)keylines.push({i,x:i*(large+gap)+large/2,size:large});
      const medium=(large+small)/2,left=big*(large+gap);
      keylines.push({i:big,x:left+medium/2,size:medium},{i:big+1,x:width-small/2,size:small});
    }
    return {width,large,gap,small,variant,keylines};
  }
  function keylineAt(lines,t,gap) {
    if(t<lines[0].i){const p=lines[0];return{x:p.x+(t-p.i)*(p.size+gap),size:p.size};}
    if(t>lines.at(-1).i){const p=lines.at(-1);return{x:p.x+(t-p.i)*(p.size+gap),size:p.size};}
    const right=lines.findIndex(p=>p.i>=t),b=lines[right],a=lines[Math.max(0,right-1)],f=b.i===a.i?0:(t-a.i)/(b.i-a.i);
    return{x:a.x+(b.x-a.x)*f,size:a.size+(b.size-a.size)*f};
  }
  function itemFrame(plan,index,position,count) {
    const {width,large,gap,variant}=plan,step=large+gap,t=index-position;
    if(variant==='uncontained')return{left:t*step,size:large};
    let p=keylineAt(plan.keylines,t,gap);
    if(variant==='hero') {
      // Edge items align to the edge; interior focal items are centered.
      p.x+=(plan.small+gap)*(clamp(position-(count-2),0,1)-clamp(1-position,0,1));
    } else {
      const span=Math.min(plan.keylines.at(-1).i,count-1),mix=clamp((position-(count-1-span))/span,0,1);
      if(mix>0) {
        // Interpolate fixed endpoint layouts. Moving both layouts during the blend
        // makes edges reverse direction and item widths repeatedly shrink and grow.
        const start=keylineAt(plan.keylines,index-(count-1-span),gap);
        const end=keylineAt(plan.keylines,count-1-index,gap);
        p={x:start.x*(1-mix)+(width-end.x)*mix,size:start.size*(1-mix)+end.size*mix};
      }
    }
    return{left:p.x-p.size/2,size:p.size};
  }
  if(typeof module!=='undefined')module.exports={layout,itemFrame};
  if(typeof document==='undefined')return;

  // Control only: fixed-width normal-flow cards inherit native scrolling.
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  for(const root of document.querySelectorAll('.md-carousel')) {
    const viewport=root.querySelector('.md-carousel-viewport');
    const buttons=[...root.querySelectorAll('.md-carousel-item')];
    let step=1,max=0,rtl=false;
    function resize(){
      const style=getComputedStyle(root),view=getComputedStyle(viewport);
      const width=viewport.clientWidth-parseFloat(view.paddingInlineStart)-parseFloat(view.paddingInlineEnd);
      const plan=layout(width,parseFloat(style.getPropertyValue('--_carousel-preferred')),parseFloat(style.getPropertyValue('--_carousel-gap')),root.dataset.variant,buttons.length);
      rtl=style.direction==='rtl';step=plan.large+plan.gap;
      root.style.setProperty('--_carousel-logical',plan.large+'px');
      root.style.setProperty('--_carousel-end',(root.dataset.variant==='uncontained'?0:Math.max(0,width-plan.large))+'px');
      max=viewport.scrollWidth-viewport.clientWidth;
    }
    function go(index,focus=false){
      index=clamp(index,0,buttons.length-1);
      viewport.scrollTo({left:(rtl?-1:1)*Math.min(index*step,max),behavior:reduced.matches?'instant':'smooth'});
      if(focus)buttons[index].focus({preventScroll:true});
    }
    root.querySelector('output').textContent='Native control';
    root.querySelectorAll('[data-carousel-step]').forEach(b=>b.addEventListener('click',()=>go(Math.round(Math.abs(viewport.scrollLeft)/step)+Number(b.dataset.carouselStep))));
    root.addEventListener('keydown',e=>{
      if(e.target.closest('[data-carousel-step]'))return;
      let i=Math.round(Math.abs(viewport.scrollLeft)/step);
      if(e.key==='ArrowRight')i+=rtl?-1:1;
      else if(e.key==='ArrowLeft')i+=rtl?1:-1;
      else if(e.key==='Home')i=0;
      else if(e.key==='End')i=buttons.length-1;
      else return;
      e.preventDefault();go(i,true);
    });
    new ResizeObserver(resize).observe(root);resize();
  }
})();
