// Temporary experiment, injected inside the frozen baseline closure.
function installTouchHandoff({roots,cancelMotion,offset,go}) {
  let gesture=null;
  const tracked=event=>[...event.touches].find(t=>t.identifier===gesture?.id);
  document.addEventListener('touchstart',event=>{
    // A second finger anywhere cancels tracking; never hijack pinch/zoom.
    gesture=null;
    if(event.touches.length!==1)return;
    const root=event.target.closest?.('.md-carousel');
    if(!root||!event.target.closest('.md-carousel-viewport'))return;
    const state=roots.get(root);if(!state)return;
    cancelMotion(state);state.pendingFocus=undefined;
    state.viewport.style.removeProperty('scroll-snap-type');
    const t=event.touches[0];
    gesture={state,id:t.identifier,startX:t.clientX,startY:t.clientY,lastX:t.clientX,lastTime:event.timeStamp,velocity:0,axis:null};
  },{passive:true});
  document.addEventListener('touchmove',event=>{
    if(!gesture)return;
    if(event.touches.length!==1){gesture=null;return;}
    const t=tracked(event);if(!t){gesture=null;return;}
    const dx=t.clientX-gesture.startX,dy=t.clientY-gesture.startY;
    if(!gesture.axis&&Math.max(Math.abs(dx),Math.abs(dy))>=8)
      gesture.axis=Math.abs(dx)>Math.abs(dy)*1.2?'horizontal':'vertical';
    const dt=event.timeStamp-gesture.lastTime;
    if(dt>0)gesture.velocity=(t.clientX-gesture.lastX)/dt;
    gesture.lastX=t.clientX;gesture.lastTime=event.timeStamp;
  },{passive:true});
  document.addEventListener('touchend',event=>{
    const current=gesture;gesture=null;
    if(!current||event.touches.length||current.axis!=='horizontal'||!current.state.root.isConnected)return;
    const {state,velocity,lastTime}=current;
    // Finger motion is opposite logical LTR scrolling, and reversed again for RTL.
    // Add projected momentum (the review sketch subtracted it by mistake).
    const momentum=event.timeStamp-lastTime<80?velocity*(state.rtl?1:-1)*120:0;
    const from=offset(state),index=Math.round((from+momentum)/(state.plan.large+state.plan.gap));
    state.suppress=true;
    state.viewport.style.scrollSnapType='none';
    // Attempt to cancel native inertia before calling the existing fractional clock.
    // Whether this wins against Safari's touch-release processing needs device testing.
    state.viewport.scrollTo({left:(state.rtl?-1:1)*from,behavior:'instant'});
    state.root.dispatchEvent(new CustomEvent('carousel:experiment',{bubbles:true,detail:{experiment:'touch-handoff',from,momentum,targetIndex:Math.max(0,Math.min(state.buttons.length-1,index))}}));
    go(state,index);
  },{passive:true});
  document.addEventListener('touchcancel',()=>{gesture=null;},{passive:true});
  window.addEventListener('blur',()=>{gesture=null;});
}
if(typeof module!=='undefined')module.exports=installTouchHandoff;
