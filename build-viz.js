/**
 * Builds a self-contained student vector visualization HTML.
 * Output: viz.html (open directly in browser, no server needed)
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const district = JSON.parse(readFileSync(join(__dirname, 'data', 'district.json'), 'utf-8'));
const timelineRaw = JSON.parse(readFileSync(join(__dirname, 'data', 'timeline.json'), 'utf-8'));

// Slim timeline: dims as flat arrays (index matches DIMS order), no key names
// Each frame = array of [val0, val1, ..., val14] per student (order matches district.students)
const dimKeys = district.stats.dimensions.map(d => d.key);
const slimTimeline = timelineRaw.frames.map(frame => {
  // frame order matches district.students order
  const idMap = {};
  for (const s of frame) idMap[s.id] = s.d;
  return district.students.map(st => {
    const d = idMap[st.id];
    return dimKeys.map(k => +(d[k] || 0).toFixed(2));
  });
});
const MONTHS_JSON = JSON.stringify(timelineRaw.months);
const FEATURED_JSON = JSON.stringify(timelineRaw.featured || []);

// Slim data for embedding
const slimStudents = district.students.map(s => ({
  id: s.id, fn: s.firstName, ln: s.lastName, g: s.grade,
  sc: s.school, st: s.schoolType, o: s.outcome,
  d: s.dims, r: s.raw, f: s.flags
}));

console.log(`Students: ${slimStudents.length}`);
console.log(`Schools: ${district.stats.schools.map(s => s.name).join(', ')}`);
console.log(`Outcomes: ${JSON.stringify(district.stats.outcomes)}`);

const DIM_META = JSON.stringify(district.stats.dimensions);
const STATS = JSON.stringify(district.stats);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Student Vectors — 15D District Visualization</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0e17;color:#c8d6e5;font-family:'SF Mono',Monaco,Consolas,monospace;font-size:13px;overflow-x:hidden}
.hdr{background:linear-gradient(135deg,#0f1923,#1a2332);border-bottom:1px solid #1e3a5f;padding:12px 24px;display:flex;justify-content:space-between;align-items:center}
.hdr h1{font-size:16px;color:#00d4ff;font-weight:600;letter-spacing:1px}
.hdr .sub{color:#5a6c7d;font-size:11px}
.tabs{display:flex;gap:2px;background:#0d1117;padding:4px 20px;border-bottom:1px solid #1e3a5f}
.tab{padding:8px 16px;cursor:pointer;border-radius:4px 4px 0 0;color:#5a6c7d;transition:all .2s;font-size:12px}
.tab:hover{color:#c8d6e5;background:#151d2b}
.tab.active{color:#00d4ff;background:#151d2b;border-bottom:2px solid #00d4ff}
.view{display:none;height:calc(100vh - 100px)}
.view.active{display:flex}
.ctrls{position:absolute;top:12px;left:12px;display:flex;flex-direction:column;gap:8px;z-index:10}
.sel{background:#151d2b;border:1px solid #1e3a5f;color:#c8d6e5;padding:4px 8px;border-radius:4px;font-size:11px;font-family:inherit}
.sel option{background:#151d2b}
.legend{position:absolute;bottom:12px;right:12px;background:rgba(15,25,35,.9);border:1px solid #1e3a5f;border-radius:6px;padding:10px 14px;font-size:11px;z-index:10}
.lr{display:flex;align-items:center;gap:6px;margin:3px 0}
.ld{width:10px;height:10px;border-radius:50%}
.btn{background:#1e3a5f;border:none;color:#c8d6e5;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:11px;font-family:inherit}
.btn:hover{background:#2a5080}
.btn.on{background:#00d4ff;color:#0a0e17}
label{font-size:11px;color:#5a6c7d}
.ip{position:absolute;background:rgba(15,25,35,.95);border:1px solid #1e3a5f;border-radius:6px;padding:12px;font-size:11px;max-width:320px;z-index:20;display:none}
.ip.show{display:block}
.ip h4{color:#00d4ff;margin-bottom:6px}
.ip .r{display:flex;justify-content:space-between;padding:2px 0}
.ip .v{color:#fff}
.db{height:4px;background:#1e3a5f;border-radius:2px;margin-top:2px}
.df{height:100%;border-radius:2px}
#view-parallel{flex-direction:column}
.pctl{padding:8px 20px;display:flex;gap:12px;align-items:center;background:#0d1117;border-top:1px solid #1e3a5f;flex-wrap:wrap}
.gi{position:absolute;top:12px;left:12px;background:rgba(15,25,35,.9);border:1px solid #1e3a5f;border-radius:6px;padding:10px;font-size:11px;max-width:280px;z-index:10}
#view-radar{flex-direction:column;align-items:center;justify-content:center;gap:20px}
.rr{display:flex;gap:20px;justify-content:center;flex-wrap:wrap}
.rc{background:#151d2b;border:1px solid #1e3a5f;border-radius:8px;padding:12px;text-align:center}
.rc h3{font-size:12px;color:#00d4ff;margin-bottom:8px}

/* Learn tab */
#vln{flex-direction:row;overflow:hidden}
.learn-nav{width:220px;background:#0d1117;border-right:1px solid #1e3a5f;overflow-y:auto;flex-shrink:0;padding:12px 0}
.learn-step{padding:10px 16px;cursor:pointer;color:#5a6c7d;font-size:12px;border-left:3px solid transparent;transition:all .2s}
.learn-step:hover{color:#c8d6e5;background:#151d2b}
.learn-step.active{color:#00d4ff;border-left-color:#00d4ff;background:#151d2b}
.learn-step .snum{display:inline-block;width:22px;height:22px;border-radius:50%;background:#1e3a5f;color:#c8d6e5;text-align:center;line-height:22px;font-size:10px;margin-right:8px}
.learn-step.active .snum{background:#00d4ff;color:#0a0e17}
.learn-step.done .snum{background:#00ff88;color:#0a0e17}
.learn-body{flex:1;display:flex;flex-direction:column;overflow:hidden}
.learn-content{flex:1;display:flex;overflow:hidden}
.learn-text{width:380px;padding:24px;overflow-y:auto;border-right:1px solid #1e3a5f;flex-shrink:0}
.learn-text h2{color:#00d4ff;font-size:18px;margin-bottom:12px;font-weight:600}
.learn-text h3{color:#ff8800;font-size:13px;margin:16px 0 8px;font-weight:600}
.learn-text p{color:#c8d6e5;font-size:12px;line-height:1.7;margin-bottom:12px}
.learn-text .key{color:#00ff88;font-weight:600}
.learn-text .dim-tag{display:inline-block;padding:2px 8px;border-radius:3px;font-size:11px;margin:2px}
.learn-text .analogy{background:#1a2332;border-left:3px solid #ff8800;padding:10px 12px;margin:12px 0;border-radius:0 4px 4px 0;font-size:12px;color:#ffcc00}
.learn-text .formula{background:#0d1117;border:1px solid #1e3a5f;padding:8px 12px;margin:10px 0;border-radius:4px;font-size:12px;color:#00d4ff;font-family:inherit}
.learn-canvas{flex:1;position:relative}
.learn-canvas canvas{width:100%;height:100%}
.learn-footer{padding:10px 20px;background:#0d1117;border-top:1px solid #1e3a5f;display:flex;justify-content:space-between;align-items:center}
.learn-footer .btn{padding:6px 16px;font-size:12px}
.learn-footer .progress{color:#5a6c7d;font-size:11px}

/* Domains */
.dom-acad{color:#00d4ff}.dom-behav{color:#ff8800}.dom-well{color:#00ff88}.dom-env{color:#ff44ff}

/* Journey tab */
#vjr{flex-direction:column;position:relative}
.jctrls{position:absolute;top:12px;left:12px;display:flex;flex-direction:column;gap:8px;z-index:10}
.jtl{background:#0d1117;border-top:1px solid #1e3a5f;padding:10px 20px;display:flex;align-items:center;gap:16px}
.jtl .month-bar{flex:1;display:flex;gap:2px;align-items:center}
.jtl .month-pip{flex:1;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:4px;font-size:11px;color:#5a6c7d;transition:all .15s;background:#151d2b;border:1px solid #1e3a5f}
.jtl .month-pip:hover{background:#1e3a5f;color:#c8d6e5}
.jtl .month-pip.active{background:#00d4ff;color:#0a0e17;font-weight:700;border-color:#00d4ff}
.jtl .month-pip.past{background:#1a3a4f;color:#5a9abf;border-color:#1e4a6f}
.jmonth{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:64px;font-weight:800;color:rgba(0,212,255,.08);pointer-events:none;z-index:1;letter-spacing:8px}
.jlegend{position:absolute;bottom:60px;right:12px;background:rgba(15,25,35,.9);border:1px solid #1e3a5f;border-radius:6px;padding:10px 14px;font-size:11px;z-index:10}
.jhover{position:absolute;background:rgba(15,25,35,.95);border:1px solid #1e3a5f;border-radius:6px;padding:10px;font-size:11px;max-width:260px;z-index:20;display:none;pointer-events:none}
.jhover.show{display:block}
</style>
</head>
<body>
<div class="hdr">
  <div><h1>STUDENT VECTORS — 15D DISTRICT ANALYSIS</h1><div class="sub">${slimStudents.length} students | 4 schools | 15 dimensions | 4 domains</div></div>
  <div style="text-align:right"><div style="color:#00d4ff;font-size:12px">RuVector Student Analytics</div><div class="sub">Synthetic District Data</div></div>
</div>
<div class="tabs">
  <div class="tab active" data-v="vln">Learn</div>
  <div class="tab" data-v="v3d">3D Scatter</div>
  <div class="tab" data-v="vpc">Parallel Coordinates</div>
  <div class="tab" data-v="vgr">Similarity Graph</div>
  <div class="tab" data-v="vsc">School Compare</div>
  <div class="tab" data-v="vjr">Journey</div>
  <div class="tab" data-v="vrd">Student Profiles</div>
</div>

<div id="vln" class="view active">
  <div class="learn-nav" id="learn-nav"></div>
  <div class="learn-body">
    <div class="learn-content">
      <div class="learn-text" id="learn-text"></div>
      <div class="learn-canvas"><canvas id="learn-cv"></canvas></div>
    </div>
    <div class="learn-footer">
      <button class="btn" id="learn-prev" disabled>Back</button>
      <span style="display:flex;align-items:center;gap:8px"><label>Spin:</label><input type="range" id="learn-spd" min="0" max="50" value="8" style="width:80px"><label>Zoom:</label><input type="range" id="learn-zoom" min="30" max="300" value="100" style="width:80px"></span>
      <span class="progress" id="learn-progress">Step 1 of 9</span>
      <button class="btn on" id="learn-next">Next Step</button>
    </div>
  </div>
</div>

<div id="v3d" class="view" style="position:relative">
  <canvas id="c3d"></canvas>
  <div class="ctrls">
    <div><label>X:</label><select class="sel" id="ax"></select></div>
    <div><label>Y:</label><select class="sel" id="ay"></select></div>
    <div><label>Z:</label><select class="sel" id="az"></select></div>
    <div><label>Color:</label><select class="sel" id="ac"></select></div>
    <div><label>Size:</label><select class="sel" id="as"></select></div>
    <div style="margin-top:8px"><label>Spin: </label><input type="range" id="spd" min="0" max="100" value="30"></div>
    <div><label>Edges: </label><input type="checkbox" id="edg"></div>
    <div style="margin-top:4px">
      <button class="btn on sf" data-f="all">All</button>
      <button class="btn sf" data-f="on-track">On-Track</button>
      <button class="btn sf" data-f="watch">Watch</button>
      <button class="btn sf" data-f="risk">At-Risk</button>
    </div>
  </div>
  <div class="legend">
    <div style="color:#00d4ff;margin-bottom:4px;font-weight:600">Outcome Color</div>
    <div class="lr"><div class="ld" style="background:#00ff88"></div>On-Track</div>
    <div class="lr"><div class="ld" style="background:#ffcc00"></div>Watch</div>
    <div class="lr"><div class="ld" style="background:#ff4466"></div>High-Risk</div>
    <div class="lr"><div class="ld" style="background:#00d4ff"></div>Resilient</div>
    <div class="lr"><div class="ld" style="background:#ff8800"></div>Hidden-Risk</div>
    <div class="lr"><div class="ld" style="background:#8844ff"></div>Intervention</div>
    <div style="margin-top:6px;color:#5a6c7d">Drag rotate | Scroll zoom</div>
  </div>
  <div class="ip" id="i3" style="top:12px;right:12px"><h4>Student Details</h4><div id="i3c"></div></div>
</div>

<div id="vpc" class="view">
  <canvas id="cpc"></canvas>
  <div class="pctl">
    <label>Highlight:</label>
    <button class="btn on pc" data-f="all">All</button>
    <button class="btn pc" data-f="on-track">On-Track</button>
    <button class="btn pc" data-f="watch">Watch</button>
    <button class="btn pc" data-f="risk">At-Risk</button>
    <span style="color:#1e3a5f">|</span>
    <button class="btn pc" data-f="elementary">Elementary</button>
    <button class="btn pc" data-f="middle">Middle</button>
    <button class="btn pc" data-f="high">High</button>
    <span style="color:#1e3a5f">|</span>
    <label>Opacity:</label><input type="range" id="pco" min="5" max="100" value="30">
  </div>
</div>

<div id="vgr" class="view" style="position:relative">
  <canvas id="cgr"></canvas>
  <div class="gi">
    <h4 style="color:#00d4ff">Student Similarity Graph</h4>
    <p style="margin:4px 0">Nodes = student vectors (15D)</p>
    <p style="margin:4px 0">Edges = k-nearest neighbors</p>
    <p style="margin:4px 0;color:#5a6c7d">Color = outcome<br>Size = number of flags</p>
    <div style="margin-top:8px"><label>K: </label><input type="range" id="gk" min="2" max="8" value="4"><span id="gkv">4</span></div>
    <div style="margin-top:4px"><label>Repulsion: </label><input type="range" id="grep" min="10" max="200" value="80"></div>
    <div style="margin-top:4px"><label>Sample: </label><input type="range" id="gsmp" min="50" max="300" value="120"><span id="gsmpv">120</span></div>
  </div>
  <div class="ip" id="igr" style="top:12px;right:12px"><h4>Student</h4><div id="igrc"></div></div>
</div>

<div id="vsc" class="view" style="position:relative">
  <canvas id="csc"></canvas>
  <div class="pctl">
    <label>Compare:</label>
    <button class="btn on sc" data-m="school">By School</button>
    <button class="btn sc" data-m="outcome">By Outcome</button>
    <button class="btn sc" data-m="grade">By Grade Level</button>
  </div>
</div>

<div id="vjr" class="view">
  <canvas id="cjr" style="flex:1"></canvas>
  <div class="jctrls">
    <div><label>X:</label><select class="sel" id="jx"></select></div>
    <div><label>Y:</label><select class="sel" id="jy"></select></div>
    <div><label>Z:</label><select class="sel" id="jz"></select></div>
    <div style="margin-top:4px"><label>Spin: </label><input type="range" id="jspd" min="0" max="100" value="15" style="width:80px"></div>
    <div><label>Trails: </label><input type="range" id="jtrail" min="0" max="9" value="3" style="width:80px"><span id="jtrailv" style="color:#5a6c7d;font-size:10px;margin-left:4px">3</span></div>
    <div><label>Speed: </label><input type="range" id="jrate" min="1" max="30" value="8" style="width:80px"></div>
    <div style="margin-top:4px">
      <button class="btn on jf" data-f="all">All</button>
      <button class="btn jf" data-f="on-track">Steady</button>
      <button class="btn jf" data-f="risk">Risk</button>
      <button class="btn jf" data-f="ell">ELL</button>
    </div>
    <div style="margin-top:2px">
      <button class="btn jf" data-f="resilient">Resilient</button>
      <button class="btn jf" data-f="hidden-risk">Hidden</button>
      <button class="btn jf" data-f="intervention">Interv.</button>
    </div>
    <div style="margin-top:6px;border-top:1px solid #1e3a5f;padding-top:6px">
      <button class="btn jf" data-f="featured" style="background:#ff8800;color:#0a0e17;font-weight:700">Featured</button>
    </div>
    <div id="jnames" style="margin-top:6px;font-size:9px;color:#5a6c7d;max-height:120px;overflow-y:auto"></div>
  </div>
  <div class="jmonth" id="jmonth-bg">SEP</div>
  <div class="jlegend">
    <div style="color:#00d4ff;margin-bottom:4px;font-weight:600">Student Journey</div>
    <div class="lr"><div class="ld" style="background:#00ff88"></div>On-Track</div>
    <div class="lr"><div class="ld" style="background:#ffcc00"></div>Watch</div>
    <div class="lr"><div class="ld" style="background:#ff4466"></div>High-Risk</div>
    <div class="lr"><div class="ld" style="background:#00d4ff"></div>Resilient</div>
    <div class="lr"><div class="ld" style="background:#ff8800"></div>Hidden-Risk</div>
    <div class="lr"><div class="ld" style="background:#8844ff"></div>Intervention</div>
    <div style="margin-top:6px;color:#5a6c7d">Fading trails = past months</div>
  </div>
  <div class="jhover" id="jhover"><div id="jhoverc"></div></div>
  <div class="jtl">
    <button class="btn" id="jplay" style="width:50px">Play</button>
    <div class="month-bar" id="jbar"></div>
  </div>
</div>

<div id="vrd" class="view">
  <div style="color:#00d4ff;font-size:14px;font-weight:600;margin-top:20px;text-align:center">Student Vector Profiles</div>
  <div style="color:#5a6c7d;font-size:11px;margin-bottom:10px;text-align:center">Each axis = 1 of 15 dimensions (0-1)</div>
  <div class="rr" id="rdc"></div>
  <div style="display:flex;gap:12px;align-items:center;padding:10px;justify-content:center">
    <button class="btn" id="rp">Prev</button><span id="rpg" style="color:#5a6c7d">Page 1</span><button class="btn" id="rn">Next</button>
    <span style="color:#1e3a5f">|</span>
    <button class="btn" id="rres">Resilient</button><button class="btn" id="rhr">Hidden-Risk</button><button class="btn" id="rrsk">High-Risk</button><button class="btn" id="rr2">Random</button>
  </div>
</div>

<script>
// === EMBEDDED DATA ===
const S=${JSON.stringify(slimStudents)};
const DIM_META=${DIM_META};
const STATS=${STATS};
const TL_MONTHS=${MONTHS_JSON};
const TL_FRAMES=${JSON.stringify(slimTimeline)};
const FEATURED=${FEATURED_JSON};
const FEATURED_IDS=new Set(FEATURED.map(f=>f.id));

// Expand students
const STUDENTS=S.map(s=>({id:s.id,firstName:s.fn,lastName:s.ln,grade:s.g,school:s.sc,schoolType:s.st,outcome:s.o,dims:s.d,raw:s.r,flags:s.f}));

// === UTILS ===
const DIMS=DIM_META.map(d=>d.key);
const DLBL=DIM_META.map(d=>d.label);
const DOMAINS={Academic:'#00d4ff',Behavioral:'#ff8800',Wellness:'#00ff88',Environment:'#ff44ff'};
const DCOL=DIM_META.map(d=>DOMAINS[d.domain]||'#c8d6e5');

function getVec(s){return DIMS.map(k=>s.dims[k]||0);}
function cosim(a,b){let d=0,na=0,nb=0;for(let i=0;i<a.length;i++){d+=a[i]*b[i];na+=a[i]*a[i];nb+=b[i]*b[i];}return na>0&&nb>0?d/(Math.sqrt(na)*Math.sqrt(nb)):0;}
function normVecs(vecs){const mn=Array(15).fill(1/0),mx=Array(15).fill(-1/0);for(const v of vecs)for(let i=0;i<15;i++){if(v[i]<mn[i])mn[i]=v[i];if(v[i]>mx[i])mx[i]=v[i];}return vecs.map(v=>v.map((x,i)=>mx[i]>mn[i]?(x-mn[i])/(mx[i]-mn[i]):0.5));}

function outcomeC(o,a){
  const m={'on-track':\`rgba(0,255,136,\${a||1})\`,'watch':\`rgba(255,204,0,\${a||1})\`,'high-risk':\`rgba(255,68,102,\${a||1})\`,
    'resilient':\`rgba(0,212,255,\${a||1})\`,'hidden-risk':\`rgba(255,136,0,\${a||1})\`,'intervention-success':\`rgba(136,68,255,\${a||1})\`};
  return m[o]||\`rgba(200,214,229,\${a||1})\`;
}
function schoolC(s){
  if(s.includes('Riverside'))return'#00d4ff';if(s.includes('Lincoln'))return'#ff8800';
  if(s.includes('Jefferson'))return'#00ff88';return'#ff44ff';
}
function flagCount(f){return Object.values(f).filter(v=>v).length;}

// === TABS ===
document.querySelectorAll('.tab').forEach(tb=>{
  tb.onclick=()=>{
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    tb.classList.add('active');
    document.getElementById(tb.dataset.v).classList.add('active');
    requestAnimationFrame(()=>{
      switch(tb.dataset.v){case'vln':renderLearn();break;case'v3d':init3D();break;case'vpc':drawPC();break;case'vgr':initGr();break;case'vsc':drawSC();break;case'vjr':initJourney();break;case'vrd':drawRd();break;}
    });
  };
});

// === 3D SCATTER ===
let r3={x:0.4,y:0},z3=1,d3=null,f3='all';
const TK=DIMS;

function init3D(){
  const c=document.getElementById('c3d'),p=c.parentElement.getBoundingClientRect();
  c.width=p.width*devicePixelRatio;c.height=p.height*devicePixelRatio;
  c.style.width=p.width+'px';c.style.height=p.height+'px';
  const defs={ax:'gpa',ay:'attendance',az:'socioeconomic',ac:'gpa',as:'testScore'};
  for(const[id,def]of Object.entries(defs)){
    const s=document.getElementById(id);if(s.options.length>1)continue;
    s.innerHTML='';for(let i=0;i<DIMS.length;i++){const o=document.createElement('option');o.value=DIMS[i];o.textContent=DLBL[i];if(DIMS[i]===def)o.selected=true;s.appendChild(o);}
  }
  c.onmousedown=e=>{d3={x:e.clientX,y:e.clientY,rx:r3.x,ry:r3.y};};
  c.onmousemove=e=>{if(d3){r3.y=d3.ry+(e.clientX-d3.x)*.005;r3.x=d3.rx-(e.clientY-d3.y)*.005;}};
  c.onmouseup=()=>d3=null;
  c.onwheel=e=>{z3=Math.max(.3,Math.min(3,z3-e.deltaY*.001));e.preventDefault();};
  document.querySelectorAll('.sf').forEach(b=>{b.onclick=function(){f3=this.dataset.f;document.querySelectorAll('.sf').forEach(x=>x.classList.remove('on'));this.classList.add('on');}});
  anim3D();
}

function proj(x,y,z,w,h){
  const c=Math.cos,s=Math.sin,ry=r3.y,rx=r3.x;
  let x1=x*c(ry)-z*s(ry),z1=x*s(ry)+z*c(ry);
  let y1=y*c(rx)-z1*s(rx),z2=y*s(rx)+z1*c(rx);
  const p=3/(3+z2*.5),sc=.35*z3*Math.min(w,h);
  return{sx:w/2+x1*sc*p,sy:h/2-y1*sc*p,d:z2,sc:p};
}

function anim3D(){
  const c=document.getElementById('c3d');
  if(!document.getElementById('v3d').classList.contains('active')){requestAnimationFrame(anim3D);return;}
  const ctx=c.getContext('2d'),w=c.width,h=c.height,dp=devicePixelRatio;
  ctx.clearRect(0,0,w,h);
  if(!d3)r3.y+=document.getElementById('spd').value/5000;
  const xK=document.getElementById('ax').value,yK=document.getElementById('ay').value,zK=document.getElementById('az').value,cK=document.getElementById('ac').value;
  let students=STUDENTS;
  if(f3==='on-track')students=students.filter(s=>s.outcome==='on-track');
  else if(f3==='watch')students=students.filter(s=>s.outcome==='watch');
  else if(f3==='risk')students=students.filter(s=>['high-risk','hidden-risk','resilient','intervention-success'].includes(s.outcome));

  const gv=(s,k)=>s.dims[k]||0;
  const rng=k=>{const v=students.map(s=>gv(s,k));return{mn:Math.min(...v),mx:Math.max(...v)};};
  const nm=(v,r)=>r.mx>r.mn?(v-r.mn)/(r.mx-r.mn)*2-1:0;
  const xR=rng(xK),yR=rng(yK),zR=rng(zK),cR=rng(cK);

  // Axes
  ctx.save();ctx.globalAlpha=.4;ctx.strokeStyle='#1e3a5f';ctx.lineWidth=dp;
  let a,b;
  a=proj(-1,-1,-1,w,h);b=proj(1,-1,-1,w,h);ctx.beginPath();ctx.moveTo(a.sx,a.sy);ctx.lineTo(b.sx,b.sy);ctx.stroke();
  a=proj(-1,-1,-1,w,h);b=proj(-1,1,-1,w,h);ctx.beginPath();ctx.moveTo(a.sx,a.sy);ctx.lineTo(b.sx,b.sy);ctx.stroke();
  a=proj(-1,-1,-1,w,h);b=proj(-1,-1,1,w,h);ctx.beginPath();ctx.moveTo(a.sx,a.sy);ctx.lineTo(b.sx,b.sy);ctx.stroke();
  ctx.globalAlpha=.8;ctx.fillStyle='#00d4ff';ctx.font=12*dp+'px monospace';
  let l=proj(1.15,-1,-1,w,h);ctx.fillText(DLBL[DIMS.indexOf(xK)]||xK,l.sx,l.sy);
  l=proj(-1,1.15,-1,w,h);ctx.fillText(DLBL[DIMS.indexOf(yK)]||yK,l.sx,l.sy);
  l=proj(-1,-1,1.15,w,h);ctx.fillText(DLBL[DIMS.indexOf(zK)]||zK,l.sx,l.sy);
  ctx.restore();

  // Edges
  if(document.getElementById('edg').checked&&students.length<200){
    const vecs=students.map(s=>getVec(s)),nv=normVecs(vecs);
    const pts2=students.map((s,i)=>{const p=proj(nm(gv(s,xK),xR),nm(gv(s,yK),yR),nm(gv(s,zK),zR),w,h);return{...p,s,i};});
    ctx.save();
    for(let i=0;i<pts2.length;i++){const pi=pts2[i],vi=nv[pi.i],sims=[];
      for(let j=0;j<pts2.length;j++){if(i===j)continue;sims.push({j,s:cosim(vi,nv[pts2[j].i])});}
      sims.sort((a,b)=>b.s-a.s);
      for(let k=0;k<Math.min(3,sims.length);k++){const pj=pts2[sims[k].j];
        ctx.globalAlpha=Math.max(.02,(sims[k].s-.8)*2);ctx.strokeStyle='#1e3a5f';ctx.lineWidth=.5*dp;
        ctx.beginPath();ctx.moveTo(pi.sx,pi.sy);ctx.lineTo(pj.sx,pj.sy);ctx.stroke();}}
    ctx.restore();
  }

  // Points
  const pts=students.map((s,i)=>{const p=proj(nm(gv(s,xK),xR),nm(gv(s,yK),yR),nm(gv(s,zK),zR),w,h);return{...p,s,i,cv:cR.mx>cR.mn?(gv(s,cK)-cR.mn)/(cR.mx-cR.mn):0.5};});
  pts.sort((a,b)=>b.d-a.d);
  for(const p of pts){
    const rad=(3+p.cv*5)*dp*p.sc;
    ctx.save();ctx.globalAlpha=.7;ctx.fillStyle=outcomeC(p.s.outcome,.8);
    ctx.beginPath();ctx.arc(p.sx,p.sy,rad,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=schoolC(p.s.school);ctx.lineWidth=1.5*dp;ctx.globalAlpha=.4;ctx.stroke();ctx.restore();
  }
  requestAnimationFrame(anim3D);
}

// === PARALLEL COORDINATES ===
let pcF='all';
function drawPC(){
  const c=document.getElementById('cpc'),p=c.parentElement.getBoundingClientRect();
  c.width=p.width*devicePixelRatio;c.height=(p.height-50)*devicePixelRatio;
  c.style.width=p.width+'px';c.style.height=(p.height-50)+'px';
  const ctx=c.getContext('2d'),w=c.width,h=c.height,dp=devicePixelRatio;
  ctx.clearRect(0,0,w,h);
  const mg={l:60*dp,r:40*dp,t:50*dp,b:40*dp},pw=w-mg.l-mg.r,ph=h-mg.t-mg.b;
  const n=15,sp=pw/(n-1);

  // Axis lines and labels
  ctx.save();
  for(let d=0;d<n;d++){const x=mg.l+d*sp;
    ctx.strokeStyle='#1e3a5f';ctx.lineWidth=dp;ctx.beginPath();ctx.moveTo(x,mg.t);ctx.lineTo(x,mg.t+ph);ctx.stroke();
    ctx.save();ctx.fillStyle=DCOL[d];ctx.font=10*dp+'px monospace';ctx.translate(x,mg.t-8*dp);ctx.rotate(-.5);ctx.fillText(DLBL[d],0,0);ctx.restore();
    ctx.fillStyle='#5a6c7d';ctx.font=8*dp+'px monospace';
    for(let tk=0;tk<=1;tk+=.5)ctx.fillText(tk.toFixed(1),x-14*dp,mg.t+ph*(1-tk)+3*dp);}
  ctx.restore();

  // Domain separators
  const domBounds=[{i:5,l:'Academic'},{i:8,l:'Behavioral'},{i:10,l:'Wellness'},{i:15,l:'Environment'}];
  let prev=0;
  ctx.save();ctx.globalAlpha=.1;
  for(const db of domBounds){
    const x1=mg.l+prev*sp-sp*.3,x2=mg.l+(db.i-1)*sp+sp*.3;
    const cols={Academic:'#00d4ff',Behavioral:'#ff8800',Wellness:'#00ff88',Environment:'#ff44ff'};
    ctx.fillStyle=cols[db.l]||'#1e3a5f';ctx.fillRect(x1,mg.t,x2-x1,ph);prev=db.i;}
  ctx.restore();

  const op=document.getElementById('pco').value/100;
  for(const s of STUDENTS){
    const v=getVec(s);
    let a=op;
    if(pcF==='on-track'&&s.outcome!=='on-track')a*=.08;
    if(pcF==='watch'&&s.outcome!=='watch')a*=.08;
    if(pcF==='risk'&&!['high-risk','hidden-risk','resilient','intervention-success'].includes(s.outcome))a*=.08;
    if(pcF==='elementary'&&s.schoolType!=='elementary')a*=.08;
    if(pcF==='middle'&&s.schoolType!=='middle')a*=.08;
    if(pcF==='high'&&s.schoolType!=='high')a*=.08;
    ctx.save();ctx.globalAlpha=a;ctx.strokeStyle=outcomeC(s.outcome);ctx.lineWidth=1.5*dp;ctx.beginPath();
    for(let d=0;d<n;d++){const x=mg.l+d*sp,y=mg.t+ph*(1-v[d]);d===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
    ctx.stroke();ctx.restore();
  }
  ctx.fillStyle='#00d4ff';ctx.font='bold '+14*dp+'px monospace';
  ctx.fillText('Parallel Coordinates — '+STUDENTS.length+' Students x 15 Dimensions',mg.l,24*dp);
}
document.querySelectorAll('.pc').forEach(b=>{b.onclick=function(){pcF=this.dataset.f;document.querySelectorAll('.pc').forEach(x=>x.classList.remove('on'));this.classList.add('on');drawPC();};});
document.getElementById('pco')?.addEventListener('input',drawPC);

// === SIMILARITY GRAPH ===
let gN=[],gE=[],gD=null,gH=null,gI=false;
function initGr(){
  if(gI&&gN.length){simGr();return;}
  const smpN=+document.getElementById('gsmp').value;
  // Sample students (stratified by outcome)
  const sampled=[];const byOut={};
  for(const s of STUDENTS){if(!byOut[s.outcome])byOut[s.outcome]=[];byOut[s.outcome].push(s);}
  for(const[o,arr]of Object.entries(byOut)){
    const n=Math.max(2,Math.round(smpN*arr.length/STUDENTS.length));
    const shuffled=[...arr].sort(()=>Math.random()-.5);
    sampled.push(...shuffled.slice(0,n));
  }
  const gt=sampled.slice(0,smpN);
  const vecs=gt.map(s=>getVec(s)),nv=normVecs(vecs);
  const K=+document.getElementById('gk').value;
  gN=gt.map((s,i)=>({x:Math.random()*800-400,y:Math.random()*600-300,vx:0,vy:0,s,vec:nv[i],i,r:4+flagCount(s.flags)*2}));
  gE=[];
  for(let i=0;i<nv.length;i++){const sims=[];for(let j=0;j<nv.length;j++){if(i===j)continue;sims.push({j,s:cosim(nv[i],nv[j])});}
    sims.sort((a,b)=>b.s-a.s);for(let k=0;k<Math.min(K,sims.length);k++)gE.push({s:i,t:sims[k].j,sim:sims[k].s});}
  gI=true;
  const c=document.getElementById('cgr');
  c.onmousedown=e=>{const r=c.getBoundingClientRect(),mx=e.clientX-r.left-r.width/2,my=e.clientY-r.top-r.height/2;
    for(const n of gN)if(Math.hypot(n.x-mx,n.y-my)<n.r*2){gD=n;break;}};
  c.onmousemove=e=>{const r=c.getBoundingClientRect(),mx=e.clientX-r.left-r.width/2,my=e.clientY-r.top-r.height/2;
    if(gD){gD.x=mx;gD.y=my;gD.vx=0;gD.vy=0;}
    gH=null;for(const n of gN)if(Math.hypot(n.x-mx,n.y-my)<n.r*2){gH=n;break;}
    updGI();};
  c.onmouseup=()=>gD=null;
  document.getElementById('gk').oninput=function(){document.getElementById('gkv').textContent=this.value;gI=false;initGr();};
  document.getElementById('gsmp').oninput=function(){document.getElementById('gsmpv').textContent=this.value;gI=false;initGr();};
  simGr();
}
function simGr(){
  if(!document.getElementById('vgr').classList.contains('active'))return;
  const rep=+document.getElementById('grep').value;
  for(const n of gN){n.vx*=.9;n.vy*=.9;}
  for(let i=0;i<gN.length;i++)for(let j=i+1;j<gN.length;j++){
    const dx=gN[i].x-gN[j].x,dy=gN[i].y-gN[j].y,dist=Math.max(Math.hypot(dx,dy),1),f=rep/(dist*dist),fx=dx/dist*f,fy=dy/dist*f;
    if(gN[i]!==gD){gN[i].vx+=fx;gN[i].vy+=fy;}if(gN[j]!==gD){gN[j].vx-=fx;gN[j].vy-=fy;}}
  for(const e of gE){const s=gN[e.s],t=gN[e.t],dx=t.x-s.x,dy=t.y-s.y,dist=Math.max(Math.hypot(dx,dy),1),f=(dist-50)*.01*e.sim,fx=dx/dist*f,fy=dy/dist*f;
    if(s!==gD){s.vx+=fx;s.vy+=fy;}if(t!==gD){t.vx-=fx;t.vy-=fy;}}
  for(const n of gN){if(n===gD)continue;n.vx-=n.x*.001;n.vy-=n.y*.001;n.x+=n.vx;n.y+=n.vy;}
  drawGr();requestAnimationFrame(simGr);
}
function drawGr(){
  const c=document.getElementById('cgr'),p=c.parentElement.getBoundingClientRect();
  c.width=p.width*devicePixelRatio;c.height=p.height*devicePixelRatio;c.style.width=p.width+'px';c.style.height=p.height+'px';
  const ctx=c.getContext('2d'),w=c.width,h=c.height,dp=devicePixelRatio,cx=w/2,cy=h/2;
  ctx.clearRect(0,0,w,h);
  ctx.save();for(const e of gE){const s=gN[e.s],t=gN[e.t];
    ctx.globalAlpha=Math.max(.03,(e.sim-.85)*3);
    ctx.strokeStyle=s.s.outcome===t.s.outcome?'#1e5a3f':'#5a1e2f';ctx.lineWidth=.5*dp;
    ctx.beginPath();ctx.moveTo(cx+s.x*dp,cy+s.y*dp);ctx.lineTo(cx+t.x*dp,cy+t.y*dp);ctx.stroke();}ctx.restore();
  for(const n of gN){const sx=cx+n.x*dp,sy=cy+n.y*dp,r=n.r*dp;
    ctx.save();if(n===gH){ctx.shadowColor='#00d4ff';ctx.shadowBlur=15*dp;}
    ctx.globalAlpha=.8;ctx.fillStyle=outcomeC(n.s.outcome);ctx.beginPath();ctx.arc(sx,sy,r,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=schoolC(n.s.school);ctx.lineWidth=2*dp;ctx.globalAlpha=.6;ctx.stroke();ctx.restore();}
  ctx.fillStyle='#00d4ff';ctx.font='bold '+14*dp+'px monospace';ctx.fillText('Similarity Graph — '+gN.length+' students, '+gE.length+' edges',300*dp,30*dp);
}
function updGI(){
  const p=document.getElementById('igr');if(!gH){p.classList.remove('show');return;}p.classList.add('show');
  const s=gH.s,v=gH.vec;
  let h='<div class="r"><span>'+s.firstName+' '+s.lastName+'</span><span class="v" style="color:'+outcomeC(s.outcome)+'">'+s.outcome.toUpperCase()+'</span></div>';
  h+='<div class="r"><span>School</span><span class="v">'+s.school.split(' ')[0]+'</span></div>';
  h+='<div class="r"><span>Grade</span><span class="v">'+s.grade+'</span></div>';
  h+='<div class="r"><span>GPA</span><span class="v">'+s.raw.gpa+'</span></div>';
  h+='<div class="r"><span>Attendance</span><span class="v">'+s.raw.attendancePct+'%</span></div>';
  h+='<div class="r"><span>Test Pctl</span><span class="v">'+s.raw.testPercentile+'th</span></div>';
  h+='<hr style="border-color:#1e3a5f;margin:6px 0"><div style="font-size:10px;color:#5a6c7d;margin-bottom:4px">15D Vector:</div>';
  for(let d=0;d<15;d++){const pct=(v[d]*100).toFixed(0);
    h+='<div style="display:flex;align-items:center;gap:4px;margin:2px 0"><span style="width:65px;font-size:9px;color:'+DCOL[d]+'">'+DLBL[d].slice(0,10)+'</span><div class="db" style="flex:1"><div class="df" style="width:'+pct+'%;background:'+DCOL[d]+'"></div></div><span style="font-size:9px;width:30px;text-align:right">'+v[d].toFixed(2)+'</span></div>';}
  document.getElementById('igrc').innerHTML=h;
}

// === SCHOOL COMPARE ===
let scMode='school';
function drawSC(){
  const c=document.getElementById('csc'),p=c.parentElement.getBoundingClientRect();
  c.width=p.width*devicePixelRatio;c.height=(p.height-50)*devicePixelRatio;
  c.style.width=p.width+'px';c.style.height=(p.height-50)+'px';
  const ctx=c.getContext('2d'),w=c.width,h=c.height,dp=devicePixelRatio;
  ctx.clearRect(0,0,w,h);

  let groups;
  if(scMode==='school'){
    groups=STATS.schools.map(sc=>({label:sc.name.split(' ')[0],students:STUDENTS.filter(s=>s.school===sc.name),color:schoolC(sc.name)}));
  } else if(scMode==='outcome'){
    groups=['on-track','watch','high-risk','resilient','hidden-risk'].map(o=>({label:o,students:STUDENTS.filter(s=>s.outcome===o),color:outcomeC(o)}));
  } else {
    const gLevels=[{label:'Elem (3-5)',grades:[3,4,5]},{label:'Middle (6-8)',grades:[6,7,8]},{label:'High (9-12)',grades:[9,10,11,12]}];
    groups=gLevels.map(gl=>({label:gl.label,students:STUDENTS.filter(s=>gl.grades.includes(s.grade)),color:['#00d4ff','#ff8800','#00ff88'][gLevels.indexOf(gl)]}));
  }

  const mg={l:120*dp,r:40*dp,t:60*dp,b:40*dp};
  const n=15,barW=(w-mg.l-mg.r)/(n*groups.length+n-1);
  const clusterW=barW*groups.length;

  ctx.fillStyle='#00d4ff';ctx.font='bold '+14*dp+'px monospace';
  ctx.fillText('Compare: Average Dimension Values by '+(scMode==='school'?'School':scMode==='outcome'?'Outcome':'Grade Level'),mg.l,30*dp);

  // Compute averages
  const avgs=groups.map(g=>{
    const avg=Array(15).fill(0);
    for(const s of g.students){const v=getVec(s);for(let i=0;i<15;i++)avg[i]+=v[i];}
    return avg.map(v=>v/Math.max(g.students.length,1));
  });

  const ph=h-mg.t-mg.b;
  // Grid lines
  ctx.save();ctx.strokeStyle='#1e3a5f';ctx.lineWidth=.5*dp;
  for(let y=0;y<=1;y+=.25){const py=mg.t+ph*(1-y);ctx.beginPath();ctx.moveTo(mg.l,py);ctx.lineTo(w-mg.r,py);ctx.stroke();
    ctx.fillStyle='#5a6c7d';ctx.font=9*dp+'px monospace';ctx.fillText(y.toFixed(2),mg.l-35*dp,py+3*dp);}
  ctx.restore();

  for(let d=0;d<n;d++){
    const cx=mg.l+d*(clusterW+barW)+clusterW/2;
    // Dim label
    ctx.save();ctx.fillStyle=DCOL[d];ctx.font=9*dp+'px monospace';ctx.translate(cx,mg.t+ph+12*dp);ctx.rotate(.4);ctx.fillText(DLBL[d].slice(0,8),0,0);ctx.restore();
    for(let gi=0;gi<groups.length;gi++){
      const x=mg.l+d*(clusterW+barW)+gi*barW;
      const bh=avgs[gi][d]*ph;
      ctx.fillStyle=groups[gi].color;ctx.globalAlpha=.7;
      ctx.fillRect(x,mg.t+ph-bh,barW-1*dp,bh);ctx.globalAlpha=1;
    }
  }
  // Legend
  ctx.save();
  for(let gi=0;gi<groups.length;gi++){
    ctx.fillStyle=groups[gi].color;ctx.font=11*dp+'px monospace';
    ctx.fillText(groups[gi].label+' ('+groups[gi].students.length+')',mg.l+gi*130*dp,h-10*dp);
  }
  ctx.restore();
}
document.querySelectorAll('.sc').forEach(b=>{b.onclick=function(){scMode=this.dataset.m;document.querySelectorAll('.sc').forEach(x=>x.classList.remove('on'));this.classList.add('on');drawSC();};});

// === STUDENT PROFILES (RADAR) ===
let rPg=0,rSt='random';
function drawRd(){
  const con=document.getElementById('rdc');con.innerHTML='';
  let sorted=[...STUDENTS];
  if(rSt==='resilient')sorted=sorted.filter(s=>s.outcome==='resilient').concat(sorted.filter(s=>s.outcome!=='resilient'));
  else if(rSt==='hidden-risk')sorted=sorted.filter(s=>s.outcome==='hidden-risk').concat(sorted.filter(s=>s.outcome!=='hidden-risk'));
  else if(rSt==='high-risk')sorted=sorted.filter(s=>s.outcome==='high-risk').concat(sorted.filter(s=>s.outcome!=='high-risk'));
  else sorted.sort(()=>Math.random()-.5);
  const pp=6,start=rPg*pp,page=sorted.slice(start,start+pp);
  for(const s of page){
    const v=getVec(s);
    const card=document.createElement('div');card.className='rc';
    card.innerHTML='<h3 style="color:'+outcomeC(s.outcome)+'">'+s.firstName+' '+s.lastName[0]+'. — '+s.outcome.toUpperCase()+'</h3>';
    const cv=document.createElement('canvas');const sz=240;cv.width=sz*devicePixelRatio;cv.height=sz*devicePixelRatio;cv.style.width=sz+'px';cv.style.height=sz+'px';
    card.appendChild(cv);
    const info=document.createElement('div');info.style.cssText='font-size:9px;color:#5a6c7d;margin-top:4px';
    info.textContent='Grade '+s.grade+' | '+s.school.split(' ')[0]+' | GPA '+s.raw.gpa+' | Attend '+s.raw.attendancePct+'%';
    card.appendChild(info);con.appendChild(card);drawRd1(cv,v,s);
  }
  document.getElementById('rpg').textContent='Page '+(rPg+1)+' of '+Math.ceil(sorted.length/pp);
}
function drawRd1(cv,vec,student){
  const ctx=cv.getContext('2d'),w=cv.width,h=cv.height,dp=devicePixelRatio,cx=w/2,cy=h/2,mR=Math.min(w,h)*.36;
  ctx.clearRect(0,0,w,h);const n=15,as=Math.PI*2/n;
  ctx.save();for(let r=.25;r<=1;r+=.25){ctx.strokeStyle='#1e3a5f';ctx.lineWidth=.5*dp;ctx.globalAlpha=.5;
    ctx.beginPath();for(let i=0;i<=n;i++){const a=i*as-Math.PI/2,x=cx+Math.cos(a)*mR*r,y=cy+Math.sin(a)*mR*r;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();}ctx.restore();
  for(let i=0;i<n;i++){const a=i*as-Math.PI/2,x=cx+Math.cos(a)*mR,y=cy+Math.sin(a)*mR;
    ctx.save();ctx.strokeStyle='#1e3a5f';ctx.lineWidth=.5*dp;ctx.globalAlpha=.3;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(x,y);ctx.stroke();
    const lx=cx+Math.cos(a)*(mR+12*dp),ly=cy+Math.sin(a)*(mR+12*dp);
    ctx.fillStyle=DCOL[i];ctx.globalAlpha=.8;ctx.font=7*dp+'px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(DLBL[i].slice(0,6),lx,ly);ctx.restore();}
  ctx.save();ctx.beginPath();for(let i=0;i<n;i++){const a=i*as-Math.PI/2,r=mR*vec[i],x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
  ctx.closePath();ctx.fillStyle=outcomeC(student.outcome,.15);ctx.fill();ctx.strokeStyle=outcomeC(student.outcome,.8);ctx.lineWidth=2*dp;ctx.stroke();ctx.restore();
  for(let i=0;i<n;i++){const a=i*as-Math.PI/2,r=mR*vec[i];ctx.fillStyle=DCOL[i];ctx.beginPath();ctx.arc(cx+Math.cos(a)*r,cy+Math.sin(a)*r,3*dp,0,Math.PI*2);ctx.fill();}
}
document.getElementById('rp')?.addEventListener('click',()=>{rPg=Math.max(0,rPg-1);drawRd();});
document.getElementById('rn')?.addEventListener('click',()=>{rPg++;drawRd();});
document.getElementById('rres')?.addEventListener('click',()=>{rSt='resilient';rPg=0;drawRd();});
document.getElementById('rhr')?.addEventListener('click',()=>{rSt='hidden-risk';rPg=0;drawRd();});
document.getElementById('rrsk')?.addEventListener('click',()=>{rSt='high-risk';rPg=0;drawRd();});
document.getElementById('rr2')?.addEventListener('click',()=>{rSt='random';rPg=0;drawRd();});

// === LEARN TAB ===
const LEARN_STEPS=[
{
  title:'What is a Student Vector?',
  text:\`<p>Right now, you probably know students by their <span class="key">GPA</span>. That's <b>one number</b> — one dimension.</p>
<p>But a student is so much more than their GPA. What if you could see them as a <b>complete picture</b> — academics, behavior, wellness, and environment all at once?</p>
<div class="analogy">Think of a doctor's visit. They don't just check your temperature. They check blood pressure, heart rate, weight, blood work — many measurements that together reveal your health. A "student vector" does the same thing for a child's educational wellbeing.</div>
<p>The visualization on the right shows all <b>${slimStudents.length} students</b> plotted on a single number line by GPA. Each dot is a child.</p>
<h3>Notice:</h3>
<p>Green = on-track. Yellow = watch list. Red = high-risk. But look — some dots overlap! Students with the <i>same GPA</i> can have <b>very different</b> situations. GPA alone isn't enough.</p>\`,
  dims:['gpa'],
  mode:'1d'
},
{
  title:'2D: GPA + Attendance',
  text:\`<p>Let's add a second measurement: <span class="key">attendance rate</span>.</p>
<p><b>X axis</b> = GPA. <b>Y axis</b> = attendance. Now each student is a dot in 2D space.</p>
<div class="analogy">It's like a map. GPA is east-west, attendance is north-south. Students in the upper-right corner have both high GPA and high attendance. Students in the lower-left are struggling on both measures.</div>
<h3>What patterns emerge:</h3>
<p>There's a general trend — students who attend school more tend to have higher GPAs. But look at the <b>outliers</b>:</p>
<p><span class="key">High attendance, low GPA</span> — something else is going on. Maybe a learning disability? Language barrier? These students are showing up but not succeeding.</p>
<p><span class="key">Low attendance, high GPA</span> — smart but disengaged? Maybe family issues pulling them away from school.</p>
<h3>The power of 2 dimensions:</h3>
<p>Already, with just 2 numbers, we can identify students who need <i>different kinds</i> of support. But we have 13 more dimensions to add.</p>\`,
  dims:['gpa','attendance'],
  mode:'2d'
},
{
  title:'3D: Adding Socioeconomics',
  text:\`<p>Now we add a third dimension: <span class="key">socioeconomic status</span> (SES).</p>
<p>This is the uncomfortable but essential dimension. Research consistently shows SES correlates with academic outcomes — but it does <b>not determine</b> them.</p>
<p>Drag the 3D visualization to rotate it!</p>
<div class="analogy">Imagine a neighborhood map. GPA is the X street, attendance is the Y street, and SES is the elevation (hills vs valleys). Students at the same intersection can be at very different elevations — same academics, very different circumstances.</div>
<h3>What to look for:</h3>
<p><span class="key" style="color:#00d4ff">Blue dots (resilient)</span> — low SES but high GPA and attendance. These students are beating the odds. What's supporting them? Can we replicate it?</p>
<p><span class="key" style="color:#ff8800">Orange dots (hidden-risk)</span> — high SES but declining grades or behavioral issues. These students often fly under the radar because their test scores haven't dropped yet.</p>
<h3>Why 3D matters:</h3>
<p>Two students with the same GPA and attendance might need completely different interventions depending on their SES. A tutoring program makes sense for one; a mentorship program for another.</p>\`,
  dims:['gpa','attendance','socioeconomic'],
  mode:'3d'
},
{
  title:'Beyond Sight: 15 Dimensions',
  text:\`<p>We can only <i>see</i> 3 spatial dimensions. But we can encode more using <span class="key">color</span>, <span class="key">size</span>, and <span class="key">connections</span>.</p>
<p>Now: X=GPA, Y=attendance, Z=SES, <b>color = outcome</b>, <b>size = test score</b>.</p>
<p>But our student vectors have <b>15 dimensions</b>. How do we think about dimensions we can't see?</p>
<div class="analogy">You can't "see" the difference between a C major and A minor chord — but you can hear it. Similarly, you can't see all 15 student dimensions at once, but the math can measure the "distance" between any two students across ALL 15 dimensions simultaneously.</div>
<h3>The key concept: Similarity</h3>
<p>Two students are "close" in 15D space if they're similar across <b>all dimensions at once</b>. Not just GPA, not just attendance — everything. When you find a student's nearest neighbors in this space, you find students with remarkably similar overall profiles.</p>
<p>This is how you move from <b>gut feeling</b> to <b>data-driven insight</b>.</p>\`,
  dims:['gpa','attendance','socioeconomic'],
  mode:'3d-color'
},
{
  title:'The Academic Domain',
  text:\`<p>Let's meet all 15 dimensions, starting with the <span class="dom-acad">5 Academic</span> ones:</p>
<h3 style="color:#00d4ff">1. GPA (Grade Point Average)</h3>
<p>The classic measure. 0-4.0 scale, normalized to 0-1. Captures overall academic performance across all subjects.</p>
<h3 style="color:#00d4ff">2. Attendance Rate</h3>
<p>Percentage of school days present. Research shows <b>chronic absence (< 90%)</b> is one of the strongest predictors of academic failure — stronger than test scores.</p>
<h3 style="color:#00d4ff">3. Test Scores</h3>
<p>Standardized assessment percentile. A snapshot measure that supplements GPA. Some students test well but don't do homework; others are the reverse.</p>
<h3 style="color:#00d4ff">4. Course Rigor</h3>
<p>Proportion of advanced/honors courses. A student with a 3.0 GPA in AP classes is very different from a 3.0 in standard classes.</p>
<h3 style="color:#00d4ff">5. Assignment Completion</h3>
<p>How many assignments are actually turned in. This is often the <b>earliest warning sign</b> — grades drop later, but missing assignments come first.</p>
<div class="analogy">These 5 dimensions are like a student's academic vital signs. A doctor wouldn't diagnose based on temperature alone. You shouldn't assess a student based on GPA alone.</div>\`,
  dims:['gpa','attendance','testScore','courseRigor','assignCompletion'],
  mode:'domain-bars'
},
{
  title:'The Behavioral Domain',
  text:\`<p>Now the <span class="dom-behav">3 Behavioral</span> dimensions:</p>
<h3 style="color:#ff8800">6. Discipline Record</h3>
<p>Number of incidents, inverted so 1 = clean record. A student with 5+ incidents is dealing with something deeper — this dimension helps surface that.</p>
<h3 style="color:#ff8800">7. Extracurricular Activities</h3>
<p>Number of clubs, sports, or programs. Students involved in extracurriculars have higher graduation rates and better mental health outcomes. Zero extracurriculars can be a red flag.</p>
<h3 style="color:#ff8800">8. SEL Score</h3>
<p>Social-Emotional Learning assessment. Can this student manage emotions, set goals, show empathy, maintain relationships? Low SEL often predicts discipline issues and academic decline.</p>
<div class="analogy">If academics are what a student achieves, behavior is how they engage. A student with great grades but zero extracurriculars and declining SEL might be heading for burnout. A student with low grades but strong SEL and activities might just need academic support.</div>
<h3>The behavioral paradox:</h3>
<p>Discipline incidents are often treated as the problem, but they're usually a <b>symptom</b>. The vector reveals what else is happening — is it home stability? Low peer connections? A learning disability creating frustration?</p>\`,
  dims:['discipline','extracurricular','selScore'],
  mode:'domain-bars'
},
{
  title:'Wellness & Environment',
  text:\`<p>The <span class="dom-well">2 Wellness</span> and <span class="dom-env">5 Environment</span> dimensions:</p>
<h3 style="color:#00ff88">9. Counselor Visits</h3>
<p>Inverted: 1 = few visits (stable), 0 = many visits (needs support). High visits can mean proactive support OR distress — context matters.</p>
<h3 style="color:#00ff88">10. Grade Trajectory</h3>
<p>Is the GPA going up or down? A 2.5 GPA that was 3.5 last year is very different from a 2.5 that was 1.5 last year. <b>Direction matters more than position.</b></p>
<h3 style="color:#ff44ff">11. Socioeconomic Status</h3>
<p>Economic advantage level. Correlates with many outcomes but doesn't determine them.</p>
<h3 style="color:#ff44ff">12. Home Stability</h3>
<p>Residential stability — fewer moves = higher. Students who move 3+ times in a year often lose months of learning.</p>
<h3 style="color:#ff44ff">13. English Proficiency</h3>
<p>1 = native speaker, 0 = newcomer. ELL students need different support, not less capability.</p>
<h3 style="color:#ff44ff">14. Special Education Services</h3>
<p>1 = no services, 0 = full IEP. Students receiving services need monitoring for effectiveness.</p>
<h3 style="color:#ff44ff">15. Peer Connections</h3>
<p>Social integration. Isolated students are at higher risk for depression, dropout, and behavioral issues.</p>
<div class="analogy">These dimensions capture the world AROUND the student. A child doesn't learn in a vacuum. Home instability, language barriers, social isolation — these are the invisible forces shaping outcomes. The vector makes them visible.</div>\`,
  dims:['counselorVisits','trajectory','socioeconomic','homeStability','ellStatus','specialEd','peerConnected'],
  mode:'domain-bars'
},
{
  title:'Finding Hidden Patterns',
  text:\`<p>Here's where it gets powerful. Let's look at two real patterns in the data:</p>
<h3 style="color:#00d4ff">The Resilient Student</h3>
<p>Low SES, unstable home, maybe ELL — but strong attendance, good SEL score, involved in activities. These students have found support systems that work. <b>What can we learn from them to help others?</b></p>
<h3 style="color:#ff8800">The Hidden-Risk Student</h3>
<p>High SES, parents are engaged, test scores are fine. But: grades are declining, counselor visits increasing, peer connections dropping, SEL score falling. Traditional metrics say "this kid is fine." The vector says <b>"this kid needs help NOW."</b></p>
<div class="analogy">A smoke detector only measures one thing: smoke. But a smart home sensor measures temperature, humidity, CO levels, and air quality simultaneously. It can detect a problem before there's visible smoke. That's what the 15D vector does for students.</div>
<h3>The superintendent's question:</h3>
<p>"What would change if we could see every student this way?"</p>
<p>The radar charts show a resilient student vs a hidden-risk student. Notice how different their shapes are — even though their GPA might be similar.</p>\`,
  dims:DIMS,
  mode:'compare-profiles'
},
{
  title:'The Complete 15D Student Vector',
  text:\`<p>You now understand all 15 dimensions across 4 domains:</p>
<div class="formula" style="font-size:11px;line-height:2">
<span class="dom-acad">Academic:</span> GPA, Attendance, Tests, Rigor, Assignments<br>
<span class="dom-behav">Behavioral:</span> Discipline, Activities, SEL<br>
<span class="dom-well">Wellness:</span> Counselor, Trajectory<br>
<span class="dom-env">Environment:</span> SES, Home, ELL, SpEd, Peers</div>
<h3>What you can do with this:</h3>
<p><b>1. Early Warning:</b> Find students whose vectors are drifting toward risk clusters — before their GPA drops.</p>
<p><b>2. Resource Allocation:</b> See which schools or grade levels have the most students near risk boundaries.</p>
<p><b>3. Intervention Matching:</b> Find students similar to past intervention successes and apply the same programs.</p>
<p><b>4. Equity Analysis:</b> Compare school vectors to see if opportunity is truly equal across buildings.</p>
<p><b>5. Resilience Mapping:</b> Identify protective factors by studying what resilient students have in common.</p>
<div class="analogy">You've moved from "How's this student's GPA?" to "Where does this student exist in 15-dimensional space, and who are they similar to?" That's the difference between a thermometer and a full diagnostic panel.</div>
<p style="color:#00ff88;font-size:13px;margin-top:16px">Explore the other tabs to see the full vector space in action.</p>\`,
  dims:DIMS,
  mode:'full-radar'
}
];

let learnStep=0;
function initLearn(){
  const nav=document.getElementById('learn-nav');
  nav.innerHTML='<div style="padding:8px 16px;color:#00d4ff;font-size:12px;font-weight:600;margin-bottom:4px">LEARNING PATH</div>';
  LEARN_STEPS.forEach((s,i)=>{
    const el=document.createElement('div');
    el.className='learn-step'+(i===0?' active':'');
    el.innerHTML='<span class="snum">'+(i+1)+'</span>'+s.title;
    el.onclick=()=>{learnStep=i;renderLearn();};
    nav.appendChild(el);
  });
  document.getElementById('learn-next').onclick=()=>{if(learnStep<LEARN_STEPS.length-1){learnStep++;renderLearn();}};
  document.getElementById('learn-prev').onclick=()=>{if(learnStep>0){learnStep--;renderLearn();}};
  renderLearn();
}

function renderLearn(){
  const step=LEARN_STEPS[learnStep];
  document.getElementById('learn-text').innerHTML='<h2>Step '+(learnStep+1)+': '+step.title+'</h2>'+step.text;
  document.getElementById('learn-progress').textContent='Step '+(learnStep+1)+' of '+LEARN_STEPS.length;
  document.getElementById('learn-prev').disabled=learnStep===0;
  document.getElementById('learn-next').textContent=learnStep===LEARN_STEPS.length-1?'Done':'Next Step';
  document.getElementById('learn-next').disabled=false;
  document.querySelectorAll('.learn-step').forEach((el,i)=>{
    el.classList.toggle('active',i===learnStep);
    el.classList.toggle('done',i<learnStep);
  });
  drawLearnViz();
}

let learnRot={x:0.4,y:0,zoom:1,dragging:false};

function drawLearnViz(){
  const cv=document.getElementById('learn-cv');
  const rect=cv.parentElement.getBoundingClientRect();
  cv.width=rect.width*devicePixelRatio;
  cv.height=rect.height*devicePixelRatio;
  cv.style.width=rect.width+'px';
  cv.style.height=rect.height+'px';
  const ctx=cv.getContext('2d'),w=cv.width,h=cv.height,dp=devicePixelRatio;
  ctx.clearRect(0,0,w,h);
  const step=LEARN_STEPS[learnStep];

  switch(step.mode){
    case '1d': drawLearn1D(ctx,w,h,dp); break;
    case '2d': drawLearn2D(ctx,w,h,dp); break;
    case '3d': drawLearn3D(ctx,w,h,dp,false); break;
    case '3d-color': drawLearn3D(ctx,w,h,dp,true); break;
    case 'domain-bars': drawLearnDomainBars(ctx,w,h,dp,step.dims); break;
    case 'compare-profiles': drawLearnCompare(ctx,w,h,dp); break;
    case 'full-radar': drawLearnFullRadar(ctx,w,h,dp); break;
  }
}

// Setup learn canvas drag
(function(){
  const lcv=document.getElementById('learn-cv');
  lcv.onmousedown=e=>{learnRot.dragging=true;learnRot._mx=e.clientX;learnRot._my=e.clientY;learnRot._rx=learnRot.x;learnRot._ry=learnRot.y;};
  lcv.onmousemove=e=>{if(learnRot.dragging){learnRot.y=learnRot._ry+(e.clientX-learnRot._mx)*.005;learnRot.x=learnRot._rx-(e.clientY-learnRot._my)*.005;}};
  lcv.onmouseup=()=>{learnRot.dragging=false;};
  lcv.onwheel=e=>{const zs=document.getElementById('learn-zoom');zs.value=Math.max(30,Math.min(300,+zs.value-e.deltaY*.3));e.preventDefault();};
})();

function drawLearn1D(ctx,w,h,dp){
  const mg=80*dp;
  const allGPA=STUDENTS.map(s=>s.dims.gpa);
  const pMin=Math.min(...allGPA),pMax=Math.max(...allGPA);
  const plotW=w-mg*2;

  ctx.fillStyle='#00d4ff';ctx.font='bold '+14*dp+'px monospace';
  ctx.fillText('1 Dimension: GPA',mg,30*dp);
  ctx.fillStyle='#5a6c7d';ctx.font=11*dp+'px monospace';
  ctx.fillText('Each dot = one student. Color = outcome.',mg,50*dp);

  // Group by school type
  const groups=[
    {label:'Elementary',students:STUDENTS.filter(s=>s.schoolType==='elementary'),color:'#00d4ff'},
    {label:'Middle',students:STUDENTS.filter(s=>s.schoolType==='middle'),color:'#ff8800'},
    {label:'High',students:STUDENTS.filter(s=>s.schoolType==='high'),color:'#00ff88'}
  ];

  for(let si=0;si<3;si++){
    const cy=h*(0.25+si*0.22);
    const st=groups[si];
    ctx.fillStyle=st.color;ctx.font='bold '+12*dp+'px monospace';
    ctx.fillText(st.label+' ('+st.students.length+')',15*dp,cy+5*dp);
    ctx.strokeStyle='#1e3a5f';ctx.lineWidth=dp;
    ctx.beginPath();ctx.moveTo(mg,cy);ctx.lineTo(mg+plotW,cy);ctx.stroke();
    for(let t=0;t<=4;t++){
      const x=mg+plotW*t/4;
      ctx.fillStyle='#5a6c7d';ctx.font=9*dp+'px monospace';ctx.textAlign='center';
      ctx.fillText((t/4).toFixed(1),x,cy+18*dp);ctx.textAlign='left';
    }
    for(const s of st.students){
      const x=mg+((s.dims.gpa-pMin)/(pMax-pMin||1))*plotW;
      const jitter=(Math.random()-.5)*12*dp;
      ctx.save();ctx.globalAlpha=0.6;ctx.fillStyle=outcomeC(s.outcome);
      ctx.beginPath();ctx.arc(x,cy+jitter,4*dp,0,Math.PI*2);ctx.fill();ctx.restore();
    }
  }
}

function drawLearn2D(ctx,w,h,dp){
  const mg={l:80*dp,r:40*dp,t:60*dp,b:60*dp};
  const pw=w-mg.l-mg.r,ph=h-mg.t-mg.b;
  const gpas=STUDENTS.map(s=>s.dims.gpa),atts=STUDENTS.map(s=>s.dims.attendance);
  const gMn=Math.min(...gpas),gMx=Math.max(...gpas);
  const aMn=Math.min(...atts),aMx=Math.max(...atts);

  ctx.fillStyle='#00d4ff';ctx.font='bold '+14*dp+'px monospace';
  ctx.fillText('2 Dimensions: GPA x Attendance',mg.l,30*dp);

  ctx.strokeStyle='#1e3a5f';ctx.lineWidth=dp;
  ctx.beginPath();ctx.moveTo(mg.l,mg.t);ctx.lineTo(mg.l,mg.t+ph);ctx.lineTo(mg.l+pw,mg.t+ph);ctx.stroke();
  ctx.fillStyle='#5a6c7d';ctx.font=10*dp+'px monospace';
  ctx.fillText('GPA (normalized)',mg.l+pw/2-40*dp,h-10*dp);
  ctx.save();ctx.translate(15*dp,mg.t+ph/2);ctx.rotate(-Math.PI/2);ctx.fillText('Attendance',0,0);ctx.restore();

  for(let i=0;i<=4;i++){
    const x=mg.l+pw*i/4,y=mg.t+ph*i/4;
    ctx.strokeStyle='#1e3a5f33';ctx.beginPath();ctx.moveTo(x,mg.t);ctx.lineTo(x,mg.t+ph);ctx.stroke();
    ctx.beginPath();ctx.moveTo(mg.l,y);ctx.lineTo(mg.l+pw,y);ctx.stroke();
  }

  for(const s of STUDENTS){
    const x=mg.l+((s.dims.gpa-gMn)/(gMx-gMn||1))*pw;
    const y=mg.t+ph*(1-((s.dims.attendance-aMn)/(aMx-aMn||1)));
    ctx.save();ctx.globalAlpha=.5;ctx.fillStyle=outcomeC(s.outcome);
    ctx.beginPath();ctx.arc(x,y,4*dp,0,Math.PI*2);ctx.fill();ctx.restore();
  }

  ctx.fillStyle='#5a6c7d';ctx.font=9*dp+'px monospace';
  ctx.fillText(gMn.toFixed(2),mg.l,mg.t+ph+16*dp);
  ctx.fillText(gMx.toFixed(2),mg.l+pw-30*dp,mg.t+ph+16*dp);
  ctx.fillText(aMn.toFixed(2),mg.l-35*dp,mg.t+ph);
  ctx.fillText(aMx.toFixed(2),mg.l-35*dp,mg.t+10*dp);
}

function drawLearn3D(ctx,w,h,dp,showColor){
  if(!learnRot.dragging)learnRot.y+=(document.getElementById('learn-spd')?.value||8)/4000;
  learnRot.zoom=(document.getElementById('learn-zoom')?.value||100)/100;

  const gpas=STUDENTS.map(s=>s.dims.gpa),atts=STUDENTS.map(s=>s.dims.attendance),sess=STUDENTS.map(s=>s.dims.socioeconomic);
  const gMn=Math.min(...gpas),gMx=Math.max(...gpas);
  const aMn=Math.min(...atts),aMx=Math.max(...atts);
  const sMn=Math.min(...sess),sMx=Math.max(...sess);

  const p3=(x,y,z)=>{
    const c=Math.cos,s=Math.sin,ry=learnRot.y,rx=learnRot.x;
    let x1=x*c(ry)-z*s(ry),z1=x*s(ry)+z*c(ry),y1=y*c(rx)-z1*s(rx),z2=y*s(rx)+z1*c(rx);
    const p=3/(3+z2*.5),sc=.3*learnRot.zoom*Math.min(w,h);
    return{sx:w/2+x1*sc*p,sy:h/2-y1*sc*p,d:z2,sc:p};
  };

  ctx.fillStyle='#00d4ff';ctx.font='bold '+14*dp+'px monospace';
  ctx.fillText(showColor?'4D: GPA x Attendance x SES (color=outcome)':'3D: GPA x Attendance x SES',60*dp,30*dp);

  ctx.save();ctx.globalAlpha=.4;ctx.strokeStyle='#1e3a5f';ctx.lineWidth=dp;
  let a3,b3;
  a3=p3(-1,-1,-1);b3=p3(1,-1,-1);ctx.beginPath();ctx.moveTo(a3.sx,a3.sy);ctx.lineTo(b3.sx,b3.sy);ctx.stroke();
  a3=p3(-1,-1,-1);b3=p3(-1,1,-1);ctx.beginPath();ctx.moveTo(a3.sx,a3.sy);ctx.lineTo(b3.sx,b3.sy);ctx.stroke();
  a3=p3(-1,-1,-1);b3=p3(-1,-1,1);ctx.beginPath();ctx.moveTo(a3.sx,a3.sy);ctx.lineTo(b3.sx,b3.sy);ctx.stroke();
  ctx.restore();

  ctx.fillStyle='#00d4ff';ctx.font=11*dp+'px monospace';
  let lb=p3(1.2,-1,-1);ctx.fillText('GPA',lb.sx,lb.sy);
  ctx.fillStyle='#ff8800';lb=p3(-1,1.2,-1);ctx.fillText('Attendance',lb.sx,lb.sy);
  ctx.fillStyle='#ff44ff';lb=p3(-1,-1,1.2);ctx.fillText('SES',lb.sx,lb.sy);

  const pts=STUDENTS.map(s=>{
    const nx=((s.dims.gpa-gMn)/(gMx-gMn||1))*2-1;
    const ny=((s.dims.attendance-aMn)/(aMx-aMn||1))*2-1;
    const nz=((s.dims.socioeconomic-sMn)/(sMx-sMn||1))*2-1;
    const p=p3(nx,ny,nz);return{...p,s};
  });
  pts.sort((a,b)=>b.d-a.d);

  for(const p of pts){
    const r=(3+(showColor?p.s.dims.testScore*4:3))*dp*p.sc;
    ctx.save();ctx.globalAlpha=.6;ctx.fillStyle=outcomeC(p.s.outcome,.7);
    ctx.beginPath();ctx.arc(p.sx,p.sy,r,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=schoolC(p.s.school);ctx.lineWidth=1*dp;ctx.globalAlpha=.3;ctx.stroke();ctx.restore();
  }

  if(document.getElementById('vln').classList.contains('active')&&(learnStep===2||learnStep===3))
    requestAnimationFrame(()=>drawLearnViz());
}

function drawLearnDomainBars(ctx,w,h,dp,dims){
  const mg={l:150*dp,r:40*dp,t:60*dp,b:20*dp};
  const barH=(h-mg.t-mg.b)/dims.length-10*dp;

  const domainName=dims[0]==='gpa'?'Academic':dims[0]==='discipline'?'Behavioral':'Wellness & Environment';
  ctx.fillStyle='#00d4ff';ctx.font='bold '+14*dp+'px monospace';
  ctx.fillText(domainName+' Dimensions — Distribution',mg.l,30*dp);

  for(let di=0;di<dims.length;di++){
    const dk=dims[di];
    const meta=DIM_META.find(d=>d.key===dk);
    const vals=STUDENTS.map(s=>s.dims[dk]||0);
    const y=mg.t+di*(barH+10*dp);
    const avg=vals.reduce((a,b)=>a+b,0)/vals.length;

    const col=DCOL[DIMS.indexOf(dk)]||'#c8d6e5';
    ctx.fillStyle=col;ctx.font='bold '+11*dp+'px monospace';
    ctx.fillText(meta?.label||dk,10*dp,y+barH/2+4*dp);

    const barW=w-mg.l-mg.r;
    ctx.fillStyle='#1e3a5f';ctx.fillRect(mg.l,y,barW,barH);

    const bins=40;const hist=Array(bins).fill(0);
    for(const v of vals)hist[Math.min(Math.floor(v*bins),bins-1)]++;
    const hMax=Math.max(...hist);
    for(let b=0;b<bins;b++){
      const bx=mg.l+b/bins*barW,bw=barW/bins;
      const bh=hist[b]/hMax*barH;
      ctx.fillStyle=col;ctx.globalAlpha=.6;
      ctx.fillRect(bx,y+barH-bh,bw-1,bh);ctx.globalAlpha=1;
    }
    const meanX=mg.l+avg*barW;
    ctx.strokeStyle='#fff';ctx.lineWidth=2*dp;ctx.beginPath();ctx.moveTo(meanX,y);ctx.lineTo(meanX,y+barH);ctx.stroke();
    ctx.fillStyle='#fff';ctx.font=9*dp+'px monospace';ctx.fillText('avg='+avg.toFixed(3),meanX+4*dp,y+12*dp);
    ctx.fillStyle='#5a6c7d';ctx.font=8*dp+'px monospace';ctx.fillText('0',mg.l,y+barH+10*dp);ctx.fillText('1',mg.l+barW-8*dp,y+barH+10*dp);
  }
}

function drawLearnCompare(ctx,w,h,dp){
  const resilient=STUDENTS.filter(s=>s.outcome==='resilient');
  const hidden=STUDENTS.filter(s=>s.outcome==='hidden-risk');
  if(!resilient.length||!hidden.length)return;
  const picks=[resilient[0],hidden[0]];
  const labels=['Resilient Student','Hidden-Risk Student'];
  const colors=['#00d4ff','#ff8800'];
  const n=15,as=Math.PI*2/n;

  ctx.fillStyle='#00d4ff';ctx.font='bold '+14*dp+'px monospace';
  ctx.fillText('Resilient vs Hidden-Risk: Same GPA, Different Vectors',60*dp,30*dp);

  for(let ri=0;ri<2;ri++){
    const cx=w*(0.3+ri*0.4),cy=h*0.52;
    const mR=Math.min(w*0.2,h*0.32);
    const s=picks[ri],vec=getVec(s);

    ctx.fillStyle=colors[ri];ctx.font='bold '+13*dp+'px monospace';ctx.textAlign='center';
    ctx.fillText(labels[ri],cx,cy-mR-28*dp);
    ctx.fillStyle=outcomeC(s.outcome);ctx.font=11*dp+'px monospace';
    ctx.fillText(s.firstName+' '+s.lastName[0]+'. | GPA '+s.raw.gpa+' | Grade '+s.grade,cx,cy-mR-12*dp);
    ctx.textAlign='left';

    for(let r=.25;r<=1;r+=.25){ctx.strokeStyle='#1e3a5f';ctx.lineWidth=.5*dp;ctx.globalAlpha=.5;ctx.beginPath();
      for(let i=0;i<=n;i++){const a=i*as-Math.PI/2,x=cx+Math.cos(a)*mR*r,y=cy+Math.sin(a)*mR*r;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();ctx.globalAlpha=1;}
    for(let i=0;i<n;i++){const a=i*as-Math.PI/2;
      ctx.strokeStyle='#1e3a5f';ctx.lineWidth=.5*dp;ctx.globalAlpha=.3;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*mR,cy+Math.sin(a)*mR);ctx.stroke();ctx.globalAlpha=1;
      ctx.fillStyle=DCOL[i];ctx.font=7*dp+'px monospace';ctx.textAlign='center';
      ctx.fillText(DLBL[i].slice(0,6),cx+Math.cos(a)*(mR+12*dp),cy+Math.sin(a)*(mR+12*dp));ctx.textAlign='left';}
    ctx.beginPath();for(let i=0;i<n;i++){const a=i*as-Math.PI/2,r2=mR*vec[i];i===0?ctx.moveTo(cx+Math.cos(a)*r2,cy+Math.sin(a)*r2):ctx.lineTo(cx+Math.cos(a)*r2,cy+Math.sin(a)*r2);}
    ctx.closePath();ctx.fillStyle=outcomeC(s.outcome,.15);ctx.fill();ctx.strokeStyle=outcomeC(s.outcome,.8);ctx.lineWidth=2*dp;ctx.stroke();
    for(let i=0;i<n;i++){const a=i*as-Math.PI/2,r2=mR*vec[i];ctx.fillStyle=DCOL[i];ctx.beginPath();ctx.arc(cx+Math.cos(a)*r2,cy+Math.sin(a)*r2,3*dp,0,Math.PI*2);ctx.fill();}
  }
}

function drawLearnFullRadar(ctx,w,h,dp){
  // Show 3 representative students
  const picks=[
    STUDENTS.find(s=>s.outcome==='on-track'),
    STUDENTS.find(s=>s.outcome==='resilient')||STUDENTS.find(s=>s.outcome==='watch'),
    STUDENTS.find(s=>s.outcome==='high-risk')||STUDENTS.find(s=>s.outcome==='hidden-risk')
  ].filter(Boolean);
  const n=15,as=Math.PI*2/n;

  ctx.fillStyle='#00d4ff';ctx.font='bold '+14*dp+'px monospace';
  ctx.fillText('The Complete 15D Student Vector',60*dp,30*dp);

  for(let ri=0;ri<picks.length;ri++){
    const cx=w*(0.2+ri*0.3),cy=h*0.52;
    const mR=Math.min(w*0.14,h*0.3);
    const s=picks[ri],vec=getVec(s);

    ctx.fillStyle=outcomeC(s.outcome);ctx.font='bold '+11*dp+'px monospace';ctx.textAlign='center';
    ctx.fillText(s.outcome.toUpperCase(),cx,cy-mR-20*dp);
    ctx.fillStyle='#c8d6e5';ctx.font=10*dp+'px monospace';
    ctx.fillText(s.firstName+' '+s.lastName[0]+'.',cx,cy-mR-6*dp);
    ctx.textAlign='left';

    for(let r=.5;r<=1;r+=.5){ctx.strokeStyle='#1e3a5f';ctx.lineWidth=.5*dp;ctx.globalAlpha=.4;ctx.beginPath();
      for(let i=0;i<=n;i++){const a=i*as-Math.PI/2,x=cx+Math.cos(a)*mR*r,y=cy+Math.sin(a)*mR*r;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();ctx.globalAlpha=1;}
    for(let i=0;i<n;i++){const a=i*as-Math.PI/2;
      ctx.strokeStyle='#1e3a5f';ctx.lineWidth=.5*dp;ctx.globalAlpha=.2;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*mR,cy+Math.sin(a)*mR);ctx.stroke();ctx.globalAlpha=1;
      ctx.fillStyle=DCOL[i];ctx.font=6*dp+'px monospace';ctx.textAlign='center';
      ctx.fillText(DLBL[i].slice(0,5),cx+Math.cos(a)*(mR+10*dp),cy+Math.sin(a)*(mR+10*dp));ctx.textAlign='left';}
    ctx.beginPath();for(let i=0;i<n;i++){const a=i*as-Math.PI/2,r2=mR*vec[i];i===0?ctx.moveTo(cx+Math.cos(a)*r2,cy+Math.sin(a)*r2):ctx.lineTo(cx+Math.cos(a)*r2,cy+Math.sin(a)*r2);}
    ctx.closePath();ctx.fillStyle=outcomeC(s.outcome,.15);ctx.fill();ctx.strokeStyle=outcomeC(s.outcome,.8);ctx.lineWidth=2*dp;ctx.stroke();
    for(let i=0;i<n;i++){const a=i*as-Math.PI/2,r2=mR*vec[i];ctx.fillStyle=DCOL[i];ctx.beginPath();ctx.arc(cx+Math.cos(a)*r2,cy+Math.sin(a)*r2,2*dp,0,Math.PI*2);ctx.fill();}
  }
}

// === JOURNEY TAB (3D animated timeline) ===
// Build timeline lookup: TL_FRAMES[monthIdx] = array of dim-arrays (index matches STUDENTS)
// Convert to {studentId: {dim1:v, dim2:v, ...}} maps
const TL_MAP=TL_FRAMES.map(frame=>{
  const m={};
  for(let si=0;si<STUDENTS.length;si++){
    const arr=frame[si];if(!arr)continue;
    const d={};for(let di=0;di<DIMS.length;di++)d[DIMS[di]]=arr[di];
    m[STUDENTS[si].id]=d;
  }
  return m;
});

let jrState={
  month:0, playing:false, timer:null, t:0, // t is fractional month for interpolation
  rot:{x:0.4,y:0}, zoom:1, drag:null, filter:'all',
  inited:false, hovered:null
};

function initJourney(){
  if(!jrState.inited){
    jrState.inited=true;
    // Build month bar
    const bar=document.getElementById('jbar');
    bar.innerHTML='';
    TL_MONTHS.forEach((m,i)=>{
      const pip=document.createElement('div');
      pip.className='month-pip'+(i===0?' active':'');
      pip.textContent=m;
      pip.onclick=()=>{jrState.month=i;jrState.t=i;updMonthBar();};
      bar.appendChild(pip);
    });
    // Axis selectors
    const defs={jx:'gpa',jy:'attendance',jz:'socioeconomic'};
    for(const[id,def]of Object.entries(defs)){
      const s=document.getElementById(id);if(s.options.length>1)continue;
      s.innerHTML='';for(let i=0;i<DIMS.length;i++){const o=document.createElement('option');o.value=DIMS[i];o.textContent=DLBL[i];if(DIMS[i]===def)o.selected=true;s.appendChild(o);}
    }
    // Play button
    document.getElementById('jplay').onclick=togglePlay;
    // Trail slider label
    document.getElementById('jtrail').oninput=function(){document.getElementById('jtrailv').textContent=this.value;};
    // Filter buttons
    document.querySelectorAll('.jf').forEach(b=>{b.onclick=function(){
      jrState.filter=this.dataset.f;
      document.querySelectorAll('.jf').forEach(x=>x.classList.remove('on'));this.classList.add('on');
    };});
    // Canvas interaction
    const c=document.getElementById('cjr');
    c.onmousedown=e=>{jrState.drag={x:e.clientX,y:e.clientY,rx:jrState.rot.x,ry:jrState.rot.y};};
    c.onmousemove=e=>{
      if(jrState.drag){jrState.rot.y=jrState.drag.ry+(e.clientX-jrState.drag.x)*.005;jrState.rot.x=jrState.drag.rx-(e.clientY-jrState.drag.y)*.005;}
      // Hover detection (simple: find nearest projected point)
      if(!jrState.drag)detectHover(e);
    };
    c.onmouseup=()=>{jrState.drag=null;};
    c.onwheel=e=>{jrState.zoom=Math.max(.3,Math.min(3,jrState.zoom-e.deltaY*.001));e.preventDefault();};
  }
  animJourney();
}

function togglePlay(){
  jrState.playing=!jrState.playing;
  document.getElementById('jplay').textContent=jrState.playing?'Pause':'Play';
  document.getElementById('jplay').classList.toggle('on',jrState.playing);
}

function updMonthBar(){
  const pips=document.querySelectorAll('.month-pip');
  pips.forEach((p,i)=>{
    p.classList.toggle('active',i===jrState.month);
    p.classList.toggle('past',i<jrState.month);
  });
  document.getElementById('jmonth-bg').textContent=TL_MONTHS[jrState.month].toUpperCase();
}

function getStudentDimsAtTime(studentId,t){
  // t is fractional month (0.0 = Sep, 9.0 = Jun)
  const mi=Math.floor(t), mj=Math.min(mi+1,9);
  const frac=t-mi;
  const da=TL_MAP[mi][studentId], db=TL_MAP[mj][studentId];
  if(!da)return null;if(!db||mi===mj)return da;
  // Lerp all dims
  const out={};
  for(const k of DIMS)out[k]=da[k]+(db[k]-da[k])*frac;
  return out;
}

let jrLastPts=[];// for hover detection
function animJourney(){
  if(!document.getElementById('vjr').classList.contains('active')){requestAnimationFrame(animJourney);return;}
  const c=document.getElementById('cjr'),rect=c.parentElement.getBoundingClientRect();
  // Account for the bottom bar height (~48px)
  const canvasH=rect.height-48;
  c.width=rect.width*devicePixelRatio;c.height=canvasH*devicePixelRatio;
  c.style.width=rect.width+'px';c.style.height=canvasH+'px';
  const ctx=c.getContext('2d'),w=c.width,h=c.height,dp=devicePixelRatio;
  ctx.clearRect(0,0,w,h);

  // Advance time if playing
  if(jrState.playing){
    const rate=+document.getElementById('jrate').value;
    jrState.t+=rate/600; // ~8 frames/sec at rate=8
    if(jrState.t>=9){jrState.t=0;} // loop
    jrState.month=Math.floor(jrState.t);
    updMonthBar();
  }

  // Auto-rotate
  if(!jrState.drag){jrState.rot.y+=document.getElementById('jspd').value/8000;}

  const xK=document.getElementById('jx').value,yK=document.getElementById('jy').value,zK=document.getElementById('jz').value;

  // Filter students
  let students=STUDENTS;
  const ff=jrState.filter;
  if(ff==='on-track')students=students.filter(s=>s.outcome==='on-track');
  else if(ff==='risk')students=students.filter(s=>['high-risk','hidden-risk','watch'].includes(s.outcome));
  else if(ff==='ell')students=students.filter(s=>s.raw.ellLevel!=='None');
  else if(ff==='resilient')students=students.filter(s=>s.outcome==='resilient');
  else if(ff==='hidden-risk')students=students.filter(s=>s.outcome==='hidden-risk');
  else if(ff==='intervention')students=students.filter(s=>s.outcome==='intervention-success');
  else if(ff==='featured')students=students.filter(s=>FEATURED_IDS.has(s.id));
  const isFeatured=ff==='featured';

  // Compute ranges across ALL months for stable axes
  let xMn=Infinity,xMx=-Infinity,yMn=Infinity,yMx=-Infinity,zMn=Infinity,zMx=-Infinity;
  for(let mi=0;mi<10;mi++){
    for(const s of students){
      const d=TL_MAP[mi][s.id];if(!d)continue;
      if(d[xK]<xMn)xMn=d[xK];if(d[xK]>xMx)xMx=d[xK];
      if(d[yK]<yMn)yMn=d[yK];if(d[yK]>yMx)yMx=d[yK];
      if(d[zK]<zMn)zMn=d[zK];if(d[zK]>zMx)zMx=d[zK];
    }
  }
  const xR={mn:xMn,mx:xMx},yR={mn:yMn,mx:yMx},zR={mn:zMn,mx:zMx};
  const nm=(v,r)=>r.mx>r.mn?(v-r.mn)/(r.mx-r.mn)*2-1:0;

  const jProj=(x,y,z)=>{
    const cos=Math.cos,sin=Math.sin,ry=jrState.rot.y,rx=jrState.rot.x;
    let x1=x*cos(ry)-z*sin(ry),z1=x*sin(ry)+z*cos(ry);
    let y1=y*cos(rx)-z1*sin(rx),z2=y*sin(rx)+z1*cos(rx);
    const p=3/(3+z2*.5),sc=.35*jrState.zoom*Math.min(w,h);
    return{sx:w/2+x1*sc*p,sy:h/2-y1*sc*p,d:z2,sc:p};
  };

  // Axes
  ctx.save();ctx.globalAlpha=.4;ctx.strokeStyle='#1e3a5f';ctx.lineWidth=dp;
  let a,b;
  a=jProj(-1,-1,-1);b=jProj(1,-1,-1);ctx.beginPath();ctx.moveTo(a.sx,a.sy);ctx.lineTo(b.sx,b.sy);ctx.stroke();
  a=jProj(-1,-1,-1);b=jProj(-1,1,-1);ctx.beginPath();ctx.moveTo(a.sx,a.sy);ctx.lineTo(b.sx,b.sy);ctx.stroke();
  a=jProj(-1,-1,-1);b=jProj(-1,-1,1);ctx.beginPath();ctx.moveTo(a.sx,a.sy);ctx.lineTo(b.sx,b.sy);ctx.stroke();
  ctx.globalAlpha=.8;ctx.fillStyle='#00d4ff';ctx.font=12*dp+'px monospace';
  let lb=jProj(1.15,-1,-1);ctx.fillText(DLBL[DIMS.indexOf(xK)]||xK,lb.sx,lb.sy);
  lb=jProj(-1,1.15,-1);ctx.fillText(DLBL[DIMS.indexOf(yK)]||yK,lb.sx,lb.sy);
  lb=jProj(-1,-1,1.15);ctx.fillText(DLBL[DIMS.indexOf(zK)]||zK,lb.sx,lb.sy);
  ctx.restore();

  const trailLen=+document.getElementById('jtrail').value;
  const curT=jrState.t;

  // Draw trails + current position
  const pts=[];
  for(const s of students){
    // Get current interpolated position
    const curD=getStudentDimsAtTime(s.id,curT);
    if(!curD)continue;
    const cx=nm(curD[xK],xR),cy=nm(curD[yK],yR),cz=nm(curD[zK],zR);
    const cp=jProj(cx,cy,cz);

    // Draw trail (past months)
    if(trailLen>0){
      ctx.save();
      const startM=Math.max(0,jrState.month-trailLen);
      for(let mi=startM;mi<=jrState.month;mi++){
        const td=TL_MAP[mi][s.id];if(!td)continue;
        const tx=nm(td[xK],xR),ty=nm(td[yK],yR),tz=nm(td[zK],zR);
        const tp=jProj(tx,ty,tz);
        const age=(jrState.month-mi)/trailLen; // 1=oldest, 0=newest
        ctx.globalAlpha=Math.max(.03,.25*(1-age));
        ctx.fillStyle=outcomeC(s.outcome,.5);
        const r=(1.5+age*0)*dp*tp.sc;
        ctx.beginPath();ctx.arc(tp.sx,tp.sy,r,0,Math.PI*2);ctx.fill();
        // Connect to next month with a line
        if(mi<jrState.month){
          const nd=TL_MAP[mi+1][s.id];if(!nd)continue;
          const nx=nm(nd[xK],xR),ny=nm(nd[yK],yR),nz=nm(nd[zK],zR);
          const np=jProj(nx,ny,nz);
          ctx.globalAlpha=Math.max(.02,.12*(1-age));
          ctx.strokeStyle=outcomeC(s.outcome,.4);ctx.lineWidth=.8*dp;
          ctx.beginPath();ctx.moveTo(tp.sx,tp.sy);ctx.lineTo(np.sx,np.sy);ctx.stroke();
        }
      }
      ctx.restore();
    }

    pts.push({...cp,s,curD});
  }

  // Sort by depth, draw current dots on top
  pts.sort((a,b)=>b.d-a.d);
  for(const p of pts){
    const isFeat=FEATURED_IDS.has(p.s.id);
    const rad=(isFeatured&&isFeat?6:3+2)*dp*p.sc;
    ctx.save();ctx.globalAlpha=isFeatured&&isFeat?.95:.8;ctx.fillStyle=outcomeC(p.s.outcome,.9);
    ctx.beginPath();ctx.arc(p.sx,p.sy,rad,0,Math.PI*2);ctx.fill();
    if(isFeatured&&isFeat){ctx.strokeStyle='#fff';ctx.lineWidth=2*dp;ctx.globalAlpha=.6;ctx.stroke();}
    else{ctx.strokeStyle=schoolC(p.s.school);ctx.lineWidth=1.5*dp;ctx.globalAlpha=.4;ctx.stroke();}
    // Highlight hovered
    if(jrState.hovered&&jrState.hovered.id===p.s.id){
      ctx.strokeStyle='#fff';ctx.lineWidth=2.5*dp;ctx.globalAlpha=.9;ctx.stroke();
    }
    ctx.restore();
    // Name label for featured students
    if(isFeatured&&isFeat){
      const feat=FEATURED.find(f=>f.id===p.s.id);
      ctx.save();ctx.globalAlpha=.85;ctx.fillStyle='#fff';ctx.font=9*dp+'px monospace';
      ctx.fillText(p.s.firstName+' '+p.s.lastName[0]+'.',p.sx+rad+3*dp,p.sy-2*dp);
      if(feat){ctx.fillStyle='#5a6c7d';ctx.font=8*dp+'px monospace';ctx.fillText(feat.label,p.sx+rad+3*dp,p.sy+9*dp);}
      ctx.restore();
    }
  }
  jrLastPts=pts;

  // Update names panel for featured mode
  const namesEl=document.getElementById('jnames');
  if(isFeatured){
    namesEl.innerHTML=FEATURED.map(f=>{
      const s=STUDENTS.find(st=>st.id===f.id);
      return '<div style="margin:2px 0;color:'+outcomeC(s.outcome)+'">'+s.firstName+' '+s.lastName[0]+'. <span style="color:#5a6c7d">'+f.label+'</span></div>';
    }).join('');
  } else { namesEl.innerHTML=''; }

  // Month + count label
  ctx.save();ctx.fillStyle='#00d4ff';ctx.font='bold '+14*dp+'px monospace';
  ctx.fillText(TL_MONTHS[jrState.month]+' — '+students.length+(isFeatured?' featured':'')+' students',w-300*dp,30*dp);
  ctx.fillStyle='#5a6c7d';ctx.font=11*dp+'px monospace';
  const frac=curT-Math.floor(curT);
  if(jrState.playing)ctx.fillText('Month '+jrState.month+' + '+(frac*100).toFixed(0)+'%',w-300*dp,48*dp);
  ctx.restore();

  requestAnimationFrame(animJourney);
}

function detectHover(e){
  const c=document.getElementById('cjr'),rect=c.getBoundingClientRect();
  const mx=(e.clientX-rect.left)*devicePixelRatio,my=(e.clientY-rect.top)*devicePixelRatio;
  let best=null,bd=30*devicePixelRatio;
  for(const p of jrLastPts){
    const d=Math.hypot(p.sx-mx,p.sy-my);
    if(d<bd){bd=d;best=p;}
  }
  const hp=document.getElementById('jhover');
  if(!best){hp.classList.remove('show');jrState.hovered=null;return;}
  jrState.hovered=best.s;
  hp.classList.add('show');
  hp.style.left=Math.min(e.clientX+12,window.innerWidth-270)+'px';
  hp.style.top=(e.clientY-60)+'px';
  const s=best.s,d=best.curD;
  const xK=document.getElementById('jx').value,yK=document.getElementById('jy').value,zK=document.getElementById('jz').value;
  // Show Sep vs current for the 3 visible dims
  const sepD=TL_MAP[0][s.id];
  let html='<div style="color:'+outcomeC(s.outcome)+';font-weight:700;margin-bottom:4px">'+s.firstName+' '+s.lastName+' ('+s.outcome+')</div>';
  html+='<div style="color:#5a6c7d;margin-bottom:4px">Grade '+s.grade+' | '+s.school.split(' ')[0]+'</div>';
  const show=[xK,yK,zK];
  for(const k of show){
    const lbl=DLBL[DIMS.indexOf(k)]||k;
    const sv=sepD?sepD[k]:0, cv=d[k];
    const delta=cv-sv;
    const arrow=delta>0.01?'<span style="color:#00ff88">+'+delta.toFixed(3)+'</span>':delta<-0.01?'<span style="color:#ff4466">'+delta.toFixed(3)+'</span>':'<span style="color:#5a6c7d">~0</span>';
    html+='<div style="display:flex;justify-content:space-between;margin:2px 0"><span style="color:'+DCOL[DIMS.indexOf(k)]+'">'+lbl+'</span><span>'+sv.toFixed(3)+' -> '+cv.toFixed(3)+' '+arrow+'</span></div>';
  }
  document.getElementById('jhoverc').innerHTML=html;
}

// === INIT ===
initLearn();
</script>
</body>
</html>`;

writeFileSync(join(__dirname, 'viz.html'), html);
console.log(`\\nWrote viz.html (${(html.length/1024).toFixed(0)} KB)`);
