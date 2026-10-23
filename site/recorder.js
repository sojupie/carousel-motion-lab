// Capture browser-exposed values; this does not measure compositor presentation.
class MotionRecorder {
  constructor({captures=[],readFrame,onChange=()=>{},now=()=>performance.now(),requestFrame=fn=>requestAnimationFrame(fn),cancelFrame=id=>cancelAnimationFrame(id)}) {
    Object.assign(this,{readFrame,onChange,now,requestFrame,cancelFrame});
    this.captures=captures.slice(-5);this.active=null;this.frame=0;
  }
  // Session storage bridges a settings navigation; recordings return to memory on load.
  static restore(storage) {
    const saved=storage.getItem('carousel-recordings');if(!saved)return [];
    const report=JSON.parse(saved);
    if(report.schema!==2||!Array.isArray(report.captures))throw Error('Invalid saved recordings.');
    storage.removeItem('carousel-recordings');return report.captures;
  }
  saveForNavigation(storage) {
    if(this.captures.length)storage.setItem('carousel-recordings',JSON.stringify(this.report()));
  }
  start(metadata) {
    if(this.active)return false;
    this.active={...metadata,started:this.now(),time:new Date().toISOString(),trigger:'manual',events:[],frames:[]};
    this.event('recording-start');this.onChange();
    this.frame=this.requestFrame(t=>this.sample(t));return true;
  }
  event(type,extra={}) {
    if(!this.active)return;
    if(this.active.events.length>=20000){this.active.eventLimitReached=true;return;}
    this.active.events.push({t:this.now()-this.active.started,type,...extra});
  }
  sample(t) {
    if(!this.active)return;
    this.active.frames.push({t:Math.max(0,t-this.active.started),...this.readFrame()});
    if(t-this.active.started>=60000||this.active.frames.length>=10000){this.stop('recording limit reached');return;}
    this.frame=this.requestFrame(next=>this.sample(next));
  }
  stop(reason='manual stop') {
    if(!this.active)return false;
    this.event('recording-stop',{reason});this.cancelFrame(this.frame);
    this.active.duration=this.now()-this.active.started;
    this.captures.push(this.active);if(this.captures.length>5)this.captures.shift();
    this.active=null;this.onChange(reason);return true;
  }
  clear() {
    if(this.active)return false;
    this.captures=[];this.onChange('recordings cleared');return true;
  }
  report() {
    return {schema:2,note:'Manually started and stopped recordings of native offsets and assigned styles. Not rendered pixels. No continuous layout reads or automatic uploads.',captures:this.captures};
  }
}
if(typeof module!=='undefined')module.exports=MotionRecorder;
