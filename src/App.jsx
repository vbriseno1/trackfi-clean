import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { LayoutDashboard, Wallet, CalendarClock, CreditCard, Target, PiggyBank,
  Plus, Trash2, CheckCircle2, Circle, TrendingUp, AlertCircle, X, Scan,
  Calculator, Edit3, Save, MessageCircle, Send, DollarSign,
  Check, Sparkles, Bell, Settings, Activity, ToggleLeft, ToggleRight,
  ChevronRight, BarChart2, Menu, Calendar, Eye, EyeOff, HelpCircle, Search,
  Zap, FileText, Download, Clock, Moon, Sun, Lock,
  Filter, Database, RefreshCw, ChevronDown } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, BarChart, Bar, Cell, PieChart, Pie } from "recharts";

// 🔑 Replace with your Supabase project URL when ready
const SUPA_URL = "https://lkxznfbcnvsbugffvobw.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxreHpuZmJjbnZzYnVnZmZ2b2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwODQ5MzAsImV4cCI6MjA4OTY2MDkzMH0.Fb1R7H5ltCRSnzTZpgAndrnDXUEPxKfqsy0fZ5ZtAuU";

async function supaFetch(path, opts={}) {
  const session = JSON.parse(localStorage.getItem("fv_session")||"null");
  const token = session?.access_token;
  const headers = {"Content-Type":"application/json","apikey":SUPA_KEY,...(token?{"Authorization":"Bearer "+token}:{}),...(opts.headers||{})};
  const res = await fetch(SUPA_URL+path, {...opts, headers});
  if(!res.ok){ const e=await res.json().catch(()=>({message:"Request failed"})); return {data:null,error:e}; }
  const data = await res.json().catch(()=>({}));
  return {data, error:null};
}
async function signUp(email, password) {
  try {
    const res = await fetch(SUPA_URL+"/auth/v1/signup", {
      method:"POST", headers:{"Content-Type":"application/json","apikey":SUPA_KEY},
      body: JSON.stringify({email, password})
    });
    if(!res.ok && res.status===0) return {error:"network"};
    const r = await res.json();
    if(r.access_token) localStorage.setItem("fv_session", JSON.stringify(r));
    return r;
  } catch(e) { return {error:"network",message:e.message}; }
}
async function signIn(email, password) {
  try {
    const res = await fetch(SUPA_URL+"/auth/v1/token?grant_type=password", {
      method:"POST", headers:{"Content-Type":"application/json","apikey":SUPA_KEY},
      body: JSON.stringify({email, password})
    });
    if(!res.ok && res.status===0) return {error:"network"};
    const r = await res.json();
    if(r.access_token) localStorage.setItem("fv_session", JSON.stringify(r));
    return r;
  } catch(e) { return {error:"network",message:e.message}; }
}

const C = {
  bg:"#F0F2F8",       surface:"#FFFFFF",    surfaceAlt:"#F7F8FC",
  border:"#E2E5EE",   borderLight:"#ECEEF5",
  navy:"#0A1628",     navyMid:"#1A2E50",    navyLight:"#243B6B",
  accent:"#6366F1",   accentBg:"#EEF2FF",   accentMid:"#C7D2FE",
  green:"#059669",    greenBg:"#ECFDF5",    greenMid:"#6EE7B7",
  red:"#DC2626",      redBg:"#FEF2F2",      redMid:"#FCA5A5",
  amber:"#D97706",    amberBg:"#FFFBEB",    amberMid:"#FDE68A",
  purple:"#7C3AED",   purpleBg:"#F5F3FF",   purpleMid:"#DDD6FE",
  teal:"#0D9488",     tealBg:"#F0FDFA",     tealMid:"#5EEAD4",
  text:"#0A1628",     textMid:"#374151",    textLight:"#6B7280",  textFaint:"#9CA3AF",
  slate:"#6B7280",
};
const PIE_COLORS = [C.accent,C.green,C.amber,C.red,C.purple,C.teal,C.purple,C.amber,C.green,C.red];
const MF="'Manrope',sans-serif";
const IF="'Inter',sans-serif";
const MOS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const TODAY = new Date();

const PROFESSIONS = [
  { id:"healthcare", icon:"🏥", label:"Healthcare",
    subs:[{id:"nurse_rn",label:"RN"},{id:"nurse_np",label:"NP"},{id:"nurse_travel",label:"Travel Nurse"},
          {id:"doctor_md",label:"MD/DO"},{id:"pa",label:"PA"},{id:"crna",label:"CRNA"},
          {id:"paramedic",label:"Paramedic/EMT"},{id:"cna",label:"CNA"},{id:"rt",label:"Resp. Therapist"},
          {id:"pt",label:"PT/OT"},{id:"pharmacy",label:"Pharmacist"},{id:"health_admin",label:"Healthcare Admin"}],
    shiftTypes:{Regular:1,Overtime:1.5,"Double Time":2,Night:1.15,Weekend:1.25,Holiday:2},
    shiftLabel:"Shift", incomeLabel:"Healthcare Salary", notePlaceholder:"Unit, floor, specialty..." },
  { id:"education", icon:"📚", label:"Education",
    subs:[{id:"teacher_k12",label:"K-12 Teacher"},{id:"professor",label:"Professor"},
          {id:"admin_edu",label:"Administrator"},{id:"counselor_edu",label:"Counselor"},
          {id:"sub",label:"Substitute"},{id:"tutor",label:"Tutor"}],
    shiftTypes:{Regular:1,Substitute:1,"After School":1.25,"Summer":1},
    shiftLabel:"Day", incomeLabel:"Teaching Salary", notePlaceholder:"Grade, subject..." },
  { id:"trades", icon:"🔧", label:"Trades & Construction",
    subs:[{id:"electrician",label:"Electrician"},{id:"plumber",label:"Plumber"},
          {id:"carpenter",label:"Carpenter"},{id:"hvac",label:"HVAC"},{id:"welder",label:"Welder"},
          {id:"mechanic",label:"Mechanic"},{id:"contractor",label:"Contractor"}],
    shiftTypes:{Regular:1,Overtime:1.5,Weekend:1.25,Rush:2,Holiday:2},
    shiftLabel:"Job", incomeLabel:"Hourly/Contract Rate", notePlaceholder:"Client, project..." },
  { id:"tech", icon:"💻", label:"Technology",
    subs:[{id:"swe",label:"Software Engineer"},{id:"devops",label:"DevOps"},{id:"data",label:"Data Scientist"},
          {id:"pm",label:"Product Manager"},{id:"design",label:"Designer"},{id:"it",label:"IT Support"}],
    shiftTypes:{Regular:1,Overtime:1.5,"On-Call":1.5,Weekend:1.25},
    shiftLabel:"Session", incomeLabel:"Salary/Rate", notePlaceholder:"Sprint, project..." },
  { id:"transportation", icon:"🚗", label:"Transportation",
    subs:[{id:"rideshare",label:"Rideshare (Uber/Lyft)"},{id:"delivery",label:"Delivery Driver"},
          {id:"trucker",label:"Truck Driver (CDL)"},{id:"bus",label:"Bus/Transit Driver"}],
    shiftTypes:{Regular:1,Overtime:1.5,"Peak":1.25,Night:1.15,Holiday:2},
    shiftLabel:"Shift", incomeLabel:"Hourly/Per Mile", notePlaceholder:"Zone, route..." },
  { id:"retail_service", icon:"🛍️", label:"Retail & Service",
    subs:[{id:"retail",label:"Retail Associate"},{id:"retail_mgr",label:"Retail Manager"},
          {id:"server",label:"Server/Bartender"},{id:"cook",label:"Cook/Chef"},{id:"hotel",label:"Hotel Staff"}],
    shiftTypes:{Regular:1,Overtime:1.5,Holiday:2,Opening:1,Closing:1},
    shiftLabel:"Shift", incomeLabel:"Hourly Wage", notePlaceholder:"Location, role..." },
  { id:"military_public", icon:"🎖️", label:"Military & Public Safety",
    subs:[{id:"military",label:"Active Military"},{id:"reserve",label:"Reserve/Guard"},
          {id:"police",label:"Police Officer"},{id:"fire",label:"Firefighter"},
          {id:"corrections",label:"Corrections"},{id:"fed",label:"Federal Employee"}],
    shiftTypes:{Regular:1,Overtime:1.5,"Hazard":1.5,Holiday:2,"OT Night":1.65},
    shiftLabel:"Duty", incomeLabel:"Base Pay", notePlaceholder:"Unit, assignment..." },
  { id:"self_employed", icon:"🚀", label:"Self-Employed / Entrepreneur",
    subs:[{id:"freelancer",label:"Freelancer"},{id:"founder",label:"Founder"},
          {id:"creator",label:"Content Creator"},{id:"artist",label:"Artist/Musician"},
          {id:"photographer",label:"Photographer"},{id:"ecommerce",label:"eCommerce"}],
    shiftTypes:{Regular:1,Rush:2,Weekend:1.25,Project:1},
    shiftLabel:"Session", incomeLabel:"Revenue/Rate", notePlaceholder:"Client, project..." },
  { id:"finance_biz", icon:"💼", label:"Finance & Business",
    subs:[{id:"accountant",label:"Accountant/CPA"},{id:"advisor",label:"Financial Advisor"},
          {id:"banker",label:"Banker"},{id:"insurance",label:"Insurance Agent"},
          {id:"real_estate",label:"Real Estate Agent"},{id:"analyst",label:"Analyst"}],
    shiftTypes:{Regular:1,Overtime:1.5,Weekend:1.25},
    shiftLabel:"Session", incomeLabel:"Salary/Commission", notePlaceholder:"Client, deal..." },
  { id:"other", icon:"🧩", label:"Other",
    subs:[{id:"other_custom",label:"Other / Custom"}],
    shiftTypes:{Regular:1,Overtime:1.5,"Part-Time":1,Weekend:1.25},
    shiftLabel:"Session", incomeLabel:"Income", notePlaceholder:"Details..." },
];
const getProfession = id => PROFESSIONS.find(p=>p.id===id)||PROFESSIONS[PROFESSIONS.length-1];
const getProfSub = (pId,sId) => { const p=getProfession(pId); return p.subs.find(s=>s.id===sId)||p.subs[0]; };

const fmt    = n => { const v=Number(n); return "$"+(isNaN(v)?0:v).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}); };
const fmtK   = n => { const v=Number(n||0); return v>=1000?"$"+(v/1000).toFixed(1)+"k":fmt(v); };
const todayStr = () => new Date().toISOString().split("T")[0];
const dueIn  = d => Math.ceil((new Date(d)-new Date(todayStr()))/86400000);
const daysInMonth = () => { const t=new Date(); return new Date(t.getFullYear(),t.getMonth()+1,0).getDate(); };
const dayOfMonth  = () => new Date().getDate();
const fmtDate = s => { if(!s)return""; const d=new Date(s+"T00:00:00"); return MOS[d.getMonth()]+" "+d.getDate(); };
const getScope=()=>{try{const s=JSON.parse(localStorage.getItem("fv_session")||"null");if(s?.user?.id)return"fv6_"+s.user.id.slice(0,8)+":";let d=localStorage.getItem("fv_device_id");if(!d){d="d_"+Math.random().toString(36).slice(2,10);localStorage.setItem("fv_device_id",d);}return"fv6_"+d+":";}catch{return"fv6_local:";}};
const sg = async k => { try { const r=localStorage.getItem(getScope()+k.replace("fv6:","")); if(r!==null)return JSON.parse(r); const legacy=localStorage.getItem(k); return legacy?JSON.parse(legacy):null; } catch { return null; } };
const ss = async (k,v) => { try { localStorage.setItem(getScope()+k.replace("fv6:",""),JSON.stringify(v)); } catch {} };
const notifSupported  = () => typeof window!=="undefined"&&"Notification" in window;
const notifPermission = () => notifSupported()?window.Notification.permission:"denied";
async function hashPIN(p) {
  try { const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(p+"fv_salt_2025")); return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join(""); }
  catch { return p; }
}
function advanceDueDate(dateStr, months=1) {
  if(!dateStr) return dateStr;
  const d = new Date(dateStr+"T00:00:00");
  d.setMonth(d.getMonth()+months);
  return d.toISOString().split("T")[0];
}

const DEF_CATS = [
  {id:"food",name:"Food",icon:"🍔"},{id:"housing",name:"Housing",icon:"🏠"},
  {id:"transport",name:"Transport",icon:"🚗"},{id:"bills_cat",name:"Bills",icon:"📄"},
  {id:"subs",name:"Subscriptions",icon:"🔄"},{id:"health",name:"Health",icon:"🏥"},
  {id:"personal",name:"Personal",icon:"👤"},{id:"entertainment",name:"Entertainment",icon:"🎮"},
  {id:"savings_cat",name:"Savings",icon:"💰"},{id:"misc",name:"Misc",icon:"📦"},
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Manrope:wght@600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{background:#F0F2F8;font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;overscroll-behavior:none}
::-webkit-scrollbar{display:none}
input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
input,select,button,textarea{font-family:'Inter',sans-serif}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
@keyframes pop{0%{transform:scale(.9);opacity:0}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}
@keyframes shimmer{0%{background-position:-200px 0}100%{background-position:calc(200px + 100%) 0}}
@keyframes spin{to{transform:rotate(360deg)}}
.fu{animation:fadeUp .26s cubic-bezier(.22,1,.36,1) both}
.si{animation:slideIn .22s cubic-bezier(.22,1,.36,1) both}
.pop{animation:pop .28s cubic-bezier(.34,1.56,.64,1) both}
.ba{transition:all .15s cubic-bezier(.22,1,.36,1);cursor:pointer;-webkit-tap-highlight-color:transparent}
.ba:active{transform:scale(.96)!important;opacity:.8}
.hl:hover{box-shadow:0 8px 24px rgba(99,102,241,.14)!important;transform:translateY(-2px)!important}
.db{opacity:0;transition:opacity .15s}.rw:hover .db{opacity:1}
.blurred{filter:blur(8px);user-select:none;transition:filter .25s}
.unblurred{filter:none;transition:filter .25s}
.card{background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(10,22,40,.05),0 4px 12px rgba(10,22,40,.04);transition:box-shadow .2s,transform .15s}
.card:active{box-shadow:0 1px 2px rgba(10,22,40,.06)!important;transform:scale(.99)!important}
.glass{background:rgba(255,255,255,.8);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px)}
.swipe-row{position:relative;overflow:hidden}
.swipe-content{transition:transform .22s cubic-bezier(.22,1,.36,1)}
.swipe-actions{position:absolute;right:0;top:0;bottom:0;display:flex;align-items:center}
textarea:focus,input:focus,select:focus{outline:none}
input,select{-webkit-appearance:none}
button{-webkit-tap-highlight-color:transparent}
`;

class ErrorBoundary extends React.Component {
  constructor(p){super(p);this.state={err:null};}
  static getDerivedStateFromError(e){return{err:e};}
  componentDidCatch(e,info){console.error('Trackfi Error:',e?.message,info);}
  render(){
    if(this.state.err) return(
      <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{background:C.surface,borderRadius:18,padding:28,maxWidth:380,width:"100%",textAlign:"center",boxShadow:"0 4px 24px rgba(0,0,0,.1)"}}>
          <div style={{fontSize:40,marginBottom:12}}>⚠️</div>
          <div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text,marginBottom:8}}>Something went wrong</div>
          <div style={{fontSize:13,color:C.textLight,marginBottom:20,lineHeight:1.5}}>{this.state.err?.message||"Unexpected error. Your data is safe."}</div>
          <button onClick={()=>window.location.reload()} style={{background:C.accent,border:"none",borderRadius:10,padding:"12px 24px",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",width:"100%",marginBottom:8}}>Reload App</button>
          <div style={{fontSize:11,color:C.textLight}}>Data stored separately — won't be affected</div>
        </div>
      </div>
    );
    return this.props.children;
  }
}

const iS = (focused,err) => ({width:"100%",background:focused?"#fff":C.surfaceAlt,border:`1.5px solid ${err?C.red:focused?C.accent:C.border}`,borderRadius:12,padding:"12px 14px",color:C.text,fontSize:14,outline:"none",transition:"all .18s cubic-bezier(.22,1,.36,1)",boxSizing:"border-box",boxShadow:focused&&!err?`0 0 0 3px ${C.accent}18`:"none"});

function FI({label,half,error,...p}){
  const[f,sf]=useState(false);
  return(
    <div style={{marginBottom:14,flex:half?"1 1 45%":"1 1 100%"}}>
      {label&&<div style={{fontSize:11,fontWeight:600,color:error?C.red:C.slate,letterSpacing:.5,textTransform:"uppercase",marginBottom:5}}>{label}{error&&<span style={{marginLeft:6,fontWeight:500,textTransform:"none"}}>— {error}</span>}</div>}
      <input {...p} style={iS(f,error)} onFocus={()=>sf(true)} onBlur={()=>sf(false)}/>
    </div>
  );
}
function FS({label,options,...p}){
  const[f,sf]=useState(false);
  return(
    <div style={{marginBottom:14}}>
      {label&&<div style={{fontSize:11,fontWeight:600,color:C.slate,letterSpacing:.5,textTransform:"uppercase",marginBottom:5}}>{label}</div>}
      <select {...p} style={{...iS(f),cursor:"pointer",appearance:"none"}} onFocus={()=>sf(true)} onBlur={()=>sf(false)}>
        <option value="">Select...</option>
        {(options||[]).map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
      </select>
    </div>
  );
}

function Modal({title,icon:Icon,onClose,onSubmit,submitLabel="Save",accent=C.accent,children,wide}){
  return(
    <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center",background:"rgba(10,22,40,.5)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",animation:"fadeIn .2s ease"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.surface,borderRadius:"24px 24px 0 0",width:"100%",maxWidth:wide?640:480,maxHeight:"94vh",overflowY:"auto",padding:"0 0 40px",animation:"slideUp .26s cubic-bezier(.22,1,.36,1)",boxShadow:"0 -4px 60px rgba(10,22,40,.22)"}}>
        <div style={{width:40,height:4,background:C.border,borderRadius:99,margin:"14px auto 4px"}}/>
        <div style={{padding:"16px 24px 20px",borderBottom:`1px solid ${C.borderLight}`,marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {Icon&&<div style={{background:accent+"14",borderRadius:12,padding:"9px 10px",display:"flex"}}><Icon size={20} color={accent}/></div>}
            <span style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text,letterSpacing:-.3}}>{title}</span>
          </div>
          <button onClick={onClose} className="ba" style={{background:C.surfaceAlt,border:"none",cursor:"pointer",color:C.textMid,padding:"7px 8px",borderRadius:10,display:"flex"}}><X size={15}/></button>
        </div>
        <div style={{padding:"0 24px"}}>
          {children}
          {onSubmit&&<button className="ba" onClick={onSubmit} style={{width:"100%",background:`linear-gradient(135deg,${accent},${accent}dd)`,border:"none",borderRadius:14,padding:"16px 0",color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",marginTop:16,boxShadow:`0 4px 20px ${accent}40`,letterSpacing:.4}}>{submitLabel}</button>}
        </div>
      </div>
    </div>
  );
}

function BarProg({pct,color=C.accent,h=5}){
  const p=Math.min(100,Math.max(0,pct));
  return(
    <div style={{height:h,background:C.borderLight,borderRadius:99,overflow:"hidden"}}>
      <div style={{height:"100%",width:`${p}%`,background:`linear-gradient(90deg,${color},${color}cc)`,borderRadius:99,transition:"width .6s cubic-bezier(.22,1,.36,1)"}}/>
    </div>
  );
}
function SH({title,sub,onAdd,addLabel="Add",right}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
      <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
        <div style={{width:3,height:sub?38:26,background:`linear-gradient(180deg,${C.accent},${C.purple}88)`,borderRadius:99,marginTop:2,flexShrink:0}}/>
        <div>
          <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.4,lineHeight:1.2}}>{title}</div>
          {sub&&<div style={{fontSize:12,color:C.textLight,marginTop:3,fontWeight:500}}>{sub}</div>}
        </div>
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0,marginTop:2}}>
        {right}
        {onAdd&&<button className="ba" onClick={onAdd} style={{display:"flex",alignItems:"center",gap:5,background:C.accent,border:"none",borderRadius:10,padding:"8px 16px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",boxShadow:`0 2px 8px ${C.accent}40`,letterSpacing:.2}}><Plus size={12}/>{addLabel}</button>}
      </div>
    </div>
  );
}

function Empty({text,icon:Icon=DollarSign,cta,onCta}){
  return(
    <div style={{textAlign:"center",padding:"52px 24px",animation:"fadeUp .3s ease"}}>
      <div style={{width:64,height:64,borderRadius:20,background:`linear-gradient(135deg,${C.accentBg},${C.purpleBg})`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",boxShadow:`0 4px 16px ${C.accent}18`}}><Icon size={26} color={C.accent}/></div>
      <div style={{fontSize:14,color:C.textMid,maxWidth:220,margin:"0 auto 0",lineHeight:1.6,fontWeight:500}}>{text}</div>
      {cta&&<button className="ba" onClick={onCta} style={{marginTop:16,background:C.accent,border:"none",borderRadius:10,padding:"10px 20px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",boxShadow:`0 2px 8px ${C.accent}40`}}>{cta}</button>}
    </div>
  );
}
function PINLock({onUnlock,appName,darkMode}){
  const[pin,setPin]=useState("");const[error,setError]=useState("");const[tries,setTries]=useState(0);
  const bg=darkMode?C.navy:C.bg;const surf=darkMode?C.navyMid:C.surface;
  const txt=darkMode?"rgba(255,255,255,.92)":C.text;const muted=darkMode?C.textLight:C.textLight;
  async function tryUnlock(){
    const h=await hashPIN(pin);
    if(h===localStorage.getItem("fv_pin_hash")){onUnlock();return;}
    setTries(t=>t+1);setError(tries>=2?"Too many attempts — wait 10s":"Wrong PIN");setPin("");
    if(tries>=2)setTimeout(()=>setTries(0),10000);
  }
  return(
    <div style={{minHeight:"100vh",background:bg,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:surf,borderRadius:24,padding:32,maxWidth:340,width:"100%",textAlign:"center",boxShadow:"0 8px 40px rgba(0,0,0,.15)"}}>
        <div style={{width:56,height:56,borderRadius:"50%",background:C.accentBg,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}><Lock size={24} color={C.accent}/></div>
        <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:txt,marginBottom:4}}>{appName||"Finance App"}</div>
        <div style={{fontSize:13,color:muted,marginBottom:24}}>Enter your PIN to continue</div>
        <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:20}}>
          {[0,1,2,3].map(i=><div key={i} style={{width:14,height:14,borderRadius:"50%",background:pin.length>i?C.accent:"transparent",border:`2px solid ${pin.length>i?C.accent:C.border}`,transition:"all .15s"}}/>)}
        </div>
        <input type="password" inputMode="numeric" maxLength={4} value={pin}
          onChange={e=>{setPin(e.target.value.replace(/\D/g,""));setError("");}}
          onKeyDown={e=>e.key==="Enter"&&pin.length===4&&tries<3&&tryUnlock()}
          style={{width:"100%",background:darkMode?C.navyMid:C.bg,border:`1.5px solid ${error?C.red:C.border}`,borderRadius:12,padding:"12px 16px",textAlign:"center",fontSize:24,letterSpacing:8,color:txt,outline:"none",marginBottom:8}} placeholder="••••" autoFocus/>
        {error&&<div style={{fontSize:12,color:C.red,marginBottom:8}}>{error}</div>}
        <button onClick={tryUnlock} disabled={pin.length!==4||tries>=3}
          style={{width:"100%",background:pin.length===4&&tries<3?C.accent:C.border,border:"none",borderRadius:12,padding:"13px 0",color:pin.length===4&&tries<3?"#fff":C.textFaint,fontWeight:700,fontSize:16,cursor:pin.length===4&&tries<3?"pointer":"default"}}>
          Unlock
        </button>
      </div>
    </div>
  );
}

function PINSetup({onSave,onCancel,darkMode}){
  const[step,setStep]=useState("set");const[p1,setP1]=useState("");const[p2,setP2]=useState("");const[err,setErr]=useState("");
  const cur=step==="set"?p1:p2;const setCur=step==="set"?setP1:setP2;
  async function confirm(){if(p1!==p2){setErr("PINs don't match");setP2("");return;}localStorage.setItem("fv_pin_hash",await hashPIN(p1));onSave();}
  return(
    <div style={{background:darkMode?C.navyMid:C.surface,borderRadius:16,padding:20}}>
      <div style={{fontFamily:MF,fontWeight:700,fontSize:16,color:C.text,marginBottom:4}}>{step==="set"?"Set PIN":"Confirm PIN"}</div>
      <div style={{fontSize:13,color:C.textLight,marginBottom:14}}>{step==="set"?"Choose a 4-digit PIN":"Re-enter to confirm"}</div>
      <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:14}}>
        {[0,1,2,3].map(i=><div key={i} style={{width:12,height:12,borderRadius:"50%",background:cur.length>i?C.accent:"transparent",border:`2px solid ${cur.length>i?C.accent:C.border}`,transition:"all .15s"}}/>)}
      </div>
      <input type="password" inputMode="numeric" maxLength={4} value={cur}
        onChange={e=>{setCur(e.target.value.replace(/\D/g,""));setErr("");}}
        onKeyDown={e=>{if(e.key==="Enter"){if(step==="set"&&p1.length===4)setStep("confirm");else if(step==="confirm"&&p2.length===4)confirm();}}}
        style={{width:"100%",background:C.bg,border:`1.5px solid ${err?C.red:C.border}`,borderRadius:10,padding:"10px",textAlign:"center",fontSize:22,letterSpacing:6,color:C.text,outline:"none",marginBottom:10}} placeholder="••••" autoFocus/>
      {err&&<div style={{fontSize:12,color:C.red,marginBottom:8}}>{err}</div>}
      <div style={{display:"flex",gap:8}}>
        {step==="confirm"&&<button onClick={()=>{setStep("set");setP2("");setErr("");}} style={{flex:1,background:"transparent",border:"1px solid #d0d7de",borderRadius:10,padding:"10px",color:C.textLight,fontWeight:600,fontSize:13,cursor:"pointer"}}>Back</button>}
        <button onClick={()=>{if(step==="set"&&p1.length===4)setStep("confirm");else if(step==="confirm"&&p2.length===4)confirm();}} disabled={cur.length!==4}
          style={{flex:1,background:cur.length===4?C.accent:C.border,border:"none",borderRadius:10,padding:"10px",color:cur.length===4?"#fff":C.textFaint,fontWeight:700,fontSize:13,cursor:cur.length===4?"pointer":"default"}}>
          {step==="set"?"Next":"Set PIN"}
        </button>
        <button onClick={onCancel} style={{flex:1,background:"transparent",border:"1px solid #d0d7de",borderRadius:10,padding:"10px",color:C.textLight,fontWeight:600,fontSize:13,cursor:"pointer"}}>Cancel</button>
      </div>
    </div>
  );
}

function OnboardingWizard({onComplete}){
  const [step,setStep]=useState(0);
  const [d,setD]=useState({name:"",appName:"Trackfi",profCategory:"nurse",profSub:"rn",income:{primary:"",other:"",freelance:"",trading:""},accounts:{checking:"",savings:"",cushion:"",investments:""}});
  const IS={width:"100%",border:`1.5px solid ${C.border}`,borderRadius:14,padding:"13px 15px",fontSize:16,color:C.text,outline:"none",background:C.surfaceAlt,boxSizing:"border-box",fontFamily:IF,transition:"border-color .15s"};
  const sel=getProfession(d.profCategory);
  const selSub=sel.subs.find(s=>s.id===d.profSub)||sel.subs[0];
  const isTrader=(parseFloat(d.income.trading||0)>0)||(d.profCategory==="trader");
  const firstName=(d.name||d.appName||"").split(" ")[0].replace(/[^a-zA-Z]/g,"")||"there";
  const STEPS=[
    {icon:"💰",title:"Welcome to Trackfi",body:<div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{fontSize:15,color:C.textMid,lineHeight:1.7}}>Your personal finance command center. Track every dollar, plan every bill, and build real wealth — all in one place.</div>
      <div style={{background:C.navy,borderRadius:14,padding:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {[["💸","Track spending"],["📅","Plan bills"],["💳","Pay off debt"],["🎯","Grow savings"],["📈","Log trades"],["🧾","File taxes"]].map(([ic,l])=>(<div key={l} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0"}}><span style={{fontSize:16}}>{ic}</span><span style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,.85)"}}>{l}</span></div>))}
      </div>
      <div style={{fontSize:11,color:C.textFaint,textAlign:"center",marginTop:4}}>Built for real people who want financial clarity 🚀</div>
    </div>},
    {icon:"👋",title:"First, what's your name?",body:<div>
      <div style={{fontSize:14,color:C.textMid,marginBottom:14,lineHeight:1.6}}>This personalizes your greeting and reports.</div>
      <FI label="Your name" placeholder="Victor B" value={d.name||""} onChange={e=>setD(p=>({...p,name:e.target.value}))} autoFocus/>
      {d.name&&<div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"12px 14px",fontSize:14,color:C.accent,fontWeight:600}}>👋 Nice to meet you, {d.name.split(" ")[0]}!</div>}
    </div>},
    {icon:"💼",title:firstName?"What do you do, "+firstName+"?":"What do you do?",body:<div>
      <div style={{fontSize:13,color:C.textLight,marginBottom:12}}>This tailors shift tracking, income labels, and insights to your work.</div>
      <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:260,overflowY:"auto"}}>{PROFESSIONS.map(p=><button key={p.id} onClick={()=>setD(x=>({...x,profCategory:p.id}))} style={{background:d.profCategory===p.id?C.accentBg:C.surfaceAlt,border:`2px solid ${d.profCategory===p.id?C.accent:C.border}`,borderRadius:14,padding:"12px 16px",cursor:"pointer",color:C.text,textAlign:"left",display:"flex",alignItems:"center",gap:10,transition:"all .15s"}}><span style={{fontSize:22}}>{p.icon}</span><div><div style={{fontWeight:700,fontSize:13,color:d.profCategory===p.id?C.accent:C.text}}>{p.label}</div><div style={{fontSize:11,color:C.textLight}}>{p.subs?.[0]?.label||""}</div></div></button>)}</div>
    </div>},
    {icon:"💰",title:firstName?"What do you bring home, "+firstName+"?":"Your monthly income",body:<div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{fontSize:13,color:C.textLight,marginBottom:4}}>Enter your take-home pay (after taxes). Used for budgets, safe-to-spend, and savings rate.</div>
      <FI label="Primary income / month" type="number" placeholder="4500" value={d.income?.primary||""} onChange={e=>setD(p=>({...p,income:{...(p.income||{}),primary:e.target.value}}))}/>
      <FI label="Side income (freelance, rental...)" type="number" placeholder="0" value={d.income?.other||""} onChange={e=>setD(p=>({...p,income:{...(p.income||{}),other:e.target.value}}))}/>
      {parseFloat(d.income?.primary||0)>0&&<div style={{background:C.greenBg,border:`1px solid ${C.greenMid}`,borderRadius:10,padding:"10px 14px",fontSize:13,color:C.green,fontWeight:600}}>
        Annual estimate: ${(parseFloat(d.income?.primary||0)*12+parseFloat(d.income?.other||0)*12).toLocaleString()}
      </div>}
    </div>},
    {icon:"🏦",title:"Where does your money live?",body:<div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{fontSize:13,color:C.textLight,marginBottom:4}}>Enter current balances. This powers your net worth, safe-to-spend, and balance trend — skip anything that doesn't apply.</div>
      <FI label="Checking account" type="number" placeholder="2500" value={d.accounts?.checking||""} onChange={e=>setD(p=>({...p,accounts:{...(p.accounts||{}),checking:e.target.value}}))}/>
      <FI label="Savings account" type="number" placeholder="5000" value={d.accounts?.savings||""} onChange={e=>setD(p=>({...p,accounts:{...(p.accounts||{}),savings:e.target.value}}))}/>
      <FI label="Investments (401k, brokerage...)" type="number" placeholder="0" value={d.accounts?.investments||""} onChange={e=>setD(p=>({...p,accounts:{...(p.accounts||{}),investments:e.target.value}}))}/>
      {(parseFloat(d.accounts?.checking||0)+parseFloat(d.accounts?.savings||0))>0&&<div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:10,padding:"10px 14px",fontSize:13,color:C.accent,fontWeight:600}}>
        Liquid savings: ${(parseFloat(d.accounts?.checking||0)+parseFloat(d.accounts?.savings||0)).toLocaleString()}
      </div>}
    </div>},
    {icon:"📅",title:"Any recurring bills?",body:<div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{fontSize:13,color:C.textLight,marginBottom:4}}>Add your biggest monthly bills to see upcoming due dates and safe-to-spend. Skip for now and add later.</div>
      {(d.bills||[]).map((b,i)=><div key={i} style={{display:"flex",gap:8,alignItems:"center"}}>
        <input placeholder="Bill name (e.g. Rent)" value={b.name||""} onChange={e=>setD(p=>({...p,bills:(p.bills||[]).map((x,j)=>j===i?{...x,name:e.target.value}:x)}))} style={{flex:2,background:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"10px 12px",fontSize:14,color:C.text,outline:"none"}}/>
        <input type="number" placeholder="$" value={b.amount||""} onChange={e=>setD(p=>({...p,bills:(p.bills||[]).map((x,j)=>j===i?{...x,amount:e.target.value}:x)}))} style={{flex:1,background:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"10px 12px",fontSize:14,color:C.text,outline:"none"}}/>
        <button onClick={()=>setD(p=>({...p,bills:(p.bills||[]).filter((_,j)=>j!==i)}))} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,padding:6,display:"flex"}}><X size={16}/></button>
      </div>)}
      <button onClick={()=>setD(p=>({...p,bills:[...(p.bills||[]),{name:"",amount:""}]}))} style={{background:C.surfaceAlt,border:`1.5px dashed ${C.border}`,borderRadius:10,padding:"10px 0",color:C.textLight,fontWeight:600,fontSize:13,cursor:"pointer"}}>+ Add a bill</button>
    </div>},
    {icon:"🎯",title:firstName?"What are you saving for, "+firstName+"?":"Set a savings goal",body:<div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{fontSize:13,color:C.textLight,marginBottom:4}}>A goal gives you something to work toward. Emergency fund is the most important one to start.</div>
      <FI label="Goal name" placeholder="Emergency Fund" value={d.goalName||""} onChange={e=>setD(p=>({...p,goalName:e.target.value}))}/>
      <FI label="Target amount ($)" type="number" placeholder="5000" value={d.goalTarget||""} onChange={e=>setD(p=>({...p,goalTarget:e.target.value}))}/> 
      {d.goalName&&d.goalTarget&&parseFloat(d.income?.primary||0)>0&&(()=>{const mo=Math.ceil(parseFloat(d.goalTarget)/(parseFloat(d.income?.primary||0)*0.2));return(<div style={{background:C.greenBg,border:`1px solid ${C.greenMid}`,borderRadius:10,padding:"10px 14px",fontSize:13,color:C.green,fontWeight:600}}>At 20% savings rate: ~{mo} months to reach {d.goalName} 🎯</div>);})()}
    </div>},
  ];
  const cur=STEPS[step];
  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(160deg,${C.navy} 0%,${C.accent} 100%)`,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.surface,borderRadius:24,width:"100%",maxWidth:480,boxShadow:"0 20px 60px rgba(0,0,0,.25)",overflow:"hidden"}}>
        <div style={{height:4,background:C.borderLight}}><div style={{height:"100%",width:`${((step+1)/STEPS.length)*100}%`,background:`linear-gradient(90deg,${C.accent},${C.teal})`,transition:"width .4s",borderRadius:99}}/></div>
        <div style={{padding:"26px 24px 30px",maxHeight:"88vh",overflowY:"auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
            <span style={{fontSize:12,color:C.textLight,fontWeight:600}}>Step {step+1} of {STEPS.length}</span>
            {step>0&&step<STEPS.length-1&&<button onClick={()=>setStep(s=>s-1)} style={{background:"none",border:"1px solid #E4E8F0",borderRadius:8,padding:"5px 12px",fontSize:12,color:C.textMid,cursor:"pointer"}}>← Back</button>}
          </div>
          <div style={{textAlign:"center",marginBottom:20}}>
            <div style={{fontSize:44,marginBottom:10}}>{cur.icon}</div>
            <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,marginBottom:4}}>{cur.title}</div>
          </div>
          {cur.body}
          <button onClick={()=>{if(step<STEPS.length-1){setStep(s=>s+1);}else{onComplete({...d,isTrader,isHealthcare:d.profCategory==="healthcare"});}}} style={{width:"100%",marginTop:20,background:`linear-gradient(135deg,${C.accent},${C.green})`,border:"none",borderRadius:14,padding:"15px 0",color:"#fff",fontFamily:MF,fontWeight:800,fontSize:16,cursor:"pointer"}}>
            {step===STEPS.length-1?"🚀 Launch Trackfi":step===0?"Get Started →":"Continue →"}
          </button>
          {step>0&&step<STEPS.length-1&&<button onClick={()=>setStep(s=>s+1)} style={{width:"100%",marginTop:10,background:"none",border:"none",color:C.textLight,fontSize:13,cursor:"pointer"}}>Skip for now</button>}
        </div>
      </div>
    </div>
  );
}






function parseMsg(text,categories,debts){
  const t=text.toLowerCase().trim();
  // Pre-process: split bill
  const splitM=t.match(/split\s*(\d+)/i);const splitBy=splitM?parseInt(splitM[1]):1;
  // Pre-process: tip/percentage
  const tipM=t.match(/(?:plus|\+|tip)\s*(\d+)%/i);const tipPct=tipM?parseFloat(tipM[1])/100:0;
  const am=text.match(/\$?([\d,]+(?:\.\d{1,2})?)/);
  const rawAmount=am?parseFloat(am[1].replace(/,/g,"")):null;
  const amount=rawAmount!=null?String(((rawAmount*(1+tipPct))/splitBy).toFixed(2)):null;
  const dt=new Date();let date=todayStr();
  if(t.includes("yesterday")){const d=new Date(dt);d.setDate(d.getDate()-1);date=d.toISOString().split("T")[0];}
  const DAYS=["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  const lastDayM=t.match(/last\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
  if(lastDayM){const target=DAYS.indexOf(lastDayM[1].toLowerCase());const d=new Date(dt);const curr=d.getDay();const diff=curr>=target?curr-target:curr-target+7;d.setDate(d.getDate()-Math.max(diff,1));date=d.toISOString().split("T")[0];}
  // Transfer detection (moved/transferred X to savings/checking)
  if((t.includes("moved")||t.includes("transferred")||t.includes("transfer"))&&amount){
    if(t.includes("saving"))return{type:"account",key:"savings",amount,text:"Moved to savings"};
    if(t.includes("checking"))return{type:"account",key:"checking",amount,text:"Moved to checking"};
  }
  const dueM=t.match(/due(?:\s+the)?\s+(\d{1,2})(?:st|nd|rd|th)?/)||t.match(/on(?:\s+the)?\s+(\d{1,2})(?:st|nd|rd|th)/);
  let dueDate=null;
  if(dueM){const d=new Date(dt.getFullYear(),dt.getMonth(),parseInt(dueM[1]));if(d<dt)d.setMonth(d.getMonth()+1);dueDate=d.toISOString().split("T")[0];}
  if(t==="undo"||t.startsWith("undo last")||t.includes("undo that"))return{type:"undo"};
  const acctKeys={checking:["checking","check"],savings:["savings","saving"],cushion:["cushion","buffer"]};
  for(const[key,kws]of Object.entries(acctKeys)){if(kws.some(k=>t.includes(k))&&amount)return{type:"account",key,amount};}
  if((t.includes("primary income")||t.includes("salary set")||t.includes("income set"))&&amount)return{type:"income",key:"primary",amount};
  const tradeKws=["traded","long ","short ","es ","nq ","cl ","gc ","futures","position"];
  if(tradeKws.some(k=>t.includes(k))&&amount){
    const sym=(text.match(/\b(ES|NQ|CL|GC|SI|ZB|YM|MES|MNQ|RTY)\b/i)||[])[1]?.toUpperCase()||"FUTURE";
    const side=t.includes("short")?"Short":"Long";
    const pnl=t.includes("-")||t.includes("loss")||t.includes("lost")?"-"+amount:amount;
    return{type:"trade",symbol:sym,side,pnl,date,contracts:"1"};
  }
  const debtKws=["loan","debt","credit card","owe","balance update","pay off"];
  if(debtKws.some(k=>t.includes(k))&&amount){
    const match=debts.find(d=>d.name.toLowerCase().split(" ").some(w=>t.includes(w)&&w.length>3));
    const name=match?match.name:text.replace(/\$?[\d,]+(?:\.\d{1,2})?/g,"").replace(/loan|debt|owe|balance|update|credit card/gi,"").trim().split(" ").filter(Boolean).map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(" ")||"Debt";
    const rateM=t.match(/(\d+(?:\.\d+)?)\s*%/);
    return{type:"debt",name,balance:amount,rate:rateM?rateM[1]:"",isUpdate:!!match,matchId:match?.id};
  }
  const billKws=["bill","rent","mortgage","electric","water","internet","phone","insurance","netflix","spotify","gym","hulu","due","subscription","car payment"];
  if((billKws.some(k=>t.includes(k))||dueDate)&&amount){
    let name=text.replace(/\$?[\d,]+(?:\.\d{1,2})?/g,"").replace(/bill|due(?:\s+the)?\s+\d{1,2}(?:st|nd|rd|th)?/gi,"").trim();
    name=name.split(" ").filter(Boolean).map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(" ")||"Bill";
    return{type:"bill",name,amount,dueDate:dueDate||"",recurring:"Monthly",autoPay:false};
  }
  if(amount){
    const catMap={
      "Food":["lunch","dinner","breakfast","coffee","food","eat","meal","restaurant","mcdonald","chipotle","pizza","burger","groceries","grocery","doordash","ubereats","starbucks","dunkin","chick","wendy","taco","subway","cafe","sushi","thai"],
      "Transport":["gas","fuel","uber","lyft","parking","toll","car wash","oil change","tire","mechanic"],
      "Housing":["rent","mortgage","repair","home depot","maintenance","lowes"],
      "Subscriptions":["netflix","hulu","spotify","apple","amazon prime","youtube","disney","hbo","gym","membership","subscription"],
      "Health":["doctor","hospital","pharmacy","medicine","prescription","dental","therapy","copay","cvs","walgreens","rite aid"],
      "Entertainment":["movie","game","bar","club","concert","ticket","bowling","steam","ps5","xbox"],
      "Personal":["haircut","barber","salon","clothes","clothing","shoes","shopping","target","amazon","nike","h&m"],
    };
    let category="Misc",best=0;
    for(const[cat,kws]of Object.entries(catMap)){const s=kws.filter(k=>t.includes(k)).length;if(s>best){best=s;category=cat;}}
    if(best===0){for(const c of categories){if(t.includes(c.name.toLowerCase())){category=c.name;break;}}}
    let name=text.replace(/\$?[\d,]+(?:\.\d{1,2})?/g,"").replace(/\b(spent|bought|paid|got|for|on|the|a|my|at|to|today|yesterday)\b/gi,"").replace(/\s+/g," ").trim();
    name=name.split(" ").filter(Boolean).map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(" ")||"Expense";
    return{type:"expense",name,amount,category,date};
  }
  return null;
}

function ChatView({categories,expenses,bills,debts,accounts,income,savingsGoals,trades,tradingAccount,setExpenses,setBills,setDebts,setSGoals,setAccounts,setIncome,setTrades,setBGoals}){
  const[msgs,setMsgs]=useState([{role:"a",text:"Hey! I can log anything:\
• \"lunch 60 split 3\" → $20 expense\
• \"coffee 5 tip 20%\" → $6 expense\
• \"rent 1200 due 28th\" → bill\
• \"checking 3200\" → balance update\
• \"moved 500 to savings\" → transfer\
• \"last monday dinner 45\" → dated expense\
• \"traded ES +250\" → trade\
• \"undo\" → remove last entry\
Or ask: \"can I afford $200?\""}]);
  const[input,setInput]=useState("");const[pending,setPending]=useState(null);const[history,setHistory]=useState([]);
  const botRef=useRef();
  useEffect(()=>{botRef.current?.scrollIntoView({behavior:"smooth"});},[msgs,pending]);
  const ti=useMemo(()=>(parseFloat(income.primary||0))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0)),[income]);
  const te=useMemo(()=>expenses.reduce((s,e)=>s+(parseFloat(e.amount)||0),0),[expenses]);
  const ck=parseFloat(accounts.checking||0);
  const bs=bills.filter(b=>!b.paid&&dueIn(b.dueDate)>=0&&dueIn(b.dueDate)<=7).reduce((s,b)=>s+(parseFloat(b.amount)||0),0);
  const sts=Math.max(0,ck-bs-200);
  const burn=dayOfMonth()>0?te/dayOfMonth():0;
  function handleQ(t){
    if(t.includes("afford")||t.includes("safe")){const m=t.match(/[\d,]+/);const a=m?parseFloat(m[0].replace(/,/g,"")):null;if(a)return a<=sts?"Yes! "+fmt(a)+" fits in "+fmt(sts):"No — "+fmt(a)+" exceeds safe-to-spend "+fmt(sts);return "Safe-to-spend: "+fmt(sts);}
    if(t.includes("bill")||t.includes("due")){const up=bills.filter(b=>!b.paid&&dueIn(b.dueDate)>=0&&dueIn(b.dueDate)<=14);const ov=bills.filter(b=>!b.paid&&dueIn(b.dueDate)<0);return(ov.length?"🚨 Overdue: "+ov.map(b=>b.name+" "+fmt(b.amount)).join(", ")+"\
":"")+(up.length?"Due soon: "+up.map(b=>b.name+" "+fmt(b.amount)+" ("+dueIn(b.dueDate)+"d)").join(", "):"No bills due soon");}
    if(t.includes("spend on")||t.includes("spent on")){const words=t.replace(/\?/g,"").split(" ");const catIdx=words.findIndex(w=>w==="on");const catQ=catIdx>=0?words.slice(catIdx+1).join(" "):"";const catTotal=expenses.filter(e=>(e.category||"").toLowerCase().includes(catQ)||(e.name||"").toLowerCase().includes(catQ)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);return"Spent "+fmt(catTotal)+(catQ?" on "+catQ:"")+" total";}if(t.includes("spend"))return fmt(te)+" spent this month · "+fmt(burn)+"/day burn";
    if(t.includes("balance")||t.includes("account"))return"Checking: "+fmt(accounts.checking)+" . Savings: "+fmt(accounts.savings);
    if(t.includes("debt")){const td=debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0);return debts.length?"Total debt: "+fmt(td)+"\
"+debts.map(d=>"• "+d.name+": "+fmt(d.balance)).join(String.fromCharCode(13,10)):"No debts!";}
    if(t.includes("net worth")){const ta=["checking","savings","cushion","investments"].reduce((s,k)=>s+(parseFloat(accounts[k]||0)),0);const td=debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0);return"Net Worth: "+fmt(ta-td);}
    if(t.includes("biggest expense")||t.includes("largest expense")){const top=expenses.slice().sort((a,b)=>parseFloat(b.amount)-parseFloat(a.amount))[0];return top?"Biggest: "+top.name+" "+fmt(top.amount)+" on "+top.date:"No expenses yet";}
    if(t.includes("savings rate")||t.includes("saving rate")){const sr=ti>0?Math.max(0,(ti-te)/ti*100):0;return"Savings rate: "+sr.toFixed(1)+"% · saving "+fmt(Math.max(0,ti-te))+" of "+fmt(ti)+" income";}
    if(t.includes("subscription")||t.includes("subscriptions")){const nameMap={};expenses.forEach(e=>{const k=e.name?.toLowerCase().trim();if(!k)return;if(!nameMap[k])nameMap[k]=[];nameMap[k].push(e);});const subs=Object.values(nameMap).filter(v=>v.length>=2&&v.map(x=>parseFloat(x.amount)).every((a,_,arr)=>Math.abs(a-arr[0])<1));return subs.length?"Found "+subs.length+" recurring charges: "+subs.map(v=>v[0].name+" "+fmt(v[0].amount)).join(", "):"No recurring patterns detected";}
    if(t.includes("health score")||t.includes("score")){const sr2=ti>0?Math.max(0,(ti-te/Math.max(1,new Date().getMonth()+1))/ti*100):0;const sc=Math.min(10,Math.max(1,parseFloat(((sr2>.20?100:sr2>.10?75:sr2>.05?50:25)*.25+(debts.length===0?100:40)*.20+(liq/Math.max(1,te/Math.max(1,new Date().getDate()))/6*100)*.20+100*.35)/10).toFixed(1)));return"Health score: "+sc+"/10 — type 'health score' to go to details";}
    return null;
  }
  function send(){const text=input.trim();if(!text)return;setInput("");setMsgs(p=>[...p,{role:"u",text}]);const t=text.toLowerCase();const isQ=t.includes("?")||/^(how|what|can|show|is|am|will|when|tell)/.test(t);if(isQ){const ans=handleQ(t);if(ans){setMsgs(p=>[...p,{role:"a",text:ans}]);return;}}const parsed=parseMsg(text,categories,debts);if(!parsed){setMsgs(p=>[...p,{role:"a",text:"Try: lunch 12, rent 1200 due 28th, checking 3200, undo"}]);return;}
    if(parsed.type==="undo"){if(!history.length){setMsgs(p=>[...p,{role:"a",text:"Nothing to undo!"}]);return;}const last=history[history.length-1];if(last.type==="expense")setExpenses(p=>p.filter(x=>x.id!==last.id));else if(last.type==="bill")setBills(p=>p.filter(x=>x.id!==last.id));else if(last.type==="debt")setDebts(p=>p.filter(x=>x.id!==last.id));else if(last.type==="trade")setTrades(p=>p.filter(x=>x.id!==last.id));else if(last.type==="account")setAccounts(p=>({...p,[last.key]:last.oldVal}));setHistory(p=>p.slice(0,-1));setMsgs(p=>[...p,{role:"a",text:"↩️ Undone: "+last.label}]);return;}
    setPending(parsed);setMsgs(p=>[...p,{role:"a",text:"Confirm?"}]);}
  function confirm(){if(!pending)return;const id=Date.now();let lbl="";
    if(pending.type==="expense"){setExpenses(p=>[...p,{id,...pending,notes:""}]);setHistory(p=>[...p,{type:"expense",id,label:pending.name+" "+fmt(pending.amount)}]);lbl="✅ "+pending.name+" ("+fmt(pending.amount)+") logged!";}else if(pending.type==="bill"){setBills(p=>[...p,{id,...pending,paid:false,autoPay:false}]);setHistory(p=>[...p,{type:"bill",id,label:pending.name}]);lbl="✅ "+pending.name+" bill added!";}else if(pending.type==="debt"){if(pending.isUpdate){setDebts(p=>p.map(d=>d.id===pending.matchId?{...d,balance:pending.balance}:d));}else{setDebts(p=>[...p,{id,name:pending.name,balance:pending.balance,rate:pending.rate||"",minPayment:""}]);setHistory(p=>[...p,{type:"debt",id,label:pending.name}]);}lbl="✅ "+pending.name+" saved!";}else if(pending.type==="trade"){setTrades(p=>[{id,date:pending.date,symbol:pending.symbol,side:pending.side,contracts:"1",pnl:pending.pnl,entry:"",exit:"",note:""},...p]);setHistory(p=>[...p,{type:"trade",id,label:pending.symbol+" "+pending.side}]);lbl="✅ "+pending.symbol+" "+(parseFloat(pending.pnl)>=0?"+":"")+fmt(pending.pnl);}else if(pending.type==="account"){const oldVal=accounts[pending.key];setAccounts(p=>({...p,[pending.key]:pending.amount}));setHistory(p=>[...p,{type:"account",key:pending.key,oldVal,label:pending.key}]);lbl="✅ "+pending.key+": "+fmt(pending.amount);}
    setMsgs(p=>[...p,{role:"a",text:lbl||"✅ Saved!"}]);setPending(null);}
  const cr=(l,v)=><div style={{display:"flex",justifyContent:"space-between",padding:"6px 10px",background:C.bg,borderRadius:8,marginBottom:3}}><span style={{fontSize:12,color:C.textLight}}>{l}</span><span style={{fontSize:12,color:C.text,fontWeight:600}}>{v}</span></div>;
  return(<div style={{display:"flex",flexDirection:"column",height:"100%",minHeight:0}}>
    <div style={{background:sts>200?`linear-gradient(135deg,${C.green},${C.teal})`:`linear-gradient(135deg,${C.red},#c41230)`,borderRadius:16,padding:"14px 18px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div><div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.7)",textTransform:"uppercase",letterSpacing:.5}}>Safe to Spend</div><div style={{fontFamily:MF,fontSize:28,fontWeight:800,color:"#fff"}}>{fmt(sts)}</div></div>
      <div style={{textAlign:"right",fontSize:12,color:"rgba(255,255,255,.7)"}}><div>{fmt(burn)}/day</div>{history.length>0&&<div style={{fontSize:11}}>type "undo"</div>}</div>
    </div>
    <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:8,paddingBottom:10,minHeight:0}}>
      {msgs.map((m,i)=><div key={i} style={{display:"flex",justifyContent:m.role==="u"?"flex-end":"flex-start"}}><div style={{maxWidth:"86%",padding:"11px 14px",borderRadius:m.role==="u"?"18px 18px 4px 18px":"18px 18px 18px 4px",background:m.role==="u"?C.accent:"#fff",color:m.role==="u"?"#fff":C.text,fontSize:14,lineHeight:1.55,border:m.role==="a"?"1px solid "+C.border:"none",whiteSpace:"pre-wrap"}}>{m.text}</div></div>)}
      {pending&&<div style={{background:C.surface,border:"1.5px solid "+C.accentMid,borderRadius:16,padding:18}}><div style={{fontSize:11,fontWeight:700,color:C.accent,textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>Confirm</div>{pending.name&&cr("Name",pending.name)}{(pending.amount||pending.balance)&&cr("Amount",fmt(pending.amount||pending.balance))}{pending.category&&cr("Category",pending.category)}{pending.symbol&&cr("Trade",pending.symbol+" "+(parseFloat(pending.pnl)>=0?"+":"")+fmt(pending.pnl))}<div style={{display:"flex",gap:8,marginTop:12}}><button className="ba" onClick={confirm} style={{flex:1,background:C.green,border:"none",borderRadius:10,padding:"11px 0",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>✅ Save</button><button className="ba" onClick={()=>setPending(null)} style={{flex:1,background:C.bg,border:"1px solid "+C.border,borderRadius:10,padding:"11px 0",color:C.textMid,fontWeight:600,fontSize:13,cursor:"pointer"}}>Cancel</button></div></div>}
      <div ref={botRef}/>
    </div>
    <div style={{display:"flex",gap:8,paddingTop:10,borderTop:"1px solid "+C.border,flexShrink:0}}>
      <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder='Try "lunch 12" or "can I afford $200?"' style={{flex:1,background:C.bg,border:"1.5px solid "+C.border,borderRadius:12,padding:"11px 14px",color:C.text,fontSize:14,outline:"none"}}/>
      <button className="ba" onClick={send} disabled={!input.trim()} style={{background:input.trim()?C.accent:C.border,border:"none",borderRadius:12,padding:"0 16px",cursor:input.trim()?"pointer":"default",display:"flex",alignItems:"center",color:input.trim()?"#fff":C.textLight}}><Send size={17}/></button>
    </div>
  </div>);
}

function SearchView({expenses,bills,debts,trades,categories,setEditItem,onNavigate}){
  const[q,setQ]=useState("");const[filter,setFilter]=useState("all");
  const results=useMemo(()=>{
    if(!q.trim())return[];
    const t=q.toLowerCase();
    const res=[];
    if(filter==="all"||filter==="expenses")expenses.forEach(e=>{if(e.name?.toLowerCase().includes(t)||e.category?.toLowerCase().includes(t)||e.notes?.toLowerCase().includes(t))res.push({type:"expense",data:e,title:e.name,sub:e.date+" - "+e.category,val:"-"+fmt(e.amount),color:C.red,icon:"💸"});});
    if(filter==="all"||filter==="bills")bills.forEach(b=>{if(b.name?.toLowerCase().includes(t))res.push({type:"bill",data:b,title:b.name,sub:"Due "+fmtDate(b.dueDate)+(b.paid?" - Paid":""),val:fmt(b.amount),color:b.paid?C.green:C.amber,icon:"📅"});});
    if(filter==="all"||filter==="debts")debts.forEach(d=>{if(d.name?.toLowerCase().includes(t))res.push({type:"debt",data:d,title:d.name,sub:(d.type||"Debt")+" - "+d.rate+"%APR",val:fmt(d.balance),color:C.red,icon:"💳"});});
    if(filter==="all"||filter==="trades")trades.forEach(t2=>{if(t2.symbol?.toLowerCase().includes(t)||t2.note?.toLowerCase().includes(t))res.push({type:"trade",data:t2,title:t2.symbol+" "+t2.side,sub:t2.date+(t2.note?" - "+t2.note:""),val:(parseFloat(t2.pnl)>=0?"+":"")+fmt(t2.pnl),color:parseFloat(t2.pnl)>=0?C.green:C.red,icon:parseFloat(t2.pnl)>=0?"📈":"📉"});});
    return res.slice(0,50);
  },[q,filter,expenses,bills,debts,trades]);
  return(
    <div className="fu">
      <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,marginBottom:4,letterSpacing:-.3}}>Search</div>
      <div style={{fontSize:13,color:C.textLight,marginBottom:14}}>Search across all your financial data</div>
      <div style={{position:"relative",marginBottom:12}}>
        <Search size={16} color={C.textLight} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)"}}/>
        <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search expenses, bills, debts, trades..." style={{width:"100%",background:C.surface,border:`1.5px solid ${q?C.accent:C.border}`,borderRadius:12,padding:"12px 14px 12px 38px",fontSize:14,color:C.text,outline:"none",boxSizing:"border-box"}}/>
        {q&&<button onClick={()=>setQ("")} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:C.textLight,display:"flex"}}><X size={16}/></button>}
      </div>
      <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto",paddingBottom:2}}>
        {[["all","All"],["expenses","Expenses"],["bills","Bills"],["debts","Debts"],["trades","Trades"]].map(([id,label])=>(
          <button key={id} onClick={()=>setFilter(id)} style={{flexShrink:0,padding:"7px 14px",borderRadius:99,border:`1.5px solid ${filter===id?C.accent:C.border}`,background:filter===id?C.accentBg:C.surface,color:filter===id?C.accent:C.textMid,fontWeight:filter===id?700:500,fontSize:13,cursor:"pointer"}}>{label}</button>
        ))}
      </div>
      {!q&&<div style={{textAlign:"center",padding:"40px 20px",color:C.textLight}}><Search size={32} color={C.border} style={{margin:"0 auto 12px",display:"block"}}/><div style={{fontSize:14,fontWeight:500}}>Start typing to search</div></div>}
      {q&&results.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:C.textLight}}><div style={{fontSize:32,marginBottom:12}}>🔍</div><div style={{fontSize:14,fontWeight:500}}>No results for "{q}"</div></div>}
      {results.map((r,i)=>(
        <div key={i} style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"13px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>{if((r.type==="expense"||r.type==="bill"||r.type==="debt")&&setEditItem)setEditItem({type:r.type,data:r.data});else if(r.type==="trade"&&onNavigate)onNavigate("trading");}}>
          <div style={{width:38,height:38,borderRadius:10,background:r.color+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{r.icon}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:600,color:C.text}}>{r.title}</div>
            <div style={{fontSize:12,color:C.textLight,marginTop:1}}>{r.sub}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:r.color}}>{r.val}</div><ChevronRight size={13} color={C.textLight}/></div>
        </div>
      ))}
      {results.length>0&&<div style={{textAlign:"center",fontSize:12,color:C.textLight,marginTop:8}}>{results.length} result{results.length!==1?"s":""} found</div>}
    </div>
  );
}

function InsightsView({expenses,income,bills,debts,budgetGoals,savingsGoals}){
  const now=new Date();
  const thisMs=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
  const lastMs=new Date(now.getFullYear(),now.getMonth()-1,1).getFullYear()+"-"+String(new Date(now.getFullYear(),now.getMonth()-1,1).getMonth()+1).padStart(2,"0");
  const thisExp=expenses.filter(e=>e.date?.startsWith(thisMs));
  const lastExp=expenses.filter(e=>e.date?.startsWith(lastMs));
  const thisTotal=thisExp.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const lastTotal=lastExp.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const diff=lastTotal>0?((thisTotal-lastTotal)/lastTotal*100):0;
  const ti=(parseFloat(income.primary||0))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const catMap=thisExp.reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount)||0);return a},{});
  const catSorted=Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
  const lastCatMap=lastExp.reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount)||0);return a},{});
  const topMerchants=Object.entries(thisExp.reduce((a,e)=>{a[e.name]=(a[e.name]||0)+(parseFloat(e.amount)||0);return a},{})).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const dailyAvg=thisTotal/Math.max(1,now.getDate());
  const projectedMonth=dailyAvg*new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  return(
    <div className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.3}}>Spending Insights</div>

      </div>
      <div style={{fontSize:13,color:C.textLight,marginBottom:16}}>Deep dive into your spending patterns</div>
      <div style={{background:C.navy,borderRadius:18,padding:20,marginBottom:14,color:"#fff"}}>
        <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>This Month vs Last Month</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:16}}>
          <div><div style={{fontFamily:MF,fontSize:32,fontWeight:800,color:"#fff"}}>{fmt(thisTotal)}</div><div style={{fontSize:12,color:"rgba(255,255,255,.4)",marginTop:2}}>{MOS[now.getMonth()]} spending</div></div>
          <div style={{textAlign:"right"}}><div style={{fontFamily:MF,fontSize:18,fontWeight:700,color:diff>0?C.redMid:C.greenMid}}>{diff>0?"+":""}{diff.toFixed(1)}%</div><div style={{fontSize:12,color:"rgba(255,255,255,.4)"}}>vs {MOS[new Date(now.getFullYear(),now.getMonth()-1,1).getMonth()]}</div></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>{[["Daily avg",fmt(dailyAvg),C.accentMid],["Projected",fmt(projectedMonth),C.amberMid],["Last month",fmt(lastTotal),C.textFaint]].map(([l,v,c])=><div key={l} style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"9px 8px"}}><div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:2}}>{l.toUpperCase()}</div><div style={{fontFamily:MF,fontSize:13,fontWeight:700,color:c}}>{v}</div></div>)}</div>
      </div>
      {catSorted.length>0&&<div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,boxShadow:"0 2px 8px rgba(13,27,42,.08)",marginBottom:14}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>By Category</div>
        {catSorted.map(([cat,amt],i)=>{
          const lastAmt=lastCatMap[cat]||0;
          const catDiff=lastAmt>0?((amt-lastAmt)/lastAmt*100):0;
          return(<div key={cat} style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:"50%",background:PIE_COLORS[i%PIE_COLORS.length]}}/><span style={{fontSize:13,fontWeight:600,color:C.text}}>{cat}</span></div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {lastAmt>0&&<span style={{fontSize:11,color:catDiff>10?C.red:catDiff<-10?C.green:C.textLight,fontWeight:600}}>{catDiff>0?"+":""}{catDiff.toFixed(0)}%</span>}
                <span style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.text}}>{fmt(amt)}</span>
              </div>
            </div>
            <BarProg pct={thisTotal>0?amt/thisTotal*100:0} color={PIE_COLORS[i%PIE_COLORS.length]} h={6}/>
          </div>);
        })}
      </div>}
      {topMerchants.length>0&&<div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,boxShadow:"0 2px 8px rgba(13,27,42,.08)",marginBottom:14}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>Top Merchants</div>
        {topMerchants.map(([name,amt],i)=>(
          <div key={name} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 0",borderBottom:i<topMerchants.length-1?`1px solid ${C.border}`:"none"}}>
            <div style={{width:32,height:32,borderRadius:8,background:PIE_COLORS[i%PIE_COLORS.length]+"18",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:MF,fontWeight:800,fontSize:13,color:PIE_COLORS[i%PIE_COLORS.length]}}>{i+1}</div>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:C.text}}>{name}</div><div style={{fontSize:11,color:C.textLight}}>{thisExp.filter(e=>e.name===name).length} transactions</div></div>
            <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.red}}>{fmt(amt)}</div>
          </div>
        ))}
      </div>}
      {(()=>{
        const nameCount={};
        expenses.forEach(e=>{if(!nameCount[e.name])nameCount[e.name]={count:0,total:0,amounts:[]};nameCount[e.name].count++;nameCount[e.name].total+=parseFloat(e.amount||0);nameCount[e.name].amounts.push(parseFloat(e.amount||0));});
        const subs=Object.entries(nameCount).filter(([n,v])=>v.count>=2&&v.amounts.every(a=>Math.abs(a-v.amounts[0])<1)).map(([name,v])=>({name,amount:v.amounts[0],count:v.count,annual:v.amounts[0]*12})).sort((a,b)=>b.annual-a.annual);
        if(!subs.length)return null;
        return(<div style={{background:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:18,padding:18,marginBottom:14}}>
          <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>Detected Subscriptions</div>
          <div style={{fontSize:12,color:C.textLight,marginBottom:12}}>Recurring charges found in your expenses</div>
          {subs.map(s=>(<div key={s.name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${C.borderLight}`}}><div><div style={{fontSize:13,fontWeight:600,color:C.text}}>{s.name}</div><div style={{fontSize:11,color:C.textLight}}>{s.count}x detected - {fmt(s.annual)}/yr</div></div><div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>{fmt(s.amount)}/mo</div></div>))}
          <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,marginTop:4,borderTop:`1px solid ${C.border}`}}><span style={{fontSize:13,fontWeight:600,color:C.text}}>Total subscriptions</span><span style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.red}}>{fmt(subs.reduce((s,x)=>s+x.amount,0))}/mo</span></div>
        </div>);
      })()}
      {budgetGoals.length>0&&<div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,boxShadow:"0 2px 8px rgba(13,27,42,.08)"}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>Budget Performance</div>
        {budgetGoals.map(g=>{
          const spent=thisExp.filter(e=>e.category===g.category).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
          const pct=parseFloat(g.limit)>0?(spent/parseFloat(g.limit)*100):0;
          const over=spent>parseFloat(g.limit);
          return(<div key={g.id} style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:13,fontWeight:600,color:C.text}}>{g.category}</span><span style={{fontSize:13,fontWeight:700,color:over?C.red:C.green}}>{fmt(spent)} / {fmt(g.limit)}</span></div>
            <BarProg pct={pct} color={over?C.red:pct>80?C.amber:C.green} h={6}/>
            {over&&<div style={{fontSize:11,color:C.red,marginTop:3,fontWeight:500}}>Over by {fmt(spent-parseFloat(g.limit))}</div>}
          </div>);
        })}
      </div>}
      {catSorted.length>0&&<div style={{background:C.surface,borderRadius:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"14px 14px 6px",marginBottom:14}}><div style={{fontSize:12,fontWeight:600,color:C.textLight,marginBottom:12}}>Top Spending This Month</div><ResponsiveContainer width="100%" height={Math.min(catSorted.length*38+20,220)}><BarChart data={catSorted.slice(0,5)} layout="vertical" barSize={16} margin={{left:4,right:50}}><XAxis type="number" hide/><YAxis type="category" dataKey="name" tick={{fontSize:11,fill:C.textMid}} width={80} axisLine={false} tickLine={false}/><Tooltip formatter={v=>[fmt(v),"Spent"]} contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,fontSize:12}}/><Bar dataKey="amt" radius={[0,6,6,0]}>{catSorted.slice(0,5).map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}</Bar></BarChart></ResponsiveContainer></div>}
    </div>
  );
}

function PaycheckView({bills,income,expenses,accounts,onAdd}){
  const now=new Date();
  const ti=(parseFloat(income.primary||0))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const checking=parseFloat(accounts.checking||0);
  const biweekly=ti/2;
  const today=now.getDate();
  let nextPay,daysUntilPay;
  if(today<15){nextPay=new Date(now.getFullYear(),now.getMonth(),15);daysUntilPay=15-today;}else if(today<new Date(now.getFullYear(),now.getMonth()+1,0).getDate()){nextPay=new Date(now.getFullYear(),now.getMonth()+1,0);daysUntilPay=new Date(now.getFullYear(),now.getMonth()+1,0).getDate()-today;}else{nextPay=new Date(now.getFullYear(),now.getMonth()+1,15);daysUntilPay=15;}
  const billsBeforePay=bills.filter(b=>{if(b.paid)return false;const d=new Date(b.dueDate+"T00:00:00");return d<=nextPay;});
  const beforeTotal=billsBeforePay.reduce((s,b)=>s+(parseFloat(b.amount)||0),0);
  const thisMs=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
  const spentSoFar=expenses.filter(e=>e.date?.startsWith(thisMs)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const mSpent=spentSoFar;  const ti2=(parseFloat(income.primary||0))+(parseFloat(income.other||0));
  const dailyBurn=spentSoFar/Math.max(1,today);
  const projectedSpend=dailyBurn*daysUntilPay;
  const safeToSpend=Math.max(0,checking-beforeTotal-projectedSpend-200);
  return(
    <div className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.3}}>Paycheck Planner</div>
        <button className="ba" onClick={onAdd} style={{display:"flex",alignItems:"center",gap:5,background:C.accent,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer"}}><Plus size={13}/>Log Spending</button>
      </div>
      <div style={{fontSize:13,color:C.textLight,marginBottom:16}}>Plan your spending around your next paycheck</div>
      <div style={{background:`linear-gradient(135deg,${C.navy} 0%,${C.navyMid} 50%,${C.accent} 100%)`,borderRadius:18,padding:20,marginBottom:14,color:"#fff"}}>
        <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Next Payday</div>
        <div style={{fontFamily:MF,fontSize:32,fontWeight:800,color:"#fff",marginBottom:4}}>{daysUntilPay===0?"Today!":daysUntilPay+" days"}</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,.5)",marginBottom:16}}>{nextPay.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>{[["Expected",fmt(biweekly),C.greenMid],["Bills due",fmt(beforeTotal),C.redMid],["Safe to spend",fmt(safeToSpend),safeToSpend>500?C.greenMid:safeToSpend>0?C.amberMid:C.redMid]].map(([l,v,c])=><div key={l} style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"9px 8px"}}><div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:2}}>{l.toUpperCase()}</div><div style={{fontFamily:MF,fontSize:13,fontWeight:700,color:c}}>{v}</div></div>)}</div>
      </div>
      <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,boxShadow:"0 2px 8px rgba(13,27,42,.08)",marginBottom:12}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>Bills Before Payday</div>
        <div style={{fontSize:12,color:C.textLight,marginBottom:12}}>Due before {nextPay.toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>
      <div style={{background:C.surface,borderRadius:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"12px 14px",marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{fontSize:12,fontWeight:600,color:C.textLight}}>Spending So Far This Month</div><div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>-{fmt(mSpent)}</div></div><BarProg pct={ti2>0?Math.min(100,mSpent/ti2*100):0} color={mSpent>ti2*0.8?C.red:mSpent>ti2*0.5?C.amber:C.green} h={8}/><div style={{display:"flex",justifyContent:"space-between",marginTop:6}}><span style={{fontSize:11,color:C.textLight}}>{ti2>0?Math.round(mSpent/ti2*100):0}% of income</span><span style={{fontSize:11,color:C.green}}>{fmt(Math.max(0,ti2-mSpent))} left</span></div></div>
        {billsBeforePay.length===0?<div style={{fontSize:13,color:C.green,fontWeight:500}}>✅ No bills due before payday</div>:billsBeforePay.map(b=>{const d=dueIn(b.dueDate);const col=d<0?C.red:d<=3?C.red:d<=7?C.amber:C.textLight;return(<div key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${C.border}`}}><div><div style={{fontSize:13,fontWeight:600,color:C.text}}>{b.name}</div><div style={{fontSize:11,color:col,fontWeight:500}}>{d<0?Math.abs(d)+"d overdue":d===0?"Today":d+"d left"}</div></div><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:col}}>{fmt(b.amount)}</div></div>);})}
        {billsBeforePay.length>0&&<div style={{display:"flex",justifyContent:"space-between",paddingTop:10,marginTop:4,borderTop:`1px solid ${C.border}`}}><span style={{fontSize:13,fontWeight:600,color:C.text}}>Total</span><span style={{fontFamily:MF,fontWeight:800,fontSize:16,color:C.red}}>{fmt(beforeTotal)}</span></div>}
      </div>
      <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,boxShadow:"0 2px 8px rgba(13,27,42,.08)",marginBottom:12}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:12}}>Projected Spending</div>
        {[["Daily burn rate",fmt(dailyBurn)+"/day",C.textMid],["Days left",String(daysUntilPay)+" days",C.textMid],["Projected spend",fmt(projectedSpend),projectedSpend>biweekly?C.red:C.amber],["Balance",fmt(checking),C.green],["Bills due","-"+fmt(beforeTotal),C.red],["Safe to spend",fmt(safeToSpend),safeToSpend>500?C.green:safeToSpend>0?C.amber:C.red]].map(([l,v,c])=><div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:13,color:C.textMid}}>{l}</span><span style={{fontFamily:MF,fontWeight:700,fontSize:13,color:c}}>{v}</span></div>)}
      </div>
    </div>
  );
}

function NetWorthTrendView({balHist,debts,accounts,onNavigate}){
  const[nwGoal,setNwGoal]=useState(()=>{try{const v=localStorage.getItem("fv_nwgoal");return v?JSON.parse(v):null;}catch{return null;}});
  const[showGoalInput,setShowGoalInput]=useState(false);
  const[goalInput,setGoalInput]=useState("");
  function saveGoal(){const v=parseFloat(goalInput);if(v>0){const g={target:v,date:goalInput+"",created:Date.now()};localStorage.setItem("fv_nwgoal",JSON.stringify(g));setNwGoal(g);setShowGoalInput(false);}}

  const totalDebt=debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0);
  const totalOriginal=debts.reduce((s,d)=>s+(parseFloat(d.original||d.balance||0)),0);
  const totalPaidDown=Math.max(0,totalOriginal-totalDebt);
  const overallPct=totalOriginal>0?Math.round(totalPaidDown/totalOriginal*100):0;
  const totalAssets=(parseFloat(accounts.checking||0))+(parseFloat(accounts.savings||0))+(parseFloat(accounts.cushion||0))+(parseFloat(accounts.investments||0))+(parseFloat(accounts.property||0))+(parseFloat(accounts.vehicles||0));
  const currentNW=totalAssets-totalDebt;
  const chartData=balHist.map(h=>({date:h.date,assets:(h.checking||0)+(h.savings||0)+(h.cushion||0)+(h.investments||0),netWorth:((h.checking||0)+(h.savings||0)+(h.cushion||0)+(h.investments||0))-totalDebt})).slice(-52);
  const firstNW=chartData[0]?.netWorth||currentNW;
  const change=currentNW-firstNW;
  const fD=s=>{if(!s)return"";const d=new Date(s+"T00:00:00");return MOS[d.getMonth()]+" "+d.getDate();};
  const TT=({active,payload,label})=>{if(!active||!payload?.length)return null;return(<div style={{background:C.surface,borderRadius:12,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"10px 14px",fontSize:12}}><div style={{fontWeight:700,marginBottom:6}}>{fD(label)}</div>{payload.map(p=><div key={p.dataKey} style={{display:"flex",justifyContent:"space-between",gap:16,marginBottom:2}}><span style={{color:C.textLight}}>{p.name}</span><span style={{fontWeight:700}}>{fmt(p.value)}</span></div>)}</div>);};
  return(
    <div className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.3}}>Net Worth Trend</div>
        <button className="ba" onClick={()=>onNavigate("accounts")} style={{display:"flex",alignItems:"center",gap:5,background:C.accent,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer"}}><Plus size={13}/>Update</button>
      </div>
      <div style={{fontSize:13,color:C.textLight,marginBottom:16}}>Track your wealth over time</div>
      <div style={{background:`linear-gradient(135deg,${C.navy} 0%,${C.navyLight} 60%,${C.accent} 100%)`,borderRadius:18,padding:20,marginBottom:14,color:"#fff"}}>
        <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Current Net Worth</div>
        <div style={{fontFamily:MF,fontSize:36,fontWeight:800,color:currentNW>=0?C.green:C.red,lineHeight:1,marginBottom:8}}>{fmt(currentNW)}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>{[["Assets",fmt(totalAssets),C.greenMid],["Debt",fmt(totalDebt),C.redMid],["Change",`${change>=0?"+":""}${fmt(change)}`,change>=0?C.greenMid:C.redMid]].map(([l,v,c])=><div key={l} style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"9px 8px"}}><div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:2}}>{l.toUpperCase()}</div><div style={{fontFamily:MF,fontSize:12,fontWeight:700,color:c}}>{v}</div></div>)}</div>
      </div>
      {chartData.length>1?<div style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"18px 4px 12px",marginBottom:14}}>
        <div style={{paddingLeft:16,marginBottom:12,display:"flex",gap:16}}>{[[C.green,"Net Worth"],[C.accent,"Assets"]].map(([c,l])=><div key={l} style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:10,height:10,borderRadius:3,background:c}}/><span style={{fontSize:12,color:C.textLight}}>{l}</span></div>)}</div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{left:8,right:8,top:4,bottom:0}}>
            <defs>
              <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.green} stopOpacity={.2}/><stop offset="95%" stopColor={C.green} stopOpacity={0}/></linearGradient>
              <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.accent} stopOpacity={.15}/><stop offset="95%" stopColor={C.accent} stopOpacity={0}/></linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={fD} interval="preserveStartEnd"/>
            <YAxis tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+(v>=1000?(v/1000).toFixed(0)+"k":v)} width={50}/>
            <Tooltip content={<TT/>}/>
            <Area type="monotone" dataKey="assets" name="Assets" stroke={C.accent} strokeWidth={2} fill="url(#aGrad)" dot={false}/>
            <Area type="monotone" dataKey="netWorth" name="Net Worth" stroke={C.green} strokeWidth={2.5} fill="url(#nwGrad)" dot={false}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>:<div style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:32,textAlign:"center",marginBottom:14}}><div style={{fontSize:32,marginBottom:10}}>📈</div><div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:4}}>Building your trend</div><div style={{fontSize:13,color:C.textLight}}>Update your balances regularly to see your net worth grow over time.</div></div>}
      {nwGoal&&(()=>{const pct=Math.min(100,Math.max(0,(currentNW/nwGoal.target)*100));const rem=Math.max(0,nwGoal.target-currentNW);return(<div style={{background:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:16,padding:18,marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Net Worth Goal</div><div style={{display:"flex",gap:8,alignItems:"center"}}><div style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.accent}}>{fmt(nwGoal.target)}</div><button onClick={()=>{setNwGoal(null);localStorage.removeItem("fv_nwgoal");}} style={{background:"none",border:"none",cursor:"pointer",color:C.textFaint,padding:2}}><X size={13}/></button></div></div><div style={{height:10,background:C.borderLight,borderRadius:99,overflow:"hidden",marginBottom:8}}><div style={{height:"100%",width:pct.toFixed(1)+"%",background:pct>=100?C.green:`linear-gradient(90deg,${C.accent},${C.green})`,borderRadius:99,transition:"width .6s"}}/></div><div style={{display:"flex",justifyContent:"space-between",fontSize:12}}><span style={{color:C.textLight}}>{pct.toFixed(1)}% there · {fmt(currentNW)} now</span><span style={{fontWeight:600,color:pct>=100?C.green:C.text}}>{pct>=100?"🎉 Goal reached!":fmt(rem)+" to go"}</span></div></div>);})()}
      {!nwGoal&&<button onClick={()=>setShowGoalInput(true)} style={{width:"100%",background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"11px 0",color:C.accent,fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:14}}>🎯 Set a Net Worth Goal</button>}
      {showGoalInput&&<div style={{background:C.surface,border:`1px solid ${C.accentMid}`,borderRadius:14,padding:16,marginBottom:14}}><div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:8}}>Target Net Worth</div><div style={{display:"flex",gap:8}}><input type="number" autoFocus placeholder="100000" value={goalInput} onChange={e=>setGoalInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveGoal()} style={{flex:1,background:C.surfaceAlt,border:`1.5px solid ${C.accent}`,borderRadius:10,padding:"10px 13px",fontSize:14,color:C.text,outline:"none"}}/><button onClick={saveGoal} style={{background:C.accent,border:"none",borderRadius:10,padding:"0 16px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>Set</button><button onClick={()=>setShowGoalInput(false)} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"0 12px",color:C.textMid,fontWeight:600,fontSize:13,cursor:"pointer"}}>✕</button></div></div>}
      {(()=>{
        const MILESTONES=[1000,5000,10000,25000,50000,100000,250000,500000,1000000];
        const achieved=MILESTONES.filter(m=>currentNW>=m);
        const next=MILESTONES.find(m=>currentNW<m);
        const prev=achieved[achieved.length-1]||0;
        const pct=next?Math.min(100,((currentNW-prev)/(next-prev))*100):100;
        return(
          <div style={{background:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:18,padding:18,marginBottom:14}}>
            <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>Net Worth Milestones</div>
            {next&&<div style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:13,color:C.textMid}}>Next milestone</span><span style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.accent}}>{fmt(next)}</span></div>
              <div style={{height:10,background:C.borderLight,borderRadius:99,overflow:"hidden",marginBottom:4}}><div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${C.accent},${C.green})`,borderRadius:99,transition:"width .6s"}}/></div>
              <div style={{fontSize:11,color:C.textFaint}}>{fmt(Math.max(0,next-currentNW))} to go - {pct.toFixed(1)}% there</div>
            </div>}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {MILESTONES.map(m=>{const done=currentNW>=m;return(<div key={m} style={{padding:"10px 8px",borderRadius:12,background:done?C.greenBg:C.surfaceAlt,border:`1.5px solid ${done?C.greenMid:C.borderLight}`,textAlign:"center"}}><div style={{fontSize:done?16:14,marginBottom:2}}>{done?"✅":"🔒"}</div><div style={{fontFamily:MF,fontWeight:700,fontSize:11,color:done?C.green:C.textFaint}}>{m>=1000000?"$1M":m>=1000?"$"+(m/1000).toFixed(0)+"k":"$"+m}</div></div>);})}
            </div>
          </div>
        );
      })()}
      <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,boxShadow:"0 2px 8px rgba(13,27,42,.08)"}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>Asset Breakdown</div>
        {[{l:"Checking",v:accounts.checking,ic:"🏦"},{l:"Savings",v:accounts.savings,ic:"💰"},{l:"Cushion",v:accounts.cushion,ic:"🛡️"},{l:"Investments",v:accounts.investments,ic:"📈"},{l:"Property",v:accounts.property,ic:"🏠"},{l:"Vehicles",v:accounts.vehicles,ic:"🚗"}].filter(a=>parseFloat(a.v||0)>0).map(a=>{
          const val=parseFloat(a.v||0);const pct=totalAssets>0?(val/totalAssets*100):0;
          return(<div key={a.l} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><div style={{display:"flex",alignItems:"center",gap:6}}><span>{a.ic}</span><span style={{fontSize:13,fontWeight:600,color:C.text}}>{a.l}</span></div><div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:12,color:C.textLight}}>{pct.toFixed(0)}%</span><span style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.green}}>{fmt(val)}</span></div></div><BarProg pct={pct} color={C.green} h={5}/></div>);
        })}
      </div>
    </div>
  );
}

function ExpenseRow({e,cat,onEdit,onDelete}){
  const[swipeX,setSwipeX]=React.useState(0);
  const[swiping,setSwiping]=React.useState(false);
  const startX=React.useRef(0);
  const threshold=60;
  function onTouchStart(ev){startX.current=ev.touches[0].clientX;setSwiping(true);}
  function onTouchMove(ev){if(!swiping)return;const dx=ev.touches[0].clientX-startX.current;setSwipeX(Math.min(0,Math.max(-threshold*1.5,dx)));}
  function onTouchEnd(){if(swipeX<-threshold){onDelete();}setSwipeX(0);setSwiping(false);}
  const revealed=swipeX<-20;
  return(
    <div style={{position:"relative",marginBottom:8,borderRadius:16,overflow:"hidden"}}>
      <div style={{position:"absolute",right:0,top:0,bottom:0,width:68,background:C.red,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"0 16px 16px 0"}}>
        <Trash2 size={18} color="#fff"/>
      </div>
      <div
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        onClick={swipeX===0?onEdit:undefined}
        style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",background:C.surface,border:"none",borderRadius:16,cursor:"pointer",transform:`translateX(${swipeX}px)`,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",transition:swiping?"none":"transform .2s ease",position:"relative",zIndex:1}}>
        <div style={{width:38,height:38,borderRadius:10,background:C.accentBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{cat?.icon||"💸"}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:600,color:C.text}}>{e.name}</div>
          <div style={{fontSize:11,color:C.textLight,marginTop:1}}>{e.date}{e.category?` · ${e.category}`:""}{e.notes?` · ${e.notes}`:""}</div>
        </div>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.red,flexShrink:0}}>-{fmt(e.amount)}</div>
      </div>
    </div>
  );
}
function SpendingView({expenses,setExpenses,budgetGoals,setBGoals,categories,setEditItem,onAdd,showToast}){
  const[showAdd,setShowAdd]=useState(false);const[bForm,setBForm]=useState({});
  const[dateFilter,setDateFilter]=useState("month");
  const[searchQ,setSearchQ]=useState("");
  const[editingBudget,setEditingBudget]=useState(null);
  const[catFilter,setCatFilter]=useState("all");
  const[tagFilter,setTagFilter]=useState("all");
  const[selectMode,setSelectMode]=useState(false);
  const[selected,setSelected]=useState(new Set());
  const now=new Date();
  const filteredExp=useMemo(()=>{
    let base=expenses;
    if(dateFilter==="month"){const m=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");base=base.filter(e=>e.date?.startsWith(m));}
    else if(dateFilter==="week"){const ago=new Date(now);ago.setDate(ago.getDate()-7);base=base.filter(e=>new Date(e.date)>=ago);}
    if(searchQ){const q=searchQ.toLowerCase();base=base.filter(e=>(e.name||"").toLowerCase().includes(q)||(e.category||"").toLowerCase().includes(q)||(e.notes||"").toLowerCase().includes(q));}
    if(catFilter!=="all"){base=base.filter(e=>e.category===catFilter);}
    if(tagFilter!=="all"){base=base.filter(e=>(e.tags||[]).includes(tagFilter));}
    return base;
  },[expenses,dateFilter,searchQ,catFilter,tagFilter]);
  const totalExp=filteredExp.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const prevMonthTotal=useMemo(()=>{if(dateFilter!=="month")return 0;const prev=new Date(now.getFullYear(),now.getMonth()-1,1);const pm=prev.getFullYear()+"-"+String(prev.getMonth()+1).padStart(2,"0");return expenses.filter(e=>e.date?.startsWith(pm)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);},[expenses,dateFilter]);
  const momDiff=prevMonthTotal>0?((totalExp-prevMonthTotal)/prevMonthTotal*100):0;
  const catMap=filteredExp.reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount)||0);return a},{});
  const catSorted=Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
  return(
    <div className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}><div style={{display:"flex",gap:10,alignItems:"flex-start"}}><div style={{width:3,height:38,background:`linear-gradient(180deg,${C.accent},${C.purple}88)`,borderRadius:99,marginTop:2,flexShrink:0}}/><div><div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.4,lineHeight:1.2}}>Spending</div><div style={{fontSize:12,color:C.textLight,marginTop:3,fontWeight:500}}>Total: {fmt(totalExp)}</div></div></div><div style={{display:"flex",gap:6}}>{selectMode?<><button className="ba" onClick={()=>{if(selected.size>0){setExpenses(p=>p.filter(e=>!selected.has(e.id)));showToast("Deleted "+selected.size+" expense"+(selected.size!==1?"s":""),"error");setSelected(new Set());setSelectMode(false);}}} style={{background:selected.size>0?C.red:C.redBg,border:`1px solid ${C.redMid}`,borderRadius:10,padding:"8px 12px",color:selected.size>0?"#fff":C.red,fontWeight:700,fontSize:12,cursor:"pointer"}}>Delete {selected.size>0?"("+selected.size+")":""}</button><button className="ba" onClick={()=>{setSelectMode(false);setSelected(new Set());}} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 12px",color:C.textMid,fontWeight:600,fontSize:12,cursor:"pointer"}}>Cancel</button></>:<><button className="ba" onClick={()=>setSelectMode(true)} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 10px",color:C.textMid,fontWeight:600,fontSize:12,cursor:"pointer"}}>Select</button><button className="ba" onClick={onAdd} style={{display:"flex",alignItems:"center",gap:5,background:C.accent,border:"none",borderRadius:10,padding:"8px 16px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",boxShadow:`0 2px 8px ${C.accent}40`}}><Plus size={12}/>Expense</button></> }</div></div>
      <div style={{position:"relative",marginBottom:10}}>
        <Search size={14} color={C.textLight} style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)"}}/>
        <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search expenses..." style={{width:"100%",background:C.surface,border:"1.5px solid "+(searchQ?C.accent:C.border),borderRadius:10,padding:"9px 12px 9px 32px",fontSize:13,color:C.text,outline:"none",boxSizing:"border-box"}}/>
        {searchQ&&<button onClick={()=>setSearchQ("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:C.textLight,padding:2}}><X size={14}/></button>}
      </div>
      <div style={{display:"flex",gap:6,background:C.borderLight,borderRadius:10,padding:3,marginBottom:10}}>
        {[["month","This Month"],["week","7 Days"],["all","All Time"]].map(([id,label])=>(
          <button key={id} className="ba" onClick={()=>{setDateFilter(id);setCatFilter("all");}} style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",background:dateFilter===id?"#fff":"transparent",color:dateFilter===id?C.accent:C.textLight,fontWeight:dateFilter===id?700:500,fontSize:12,cursor:"pointer",boxShadow:dateFilter===id?"0 1px 4px rgba(0,0,0,.08)":"none"}}>{label}</button>
        ))}
      </div>
      {(()=>{const allTags=[...new Set(expenses.flatMap(e=>e.tags||[]))].filter(Boolean);if(allTags.length>0)return(<div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4,marginBottom:8}}>{[{id:"all",label:"All tags"},...allTags.map(t=>({id:t,label:"#"+t}))].map(({id,label})=>(<button key={id} className="ba" onClick={()=>setTagFilter(id)} style={{flexShrink:0,padding:"5px 10px",borderRadius:99,border:"none",background:tagFilter===id?C.purple:C.surface,color:tagFilter===id?"#fff":C.textLight,fontWeight:tagFilter===id?700:500,fontSize:11,cursor:"pointer",boxShadow:"0 1px 3px rgba(10,22,40,.06)"}}>{label}</button>))}</div>);return null;})()}
      {(()=>{const allCats=[...new Set(expenses.map(e=>e.category).filter(Boolean))].sort();if(allCats.length<2)return null;return(<div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4,marginBottom:12}}>{[{id:"all",label:"All"},...allCats.map(c=>({id:c,label:c}))].map(({id,label})=>(<button key={id} className="ba" onClick={()=>setCatFilter(id)} style={{flexShrink:0,padding:"6px 12px",borderRadius:99,border:"none",background:catFilter===id?C.accent:C.surface,color:catFilter===id?"#fff":C.textMid,fontWeight:catFilter===id?700:500,fontSize:12,cursor:"pointer",boxShadow:catFilter===id?`0 2px 8px ${C.accent}40`:"0 1px 3px rgba(10,22,40,.06)",transition:"all .15s"}}>{label}</button>))} </div>);})()}
      {searchQ&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,padding:"8px 12px",background:filteredExp.length>0?C.accentBg:C.redBg,borderRadius:10,border:"1px solid "+(filteredExp.length>0?C.accent:C.red)}}><Search size={13} color={filteredExp.length>0?C.accent:C.red}/><span style={{fontSize:13,fontWeight:600,color:filteredExp.length>0?C.accent:C.red}}>{filteredExp.length>0?filteredExp.length+" result"+(filteredExp.length!==1?"s":"")+" — "+fmt(totalExp):"No results for "+searchQ}</span></div>}
      {!searchQ&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><div style={{fontSize:12,color:C.textLight}}>{filteredExp.length} transaction{filteredExp.length!==1?"s":""}</div><div style={{display:"flex",alignItems:"center",gap:8}}>{dateFilter==="month"&&prevMonthTotal>0&&<div style={{fontSize:11,fontWeight:700,color:momDiff>0?C.red:C.green,background:momDiff>0?C.redBg:C.greenBg,borderRadius:99,padding:"3px 8px"}}>{momDiff>0?"+":""}{momDiff.toFixed(0)}% vs last mo</div>}<div style={{fontFamily:MF,fontWeight:800,fontSize:16,color:C.red}}>-{fmt(totalExp)}</div></div></div>}
      {!searchQ&&filteredExp.length>0&&(()=>{const catTotals=Object.entries(filteredExp.reduce((m,e)=>{const k=e.category||"Misc";m[k]=(m[k]||0)+(parseFloat(e.amount)||0);return m;},{})).sort((a,b)=>b[1]-a[1]).slice(0,4);const catMax=catTotals[0]?.[1]||1;return(<div style={{background:C.surface,borderRadius:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"12px 14px",marginBottom:14}}>{catTotals.map(([cat,amt])=><div key={cat} style={{marginBottom:7}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12,color:C.textMid,fontWeight:500}}>{cat}</span><span style={{fontSize:12,fontFamily:MF,fontWeight:700,color:C.red}}>-{fmt(amt)}</span></div><div style={{height:5,background:C.borderLight,borderRadius:3}}><div style={{height:5,width:`${(amt/catMax*100).toFixed(1)}%`,background:C.accent,borderRadius:3,transition:"width .4s"}}/></div></div>)}</div>);})()}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{fontSize:12,color:C.textLight}}>{filteredExp.length} transaction{filteredExp.length!==1?"s":""}</div>
        <div style={{fontFamily:MF,fontWeight:800,fontSize:16,color:C.red}}>-{fmt(totalExp)}</div>
      </div>
      {!searchQ&&budgetGoals.length>0&&(
        <div style={{marginBottom:16}}>
          <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:10}}>Budgets</div>
          {budgetGoals.map(g=>{
            const sp=expenses.filter(e=>e.category===g.category&&e.date?.startsWith(now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0"))).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
            const lim=parseFloat(g.limit)||1;const pct=(sp/lim)*100;const over=sp>lim;
            return(
              <div key={g.id} style={{background:C.surface,border:`1px solid ${over?C.redMid:C.border}`,borderRadius:12,padding:14,marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
                  <span style={{fontSize:13,fontWeight:600,color:C.text}}>{g.category}</span>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:13,fontWeight:700,color:over?C.red:C.green}}>{fmt(sp)} / {editingBudget===g.id?<input autoFocus type="number" defaultValue={g.limit} onBlur={e=>{const v=parseFloat(e.target.value);if(v>0){setBGoals(p=>p.map(x=>x.id===g.id?{...x,limit:String(v)}:x));showToast&&showToast("✓ Budget limit updated");}setEditingBudget(null);}} onKeyDown={e=>{if(e.key==="Enter")e.target.blur();if(e.key==="Escape")setEditingBudget(null);}} style={{width:70,background:C.surfaceAlt,border:`1.5px solid ${C.accent}`,borderRadius:6,padding:"2px 6px",fontSize:13,fontWeight:700,color:C.accent,outline:"none",textAlign:"right"}}/>:<span onClick={()=>setEditingBudget(g.id)} style={{fontWeight:400,color:C.textLight,cursor:"pointer",borderBottom:`1px dashed ${C.textLight}`}}>{fmt(lim)} ✎</span>}</span>
                    <button onClick={()=>{if(window.confirm("Remove budget goal?"))setBGoals(p=>p.filter(x=>x.id!==g.id));}} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,display:"flex"}}><X size={12}/></button>
                  </div>
                </div>
                <BarProg pct={pct} color={over?C.red:pct>80?C.amber:C.green} h={6}/>
                {over&&<div style={{fontSize:11,color:C.red,marginTop:4,fontWeight:500}}>Over by {fmt(sp-lim)}</div>}
              </div>
            );
          })}
          <button className="ba" onClick={()=>setShowAdd(true)} style={{display:"flex",alignItems:"center",gap:5,background:"transparent",border:`1px dashed ${C.border}`,borderRadius:10,padding:"8px 14px",color:C.textLight,fontSize:13,cursor:"pointer",width:"100%",justifyContent:"center",marginBottom:14}}><Plus size={13}/>Add Budget Goal</button>
        </div>
      )}
      {catSorted.length>0&&(
        <div style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:16,marginBottom:14}}>
          <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:12}}>By Category</div>
          {catSorted.map(([cat,amt],i)=>(
            <div key={cat} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{width:8,height:8,borderRadius:99,background:PIE_COLORS[i%PIE_COLORS.length],flexShrink:0}}/>
              <div style={{flex:1}}><div style={{fontSize:13,color:C.textMid}}>{cat}</div><BarProg pct={totalExp>0?amt/totalExp*100:0} color={PIE_COLORS[i%PIE_COLORS.length]} h={3}/></div>
              <div style={{fontSize:13,fontWeight:600,color:C.text}}>{fmt(amt)}</div>
            </div>
          ))}
        </div>
      )}
      {budgetGoals.length===0&&<button className="ba" onClick={()=>setShowAdd(true)} style={{display:"flex",alignItems:"center",gap:5,background:C.purpleBg,border:`1px solid ${C.purpleMid}`,borderRadius:10,padding:"10px 14px",color:C.purple,fontSize:13,cursor:"pointer",marginBottom:14,width:"100%",justifyContent:"center"}}><Target size={13}/>Add Budget Goal</button>}
      {!searchQ&&filteredExp.length>=7&&(()=>{const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];const dow=[0,1,2,3,4,5,6].map(d=>filteredExp.filter(e=>new Date(e.date+"T00:00:00").getDay()===d).reduce((s,e)=>s+(parseFloat(e.amount)||0),0));const max=Math.max(...dow)||1;const topDay=dow.indexOf(max);return(<div style={{background:C.surface,borderRadius:16,padding:16,marginBottom:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)"}}><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:12}}>Spending by Day</div><div style={{display:"flex",gap:4,alignItems:"flex-end",height:60}}>{dow.map((amt,d)=>{const h=Math.max(4,Math.round((amt/max)*52));return(<div key={d} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><div style={{width:"100%",height:h,background:d===topDay?`linear-gradient(135deg,${C.accent},${C.purple})`:C.accentBg,borderRadius:"4px 4px 0 0",transition:"height .4s"}}/><div style={{fontSize:9,color:d===topDay?C.accent:C.textFaint,fontWeight:d===topDay?700:400}}>{DAYS[d]}</div></div>);})}</div><div style={{fontSize:11,color:C.textLight,marginTop:8}}>{DAYS[topDay]} is your highest spending day · {fmt(max)}</div></div>);})()}

      {!searchQ&&filteredExp.length>=3&&(()=>{
        const merchants=filteredExp.reduce((m,e)=>{const k=(e.name||'').toLowerCase().trim();if(!k)return m;m[k]=(m[k]||0)+(parseFloat(e.amount)||0);return m;},{});
        const top=Object.entries(merchants).sort((a,b)=>b[1]-a[1])[0];
        const dayOfMo=new Date().getDate();
        const dailyAvg=dayOfMo>0?(totalExp/dayOfMo):0;
        const daysInMo=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate();
        const forecast=totalExp+(dailyAvg*(daysInMo-dayOfMo));
        if(!top)return null;
        return(<div style={{background:C.surface,borderRadius:12,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:'12px 14px',marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontSize:11,color:C.textLight,fontWeight:600,marginBottom:2}}>TOP MERCHANT</div>
            <div style={{fontSize:13,fontWeight:700,color:C.text,textTransform:'capitalize'}}>{top[0]}</div>
            <div style={{fontSize:12,color:C.textLight}}>Month forecast: <span style={{fontWeight:700,color:forecast>totalExp*1.2?C.red:C.amber}}>{fmt(forecast)}</span></div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontFamily:MF,fontWeight:800,fontSize:18,color:C.red}}>{fmt(top[1])}</div>
            <div style={{fontSize:11,color:C.textLight}}>{filteredExp.filter(e=>(e.name||'').toLowerCase().trim()===top[0]).length} visits</div>
          </div>
        </div>);
      })()}
            <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:10}}>Transactions</div>
      {filteredExp.length===0&&<Empty text="No expenses yet — use AI Logger or the + button" icon={Wallet}/>}
      {filteredExp.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(e=>{
        const cat=categories.find(c=>c.name===e.category);
        if(selectMode){const isSel=selected.has(e.id);return(<div key={e.id} onClick={()=>setSelected(p=>{const n=new Set(p);if(n.has(e.id))n.delete(e.id);else n.add(e.id);return n;})} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",background:isSel?C.accentBg:C.surface,border:`1.5px solid ${isSel?C.accent:C.border}`,borderRadius:16,marginBottom:8,cursor:"pointer"}}><div style={{width:22,height:22,borderRadius:"50%",background:isSel?C.accent:C.bg,border:`2px solid ${isSel?C.accent:C.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{isSel&&<Check size={12} color="#fff"/>}</div><div style={{width:34,height:34,borderRadius:10,background:C.accentBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{cat?.icon||"💸"}</div><div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:600,color:C.text}}>{e.name}</div><div style={{fontSize:11,color:C.textLight}}>{e.date} · {e.category}</div></div><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.red,flexShrink:0}}>-{fmt(e.amount)}</div></div>);}
        return(
          <ExpenseRow key={e.id} e={e} cat={cat} onEdit={()=>setEditItem({type:"expense",data:e})} onDelete={()=>{if(window.confirm("Delete "+e.name+"?")){setExpenses(p=>p.filter(x=>x.id!==e.id));showToast&&showToast("Deleted — "+e.name,"error");}}}/>
        );
      })}
      {showAdd&&<Modal title="Budget Goal" icon={Target} onClose={()=>setShowAdd(false)} onSubmit={()=>{if(!bForm.category||!bForm.limit)return;setBGoals(p=>[...p,{id:Date.now(),...bForm}]);setShowAdd(false);setBForm({});}} submitLabel="Set Goal" accent={C.purple}><FS label="Category" options={categories.map(c=>c.name)} value={bForm.category||""} onChange={e=>setBForm(p=>({...p,category:e.target.value}))}/><FI label="Monthly Limit ($)" type="number" placeholder="400" value={bForm.limit||""} onChange={e=>setBForm(p=>({...p,limit:e.target.value}))}/></Modal>}
    </div>
  );
}function BillsView({bills,setBills,setEditItem,onAdd,showToast}){
  const overdue=bills.filter(b=>!b.paid&&dueIn(b.dueDate)<0);
  const unpaid=bills.filter(b=>!b.paid);
  const paid=bills.filter(b=>b.paid);
  const totalMonthly=bills.reduce((s,b)=>s+(parseFloat(b.amount)||0),0);
  const totalPaid=paid.reduce((s,b)=>s+(parseFloat(b.amount)||0),0);
  const pctPaid=totalMonthly>0?Math.round(totalPaid/totalMonthly*100):0;
  const soonAmt=bills.filter(b=>!b.paid&&dueIn(b.dueDate)>=0&&dueIn(b.dueDate)<=7).reduce((s,b)=>s+(parseFloat(b.amount)||0),0);
  return(
    <div className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div><div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.4}}>Bills</div><div style={{fontSize:13,color:C.textLight}}>{unpaid.length} unpaid · {overdue.length} overdue</div></div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>{overdue.length>0&&<button className="ba" onClick={()=>setBills(p=>p.map(b=>overdue.some(o=>o.id===b.id)?{...b,paid:true}:b))} style={{background:C.greenBg,border:`1px solid ${C.greenMid}`,borderRadius:10,padding:"7px 12px",color:C.green,fontWeight:700,fontSize:12,cursor:"pointer"}}>✓ Pay Overdue</button>}<button onClick={onAdd} style={{display:"flex",alignItems:"center",gap:5,background:C.accent,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}><Plus size={13}/>Add Bill</button></div>
      </div>
      {bills.length>0&&<div style={{background:C.surface,borderRadius:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"14px 16px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:12,color:C.textLight,marginBottom:2}}>Monthly Total</div>
          <div style={{fontFamily:MF,fontWeight:800,fontSize:20,color:C.text}}>{fmt(totalMonthly)}</div>
          <div style={{fontSize:12,color:C.green,marginTop:2}}>{fmt(totalPaid)} paid · {fmt(totalMonthly-totalPaid)} remaining</div>
        </div>
        <div style={{position:"relative",width:56,height:56}}>
          <svg width="56" height="56" style={{transform:"rotate(-90deg)"}}>
            <circle cx="28" cy="28" r="22" fill="none" stroke={pctPaid>0?C.greenBg:C.borderLight} strokeWidth="5" style={{transition:"stroke .4s"}}/>
            <circle cx="28" cy="28" r="22" fill="none" stroke={pctPaid>=80?C.green:pctPaid>=40?C.accent:C.red} strokeWidth="5" strokeDasharray={`${2*Math.PI*22}`} strokeDashoffset={`${2*Math.PI*22*(1-pctPaid/100)}`} strokeLinecap="round"/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:C.text}}>{pctPaid}%</div>
        </div>
      </div>}
      {soonAmt>0&&<div style={{background:C.amberBg,border:`1px solid ${C.amberMid}`,borderRadius:12,padding:"11px 15px",marginBottom:14,fontSize:13,color:C.amber,fontWeight:500}}>⚠️ <strong>{fmt(soonAmt)}</strong> due in the next 7 days</div>}
      {bills.length===0&&<Empty text='No bills yet. Use AI Logger — type "rent 1200 due 28th"' icon={CalendarClock}/>}
      {bills.sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate)).map(b=>{
        const d=dueIn(b.dueDate);
        const uc=b.paid?C.green:d<0?C.red:d<=3?C.red:d<=7?C.amber:C.textLight;
        const ul=b.paid?"Paid ✓":d<0?Math.abs(d)+"d overdue":d===0?"Due today!":d<=7?"Due in "+d+"d":"Due "+fmtDate(b.dueDate);
        return(
          <div key={b.id} style={{marginBottom:8}}>
            <div className="rw" style={{display:"flex",alignItems:"center",gap:12,padding:"14px 14px",background:C.surface,border:`1.5px solid ${b.paid?C.border:d<0?C.redMid:d<=7?C.amberMid:C.border}`,borderRadius:14}}>
              <button onClick={()=>{setBills(p=>p.map(x=>{if(x.id!==b.id)return x;const nowPaid=!x.paid;if(nowPaid)setTimeout(()=>showToast&&showToast("✓ Paid — "+x.name),0);if(nowPaid&&x.recurring&&x.recurring!=="One-time"){return{...x,paid:true,dueDate:advanceDueDate(x.dueDate,1),paidDate:todayStr()};}return{...x,paid:nowPaid};}));}} style={{background:"none",border:"none",cursor:"pointer",color:b.paid?C.green:C.border,padding:0,display:"flex",flexShrink:0}}>{b.paid?<CheckCircle2 size={22}/>:<Circle size={22}/>}</button>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600,color:b.paid?C.textLight:C.text,textDecoration:b.paid?"line-through":"none"}}>{b.name}</div>
                <div style={{fontSize:12,marginTop:2,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{color:uc,fontWeight:500}}>{ul}</span>
                  {b.recurring&&b.recurring!=="One-time"&&<span style={{color:C.textLight}}>{b.recurring}</span>}{b.notes&&<span style={{color:C.textFaint,fontSize:11}}>· {b.notes}</span>}
                  {b.autoPay&&<span style={{background:C.accentBg,color:C.accent,fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:99}}>AUTO-PAY</span>}
                </div>
              </div>
              <div style={{fontFamily:MF,fontWeight:700,fontSize:16,color:b.paid?C.textLight:C.text}}>{fmt(b.amount)}</div>
              <button className="ba" onClick={()=>setEditItem({type:"bill",data:b})} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,fontSize:11,fontWeight:600,padding:"4px 6px"}}>Edit</button>
              <button className="ba" onClick={()=>{if(window.confirm("Delete "+b.name+"?"))setBills(p=>p.filter(x=>x.id!==b.id));}} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,padding:"4px 3px",display:"flex"}}><Trash2 size={13}/></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DebtView({debts,setDebts,setModal,setEditItem,showToast}){
  const[selectedDebt,setSelectedDebt]=useState(null);
  const[strategy,setStrategy]=useState("avalanche");
  const[payModal,setPayModal]=useState(null);
  const totalDebt=debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0);
  const totalOriginal=debts.reduce((s,d)=>s+(parseFloat(d.original||d.balance||0)),0);
  const totalPaidDown=Math.max(0,totalOriginal-totalDebt);
  const overallPct=totalOriginal>0?Math.round(totalPaidDown/totalOriginal*100):0;
  const pieData=debts.map((d,i)=>({name:d.name,value:parseFloat(d.balance)||0,color:PIE_COLORS[i%PIE_COLORS.length],debt:d}));
  function calcPayoff(d){
    const bal=parseFloat(d.balance)||0;
    const rate=(parseFloat(d.rate)||0)/100/12;
    const minPay=d.minPayment?parseFloat(d.minPayment):Math.max(25,bal*0.02+(rate*bal));
    if(bal<=0)return{months:0,totalInterest:0,payoffDate:"Paid off"};
    if(minPay<=rate*bal)return{months:999,totalInterest:999999,payoffDate:"Never"};
    let b=bal,mo=0,interest=0;
    while(b>0.01&&mo<600){const i=b*rate;interest+=i;b=b+i-minPay;mo++;}
    const d2=new Date();d2.setMonth(d2.getMonth()+mo);
    return{months:mo,totalInterest:interest,payoffDate:d2.toLocaleDateString("en-US",{month:"long",year:"numeric"})};
  }
  const prioritized=[...debts].sort((a,b)=>strategy==="avalanche"?(parseFloat(b.rate)||0)-(parseFloat(a.rate)||0):(parseFloat(a.balance)||0)-(parseFloat(b.balance)||0));
  const renderLabel=({cx,cy,midAngle,innerRadius,outerRadius,index})=>{
    if(pieData[index].value/totalDebt<0.08)return null;
    const RADIAN=Math.PI/180;
    const r=innerRadius+(outerRadius-innerRadius)*0.55;
    const x=cx+r*Math.cos(-midAngle*RADIAN);
    const y=cy+r*Math.sin(-midAngle*RADIAN);
    return(<text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" style={{fontSize:11,fontWeight:700,pointerEvents:"none"}}>{(pieData[index].value/totalDebt*100).toFixed(0)}%</text>);
  };
  return(
    <div className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div><div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.4}}>Debt Tracker</div><div style={{fontSize:13,color:C.textLight}}>{fmt(totalDebt)} total across {debts.length} debt{debts.length!==1?"s":""}</div></div>

      {debts.length>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}><div style={{background:C.redBg,borderRadius:12,padding:"10px 12px",textAlign:"center"}}><div style={{fontSize:10,color:C.red,marginBottom:2,fontWeight:600,letterSpacing:.5}}>REMAINING</div><div style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.red}}>{fmt(totalDebt)}</div></div><div style={{background:C.greenBg,borderRadius:12,padding:"10px 12px",textAlign:"center"}}><div style={{fontSize:10,color:C.green,marginBottom:2,fontWeight:600,letterSpacing:.5}}>PAID DOWN</div><div style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.green}}>{fmt(totalPaidDown)}</div></div><div style={{background:C.accentBg,borderRadius:12,padding:"10px 12px",textAlign:"center"}}><div style={{fontSize:10,color:C.accent,marginBottom:2,fontWeight:600,letterSpacing:.5}}>PROGRESS</div><div style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.accent}}>{overallPct}%</div></div></div>}
        <div style={{display:"flex",gap:8}}>
          {debts.length>0&&<button className="ba" onClick={()=>setModal("simulator")} style={{display:"flex",alignItems:"center",gap:5,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 12px",color:C.textMid,fontWeight:600,fontSize:13,cursor:"pointer"}}><Calculator size={13}/>Sim</button>}
          <button className="ba" onClick={()=>setModal("debt")} style={{display:"flex",alignItems:"center",gap:5,background:C.accent,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}><Plus size={13}/>Add Debt</button>
        </div>
      </div>
      {debts.length===0&&<Empty text="No debts tracked. Add one to start your payoff plan!" icon={CreditCard}/>}
      {debts.length>0&&<>
        <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:20,marginBottom:14}}>
          <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>Debt Breakdown</div>
          <div style={{fontSize:12,color:C.textLight,marginBottom:12}}>Tap a slice to see details</div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <PieChart width={180} height={180}>
              <Pie data={pieData} cx={85} cy={85} innerRadius={48} outerRadius={82} dataKey="value" labelLine={false} label={renderLabel} onClick={(entry)=>setSelectedDebt(selectedDebt?.debt?.id===entry.debt?.id?null:entry)}>
                {pieData.map((entry,i)=>(<Cell key={i} fill={entry.color} stroke={selectedDebt?.debt?.id===entry.debt?.id?"#fff":"transparent"} strokeWidth={selectedDebt?.debt?.id===entry.debt?.id?3:0} style={{cursor:"pointer",opacity:selectedDebt&&selectedDebt.debt?.id!==entry.debt?.id?0.5:1}}/>))}
              </Pie>
            </PieChart>
            <div style={{flex:1,minWidth:0}}>
              {pieData.map((d,i)=>(
                <div key={i} onClick={()=>setSelectedDebt(selectedDebt?.debt?.id===d.debt?.id?null:d)} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",borderRadius:10,marginBottom:3,cursor:"pointer",background:selectedDebt?.debt?.id===d.debt?.id?d.color+"18":"transparent",border:selectedDebt?.debt?.id===d.debt?.id?`1.5px solid ${d.color}33`:"1.5px solid transparent"}}>
                  <div style={{width:10,height:10,borderRadius:3,background:d.color,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</div></div>
                  <div style={{fontFamily:MF,fontWeight:700,fontSize:12,color:C.red,flexShrink:0}}>{fmt(d.value)}</div>
                </div>
              ))}
            </div>
          </div>
          {selectedDebt&&(()=>{
            const d=selectedDebt.debt;
            const proj=calcPayoff(d);
            const bal=parseFloat(d.balance)||0;
            const orig=parseFloat(d.original)||bal;
            const pct=Math.min(100,((orig-bal)/orig)*100);
            return(
              <div style={{marginTop:14,background:selectedDebt.color+"12",border:`1.5px solid ${selectedDebt.color}33`,borderRadius:14,padding:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div><div style={{fontFamily:MF,fontSize:16,fontWeight:800,color:C.text}}>{d.name}</div>
                    <div style={{display:"flex",gap:6,marginTop:3,flexWrap:"wrap"}}>
                      {d.type&&<span style={{fontSize:11,fontWeight:600,background:selectedDebt.color+"20",color:selectedDebt.color,padding:"2px 8px",borderRadius:99}}>{d.type}</span>}
                      {d.rate&&<span style={{fontSize:11,color:C.textLight,fontWeight:500}}>{d.rate}% APR</span>}{(()=>{const po=calcPayoff(d);return po.months>0&&po.months<500?<span style={{fontSize:11,color:C.green,fontWeight:600}}> · payoff {po.months}mo</span>:null;})()}
                    </div>
                  </div>
                  <div style={{fontFamily:MF,fontSize:22,fontWeight:800,color:C.red}}>{fmt(bal)}</div>
                </div>
                {orig>bal&&<><BarProg pct={pct} color={selectedDebt.color} h={7}/><div style={{display:"flex",justifyContent:"space-between",marginTop:4,marginBottom:10,fontSize:12,color:C.textLight}}><span>{pct.toFixed(0)}% paid off</span><span>of {fmt(orig)}</span></div></>}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                  {[["Payoff",proj.payoffDate],["Time left",proj.months<600?proj.months+" months":"Too long"],["Total Int.",proj.totalInterest<999999?fmt(proj.totalInterest):"Reduce payment"],["Mo. Interest",fmt((parseFloat(d.rate)||0)/100/12*bal)]].map(([l,v])=>(
                    <div key={l} style={{background:"rgba(255,255,255,.6)",borderRadius:10,padding:"9px 10px"}}>
                      <div style={{fontSize:10,color:C.textLight,fontWeight:600,marginBottom:2}}>{l.toUpperCase()}</div>
                      <div style={{fontFamily:MF,fontSize:12,fontWeight:700,color:C.text}}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setPayModal(d)} style={{flex:1,padding:"10px",borderRadius:12,background:C.green,border:"none",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>+ Make Payment</button>
                  <button onClick={()=>setEditItem({type:"debt",data:d})} style={{padding:"10px 16px",borderRadius:12,background:C.surface,border:`1px solid ${C.border}`,color:C.textMid,fontWeight:600,fontSize:13,cursor:"pointer"}}>Edit</button>
                </div>
              </div>
            );
          })()}
        </div>
        {debts.length>0&&(()=>{
          const totalBal=debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0);
          const totalMin=debts.reduce((s,d)=>{const b=parseFloat(d.balance)||0;const r=(parseFloat(d.rate)||0)/100/12;return s+(parseFloat(d.minPayment)||Math.max(25,b*0.02+r*b));},0);
          let rem=prioritized.map(d=>{const b=parseFloat(d.balance)||0;const r=(parseFloat(d.rate)||0)/100/12;return{...d,bal:b,rate:r,min:parseFloat(d.minPayment)||Math.max(25,b*0.02+r*b)};});
          let mo=0,totalInt=0;
          while(rem.some(d=>d.bal>0.01)&&mo<600){mo++;let extra=0;rem=rem.map(d=>{if(d.bal<=0)return d;const i=d.bal*d.rate;totalInt+=i;const pay=Math.min(d.min,d.bal+i);extra+=Math.max(0,d.min-pay);return{...d,bal:Math.max(0,d.bal+i-pay)};});const focus=rem.find(d=>d.bal>0.01);if(focus){const idx=rem.indexOf(focus);rem[idx].bal=Math.max(0,rem[idx].bal-extra);}}
          const dfDate=new Date();dfDate.setMonth(dfDate.getMonth()+mo);
          const yrs=Math.floor(mo/12);const mos=mo%12;
          const timeStr=yrs>0?yrs+"y "+(mos>0?mos+"mo":""):mos+"mo";
          return(
            <div style={{background:`linear-gradient(135deg,${C.green},#059669)`,borderRadius:18,padding:20,marginBottom:14,color:"#fff"}}>
              <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.6)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>🎯 Debt-Free Date</div>
              <div style={{fontFamily:MF,fontSize:28,fontWeight:800,color:"#fff",marginBottom:4}}>{mo>=600?"Increase payments":dfDate.toLocaleDateString("en-US",{month:"long",year:"numeric"})}</div>
              <div style={{fontSize:13,color:"rgba(255,255,255,.7)",marginBottom:14}}>{mo>=600?"Min payments don't cover interest":""+timeStr+" away · you've got this!"}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                {[["Total Debt",fmt(totalBal),"rgba(255,255,255,.9)"],["Min/mo",fmt(totalMin),"rgba(255,255,255,.9)"],["Total Interest",mo<600?fmt(totalInt):"High","rgba(255,255,255,.7)"]].map(([l,v,c])=>(
                  <div key={l} style={{background:"rgba(255,255,255,.12)",borderRadius:10,padding:"9px 8px"}}>
                    <div style={{fontSize:10,color:"rgba(255,255,255,.5)",fontWeight:600,marginBottom:2}}>{l.toUpperCase()}</div>
                    <div style={{fontFamily:MF,fontSize:12,fontWeight:700,color:c}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
        <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:20,marginBottom:14}}>
          <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>Payoff Strategy</div>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            {[["avalanche","Avalanche","Highest APR first"],["snowball","Snowball","Lowest balance first"]].map(([id,label,desc])=>(
              <button key={id} onClick={()=>setStrategy(id)} style={{flex:1,padding:"10px 8px",borderRadius:12,border:`1.5px solid ${strategy===id?C.accent:C.border}`,background:strategy===id?C.accentBg:C.surface,cursor:"pointer",textAlign:"left"}}>
                <div style={{fontSize:13,fontWeight:700,color:strategy===id?C.accent:C.text,marginBottom:2}}>{label}</div>
                <div style={{fontSize:11,color:C.textLight,lineHeight:1.3}}>{desc}</div>
              </button>
            ))}
          </div>
          <div style={{fontSize:12,fontWeight:600,color:C.textLight,marginBottom:10,textTransform:"uppercase",letterSpacing:.5}}>Priority Order</div>
          {prioritized.map((d,i)=>{
            const proj=calcPayoff(d);
            const color=PIE_COLORS[debts.indexOf(d)%PIE_COLORS.length];
            return(
              <div key={d.id} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"12px 0",borderBottom:i<prioritized.length-1?`1px solid ${C.border}`:"none"}}>
                <div style={{width:28,height:28,borderRadius:8,background:color+"20",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:MF,fontWeight:800,fontSize:13,color,flexShrink:0}}>#{i+1}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:2}}>{d.name}</div>
                  <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                    <span style={{fontSize:12,color:C.red,fontWeight:600}}>{fmt(parseFloat(d.balance)||0)}</span>
                    {d.rate&&<span style={{fontSize:12,color:C.textLight}}>{d.rate}% APR</span>}
                    <span style={{fontSize:12,color:proj.months<600?C.green:C.red,fontWeight:500}}>{proj.months<600?"Paid off "+proj.payoffDate:"Increase pmt"}</span>
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:11,color:C.textLight}}>Interest cost</div>
                  <div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>{proj.totalInterest<999999?fmt(proj.totalInterest):"High"}</div>
                </div>
              </div>
            );
          })}
        </div>
        {prioritized.map(d=>{
          const bal=parseFloat(d.balance)||0,orig=parseFloat(d.original)||bal,pct=Math.min(100,((orig-bal)/orig)*100);
          const mi=(parseFloat(d.rate)||0)/100/12*bal;
          const color=PIE_COLORS[debts.indexOf(d)%PIE_COLORS.length];
          return(
            <div key={d.id} style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:16,marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:10,height:10,borderRadius:3,background:color,flexShrink:0,marginTop:3}}/>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:C.text}}>{d.name}</div>
                    <div style={{display:"flex",gap:6,marginTop:2,flexWrap:"wrap"}}>
                      {d.type&&<span style={{fontSize:11,fontWeight:600,background:C.accentBg,color:C.accent,padding:"2px 6px",borderRadius:99}}>{d.type}</span>}
                      {d.rate&&<span style={{fontSize:11,color:C.textLight}}>{d.rate}% APR</span>}
                      {mi>0&&<span style={{fontSize:11,color:C.red}}>~{fmt(mi)}/mo interest</span>}
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontFamily:MF,fontWeight:800,fontSize:16,color:C.red}}>{fmt(bal)}</span>
                  <button onClick={()=>setPayModal(d)} style={{background:C.greenBg,border:`1px solid ${C.greenMid}`,borderRadius:8,cursor:"pointer",color:C.green,fontSize:11,fontWeight:700,padding:"4px 8px"}}>💳 Pay</button>
                  <button onClick={()=>setEditItem({type:"debt",data:d})} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,fontSize:12,fontWeight:600,padding:"4px 6px"}}>Edit</button>
                  <button onClick={()=>{if(window.confirm("Delete "+d.name+"?"))setDebts(p=>p.filter(x=>x.id!==d.id));}} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,padding:"4px 3px",display:"flex"}}><Trash2 size={13}/></button>
                </div>
              </div>
              {d.original&&<><BarProg pct={pct} color={pct>60?C.green:pct>30?C.accent:C.red} h={6}/><div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:11,color:C.textLight}}><span>{pct.toFixed(0)}% paid off</span><span>of {fmt(orig)}</span></div></>}
            </div>
          );
        })}
      </>}
  
    {debts.length>0&&(()=>{
      const extra=50;
      const ordered=strategy==="avalanche"
        ?[...debts].sort((a,b)=>(parseFloat(b.rate)||0)-(parseFloat(a.rate)||0))
        :[...debts].sort((a,b)=>(parseFloat(a.balance)||0)-(parseFloat(b.balance)||0));
      let rolling=extra;
      const plan=ordered.map(d=>{
        const po=calcPayoff({...d,balance:String(parseFloat(d.balance||0))});
        const minPay=parseFloat(d.minPayment)||Math.max(25,parseFloat(d.balance||0)*0.02);
        const mo=po.months;
        const result2={name:d.name,months:mo,minPay,extra:rolling,interest:po.totalInterest,color:d.color||PIE_COLORS[0]};
        rolling+=minPay;
        return result2;
      });
      const maxMo=Math.max(...plan.map(p=>p.months).filter(m=>m<500));
      return(<div style={{background:C.surface,borderRadius:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:'14px',marginTop:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Payoff Schedule</div>
          <div style={{display:'flex',gap:4,background:C.borderLight,borderRadius:8,padding:2}}>
            {[['avalanche','⬆ Rate'],['snowball','⬇ Balance']].map(([s,l])=><button key={s} onClick={()=>setStrategy(s)} style={{padding:'5px 10px',borderRadius:6,border:'none',background:strategy===s?C.surface:'transparent',fontWeight:strategy===s?700:500,fontSize:11,cursor:'pointer',color:strategy===s?C.accent:C.textMid}}>{l}</button>)}
          </div>
        </div>
        <div style={{fontSize:11,color:C.textLight,marginBottom:10}}>+${extra}/mo snowball applied • {strategy==="avalanche"?"Highest rate first":"Smallest balance first"}</div>
        {plan.map((p,i)=><div key={p.name} style={{marginBottom:10}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
            <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:8,height:8,borderRadius:'50%',background:p.color}}/><span style={{fontSize:13,fontWeight:600,color:C.text}}>{p.name}</span>{i===0&&<span style={{fontSize:10,background:C.accentBg,color:C.accent,borderRadius:4,padding:'1px 5px',fontWeight:700}}>ATTACK</span>}</div>
            <span style={{fontSize:12,fontFamily:MF,fontWeight:700,color:p.months<500?C.text:C.red}}>{p.months<500?p.months+'mo':'∞'}</span>
          </div>
          <div style={{height:6,background:C.borderLight,borderRadius:3}}><div style={{height:6,width:p.months<500?((p.months/Math.max(maxMo,1))*100).toFixed(1)+'%':'100%',background:p.color,borderRadius:3}}/></div>
          <div style={{fontSize:11,color:C.textLight,marginTop:2}}>+${p.extra.toFixed(0)}/mo · {fmt(p.interest)} interest</div>
        </div>)}
        <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between'}}>
          <div style={{fontSize:12,color:C.textLight}}>Total interest: <span style={{fontWeight:700,color:C.red}}>{fmt(plan.reduce((s,p)=>s+(p.interest<999999?p.interest:0),0))}</span></div>
          <div style={{fontSize:12,color:C.textLight}}>Debt-free in: <span style={{fontWeight:700,color:C.green}}>{Math.max(...plan.map(p=>p.months).filter(m=>m<500))}mo</span></div>
        </div>
      </div>);
    })()}
        {payModal&&<ExtraPayModal debt={payModal} onConfirm={pay=>{setDebts(p=>p.map(x=>x.id===payModal.id?{...x,balance:String(Math.max(0,parseFloat(x.balance||0)-pay))}:x));showToast("Payment applied!");setSelectedDebt(null);setPayModal(null);}} onClose={()=>setPayModal(null)}/>}
    </div>
  );
}

function GoalRing({pct,size=80,color,icon,label,saved,target}){
  const r=30,c=2*Math.PI*r;
  const filled=Math.min(1,pct/100)*c;
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
      <div style={{position:"relative",width:size,height:size}}>
        <svg width={size} height={size} viewBox="0 0 80 80" style={{transform:"rotate(-90deg)"}}>
          <circle cx="40" cy="40" r={r} fill="none" stroke={C.borderLight} strokeWidth="8"/>
          <circle cx="40" cy="40" r={r} fill="none" stroke={color||C.accent} strokeWidth="8" strokeDasharray={`${filled} ${c}`} strokeLinecap="round" style={{transition:"stroke-dasharray .6s ease"}}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
          <span style={{fontSize:18}}>{icon||"🎯"}</span>
          <span style={{fontSize:10,fontWeight:700,color:color||C.accent}}>{Math.round(pct)}%</span>
        </div>
      </div>
      <div style={{textAlign:"center",maxWidth:80}}>
        <div style={{fontSize:11,fontWeight:700,color:C.text,lineHeight:1.2}}>{label}</div>
        <div style={{fontSize:10,color:C.textLight,marginTop:1}}>{fmt(saved)}/{fmt(target)}</div>
      </div>
    </div>
  );
}

function SavingsGoalsView({goals,setGoals,income,showToast}){
  const[view,setView]=useState("rings");
  const[editGoal,setEditGoal]=useState(null);
  const[editForm,setEditForm]=useState({});
  const[showAdd,setShowAdd]=useState(false);
  const[form,setForm]=useState({});
  const ff=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  function add(){if(!form.name||!form.target)return;setGoals(p=>[...p,{id:Date.now().toString(),name:form.name,target:parseFloat(form.target),saved:parseFloat(form.saved||0),monthly:parseFloat(form.monthly||0),icon:form.icon||"🎯",color:form.color||C.teal}]);showToast&&showToast("✓ Goal added — "+form.name);setForm({});setShowAdd(false);}
  function GoalRingInner({goal}){
    const pct=Math.min(100,(goal.saved/goal.target)*100);
    const r=44;const circ=2*Math.PI*r;const dash=circ*(pct/100);
    const mo=goal.monthly||0;const rem=Math.max(0,goal.target-goal.saved);
    const months=mo>0?Math.ceil(rem/mo):0;
    const targetDate=months>0?(()=>{const d=new Date();d.setMonth(d.getMonth()+months);return d.toLocaleDateString("en-US",{month:"short",year:"numeric"});})():null;
    return(
      <div style={{background:C.surface,borderRadius:20,padding:20,display:"flex",flexDirection:"column",alignItems:"center",position:"relative",boxShadow:"0 2px 8px rgba(10,22,40,.06),0 1px 3px rgba(10,22,40,.04)"}}>
        <div style={{position:"relative",width:120,height:120,marginBottom:12}}>
          <svg width="120" height="120" viewBox="0 0 120 120" style={{transform:"rotate(-90deg)"}}>
            <circle cx="60" cy="60" r={r} fill="none" stroke={C.borderLight} strokeWidth="10"/>
            <circle cx="60" cy="60" r={r} fill="none" stroke={goal.color||C.teal} strokeWidth="10" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{transition:"stroke-dasharray .6s ease"}}/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
            <div style={{fontSize:24}}>{goal.icon||"🎯"}</div>
            <div style={{fontFamily:MF,fontWeight:800,fontSize:16,color:C.text}}>{pct.toFixed(0)}%</div>
          </div>
        </div>
        <div onClick={()=>{setEditGoal(goal);setEditForm({name:goal.name,target:String(goal.target),monthly:String(goal.monthly||0),saved:String(goal.saved||0)});}} style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:2,textAlign:"center",cursor:"pointer"}}>{goal.name} <span style={{fontSize:11,color:C.textLight}}>✎</span></div>
        <div style={{fontSize:12,color:C.textLight,marginBottom:8,textAlign:"center"}}>{fmt(goal.saved)} of {fmt(goal.target)}</div>
        {months>0&&<div style={{fontSize:11,color:C.green,fontWeight:600,marginBottom:4}}>{months} mo · {targetDate}</div>}
        <div style={{display:"flex",gap:6,width:"100%"}}>
          <input type="number" placeholder="Deposit $" id={"dep-"+goal.id} onKeyDown={e=>{if(e.key==="Enter"&&e.target.value){const amt=parseFloat(e.target.value);if(amt>0){setGoals(p=>p.map(g=>g.id===goal.id?{...g,saved:Math.min(g.target,(g.saved||0)+amt)}:g));showToast&&showToast("+" + fmt(amt)+" added to "+goal.name);e.target.value="";}}}  } style={{flex:1,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"8px 10px",fontSize:13,color:C.text,outline:"none",background:C.surfaceAlt}}/>
          <button onClick={()=>{const inp=document.getElementById("dep-"+goal.id);const amt=parseFloat(inp?.value||0);if(amt>0){setGoals(p=>p.map(g=>{if(g.id!==goal.id)return g;const newSaved=Math.min(g.target,(g.saved||0)+amt);const oldPct=Math.floor(((g.saved||0)/g.target)*4)*25;const newPct=Math.floor((newSaved/g.target)*4)*25;if(newPct>oldPct){setTimeout(()=>showToast&&showToast(newSaved>=g.target?"🎉 Goal complete: "+g.name+"!":"🎯 "+newPct+"% reached — "+g.name),100);}else{showToast&&showToast("+"+fmt(amt)+" → "+g.name);}return{...g,saved:newSaved};}));if(inp)inp.value="";}}} style={{padding:"8px 12px",borderRadius:10,border:"none",background:C.green,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>+</button>
          <button onClick={()=>setGoals(p=>p.filter(g=>g.id!==goal.id))} style={{padding:"8px 10px",borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,cursor:"pointer",color:C.textLight}}>✕</button>
        </div>
      </div>
    );
  }
  const ICONS=["🎯","🏠","🚗","✈️","💍","📱","🎓","🐕","💪","🌴","🏖️","💰"];
  const COLORS=[C.accent,C.green,C.purple,C.amber,C.red,C.teal,C.purple];
  return(
    <div className="fu">
      <div style={{display:"flex",gap:6,background:C.borderLight,borderRadius:12,padding:4,marginBottom:16}}>
        {[["rings","Rings"],["list","List"]].map(([id,l])=>(<button key={id} onClick={()=>setView(id)} style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",background:view===id?C.surface:"transparent",color:view===id?C.accent:C.textLight,fontWeight:view===id?700:500,fontSize:13,cursor:"pointer"}}>{l}</button>))}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:goals.length>0?10:16}}>
        <div><div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.3}}>Savings Goals</div><div style={{fontSize:13,color:C.textLight}}>{goals.length} goal{goals.length!==1?"s":""} · {fmt(goals.reduce((s,g)=>s+(parseFloat(g.saved||0)),0))} saved total</div></div>
        <button onClick={()=>setShowAdd(true)} style={{display:"flex",alignItems:"center",gap:5,background:C.accent,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer"}}><Plus size={13}/>Add Goal</button>
      </div>
      {goals.length>0&&(()=>{const totalTarget=goals.reduce((s,g)=>s+(parseFloat(g.target||0)),0);const totalSaved=goals.reduce((s,g)=>s+(parseFloat(g.saved||0)),0);const overallPct=totalTarget>0?Math.min(100,(totalSaved/totalTarget)*100):0;const complete=goals.filter(g=>parseFloat(g.saved||0)>=parseFloat(g.target||1)).length;return(<div style={{background:C.surface,borderRadius:14,padding:"12px 16px",marginBottom:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:13,fontWeight:600,color:C.text}}>Overall Progress</span><span style={{fontSize:13,fontWeight:700,color:C.green}}>{fmt(totalSaved)} / {fmt(totalTarget)}</span></div><div style={{height:8,background:C.borderLight,borderRadius:99,overflow:"hidden",marginBottom:5}}><div style={{height:"100%",width:overallPct.toFixed(1)+"%",background:`linear-gradient(90deg,${C.teal},${C.green})`,borderRadius:99,transition:"width .6s"}}/></div><div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.textLight}}><span>{overallPct.toFixed(0)}% of total goals</span><span>{complete}/{goals.length} complete</span></div></div>);})()}
      {goals.length===0&&<div style={{textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:48,marginBottom:12}}>🎯</div><div style={{fontFamily:MF,fontSize:16,fontWeight:700,color:C.text,marginBottom:8}}>No savings goals yet</div><div style={{fontSize:13,color:C.textLight,marginBottom:20}}>Set a goal and watch your ring fill up</div><button onClick={()=>setShowAdd(true)} style={{padding:"12px 24px",borderRadius:14,background:C.accent,border:"none",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>Add First Goal</button></div>}
      {view==="rings"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        {goals.map(g=><div key={g.id} style={{position:"relative"}}><GoalRingInner goal={{...g,saved:parseFloat(g.saved||0),target:parseFloat(g.target||0),monthly:parseFloat(g.monthly||0)}}/><button onClick={()=>{if(window.confirm("Delete goal: "+g.name+"?"))setGoals(p=>p.filter(x=>x.id!==g.id));}} style={{position:"absolute",top:4,right:4,background:"rgba(0,0,0,.06)",border:"none",borderRadius:"50%",width:24,height:24,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><X size={12} color={C.textLight}/></button></div>)}
      </div>}
      {view==="list"&&<div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
        {goals.map(g=>{
          const saved=parseFloat(g.saved||0),target=parseFloat(g.target||0),pct=target>0?Math.min(100,(saved/target)*100):0;
          const mo=parseFloat(g.monthly||0),rem=Math.max(0,target-saved),months=mo>0?Math.ceil(rem/mo):0;
          const targetDate=months>0?(()=>{const d=new Date();d.setMonth(d.getMonth()+months);return d.toLocaleDateString("en-US",{month:"short",year:"numeric"});})():null;
          return(<div key={g.id} style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:16}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
              <div style={{width:44,height:44,borderRadius:12,background:(g.color||C.teal)+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{g.icon||"🎯"}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:15,fontWeight:700,color:C.text}}>{g.name}</div>
                <div style={{fontSize:12,color:C.textLight}}>{fmt(saved)} of {fmt(target)}{months>0?" · "+months+" mo to go":pct>=100?" 🎉 Complete!":""}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontFamily:MF,fontWeight:800,fontSize:18,color:g.color||C.teal}}>{pct.toFixed(0)}%</div>
                {targetDate&&<div style={{fontSize:11,color:C.textLight}}>{targetDate}</div>}
              </div>
            </div>
            <div style={{height:8,background:C.borderLight,borderRadius:99,overflow:"hidden",marginBottom:12}}>
              <div style={{height:"100%",width:pct.toFixed(1)+"%",background:pct>=100?C.green:g.color||C.teal,borderRadius:99,transition:"width .6s"}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <input type="number" placeholder="Deposit $" id={"ldep-"+g.id} style={{flex:1,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"8px 10px",fontSize:13,color:C.text,outline:"none",background:C.surfaceAlt}}
                onKeyDown={e=>{if(e.key==="Enter"&&e.target.value){const a=parseFloat(e.target.value);if(a>0){setGoals(p=>p.map(x=>{if(x.id!==g.id)return x;const ns=Math.min(x.target,(x.saved||0)+a);if(ns>=x.target)setTimeout(()=>showToast&&showToast("🎉 Goal complete: "+x.name),100);else showToast&&showToast("+"+fmt(a)+" → "+x.name);return{...x,saved:ns};}));e.target.value='';}};}}/>
              <button onClick={()=>{const inp=document.getElementById("ldep-"+g.id);const a=parseFloat(inp?.value||0);if(a>0){setGoals(p=>p.map(x=>{if(x.id!==g.id)return x;const ns=Math.min(x.target,(x.saved||0)+a);if(ns>=x.target)setTimeout(()=>showToast&&showToast("🎉 Goal complete: "+x.name),100);else showToast&&showToast("+"+fmt(a)+" → "+x.name);return{...x,saved:ns};}));if(inp)inp.value="";}}} style={{padding:"8px 12px",borderRadius:10,border:"none",background:C.green,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>+</button>
              <button onClick={()=>{setEditGoal(g);setEditForm({name:g.name,target:String(g.target),monthly:String(g.monthly||0),saved:String(g.saved||0)});}} style={{padding:"8px 10px",borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,cursor:"pointer",fontSize:12,color:C.textMid,fontWeight:600}}>Edit</button>
              <button onClick={()=>{if(window.confirm("Delete goal: "+g.name+"?"))setGoals(p=>p.filter(x=>x.id!==g.id));}} style={{padding:"8px 10px",borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,cursor:"pointer",color:C.textLight,display:"flex",alignItems:"center"}}><Trash2 size={14}/></button>
            </div>
          </div>);
        })}
      </div>}
      {editGoal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:9999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setEditGoal(null)}><div style={{background:"#fff",borderRadius:"24px 24px 0 0",padding:28,width:"100%",maxWidth:480}} onClick={e=>e.stopPropagation()}><div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text,marginBottom:16}}>Edit Goal</div><FI label="Goal Name" value={editForm.name||""} onChange={e=>setEditForm(p=>({...p,name:e.target.value}))}/><div style={{display:"flex",gap:10}}><FI half label="Target ($)" type="number" value={editForm.target||""} onChange={e=>setEditForm(p=>({...p,target:e.target.value}))}/><FI half label="Saved ($)" type="number" value={editForm.saved||""} onChange={e=>setEditForm(p=>({...p,saved:e.target.value}))}/></div><FI label="Monthly Contribution ($)" type="number" value={editForm.monthly||""} onChange={e=>setEditForm(p=>({...p,monthly:e.target.value}))}/><div style={{display:"flex",gap:10,marginTop:8}}><button onClick={()=>setEditGoal(null)} style={{flex:1,padding:"13px",borderRadius:14,border:`1.5px solid ${C.border}`,background:C.surface,color:C.textMid,fontWeight:700,fontSize:16,cursor:"pointer"}}>Cancel</button><button onClick={()=>{setGoals(p=>p.map(g=>g.id===editGoal.id?{...g,name:editForm.name||g.name,target:parseFloat(editForm.target)||g.target,saved:parseFloat(editForm.saved||0),monthly:parseFloat(editForm.monthly||0)}:g));showToast&&showToast("Goal updated!");setEditGoal(null);}} style={{flex:2,padding:"13px",borderRadius:14,border:"none",background:C.accent,color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",fontFamily:MF}}>Save Changes</button></div></div></div>}
            {showAdd&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:9999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShowAdd(false)}>
          <div style={{background:"#fff",borderRadius:"24px 24px 0 0",padding:28,width:"100%",maxWidth:480}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text,marginBottom:16}}>New Savings Goal</div>
            <FI label="Goal Name" placeholder="Emergency Fund, New Car..." value={form.name||""} onChange={ff("name")} autoFocus/>
            <div style={{display:"flex",gap:10}}><FI half label="Target ($)" type="number" placeholder="5000" value={form.target||""} onChange={ff("target")}/><FI half label="Saved So Far ($)" type="number" placeholder="0" value={form.saved||""} onChange={ff("saved")}/></div>
            <FI label="Monthly Contribution ($)" type="number" placeholder="200" value={form.monthly||""} onChange={ff("monthly")}/>
            <div style={{marginBottom:12}}><div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Icon</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{ICONS.map(ic=><button key={ic} onClick={()=>setForm(p=>({...p,icon:ic}))} style={{fontSize:22,padding:6,borderRadius:10,border:`2px solid ${form.icon===ic?C.accent:C.border}`,background:form.icon===ic?C.accentBg:"#fff",cursor:"pointer"}}>{ic}</button>)}</div></div>
            <div style={{marginBottom:20}}><div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Color</div><div style={{display:"flex",gap:8}}>{COLORS.map(c=><button key={c} onClick={()=>setForm(p=>({...p,color:c}))} style={{width:32,height:32,borderRadius:"50%",background:c,border:`3px solid ${form.color===c?"#fff":c}`,outline:form.color===c?`2px solid ${c}`:"none",cursor:"pointer"}}/>)}</div></div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:"13px",borderRadius:14,border:`1.5px solid ${C.border}`,background:C.surface,color:C.textMid,fontWeight:700,fontSize:16,cursor:"pointer"}}>Cancel</button>
              <button onClick={add} style={{flex:2,padding:"13px",borderRadius:14,border:"none",background:C.accent,color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",fontFamily:MF}}>Add Goal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditModal({item,categories,onSave,onDelete,onClose}){
  const[form,setForm]=useState({...item.data});
  const ff=(k,v)=>setForm(p=>({...p,[k]:v}));
  const type=item.type;
  function save(){if(type==="expense"&&(!form.name||!form.amount))return;if(type==="bill"&&(!form.name||!form.amount))return;if(type==="debt"&&(!form.name||!form.balance))return;onSave(form);onClose();}
  const accent=type==="expense"?C.accent:type==="bill"?C.amber:C.red;
  const title=type==="expense"?"Edit Expense":type==="bill"?"Edit Bill":"Edit Debt";
  const Icon=type==="expense"?Wallet:type==="bill"?CalendarClock:CreditCard;
  return(
    <Modal title={title} icon={Icon} onClose={onClose} onSubmit={save} submitLabel="Save Changes" accent={accent} wide>
      {(type==="expense"||type==="bill")&&<FI label="Name" value={form.name||""} onChange={e=>ff("name",e.target.value)}/>}
      {type==="debt"&&<FI label="Debt Name" value={form.name||""} onChange={e=>ff("name",e.target.value)}/>}
      {type==="expense"&&<><div style={{display:"flex",gap:12}}><FI half label="Amount ($)" type="number" value={form.amount||""} onChange={e=>ff("amount",e.target.value)}/><FI half label="Date" type="date" value={form.date||todayStr()} onChange={e=>ff("date",e.target.value)}/></div><FS label="Category" options={categories.map(c=>c.name)} value={form.category||""} onChange={e=>ff("category",e.target.value)}/><FI label="Notes" value={form.notes||""} onChange={e=>ff("notes",e.target.value)}/><div style={{marginBottom:12}}><div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Tags</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{["food","transport","health","work","personal","family","fun","recurring"].map(tag=>{const on=(form.tags||[]).includes(tag);return(<button key={tag} onClick={()=>ff("tags",on?(form.tags||[]).filter(t=>t!==tag):[...(form.tags||[]),tag])} style={{padding:"5px 12px",borderRadius:99,border:`1.5px solid ${on?C.accent:C.border}`,background:on?C.accentBg:C.surface,color:on?C.accent:C.textMid,fontSize:12,fontWeight:on?700:500,cursor:"pointer"}}>{tag}</button>);})}</div></div></>}
      {type==="bill"&&<><div style={{display:"flex",gap:12}}><FI half label="Amount ($)" type="number" value={form.amount||""} onChange={e=>ff("amount",e.target.value)}/><FI half label="Due Date" type="date" value={form.dueDate||""} onChange={e=>ff("dueDate",e.target.value)}/></div><FS label="Recurring" options={["Monthly","Bi-weekly","Quarterly","Annual","One-time"]} value={form.recurring||""} onChange={e=>ff("recurring",e.target.value)}/><FI label="Notes (optional)" value={form.notes||""} onChange={e=>ff("notes",e.target.value)}/><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderTop:`1px solid ${C.border}`,marginTop:4}}><div><div style={{fontSize:13,fontWeight:600,color:C.text}}>Auto-Pay</div><div style={{fontSize:12,color:C.textLight}}>Mark as automatically paid</div></div><button onClick={()=>ff("autoPay",!form.autoPay)} style={{background:"none",border:"none",cursor:"pointer",color:form.autoPay?C.accent:C.borderLight,padding:0,display:"flex"}}>{form.autoPay?<ToggleRight size={30}/>:<ToggleLeft size={30}/>}</button></div></>}
      {type==="debt"&&<><div style={{display:"flex",gap:12}}><FI half label="Balance ($)" type="number" value={form.balance||""} onChange={e=>ff("balance",e.target.value)}/><FI half label="Original ($)" type="number" value={form.original||""} onChange={e=>ff("original",e.target.value)}/></div><div style={{display:"flex",gap:12}}><FI half label="Rate %" type="number" value={form.rate||""} onChange={e=>ff("rate",e.target.value)}/><FI half label="Min Payment ($)" type="number" value={form.minPayment||""} onChange={e=>ff("minPayment",e.target.value)}/></div></>}
      <button className="ba" onClick={()=>{onDelete();onClose();}} style={{width:"100%",background:C.redBg,border:`1px solid ${C.redMid}`,borderRadius:12,padding:"13px 0",color:C.red,fontWeight:700,fontSize:14,cursor:"pointer",marginTop:6}}>🗑 Delete</button>
    </Modal>
  );
}

function TradingView({trades,setTrades,account,setAccount,showToast}){
  const[showAdd,setShowAdd]=useState(false);const[form,setForm]=useState({});const ff=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  function add(){if(!form.symbol||!form.pnl)return;setTrades(p=>[{id:Date.now(),date:form.date||todayStr(),symbol:form.symbol.toUpperCase(),side:form.side||"Long",contracts:form.contracts||"1",entry:form.entry||"",exit:form.exit||"",pnl:form.pnl,note:form.note||""},...p]);showToast&&showToast((parseFloat(form.pnl)>=0?"✅":"❌")+" Trade logged — "+form.symbol.toUpperCase());setForm({});setShowAdd(false);}
  const totalPnl=trades.reduce((s,t)=>s+(parseFloat(t.pnl)||0),0);const wins=trades.filter(t=>parseFloat(t.pnl)>0);const losses=trades.filter(t=>parseFloat(t.pnl)<0);
  const winRate=trades.length>0?((wins.length/trades.length)*100).toFixed(0):0;const avgWin=wins.length>0?wins.reduce((s,t)=>s+(parseFloat(t.pnl)||0),0)/wins.length:0;const avgLoss=losses.length>0?Math.abs(losses.reduce((s,t)=>s+(parseFloat(t.pnl)||0),0)/losses.length):0;
  const bal=parseFloat(account.balance||0),dep=parseFloat(account.deposit||0),ret=dep>0?((bal-dep)/dep*100).toFixed(1):0;
  const monthly=trades.reduce((a,t)=>{const m=t.date?MOS[new Date(t.date).getMonth()]:"?";a[m]=(a[m]||0)+(parseFloat(t.pnl)||0);return a},{});
  const chartData=Object.entries(monthly).map(([month,pnl])=>({month,pnl}));
  const equityData=useMemo(()=>{let run=parseFloat(tradingAccount.deposit||0);return[...trades].sort((a,b)=>a.date?.localeCompare(b.date)).map((t,i)=>{run+=(parseFloat(t.pnl)||0);return{i:i+1,equity:parseFloat(run.toFixed(2)),pnl:parseFloat(t.pnl)||0};});},[trades,tradingAccount.deposit]);
  return(<div className="fu">
    <SH title="Futures Trading" sub="P&L, win rate & performance" onAdd={()=>setShowAdd(true)} addLabel="Log Trade"/>
    <div style={{background:`linear-gradient(135deg,${C.navy} 0%,#1a3a6e 100%)`,borderRadius:18,padding:22,marginBottom:14,color:"#fff"}}>
      <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",letterSpacing:.5,textTransform:"uppercase",marginBottom:4}}>Trading Account</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}><div><div style={{fontFamily:MF,fontSize:30,fontWeight:800,color:"#fff",lineHeight:1}}>{fmt(bal)}</div><div style={{fontSize:13,color:"rgba(255,255,255,.5)",marginTop:4}}>Current Balance</div></div><div style={{textAlign:"right"}}><div style={{fontFamily:MF,fontSize:20,fontWeight:700,color:totalPnl>=0?C.green:C.red}}>{totalPnl>=0?"+":""}{fmt(totalPnl)}</div><div style={{fontSize:12,color:"rgba(255,255,255,.4)"}}>Total P&L</div></div></div>
      <div style={{display:"flex",gap:4}}>{[["Deposited",fmt(dep)],["Return",ret+"%"],["Trades",String(trades.length)]].map(([l,v])=><div key={l} style={{flex:1,background:"rgba(255,255,255,.08)",borderRadius:10,padding:"9px 10px"}}><div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:2}}>{l}</div><div style={{fontFamily:MF,fontSize:14,fontWeight:700,color:"#fff"}}>{v}</div></div>)}</div>
    </div>
    <div style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:16,marginBottom:14}}><div style={{fontSize:12,fontWeight:600,color:C.slate,marginBottom:10}}>Update Balances</div><div style={{display:"flex",gap:10,marginBottom:10}}><div style={{flex:1}}><div style={{fontSize:11,color:C.textLight,marginBottom:4}}>Total Deposited</div><input type="number" placeholder="0.00" value={account.deposit||""} onChange={e=>setAccount(p=>({...p,deposit:e.target.value}))} onBlur={e=>{if(e.target.value)showToast("✓ Deposit saved");}} style={{...iS(false),padding:"9px 12px",fontSize:13}}/></div><div style={{flex:1}}><div style={{fontSize:11,color:C.textLight,marginBottom:4}}>Current Balance</div><input type="number" placeholder="0.00" value={account.balance||""} onChange={e=>setAccount(p=>({...p,balance:e.target.value}))} onBlur={e=>{if(e.target.value)showToast("✓ Balance saved");}} style={{...iS(false),padding:"9px 12px",fontSize:13}}/></div></div><div style={{display:"flex",justifyContent:"center"}}><div style={{fontSize:11,color:C.green,fontWeight:600,display:"flex",alignItems:"center",gap:5}}><div style={{width:6,height:6,borderRadius:"50%",background:C.green}}/>Changes save automatically</div></div></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>{[{l:"Win Rate",v:winRate+"%",c:parseFloat(winRate)>=50?C.green:C.red},{l:"Profit Factor",v:avgLoss>0?(avgWin/avgLoss).toFixed(2):"∞",c:C.accent},{l:"Avg Win",v:fmt(avgWin),c:C.green},{l:"Avg Loss",v:"-"+fmt(avgLoss),c:C.red}].map(s=><div key={s.l} style={{background:C.surface,borderRadius:12,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:14}}><div style={{fontSize:11,fontWeight:600,color:C.slate,textTransform:"uppercase",letterSpacing:.4,marginBottom:4}}>{s.l}</div><div style={{fontFamily:MF,fontSize:22,fontWeight:800,color:s.c}}>{s.v}</div></div>)}</div>
    {chartData.length>0&&<div style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:14}}><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>Monthly P&L</div><ResponsiveContainer width="100%" height={160}><BarChart data={chartData} margin={{left:-20,right:4,top:4,bottom:0}}><XAxis dataKey="month" tick={{fill:C.textLight,fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:C.textLight,fontSize:11}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,fontSize:12}} formatter={v=>[fmt(v),"P&L"]}/><Bar dataKey="pnl" radius={[6,6,0,0]}>{chartData.map((d,i)=><Cell key={i} fill={d.pnl>=0?C.green:C.red}/>)}</Bar></BarChart></ResponsiveContainer></div>}
    {equityData.length>1&&<div style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:14}}><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>Equity Curve</div><div style={{fontSize:12,color:C.textLight,marginBottom:14}}>Cumulative account value per trade</div><ResponsiveContainer width="100%" height={160}><AreaChart data={equityData} margin={{left:-20,right:4,top:4,bottom:0}}><defs><linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={equityData[equityData.length-1]?.equity>=(parseFloat(tradingAccount.deposit||0))?C.green:C.red} stopOpacity={.2}/><stop offset="95%" stopColor={equityData[equityData.length-1]?.equity>=(parseFloat(tradingAccount.deposit||0))?C.green:C.red} stopOpacity={0}/></linearGradient></defs><XAxis dataKey="i" tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false}/><YAxis tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+(v>=1000?(v/1000).toFixed(1)+"k":v)} width={50}/><Tooltip formatter={(v,n)=>n==="equity"?[fmt(v),"Account Value"]:[fmt(v),"Trade P&L"]} contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,fontSize:12}}/><Area type="monotone" dataKey="equity" name="equity" stroke={equityData[equityData.length-1]?.equity>=(parseFloat(tradingAccount.deposit||0))?C.green:C.red} strokeWidth={2.5} fill="url(#eqGrad)" dot={false}/></AreaChart></ResponsiveContainer></div>}
    <div style={{fontFamily:MF,fontWeight:700,fontSize:16,color:C.text,marginBottom:10}}>Trade Log</div>
    {trades.length===0&&<Empty text="No trades yet. Tap 'Log Trade' to start." icon={BarChart2}/>}
    {trades.map(t=>{const pnl=parseFloat(t.pnl)||0;return(<Row key={t.id} icon={pnl>=0?"📈":"📉"} title={t.symbol} sub={`${t.date} · ${t.side} · ${t.contracts} contract${t.contracts!=="1"?"s":""}${t.note?" · "+t.note:""}`} right={(pnl>=0?"+":"")+fmt(pnl)} rightColor={pnl>=0?C.green:C.red} rightSub={t.entry&&t.exit?t.entry+" - "+t.exit:""} onDelete={()=>{if(window.confirm("Delete this trade?"))setTrades(p=>p.filter(x=>x.id!==t.id));}} badge={pnl>=0?{label:"WIN",bg:C.greenBg,color:C.green}:{label:"LOSS",bg:C.redBg,color:C.red}}/>);})}
    {showAdd&&<Modal title="Log Trade" icon={BarChart2} onClose={()=>setShowAdd(false)} onSubmit={add} submitLabel="Log Trade" wide><div style={{display:"flex",gap:12,flexWrap:"wrap"}}><FI half label="Symbol" placeholder="ES, NQ, CL..." value={form.symbol||""} onChange={ff("symbol")}/><FI half label="Date" type="date" value={form.date||todayStr()} onChange={ff("date")}/></div><div style={{display:"flex",gap:10,marginBottom:14}}>{["Long","Short"].map(s=><button key={s} className="ba" onClick={()=>setForm(p=>({...p,side:s}))} style={{flex:1,padding:"10px",borderRadius:10,border:`1.5px solid ${form.side===s?C.accent:C.border}`,background:form.side===s?C.accentBg:C.surface,color:form.side===s?C.accent:C.textMid,fontWeight:700,fontSize:13,cursor:"pointer"}}>{s==="Long"?"📈 Long":"📉 Short"}</button>)}</div><div style={{display:"flex",gap:12,flexWrap:"wrap"}}><FI half label="Contracts" type="number" placeholder="1" value={form.contracts||""} onChange={ff("contracts")}/><FI half label="P&L ($)" type="number" placeholder="+250 or -150" value={form.pnl||""} onChange={ff("pnl")}/></div><div style={{display:"flex",gap:12,flexWrap:"wrap"}}><FI half label="Entry Price" type="number" value={form.entry||""} onChange={ff("entry")}/><FI half label="Exit Price" type="number" value={form.exit||""} onChange={ff("exit")}/></div><FI label="Note" placeholder="Setup, lesson..." value={form.note||""} onChange={ff("note")}/></Modal>}
  </div>);
}

function CalendarView({expenses,bills,calColors,setCalColors,setExpenses,onAdd}){
  const[viewDate,setViewDate]=useState(new Date(TODAY.getFullYear(),TODAY.getMonth(),1));const[selected,setSelected]=useState(null);const[showCustom,setShowCustom]=useState(false);
  const yr=viewDate.getFullYear(),mo=viewDate.getMonth(),first=new Date(yr,mo,1).getDay(),dim=new Date(yr,mo+1,0).getDate();
  const expCol=calColors.expense||C.red,billCol=calColors.bill||C.amber,todayCol=calColors.today||C.accent,dotStyle=calColors.dotStyle||"circle";
  const expByDay={},billByDay={};
  expenses.forEach(e=>{const d=new Date(e.date);if(d.getFullYear()===yr&&d.getMonth()===mo){const day=d.getDate();expByDay[day]=(expByDay[day]||0)+(parseFloat(e.amount)||0);}});
  bills.forEach(b=>{if(!b.dueDate)return;const d=new Date(b.dueDate);if(d.getFullYear()===yr&&d.getMonth()===mo){const day=d.getDate();if(!billByDay[day])billByDay[day]=[];billByDay[day].push(b);}});
  const cells=[];for(let i=0;i<first;i++)cells.push(null);for(let d=1;d<=dim;d++)cells.push(d);
  const selExp=selected?expenses.filter(e=>{const d=new Date(e.date);return d.getFullYear()===yr&&d.getMonth()===mo&&d.getDate()===selected;}):[],selBills=selected?(billByDay[selected]||[]):[];
  const totExp=Object.values(expByDay).reduce((s,v)=>s+v,0),totBills=bills.filter(b=>{if(!b.dueDate)return false;const d=new Date(b.dueDate);return d.getFullYear()===yr&&d.getMonth()===mo;}).reduce((s,b)=>s+(parseFloat(b.amount)||0),0);
  const PRESETS=[C.red,C.accent,C.green,C.amber,C.purple,C.teal,C.purple,C.navy,C.slate,C.amber];
  const CP=({label,ck})=>(<div style={{marginBottom:12}}><div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>{label}</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{PRESETS.map(c=><button key={c} onClick={()=>setCalColors(p=>({...p,[ck]:c}))} style={{width:26,height:26,borderRadius:"50%",background:c,border:(calColors[ck]||"")===c?`3px solid ${C.text}`:"3px solid transparent",cursor:"pointer"}}/>)}</div></div>);
  return(<div className="fu">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text}}>Calendar</div>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <button className="ba" onClick={()=>setShowCustom(p=>!p)} style={{background:showCustom?C.accentBg:C.bg,border:`1px solid ${showCustom?C.accentMid:C.border}`,borderRadius:8,padding:"6px 10px",cursor:"pointer",color:showCustom?C.accent:C.textMid,fontWeight:600,fontSize:12}}>🎨</button>
        <div style={{display:"flex",alignItems:"center",background:C.surface,borderRadius:12,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",overflow:"hidden"}}>
          <button className="ba" onClick={()=>setViewDate(new Date(yr,mo-1,1))} style={{background:"none",border:"none",padding:"8px 14px",cursor:"pointer",color:C.textMid,fontWeight:700,fontSize:16,lineHeight:1}}>‹</button>
          <span style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,minWidth:100,textAlign:"center"}}>{MOS[mo]} {yr}</span>
          <button className="ba" onClick={()=>setViewDate(new Date(yr,mo+1,1))} style={{background:"none",border:"none",padding:"8px 14px",cursor:"pointer",color:C.textMid,fontWeight:700,fontSize:16,lineHeight:1}}>›</button>
        </div>
      </div>
    </div>
    {showCustom&&<div style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:16,marginBottom:14}}><CP label="Expense Color" ck="expense"/><CP label="Bill Color" ck="bill"/><CP label="Today Color" ck="today"/><div style={{marginBottom:8}}><div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Dot Shape</div><div style={{display:"flex",gap:8}}>{["circle","square","diamond"].map(s=><button key={s} className="ba" onClick={()=>setCalColors(p=>({...p,dotStyle:s}))} style={{flex:1,padding:"8px 0",borderRadius:8,border:`1.5px solid ${dotStyle===s?C.accent:C.border}`,background:dotStyle===s?C.accentBg:C.surface,color:dotStyle===s?C.accent:C.textMid,fontWeight:600,fontSize:12,cursor:"pointer"}}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>)}</div></div><button className="ba" onClick={()=>setCalColors({expense:C.red,bill:C.amber,overdue:C.red,today:C.accent,dotStyle:"circle"})} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 16px",cursor:"pointer",color:C.textMid,fontWeight:600,fontSize:12}}>Reset to Default</button></div>}
    <div style={{display:"flex",gap:8,marginBottom:14}}><div style={{flex:1,background:expCol+"12",borderRadius:10,padding:"10px 14px"}}><div style={{fontSize:11,fontWeight:600,color:expCol,textTransform:"uppercase",letterSpacing:.3,marginBottom:3}}>Spent</div><div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:expCol}}>{fmtK(totExp)}</div></div><div style={{flex:1,background:billCol+"12",borderRadius:10,padding:"10px 14px"}}><div style={{fontSize:11,fontWeight:600,color:billCol,textTransform:"uppercase",letterSpacing:.3,marginBottom:3}}>Bills Due</div><div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:billCol}}>{fmtK(totBills)}</div></div></div>
    <div
      onTouchStart={e=>{window._cvts=e.touches[0].clientX;}}
      onTouchEnd={e=>{const dx=window._cvts-(e.changedTouches[0].clientX||0);if(Math.abs(dx)>50){if(dx>0)setViewDate(new Date(yr,mo+1,1));else setViewDate(new Date(yr,mo-1,1));}}}
    >
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:3}}>{["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=><div key={d} style={{textAlign:"center",fontSize:11,fontWeight:700,color:C.textLight,padding:"4px 0"}}>{d}</div>)}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:16}}>{cells.map((day,i)=>{if(!day)return <div key={i}/>;const isToday=day===TODAY.getDate()&&mo===TODAY.getMonth()&&yr===TODAY.getFullYear(),hasBill=!!billByDay[day],hasExp=!!expByDay[day],isSel=selected===day,br=dotStyle==="square"?3:dotStyle==="diamond"?0:"50%",tf=dotStyle==="diamond"?"rotate(45deg)":"none";return(<button key={i} className="ba" onClick={()=>setSelected(isSel?null:day)} style={{border:`1.5px solid ${isSel?todayCol:isToday?todayCol+"66":C.border}`,borderRadius:10,padding:"6px 4px",cursor:"pointer",background:isSel?todayCol+"18":isToday?todayCol+"0f":C.surface,boxShadow:isSel?`0 2px 8px ${todayCol}30`:"none",display:"flex",flexDirection:"column",alignItems:"center",gap:2,minHeight:52}}><span style={{fontFamily:MF,fontSize:13,fontWeight:isToday?800:500,color:isSel||isToday?todayCol:C.text}}>{day}</span><div style={{display:"flex",gap:2,justifyContent:"center"}}>{hasExp&&<div style={{width:6,height:6,borderRadius:br,background:expCol,transform:tf}}/>}{hasBill&&<div style={{width:6,height:6,borderRadius:br,background:billCol,transform:tf}}/>}</div>{hasExp&&<span style={{fontSize:9,color:expCol,fontWeight:700,lineHeight:1}}>{fmtK(expByDay[day])}</span>}</button>);})}</div>
    </div>
    {selected&&(selExp.length>0||selBills.length>0)&&<div style={{background:C.surface,border:`1.5px solid ${todayCol}44`,borderRadius:16,padding:18}}><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:12}}>{MOS[mo]} {selected}</div>{selBills.length>0&&<div style={{marginBottom:selExp.length>0?12:0}}><div style={{fontSize:11,fontWeight:700,color:billCol,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Bills</div>{selBills.map(b=><div key={b.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",background:billCol+"18",borderRadius:8,marginBottom:5}}><span style={{fontSize:13,fontWeight:500,color:C.text}}>{b.name}</span><span style={{fontSize:13,fontWeight:700,color:billCol}}>{fmt(b.amount)}</span></div>)}</div>}{selExp.length>0&&<div><div style={{fontSize:11,fontWeight:700,color:expCol,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Expenses</div>{selExp.map(e=><div key={e.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",background:expCol+"18",borderRadius:8,marginBottom:5}}><span style={{fontSize:13,fontWeight:500,color:C.text}}>{e.name}</span><span style={{fontSize:13,fontWeight:700,color:expCol}}>{fmt(e.amount)}</span></div>)}</div>}<button onClick={()=>{if(onAdd)onAdd();}} style={{marginTop:12,width:"100%",background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:10,padding:"9px",color:C.accent,fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><Plus size={13}/>Add for {MOS[mo]} {selected}</button></div>}
    {selected&&selExp.length===0&&selBills.length===0&&<div style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"20px",textAlign:"center"}}><div style={{fontSize:13,color:C.textLight,marginBottom:12}}>Nothing logged on {MOS[mo]} {selected}</div><button onClick={()=>{if(onAdd)onAdd();}} style={{background:C.accent,border:"none",borderRadius:10,padding:"10px 20px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6}}><Plus size={14}/>Add Expense</button></div>}
  </div>);
}

function ShiftView({shifts,setShifts,income,profCategory,profSub,showToast}){
  const[showAdd,setShowAdd]=useState(false);const[form,setForm]=useState({date:todayStr(),type:"Regular",hours:"",rate:"",note:""});const ff=(k,v)=>setForm(p=>({...p,[k]:v}));
  const prof=getProfession(profCategory);const OT=prof.shiftTypes;
  const DEFAULT_RATE=parseFloat(income.primary||0)>0?(((parseFloat(income.primary)/4)/40).toFixed(2)):"35.00";
  function add(){if(!form.hours||!form.rate)return;const mult=OT[form.type]||1;const gross=(parseFloat(form.hours)*parseFloat(form.rate)*mult).toFixed(2);setShifts(p=>[{id:Date.now(),...form,gross,mult},...p]);showToast&&showToast("✓ Shift logged — "+fmt(gross));setForm({date:todayStr(),type:"Regular",hours:"",rate:form.rate,note:""});setShowAdd(false);}
  const now2=new Date();const thisMonth=now2.getFullYear()+"-"+String(now2.getMonth()+1).padStart(2,"0");const ms=shifts.filter(s=>s.date?.startsWith(thisMonth));
  const mh=ms.reduce((s,x)=>s+(parseFloat(x.hours)||0),0),mg=ms.reduce((s,x)=>s+(parseFloat(x.gross)||0),0),mot=ms.filter(s=>s.type!=="Regular").reduce((s,x)=>s+(parseFloat(x.gross)||0),0);
  const ytd=shifts.reduce((s,x)=>s+(parseFloat(x.gross)||0),0);
  const subRole=getProfSub(profCategory,profSub);
  const weeklyData=useMemo(()=>{const wk={};shifts.forEach(s=>{const d=new Date((s.date||todayStr())+"T00:00:00");d.setDate(d.getDate()-d.getDay());const k=d.toISOString().split("T")[0];if(!wk[k])wk[k]={week:k,gross:0};wk[k].gross+=parseFloat(s.gross||0);});return Object.values(wk).sort((a,b)=>a.week.localeCompare(b.week)).slice(-8).map(w=>({...w,label:w.week.slice(5)}));},[shifts]);
  return(<div className="fu">
    <SH title={prof.icon+" "+prof.shiftLabel+" Tracker"} sub={subRole.label+" · Log hours & calculate pay"} onAdd={()=>setShowAdd(true)} addLabel={"Log "+prof.shiftLabel}/>
    <div style={{background:`linear-gradient(135deg,${C.navy} 0%,#1a3a6e 100%)`,borderRadius:18,padding:20,marginBottom:14,color:"#fff"}}><div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>This Month</div><div style={{fontFamily:MF,fontSize:30,fontWeight:800,color:"#fff",marginBottom:14}}>{fmt(mg)}</div><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>{[["Shifts",String(ms.length)],["Hours",mh.toFixed(1)],["OT Pay",fmtK(mot)],["YTD",fmtK(ytd)]].map(([l,v])=><div key={l} style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"9px 8px"}}><div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:2}}>{l}</div><div style={{fontFamily:MF,fontSize:13,fontWeight:700,color:"#fff"}}>{v}</div></div>)}</div></div>
    {shifts.length===0&&<Empty text={`No ${prof.shiftLabel.toLowerCase()}s logged yet.`} icon={Clock}/>}
    {shifts.slice(0,30).map(s=>{const mult=OT[s.type]||1;const col={Regular:C.accent,Overtime:C.amber,"Double Time":C.red,Night:C.purple,Weekend:C.green,Holiday:C.red}[s.type]||C.accent;return(<div key={s.id} className="rw" style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"14px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12}}><div style={{width:40,height:40,borderRadius:12,background:col+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Clock size={18} color={col}/></div><div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:600,color:C.text}}>{s.type} {prof.shiftLabel}</div><div style={{fontSize:12,color:C.textLight,marginTop:2}}>{fmtDate(s.date)} · {s.hours}h @ ${s.rate}/hr{mult!==1&&<span style={{color:col,fontWeight:600}}> ×{mult}</span>}{s.note&&" · "+s.note}</div></div><div style={{textAlign:"right",flexShrink:0}}><div style={{fontFamily:MF,fontWeight:800,fontSize:16,color:C.green}}>{fmt(s.gross)}</div><button className="db" onClick={()=>{if(window.confirm("Delete this shift?"))setShifts(p=>p.filter(x=>x.id!==s.id));}} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,padding:2,display:"flex",marginLeft:"auto",marginTop:4}}><Trash2 size={13}/></button></div></div>);})}
    {weeklyData.length>1&&<div style={{background:C.surface,borderRadius:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"14px 14px 8px",marginBottom:14}}>
      <div style={{fontSize:12,fontWeight:600,color:C.textLight,marginBottom:10}}>Weekly Earnings</div>
      <ResponsiveContainer width="100%" height={100}><BarChart data={weeklyData} barSize={24}><XAxis dataKey="label" tick={{fontSize:10,fill:C.textLight}} axisLine={false} tickLine={false}/><Tooltip formatter={v=>[fmt(v),"Gross"]} contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,fontSize:12}}/><Bar dataKey="gross" fill={C.accent} radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>
    </div>}
    {showAdd&&<Modal title={`Log ${prof.shiftLabel}`} icon={Clock} onClose={()=>setShowAdd(false)} onSubmit={add} submitLabel={`Add ${prof.shiftLabel}`} accent={C.green}><FI label="Date" type="date" value={form.date} onChange={e=>ff("date",e.target.value)}/><FS label={`${prof.shiftLabel} Type`} options={Object.keys(OT)} value={form.type} onChange={e=>ff("type",e.target.value)}/><div style={{display:"flex",gap:12}}><FI half label="Hours Worked" type="number" placeholder="8" value={form.hours} onChange={e=>ff("hours",e.target.value)}/><FI half label="Hourly Rate ($)" type="number" placeholder={DEFAULT_RATE||"35.00"} value={form.rate} onChange={e=>ff("rate",e.target.value)}/></div>{form.hours&&form.rate&&<div style={{background:C.greenBg,border:`1px solid ${C.greenMid}`,borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13,color:C.green,fontWeight:600}}>Gross pay: {fmt((parseFloat(form.hours)*parseFloat(form.rate)*(OT[form.type]||1)).toFixed(2))}</div>}<FI label="Note (optional)" placeholder={prof.notePlaceholder} value={form.note} onChange={e=>ff("note",e.target.value)}/></Modal>}
  </div>);
}






function TrendView({balHist,accounts,expenses,onNavigate}){
  const[range,setRange]=useState("1M");
  const[mode,setMode]=useState("total");
  const RANGES=[{id:"7D",days:7},{id:"1M",days:30},{id:"3M",days:90},{id:"6M",days:180},{id:"1Y",days:365},{id:"ALL",days:9999}];
  const days=RANGES.find(r=>r.id===range)?.days||30;
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-days);
  const cutStr=cutoff.toISOString().split("T")[0];
  const filtered=balHist.filter(s=>s.date>=cutStr);
  const cur=(parseFloat(accounts.checking||0))+(parseFloat(accounts.savings||0))+(parseFloat(accounts.cushion||0))+(parseFloat(accounts.investments||0));
  const chartData=useMemo(()=>filtered.length>0?filtered:[{date:todayStr(),checking:parseFloat(accounts.checking||0),savings:parseFloat(accounts.savings||0),cushion:parseFloat(accounts.cushion||0),total:cur}],[filtered.length,cur]);
  const first=chartData[0]?.total||cur;
  const last=chartData[chartData.length-1]?.total||cur;
  const high=chartData.length?Math.max(...chartData.map(d=>d.total)):cur;
  const low=chartData.length?Math.min(...chartData.map(d=>d.total)):cur;
  const change=last-first,changePct=first>0?((change/first)*100).toFixed(1):"0.0",isUp=change>=0,lineCol=isUp?C.green:C.red;
  const spendData=useMemo(()=>{
    const bd={};
    expenses.filter(e=>e.date>=cutStr).forEach(e=>{bd[e.date]=(bd[e.date]||0)+(parseFloat(e.amount)||0);});
    return Object.entries(bd).sort((a,b)=>a[0].localeCompare(b[0])).map(([date,amount])=>({date,amount}));
  },[expenses,cutStr]);
  const fD=s=>{if(!s)return"";const d=new Date(s+"T00:00:00");return MOS[d.getMonth()]+" "+d.getDate();};
  const hasData=chartData.length>1;
  return(
    <div className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
        <div>
          <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.3}}>Balance Trend</div>
          <div style={{fontSize:13,color:C.textLight,marginTop:1}}>Track how your money moves over time</div>
        </div>
        <button className="ba" onClick={()=>onNavigate("accounts")} style={{display:"flex",alignItems:"center",gap:5,background:C.accent,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer"}}><Plus size={13}/>Update</button>
      </div>
      <div style={{background:`linear-gradient(135deg,${C.navy} 0%,${C.navyLight} 60%,${C.accent} 100%)`,borderRadius:20,padding:"20px 22px",marginBottom:16,color:"#fff"}}>
        <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{mode==="spending"?"Total Spent":"Current Balance"} - {range}</div>
        <div style={{fontFamily:MF,fontSize:36,fontWeight:800,color:"#fff",lineHeight:1,marginBottom:12}}>{fmt(cur)}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
          {[["Change",(isUp?"+":"")+fmt(change),isUp?C.greenMid:C.redMid],["Change %",(isUp?"+":"")+changePct+"%",isUp?C.greenMid:C.redMid],["High",fmt(high),C.accentMid],["Low",fmt(low),C.amberMid]].map(([l,v,c])=>(
            <div key={l} style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"9px 8px"}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:2}}>{l}</div>
              <div style={{fontFamily:MF,fontSize:13,fontWeight:700,color:c}}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{display:"flex",gap:6,background:C.borderLight,borderRadius:12,padding:4,marginBottom:12}}>
        {RANGES.map(r=>(<button key={r.id} className="ba" onClick={()=>setRange(r.id)} style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",background:range===r.id?C.surface:"transparent",color:range===r.id?C.accent:C.textLight,fontWeight:range===r.id?700:500,fontSize:12,cursor:"pointer"}}>{r.id}</button>))}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        {[{id:"total",l:"Net Balance"},{id:"breakdown",l:"By Account"},{id:"spending",l:"Spending"}].map(m=>(
          <button key={m.id} className="ba" onClick={()=>setMode(m.id)} style={{flex:1,padding:"9px 0",borderRadius:10,border:`1.5px solid ${mode===m.id?C.accent:C.border}`,background:mode===m.id?C.accentBg:C.surface,color:mode===m.id?C.accent:C.textMid,fontWeight:mode===m.id?700:500,fontSize:12,cursor:"pointer"}}>{m.l}</button>
        ))}
      </div>
      <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"20px 4px 8px",marginBottom:16}}>
        {!hasData&&<div style={{height:200,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:C.textLight,padding:20,textAlign:"center"}}><div style={{fontSize:32,marginBottom:10}}>📈</div><div style={{fontSize:14,fontWeight:600,marginBottom:4}}>Building your trend</div><div style={{fontSize:13}}>Update your balances regularly.</div></div>}
        {hasData&&mode==="total"&&<ResponsiveContainer width="100%" height={200}><AreaChart data={chartData} margin={{left:8,right:8,top:4,bottom:0}}><defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={lineCol} stopOpacity={.2}/><stop offset="95%" stopColor={lineCol} stopOpacity={0}/></linearGradient></defs><XAxis dataKey="date" tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={fD} interval="preserveStartEnd"/><YAxis tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+(v>=1000?(v/1000).toFixed(1)+"k":v)} width={50}/><Tooltip formatter={(v)=>fmt(v)}/><Area type="monotone" dataKey="total" name="Balance" stroke={lineCol} strokeWidth={2.5} fill="url(#tg)" dot={false}/></AreaChart></ResponsiveContainer>}
        {hasData&&mode==="breakdown"&&<ResponsiveContainer width="100%" height={200}><AreaChart data={chartData} margin={{left:8,right:8,top:4,bottom:0}}><XAxis dataKey="date" tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={fD} interval="preserveStartEnd"/><YAxis tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+(v>=1000?(v/1000).toFixed(1)+"k":v)} width={50}/><Tooltip formatter={(v)=>fmt(v)}/><Area type="monotone" dataKey="checking" name="Checking" stroke={C.navy} strokeWidth={2} fill="transparent"/><Area type="monotone" dataKey="savings" name="Savings" stroke={C.green} strokeWidth={2} fill="transparent"/><Area type="monotone" dataKey="cushion" name="Cushion" stroke={C.accent} strokeWidth={2} fill="transparent"/></AreaChart></ResponsiveContainer>}
        {hasData&&mode==="spending"&&<ResponsiveContainer width="100%" height={200}><BarChart data={spendData} margin={{left:8,right:8,top:4,bottom:0}}><XAxis dataKey="date" tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={fD} interval="preserveStartEnd"/><YAxis tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+(v>=1000?(v/1000).toFixed(1)+"k":v)} width={50}/><Tooltip formatter={(v)=>fmt(v)}/><Bar dataKey="amount" name="Spent" fill={C.red} radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>}
      </div>
      <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"11px 14px",fontSize:12,color:C.accent}}>Tip: Update balances weekly for the best trend line.</div>
    </div>
  );
}

function StatementView({expenses,bills,income,accounts,debts,trades,appName,categories,onAdd}){
  const now=new Date();
  const[mo,setMo]=useState(now.getMonth());const[yr,setYr]=useState(now.getFullYear());const[ytdMode,setYtdMode]=useState(false);
  function nav(d){let m=mo+d,y=yr;if(m<0){m=11;y--;}else if(m>11){m=0;y++;}setMo(m);setYr(y);}
  const ms=yr+"-"+String(mo+1).padStart(2,"0");
  const prevMo=mo===0?11:mo-1,prevYr=mo===0?yr-1:yr;
  const prevMs=prevYr+"-"+String(prevMo+1).padStart(2,"0");
  const prevExp=expenses.filter(e=>e.date?.startsWith(prevMs));
  const totPrev=prevExp.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const mExp=ytdMode?expenses.filter(e=>e.date?.startsWith(String(yr))):expenses.filter(e=>e.date?.startsWith(ms));
  const mBills=bills.filter(b=>b.dueDate?.startsWith(ms));
  const mTrades=trades.filter(t=>t.date?.startsWith(ms));
  const totE=mExp.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const totB=mBills.reduce((s,b)=>s+(parseFloat(b.amount)||0),0);
  const tradePnl=mTrades.reduce((s,t)=>s+(parseFloat(t.pnl)||0),0);
  const ti=(parseFloat(income.primary||0))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const catMap=mExp.reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount)||0);return a},{});
  function exportHTML(){const rows=mExp.map(e=>"<tr><td>"+e.date+"</td><td>"+e.name+"</td><td>"+e.category+"</td><td>$"+parseFloat(e.amount).toFixed(2)+"</td></tr>").join("");const html="<html><head><title>"+MOS[mo]+" "+yr+" Statement</title></head><body><h1>"+(appName||"Finances")+" — "+MOS[mo]+" "+yr+"</h1><table border='1'><tr><th>Date</th><th>Name</th><th>Category</th><th>Amount</th></tr>"+rows+"<tr><td colspan='3'><b>Total</b></td><td><b>$"+totE.toFixed(2)+"</b></td></tr></table></body></html>";const b=new Blob([html],{type:"text/html"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=(appName||"finances")+"-"+MOS[mo]+"-"+yr+".html";a.click();URL.revokeObjectURL(u);}
  function exportCSV(){const hdr=["Date","Name","Category","Amount"];const rowData=mExp.map(e=>[e.date,e.name.replace(/,/g," "),e.category,parseFloat(e.amount).toFixed(2)]);const csv=[hdr,...rowData].map(r=>r.join(",")).join("\r\n");const b=new Blob([csv],{type:"text/csv"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=(appName||"trackfi")+"-"+MOS[mo]+"-"+yr+".csv";a.click();URL.revokeObjectURL(u);}
  return(<div className="fu">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
      <div><div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text}}>Monthly Statement</div><div style={{fontSize:13,color:C.textLight}}>{MOS[mo]} {yr}</div></div>
      <div style={{display:"flex",gap:8}}>
        <button className="ba" onClick={onAdd} style={{background:C.accent,border:"none",borderRadius:10,padding:"8px 12px",cursor:"pointer",color:"#fff",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",gap:4}}><Plus size={13}/>Add</button>
        <button className="ba" onClick={()=>setYtdMode(y=>!y)} style={{background:ytdMode?C.accentBg:C.bg,border:`1px solid ${ytdMode?C.accentMid:C.border}`,borderRadius:10,padding:"8px 12px",cursor:"pointer",color:ytdMode?C.accent:C.textMid,fontWeight:700,fontSize:12}}>YTD</button><button className="ba" onClick={()=>{setYtdMode(false);nav(-1);}} style={{background:C.bg,border:"1px solid "+C.border,borderRadius:10,padding:"8px 12px",cursor:"pointer",color:C.textMid,fontWeight:600}}>←</button>
        <button className="ba" onClick={()=>nav(1)} style={{background:C.bg,border:"1px solid "+C.border,borderRadius:10,padding:"8px 12px",cursor:"pointer",color:C.textMid,fontWeight:600}}>→</button>
        <button className="ba" onClick={exportCSV} style={{background:C.teal,border:"none",borderRadius:10,padding:"8px 12px",cursor:"pointer",color:"#fff",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",gap:4}}><Download size={13}/>CSV</button><button className="ba" onClick={exportHTML} style={{background:C.green,border:"none",borderRadius:10,padding:"8px 12px",cursor:"pointer",color:"#fff",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",gap:4}}><Download size={13}/>HTML</button>
      </div>
    </div>
    <div style={{background:C.navy,borderRadius:18,padding:20,marginBottom:16,color:"#fff"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {[["Income",fmt(ti),C.greenMid],["Expenses",fmt(totE),C.redMid],["Net",(ti-totE>=0?"+":"")+fmt(ti-totE),ti-totE>=0?C.greenMid:C.redMid]].map(([l,v,c])=><div key={l} style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"11px 12px"}}><div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:3}}>{l}</div><div style={{fontFamily:MF,fontSize:16,fontWeight:800,color:c}}>{v}</div></div>)}
      </div>
    </div>
    
      {(totE>0||totPrev>0)&&<div style={{background:C.surface,borderRadius:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"14px",marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:600,color:C.textLight}}>vs Last Month</div>
          <div style={{fontSize:13,fontWeight:700,color:totE<=totPrev?C.green:C.red}}>{totE<=totPrev?"↓ ":"+$"}{totE<=totPrev?fmt(totPrev-totE)+" less":""+fmt(totE-totPrev)+" more"}</div>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:6}}>
          <div style={{flex:1}}><div style={{fontSize:10,color:C.textLight,fontWeight:600,marginBottom:4}}>THIS MONTH</div><div style={{height:8,background:C.borderLight,borderRadius:4}}><div style={{height:8,width:totPrev>0?Math.min(100,totE/Math.max(totE,totPrev)*100).toFixed(1)+"%":"100%",background:totE<=totPrev?C.green:C.red,borderRadius:4}}/></div><div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.text,marginTop:3}}>{fmt(totE)}</div></div>
          <div style={{flex:1}}><div style={{fontSize:10,color:C.textLight,fontWeight:600,marginBottom:4}}>LAST MONTH</div><div style={{height:8,background:C.borderLight,borderRadius:4}}><div style={{height:8,width:totE>0?Math.min(100,totPrev/Math.max(totE,totPrev)*100).toFixed(1)+"%":"100%",background:C.textLight,borderRadius:4}}/></div><div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.textMid,marginTop:3}}>{fmt(totPrev)}</div></div>
        </div>
      </div>}
      {Object.entries(catMap).sort((a,b)=>b[1]-a[1]).map(([cat,amt],i)=><div key={cat} style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,fontWeight:600,color:C.text}}>{cat}</span><span style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>{fmt(amt)}</span></div><BarProg pct={totE>0?amt/totE*100:0} color={PIE_COLORS[i%PIE_COLORS.length]} h={5}/></div>)}
    {mTrades.length>0&&<div style={{background:C.surface,border:"1px solid "+C.border,borderRadius:14,padding:14,marginTop:12}}><div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.text,marginBottom:4}}>Trading P&L: <span style={{color:tradePnl>=0?C.green:C.red}}>{tradePnl>=0?"+":""}{fmt(tradePnl)}</span></div><div style={{fontSize:12,color:C.textLight}}>{mTrades.length} trades · {mTrades.filter(t=>parseFloat(t.pnl)>0).length} wins</div></div>}
    <div style={{marginTop:12}}>
      <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:10}}>Transactions ({mExp.length})</div>
      {mExp.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(e=>{const cat=categories.find(c=>c.name===e.category);return(<div key={e.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid "+C.border}}><div style={{width:32,height:32,borderRadius:8,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{cat?.icon||"💸"}</div><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:C.text}}>{e.name}</div><div style={{fontSize:11,color:C.textLight}}>{e.date} · {e.category}</div></div><div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>{fmt(e.amount)}</div></div>);})}
      {mExp.length===0&&<Empty text={"No expenses in "+MOS[mo]+" "+yr} icon={FileText}/>}
    </div>
  </div>);
}

function FinancialPhysicalView({income,expenses,debts,accounts,bills,savingsGoals}){
  const ti=(parseFloat(income.primary||0))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const annualIncome=ti*12;
  const te=expenses.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const td=debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0);
  const tm=debts.reduce((s,d)=>s+(parseFloat(d.minPayment)||0),0);
  const liq=(parseFloat(accounts.savings||0))+(parseFloat(accounts.cushion||0));
  const ta=(parseFloat(accounts.checking||0))+(parseFloat(accounts.savings||0))+(parseFloat(accounts.cushion||0))+(parseFloat(accounts.investments||0))+(parseFloat(accounts.property||0))+(parseFloat(accounts.vehicles||0));
  const mAvg=te/Math.max(1,new Date().getMonth()+1);
  const efMo=mAvg>0?liq/mAvg:0;
  const sr=ti>0?Math.max(0,(ti-mAvg)/ti*100):0;
  const dti=ti>0?(tm/ti)*100:0;
  const nw=ta-td;
  const ov=bills.filter(b=>!b.paid&&dueIn(b.dueDate)<0).length;
  const mi=debts.reduce((s,d)=>s+(parseFloat(d.balance||0)*(parseFloat(d.rate||0)/100/12)),0);
  const priorities=[];
  if(ov)priorities.push({ic:"🚨",c:C.red,t:"Pay overdue bills",d:ov+" bill"+(ov!==1?"s":" ")+"past due"});
  if(liq<1000)priorities.push({ic:"🛡️",c:C.amber,t:"Build $1,000 emergency fund",d:"Have "+fmt(liq)+" — need "+fmt(Math.max(0,1000-liq))+" more"});
  if(dti>36)priorities.push({ic:"💳",c:C.red,t:"Reduce debt load",d:"DTI "+dti.toFixed(1)+"% — target under 28%"});
  if(sr<5&&ti>0)priorities.push({ic:"📉",c:C.amber,t:"Boost savings rate",d:"Currently "+sr.toFixed(1)+"% — target 15-20%"});
  if(efMo<3)priorities.push({ic:"💰",c:C.amber,t:"Grow emergency fund",d:efMo.toFixed(1)+" months saved — target 3-6"});
  if(mi>100)priorities.push({ic:"⚡",c:C.accent,t:"Tackle interest costs",d:"Paying "+fmt(mi)+"/mo in interest"});
  return(<div className="fu">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text}}>Financial Physical</div>

    </div>
    <div style={{background:C.navy,borderRadius:18,padding:20,marginBottom:16,color:"#fff"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {[["Net Worth",fmt(nw),nw>=0?C.greenMid:C.redMid],["Emergency",efMo.toFixed(1)+" mo",efMo>=6?C.greenMid:efMo>=3?C.amberMid:C.redMid],["Savings Rate",sr.toFixed(1)+"%",sr>=15?C.greenMid:sr>=5?C.amberMid:C.redMid],["DTI",dti.toFixed(1)+"%",dti<=28?C.greenMid:dti<=36?C.amberMid:C.redMid]].map(([l,v,c])=><div key={l} style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"10px 12px"}}><div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:3}}>{l}</div><div style={{fontFamily:MF,fontSize:16,fontWeight:800,color:c}}>{v}</div></div>)}
      </div>
    </div>
    {priorities.length>0&&<div style={{marginBottom:16}}><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:10}}>Top Priorities</div>{priorities.slice(0,3).map((p,i)=><div key={i} style={{background:C.surface,border:"1.5px solid "+p.c+"22",borderRadius:14,padding:14,marginBottom:8,borderLeft:"4px solid "+p.c}}><div style={{display:"flex",gap:10,alignItems:"flex-start"}}><span style={{fontSize:20,flexShrink:0}}>{p.ic}</span><div><div style={{fontSize:13,fontWeight:700,color:C.text}}>{p.t}</div><div style={{fontSize:12,color:C.textMid,marginTop:3,lineHeight:1.5}}>{p.d}</div></div></div></div>)}</div>}
    <div style={{background:C.surface,border:"1px solid "+C.border,borderRadius:16,padding:18}}>
      <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:12}}>Dave Ramsey Steps</div>
      <div style={{fontSize:12,color:C.textLight,marginBottom:10}}>Based on your real numbers</div>
      {[[liq>=1000,"$1,000 emergency fund","Have: "+fmt(liq)+(liq<1000?" — need "+fmt(1000-liq)+" more":""),"baby-1"],[td===0,"Pay off all debt (except mortgage)","Total: "+fmt(td)+(td>0?" across "+debts.length+" account"+(debts.length!==1?"s":""):""),"baby-2"],[efMo>=3&&efMo<=6,"3-6 months emergency fund",efMo.toFixed(1)+" months — target 3-6","baby-3"],[parseFloat(accounts.investments||0)>=annualIncome*0.15,"Invest 15% for retirement","Balance: "+fmt(accounts.investments||0),"baby-4"],[savingsGoals.some(g=>g.name?.toLowerCase().includes("college")||g.name?.toLowerCase().includes("529")),"College funding (if applicable)","Check savings goals","baby-5"],[parseFloat(accounts.property||0)>0||nw>td*2,"Pay off home early","Property equity: "+fmt(accounts.property||0),"baby-6"],[nw>=500000||nw>=annualIncome*7,"Build wealth & give generously","Net worth: "+fmt(nw),"baby-7"]].map(([done,t,sub],i)=><div key={i} style={{display:"flex",gap:12,alignItems:"center",padding:"9px 0",borderBottom:i<3?"1px solid "+C.border:""}}><div style={{width:24,height:24,borderRadius:"50%",background:done?C.greenBg:C.bg,border:"2px solid "+(done?C.green:C.border),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,fontWeight:800,color:done?C.green:C.textLight}}>{done?"✓":i+1}</div><div><div style={{fontSize:13,fontWeight:600,color:done?C.textLight:C.text,textDecoration:done?"line-through":"none"}}>{t}</div><div style={{fontSize:11,color:C.textLight,marginTop:2}}>{sub}</div></div></div>)}
    </div>
  </div>);
}

function SettingsView({settings,setSettings,appName,setAppName,greetName,setGreetName,onResetAllData,darkMode,setDarkMode,pinEnabled,setPinEnabled,profCategory,setProfCategory,profSub,setProfSub,expenses,bills,debts,trades,accounts,income,shifts,savingsGoals,budgetGoals,setBills,setDebts,setTrades,setShifts,setSGoals,setBGoals,setAccounts,setIncome,setExpenses,categories,setCategories,onResetOnboarding,onSignOut,onSignIn,userEmail}){
  const[nm,setNm]=useState(appName||"");const[showPIN,setShowPIN]=useState(false);
  function exportData(){const d={exportedAt:new Date().toISOString(),appName,accounts,income,expenses,bills,debts,trades,shifts,savingsGoals,budgetGoals,version:"2.0"};const b=new Blob([JSON.stringify(d,null,2)],{type:"application/json"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=`${(appName||"finances").replace(/\s+/g,"-")}-backup.json`;a.click();URL.revokeObjectURL(u);}
  async function importData(file){try{const t=await file.text();const d=JSON.parse(t);if(d.accounts)setAccounts(d.accounts);if(d.income)setIncome(d.income);if(d.expenses)setExpenses(d.expenses);if(d.bills)setBills(d.bills);if(d.debts)setDebts(d.debts);if(d.trades)setTrades(d.trades);if(d.shifts)setShifts(d.shifts);if(d.savingsGoals)setSGoals(d.savingsGoals);if(d.budgetGoals)setBGoals(d.budgetGoals);alert("✅ Imported!");}catch(e){alert("❌ "+e.message);}}
  const S=(k,l,d,ic)=>(<div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${C.border}`}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>{ic}</span><div><div style={{fontSize:14,fontWeight:600,color:C.text}}>{l}</div><div style={{fontSize:12,color:C.textLight}}>{d}</div></div></div><button onClick={()=>setSettings(p=>({...p,[k]:!p[k]}))} style={{background:"none",border:"none",cursor:"pointer",color:settings[k]?C.accent:C.borderLight,padding:0}}>{settings[k]?<ToggleRight size={28}/>:<ToggleLeft size={28}/>}</button></div>);
  return(<div className="fu">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.4}}>Settings</div>{userEmail&&<div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:99,padding:"4px 12px",fontSize:12,fontWeight:600,color:C.accent}}>{userEmail.split("@")[0]}</div>}</div>
    <div style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:16,marginBottom:12}}>
      <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>App Name</div>
      <div style={{display:"flex",gap:8,marginBottom:14}}><input value={nm} onChange={e=>setNm(e.target.value)} placeholder="Trackfi" style={{flex:1,background:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"10px 13px",color:C.text,fontSize:14,outline:"none"}}/><button className="ba" onClick={()=>nm.trim()&&setAppName(nm.trim())} style={{background:C.accent,border:"none",borderRadius:10,padding:"0 16px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13}}>Save</button></div>
      <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6,marginTop:14}}>Greeting Name</div>
      <div style={{fontSize:11,color:C.textLight,marginBottom:6}}>Used in your home screen greeting — "Good morning, ____"</div>
      <div style={{display:"flex",gap:8,marginBottom:14}}><input value={greetName||""} onChange={e=>setGreetName(e.target.value)} placeholder="Your first name" style={{flex:1,background:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"10px 13px",color:C.text,fontSize:14,outline:"none"}}/><button className="ba" onClick={()=>setGreetName(greetName.trim())} style={{background:C.green,border:"none",borderRadius:10,padding:"0 16px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13}}>Save</button></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
        {PROFESSIONS.map(p=><button key={p.id} onClick={()=>{setProfCategory(p.id);setProfSub(p.subs[0].id);showToast&&showToast("✓ Profession updated — "+p.label);}} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:10,border:`1.5px solid ${profCategory===p.id?C.accent:C.border}`,background:profCategory===p.id?C.accentBg:C.surfaceAlt,cursor:"pointer",textAlign:"left"}}><span style={{fontSize:16}}>{p.icon}</span><span style={{fontSize:12,fontWeight:600,color:profCategory===p.id?C.accent:C.text}}>{p.label}</span></button>)}
      </div>
    </div>
    <div style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:16,marginBottom:12}}>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>{[["💸",expenses.length,"Expenses"],["📅",bills.length,"Bills"],["💳",debts.length,"Debts"],["🎯",savingsGoals.length,"Goals"],["📈",trades.length,"Trades"]].map(([ic,n,l])=>(<div key={l} style={{flex:"1 1 60px",background:C.surfaceAlt,borderRadius:12,padding:"10px 8px",textAlign:"center",minWidth:60}}><div style={{fontSize:18,marginBottom:2}}>{ic}</div><div style={{fontFamily:MF,fontWeight:800,fontSize:16,color:C.text}}>{n}</div><div style={{fontSize:10,color:C.textLight,fontWeight:600}}>{l}</div></div>))}</div>
      <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>Appearance & Security</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${C.border}`}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>{darkMode?"🌙":"☀️"}</span><div style={{fontSize:14,fontWeight:600,color:C.text}}>Dark Mode</div></div><button onClick={()=>setDarkMode(d=>!d)} style={{background:"none",border:"none",cursor:"pointer",color:darkMode?C.accent:C.borderLight,padding:0}}>{darkMode?<ToggleRight size={28}/>:<ToggleLeft size={28}/>}</button></div>
      <div style={{padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>🔒</span><div><div style={{fontSize:14,fontWeight:600,color:C.text}}>PIN Lock</div><div style={{fontSize:12,color:C.textLight}}>{pinEnabled?"Enabled":"Disabled"}</div></div></div><button onClick={()=>{if(pinEnabled){localStorage.removeItem("fv_pin_hash");setPinEnabled(false);}else setShowPIN(true);}} style={{background:"none",border:"none",cursor:"pointer",color:pinEnabled?C.accent:C.borderLight,padding:0}}>{pinEnabled?<ToggleRight size={28}/>:<ToggleLeft size={28}/>}</button></div>
        {showPIN&&<div style={{marginTop:10}}><PINSetup onSave={()=>{setPinEnabled(true);setShowPIN(false);}} onCancel={()=>setShowPIN(false)} darkMode={darkMode}/></div>}
      </div>
      <div style={{display:"flex",gap:8,paddingTop:12}}>
        <button className="ba" onClick={exportData} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:10,padding:"11px 0",color:C.accent,fontWeight:700,fontSize:13,cursor:"pointer"}}><Download size={14}/>Export</button>
        <label className="ba" style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 0",color:C.textMid,fontWeight:700,fontSize:13,cursor:"pointer"}}><Database size={14}/>Import<input type="file" accept=".json" style={{display:"none"}} onChange={async e=>importData(e.target.files[0])}/></label>
      </div>
    </div>
    <div style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:16,marginBottom:12}}>
      <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Features</div>
      {S("showTrading","Futures Trading","Track P&L, win rate","📈")}
      {S("showCrypto","Crypto","Add to net worth","🪙")}
      {S("showHealth","Health Score","Gamified financial score","🏆")}
      {S("showSavings","Savings Goals","Track goals with timelines","🎯")}
    </div>
    {onResetOnboarding&&<button className="ba" onClick={onResetOnboarding} style={{width:"100%",background:C.bg,borderRadius:12,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"12px 0",color:C.textMid,fontWeight:600,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:10}}><RefreshCw size={14}/>Re-run Setup Wizard</button>}
    {onResetAllData&&<button className="ba" onClick={onResetAllData} style={{width:"100%",background:C.redBg,border:`1px solid ${C.redMid}`,borderRadius:12,padding:"12px 0",color:C.red,fontWeight:700,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:10}}><Trash2 size={14}/>Reset All Data</button>}
    <div style={{marginTop:8,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
      
      {onSignOut&&<button className="ba" onClick={()=>onSignOut()} style={{width:"100%",marginBottom:8,background:C.redBg,border:`1px solid ${C.redMid}`,borderRadius:12,padding:"12px 0",color:C.red,fontWeight:700,fontSize:14,cursor:"pointer"}}>Sign Out & Clear Session</button>}
      {onSignIn&&<button className="ba" onClick={onSignIn} style={{width:"100%",background:`linear-gradient(135deg,${C.accent},${C.green})`,border:"none",borderRadius:12,padding:"12px 0",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>Sign In / Create Account</button>}
    </div>
  </div>);
}

function generateDemoData(){
  const now=new Date(),yr=now.getFullYear();
  const expenses=[],bills=[],debts=[],trades=[],shifts=[],savingsGoals=[],budgetGoals=[],balHist=[];
  const ET=[
    ["Chipotle","Food",[11,15]],["Publix Groceries","Food",[80,160]],["Starbucks","Food",[6,9]],
    ["McDonald's","Food",[8,14]],["DoorDash","Food",[22,45]],["Shell Gas","Transport",[50,85]],
    ["Uber","Transport",[12,28]],["Netflix","Subscriptions",[15,16]],["Spotify","Subscriptions",[10,11]],
    ["Apple iCloud","Subscriptions",[3,3]],["Gym Membership","Subscriptions",[45,45]],
    ["Walgreens","Health",[15,60]],["Target","Personal",[35,120]],["Amazon","Personal",[25,95]],
    ["Barber","Personal",[30,35]],["AMC Movies","Entertainment",[18,30]],
    ["Cheesecake Factory","Food",[45,75]],["Home Depot","Housing",[35,180]],
    ["Car Wash","Transport",[15,25]],["CVS Pharmacy","Health",[18,45]],
  ];
  for(let mo=0;mo<12;mo++){
    const isFutureMo=mo>now.getMonth(),isCurMo=mo===now.getMonth();
    const dim=new Date(yr,mo+1,0).getDate();
    const maxDay=isFutureMo?0:isCurMo?Math.max(1,now.getDate()-1):dim;
    if(!maxDay)continue;
    const count=20+Math.floor(Math.random()*16);
    for(let i=0;i<count;i++){
      const[name,cat,range]=ET[Math.floor(Math.random()*ET.length)];
      const day=1+Math.floor(Math.random()*Math.max(1,maxDay-1));
      const amt=(range[0]+Math.random()*(range[1]-range[0])).toFixed(2);
      expenses.push({id:Date.now()+mo*10000+i,name,category:cat,amount:amt,date:yr+"-"+String(mo+1).padStart(2,"0")+"-"+String(day).padStart(2,"0"),notes:""});
    }
  }
  const BT=[["Rent","1450","01"],["Electric","87","15"],["Internet (Xfinity)","65","22"],["Phone (T-Mobile)","95","08"],["Renters Insurance","22","01"],["Car Insurance","148","10"],["Hulu","18","18"],["Student Loan","320","05"]];
  const today2=new Date();
  BT.forEach(([name,amount,day],idx)=>{
    for(let mo2=0;mo2<12;mo2++){
      const due=yr+"-"+String(mo2+1).padStart(2,"0")+"-"+day;
      bills.push({id:(idx+1)*100+mo2,name,amount,dueDate:due,paid:new Date(due+"T00:00:00")<today2,recurring:"Monthly",autoPay:false});
    }
  });
  debts.push(
    {id:2001,name:"Student Loans",balance:"18400",original:"24000",rate:"5.75",minPayment:"320",type:"Student Loan"},
    {id:2002,name:"Car Loan",balance:"9200",original:"15000",rate:"6.9",minPayment:"285",type:"Car Loan"},
    {id:2003,name:"Capital One Visa",balance:"2340",original:"3000",rate:"22.99",minPayment:"58",type:"Credit Card"}
  );
  const syms=["ES","NQ","CL","GC","MES","MNQ"];
  for(let mo=0;mo<12;mo++){
    const n=6+Math.floor(Math.random()*8);
    for(let i=0;i<n;i++){
      const isWin=Math.random()>0.42;
      const pnl=isWin?(80+Math.random()*620).toFixed(0):"-"+(60+Math.random()*340).toFixed(0);
      const day=2+Math.floor(Math.random()*25);
      trades.push({id:Date.now()+50000+mo*200+i,date:yr+"-"+String(mo+1).padStart(2,"0")+"-"+String(day).padStart(2,"0"),symbol:syms[Math.floor(Math.random()*syms.length)],side:Math.random()>0.5?"Long":"Short",contracts:"1",pnl,entry:"",exit:"",note:isWin?"Good setup":"Stopped out"});
    }
  }
  const ST=["Regular","Regular","Regular","Overtime","Night","Weekend"];
  const mults={Regular:1,Overtime:1.5,Night:1.15,Weekend:1.25};
  for(let mo=0;mo<12;mo++){
    for(let wk=0;wk<4;wk++){
      const day=Math.min(wk*7+1+Math.floor(Math.random()*5),28);
      const type=ST[Math.floor(Math.random()*ST.length)];
      const hours=(type==="Overtime"?12:(8+Math.random()*4)).toFixed(1);
      const rate="36.50";
      shifts.push({id:Date.now()+80000+mo*100+wk,date:yr+"-"+String(mo+1).padStart(2,"0")+"-"+String(day).padStart(2,"0"),type,hours,rate,gross:(parseFloat(hours)*parseFloat(rate)*(mults[type]||1)).toFixed(2),note:"ICU"});
    }
  }
  savingsGoals.push(
    {id:3001,name:"Emergency Fund",icon:"🛡️",target:"18000",saved:"9400",monthly:"400"},
    {id:3002,name:"New Car",icon:"🚗",target:"8000",saved:"2100",monthly:"250"},
    {id:3003,name:"Vacation",icon:"✈️",target:"3500",saved:"850",monthly:"150"},
    {id:3004,name:"Trading Account",icon:"📈",target:"10000",saved:"5200",monthly:"200"}
  );
  budgetGoals.push(
    {id:4001,category:"Food",limit:"600"},{id:4002,category:"Transport",limit:"200"},
    {id:4003,category:"Entertainment",limit:"150"},{id:4004,category:"Personal",limit:"200"},{id:4005,category:"Subscriptions",limit:"100"}
  );
  let bal=3200;
  for(let mo=0;mo<12;mo++){
    for(let wk=0;wk<4;wk++){
      const day=wk*7+1;if(day>28)continue;
      bal=Math.max(1800,bal+(Math.random()-.4)*400);
      balHist.push({date:yr+"-"+String(mo+1).padStart(2,"0")+"-"+String(day).padStart(2,"0"),checking:parseFloat((bal*.6).toFixed(0)),savings:parseFloat((bal*.3).toFixed(0)),cushion:parseFloat((bal*.1).toFixed(0)),investments:parseFloat((12000+mo*180+Math.random()*300).toFixed(0)),total:parseFloat(bal.toFixed(0))});
    }
  }
  return{expenses,bills,debts,trades,shifts,savingsGoals,budgetGoals,balHist};
}

function HealthScoreView({income,expenses,debts,accounts,bills}){
  const ti=(parseFloat(income.primary||0))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const te=expenses.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const td=debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0);
  const tm=debts.reduce((s,d)=>s+(parseFloat(d.minPayment)||0),0);
  const liq=(parseFloat(accounts.savings||0))+(parseFloat(accounts.cushion||0));
  const ov=bills.filter(b=>!b.paid&&dueIn(b.dueDate)<0).length;
  const mExp=te/Math.max(1,new Date().getMonth()+1);
  const sr=ti>0?Math.min(100,Math.max(0,(ti-mExp)/ti*100)):0;
  const dti=ti>0?(tm/ti)*100:0;
  const efMo=mExp>0?liq/mExp:0;
  const srS=sr>=20?100:sr>=10?75:sr>=5?50:sr>0?25:0;
  const dtiS=dti<=15?100:dti<=28?80:dti<=36?60:dti<=43?35:10;
  const efS=efMo>=6?100:efMo>=3?75:efMo>=1?40:10;
  const nwS=td===0?100:ti>0?Math.min(100,Math.max(0,60-(td/ti)*2)):40;
  const psS=Math.max(0,100-ov*20);
  const overall=Math.min(10,Math.max(1,parseFloat(((srS*.25)+(dtiS*.2)+(efS*.2)+(nwS*.2)+(psS*.15))/10).toFixed(1)));
  const col=overall>=8?C.green:overall>=6?C.accent:overall>=4?C.amber:C.red;
  const label=overall>=8?"Excellent 💪":overall>=6?"Good 👍":overall>=4?"Fair ⚡":"Needs Work 📈";
  const gr=s=>s>=85?"A":s>=70?"B":s>=55?"C":s>=40?"D":"F";
  const gc=s=>s>=85?C.green:s>=70?C.accent:s>=55?C.amber:C.red;
  return(
    <div className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.3}}>Health Score</div>

      </div>
      <div style={{fontSize:13,color:C.textLight,marginBottom:16}}>Based on savings, debt, spending & payments</div>
      <div style={{background:`linear-gradient(135deg,${C.navy} 0%,${C.navyMid} 60%,${C.accent}88 100%)`,borderRadius:18,padding:24,marginBottom:16,display:"flex",alignItems:"center",gap:20}}>
        <div style={{position:"relative",width:100,height:100,flexShrink:0}}>
          <svg width="100" height="100"><circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="10"/><circle cx="50" cy="50" r="42" fill="none" stroke={col} strokeWidth="10" strokeDasharray={2*Math.PI*42} strokeDashoffset={2*Math.PI*42*(1-overall/10)} strokeLinecap="round" transform="rotate(-90 50 50)"/></svg>
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}><div style={{fontFamily:MF,fontSize:28,fontWeight:900,color:col,lineHeight:1}}>{overall}</div><div style={{fontSize:10,color:"rgba(255,255,255,.5)",letterSpacing:.5}}>/ 10</div></div>
        </div>
        <div style={{flex:1}}><div style={{fontFamily:MF,fontSize:22,fontWeight:800,color:"#fff",marginBottom:4}}>{label}</div><div style={{fontSize:13,color:"rgba(255,255,255,.6)",marginBottom:10}}>Financial Health Score</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{[["Savings",srS],["DTI",dtiS],["E-Fund",efS],["Debt",nwS],["Bills",psS]].map(([l,s])=><div key={l} style={{background:"rgba(255,255,255,.1)",borderRadius:8,padding:"3px 8px",fontSize:11,fontWeight:600,color:gc(s)}}>{l} {gr(s)}</div>)}</div></div>
      </div>
      {[{l:"Savings Rate",s:Math.round(srS),tip:`${sr.toFixed(1)}% — target 20%+`},{l:"Debt-to-Income",s:Math.round(dtiS),tip:`${dti.toFixed(1)}% DTI — under 28% is healthy`},{l:"Emergency Fund",s:Math.round(efS),tip:`${efMo.toFixed(1)} months — target 6 months`},{l:"Debt Load",s:Math.round(nwS),tip:td===0?"No debt — excellent!":fmt(td)+" total debt"},{l:"Payment History",s:psS,tip:ov===0?"All bills current":ov+" overdue bill"+(ov!==1?"s":"")}].map(it=>(
        <div key={it.l} style={{background:C.surfaceAlt,borderRadius:12,padding:14,marginBottom:8,borderLeft:`3px solid ${gc(it.s)}`,boxShadow:"0 1px 3px rgba(10,22,40,.04)"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:13,fontWeight:600,color:C.text}}>{it.l}</span><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:13,fontWeight:700,color:gc(it.s)}}>{it.s}/100</span><div style={{width:24,height:24,borderRadius:"50%",background:gc(it.s)+"18",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:MF,fontWeight:800,fontSize:11,color:gc(it.s)}}>{gr(it.s)}</div></div></div>
          <BarProg pct={it.s} color={gc(it.s)} h={5}/>
          <div style={{fontSize:11,color:C.textLight,marginTop:4}}>{it.tip}</div>
        </div>
      ))}
    </div>
  );
}

function IncomeSpendingView({expenses,income,trades}){
  const[range,setRange]=useState("3M");
  const now=new Date();
  const ti=useMemo(()=>(parseFloat(income.primary||0))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0)),[income]);
  const months=range==="3M"?3:range==="6M"?6:12;
  const data=useMemo(()=>Array.from({length:months},(_,i)=>{
    const d=new Date(now.getFullYear(),now.getMonth()-months+1+i,1);
    const ms=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
    const sp=expenses.filter(e=>e.date?.startsWith(ms)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
    const tp=trades.filter(t=>t.date?.startsWith(ms)).reduce((s,t)=>s+(parseFloat(t.pnl)||0),0);
    const inc=ti+(tp>0?tp:0);
    return{month:MOS[d.getMonth()],income:parseFloat(inc.toFixed(0)),spending:parseFloat(sp.toFixed(0)),saved:parseFloat(Math.max(0,inc-sp).toFixed(0))};
  }),[expenses,income,trades,months]);
  const TT=({active,payload,label})=>{if(!active||!payload?.length)return null;return(<div style={{background:C.surface,borderRadius:12,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"10px 14px",fontSize:12}}><div style={{fontWeight:700,marginBottom:6}}>{label}</div>{payload.map(p=><div key={p.dataKey} style={{display:"flex",justifyContent:"space-between",gap:12,marginBottom:2}}><span style={{color:C.textLight}}>{p.name}</span><span style={{fontWeight:700}}>{fmt(p.value)}</span></div>)}</div>);};
  return(
    <div className="fu">
      {(()=>{
        const sources=[{l:"Primary",v:parseFloat(income.primary||0),c:C.accent},{l:"Trading",v:parseFloat(income.trading||0),c:C.green},{l:"Freelance",v:parseFloat(income.freelance||0),c:C.purple},{l:"Rental",v:parseFloat(income.rental||0),c:C.amber},{l:"Dividends",v:parseFloat(income.dividends||0),c:C.teal},{l:"Other",v:parseFloat(income.other||0),c:C.textLight}].filter(s=>s.v>0);
        const total=sources.reduce((s,x)=>s+x.v,0);
        if(!total)return null;
        return(<div style={{background:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:18,padding:18,marginBottom:14}}>
          <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>Income Breakdown</div>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <PieChart width={120} height={120}><Pie data={sources.map(s=>({name:s.l,value:s.v}))} cx={55} cy={55} innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={2}>{sources.map((s,i)=><Cell key={i} fill={s.c}/>)}</Pie></PieChart>
            <div style={{flex:1}}>{sources.map(s=>(<div key={s.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:s.c}}/><span style={{fontSize:12,color:C.textMid}}>{s.l}</span></div><div style={{textAlign:"right"}}><span style={{fontFamily:MF,fontWeight:700,fontSize:12,color:C.text}}>{fmt(s.v)}</span><span style={{fontSize:11,color:C.textFaint,marginLeft:4}}>{(s.v/total*100).toFixed(0)}%</span></div></div>))}</div>
          </div>
        </div>);
      })()}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.3}}>Income vs Spending</div>
        
      </div>
      <div style={{display:"flex",gap:6,background:C.borderLight,borderRadius:10,padding:3,marginBottom:16}}>
        {["3M","6M","1Y"].map(r=><button key={r} className="ba" onClick={()=>setRange(r)} style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",background:range===r?"#fff":"transparent",color:range===r?C.accent:C.textLight,fontWeight:range===r?700:500,fontSize:13,cursor:"pointer"}}>{r}</button>)}
      </div>
      <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"20px 4px 12px",marginBottom:14}}>
        <div style={{display:"flex",gap:16,paddingLeft:16,marginBottom:12}}>{[[C.green,"Income"],[C.red,"Spending"],[C.accent,"Saved"]].map(([c,l])=><div key={l} style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:10,height:10,borderRadius:3,background:c}}/><span style={{fontSize:12,color:C.textLight}}>{l}</span></div>)}</div>
        <ResponsiveContainer width="100%" height={200}><BarChart data={data} margin={{left:8,right:8,top:4,bottom:0}} barGap={3}><XAxis dataKey="month" tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false}/><YAxis tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+(v>=1000?(v/1000).toFixed(0)+"k":v)} width={40}/><Tooltip content={<TT/>}/><Bar dataKey="income" name="Income" fill={C.green} radius={[4,4,0,0]}/><Bar dataKey="spending" name="Spending" fill={C.red} radius={[4,4,0,0]}/><Bar dataKey="saved" name="Saved" fill={C.accent} radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {data.map(m=>{const rate=m.income>0?Math.max(0,(m.income-m.spending)/m.income*100):0;return(<div key={m.month} style={{background:C.surface,borderRadius:12,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"12px 14px",display:"flex",alignItems:"center",gap:12}}><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,width:32}}>{m.month}</div><div style={{flex:1}}><BarProg pct={m.income>0?m.spending/m.income*100:0} color={m.spending>m.income?C.red:C.green} h={5}/></div><div style={{textAlign:"right",minWidth:80}}><div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>{fmt(m.spending)}</div><div style={{fontSize:11,color:C.textLight}}>{rate.toFixed(0)}% saved</div></div></div>);})}
      </div>
    </div>
  );
}function DashSettingsView({config,setConfig,showTrading}){
  const toggle=k=>setConfig(p=>({...p,[k]:!p[k]}));
  const items=[{k:"showIncomeChart",icon:"📊",label:"Income vs Spending Chart",desc:"3-month bar chart on home"},{k:"showMetrics",icon:"📐",label:"Key Metrics Grid",desc:"Net worth, health, emergency fund"},{k:"showAccounts",icon:"🏦",label:"Account Cards",desc:"Scrollable balance overview"},{k:"showForecast",icon:"🔮",label:"Month Forecast",desc:"Burn rate and projected spend"},{k:"showBills",icon:"📅",label:"Upcoming Bills",desc:"Next 3 bills with countdown"},{k:"showRecent",icon:"🕒",label:"Recent Transactions",desc:"Last 4 logged expenses"},...(showTrading?[{k:"showTradeCard",icon:"📈",label:"Trading Summary",desc:"P&L and record"}]:[])];
  return(
    <div className="fu">
      <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,marginBottom:4,letterSpacing:-.3}}>Customize Dashboard</div>
      <div style={{fontSize:13,color:C.textLight,marginBottom:18}}>Choose what shows on your home screen</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {items.map(item=>(
          <div key={item.k} style={{background:C.surface,border:`1.5px solid ${config[item.k]?C.accentMid:C.border}`,borderRadius:14,padding:"13px 16px",display:"flex",alignItems:"center",gap:14}}>
            <span style={{fontSize:22}}>{item.icon}</span>
            <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:C.text}}>{item.label}</div><div style={{fontSize:12,color:C.textLight,marginTop:2}}>{item.desc}</div></div>
            <button onClick={()=>toggle(item.k)} style={{background:"none",border:"none",cursor:"pointer",color:config[item.k]?C.accent:C.borderLight,padding:0}}>{config[item.k]?<ToggleRight size={28}/>:<ToggleLeft size={28}/>}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({icon,title,sub,right,rightColor,rightSub,onDelete,badge,onClick}){
  return(
    <div className="rw" style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"13px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12,cursor:onClick?"pointer":"default"}} onClick={onClick}>
      <div style={{width:38,height:38,borderRadius:10,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{icon}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
          <span style={{fontSize:14,fontWeight:600,color:C.text}}>{title}</span>
          {badge&&<span style={{fontSize:10,fontWeight:700,background:badge.bg,color:badge.color,padding:"2px 7px",borderRadius:99}}>{badge.label}</span>}
        </div>
        <div style={{fontSize:12,color:C.textLight,lineHeight:1.4}}>{sub}</div>
        {rightSub&&<div style={{fontSize:11,color:C.textLight,marginTop:2}}>{rightSub}</div>}
      </div>
      <div style={{textAlign:"right",flexShrink:0}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:rightColor||C.text}}>{right}</div>
      </div>
      {onDelete&&<button className="ba db" onClick={e=>{e.stopPropagation();onDelete();}} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,padding:4,display:"flex"}}><Trash2 size={14}/></button>}
    </div>
  );
}

function SwipeRow({children,onDelete}){
  const[swiped,setSwiped]=useState(false);
  const startX=useRef(0);
  return(
    <div style={{position:"relative",overflow:"hidden",marginBottom:8}}
      onTouchStart={e=>{startX.current=e.touches[0].clientX;}}
      onTouchEnd={e=>{const dx=startX.current-e.changedTouches[0].clientX;if(dx>60)setSwiped(true);else if(dx<-20)setSwiped(false);}}>
      <div style={{transform:swiped?"translateX(-72px)":"translateX(0)",transition:"transform .2s ease"}}>{children}</div>
      {swiped&&<div style={{position:"absolute",right:0,top:0,bottom:0,width:68,display:"flex",alignItems:"center",justifyContent:"center",background:C.red,borderRadius:"0 14px 14px 0",cursor:"pointer"}} onClick={()=>{onDelete();setSwiped(false);}}><Trash2 size={18} color="#fff"/></div>}
    </div>
  );
}

function ConfirmDialog({title,message,onConfirm,onCancel,danger=false}){
  return(
    <div style={{position:"fixed",inset:0,zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(10,22,40,.55)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",backdropFilter:"blur(4px)",padding:20,animation:"fadeIn .15s ease"}} onClick={e=>e.target===e.currentTarget&&onCancel()}>
      <div style={{background:C.surface,borderRadius:20,padding:24,width:"100%",maxWidth:340,boxShadow:"0 8px 40px rgba(0,0,0,.2)",animation:"slideUp .2s ease"}}>
        <div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text,marginBottom:8}}>{title}</div>
        <div style={{fontSize:14,color:C.textLight,lineHeight:1.5,marginBottom:20}}>{message}</div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onCancel} style={{flex:1,background:C.bg,borderRadius:12,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"12px 0",color:C.textMid,fontWeight:600,fontSize:14,cursor:"pointer"}}>Cancel</button>
          <button onClick={onConfirm} style={{flex:1,background:danger?C.red:C.accent,border:"none",borderRadius:12,padding:"12px 0",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>{danger?"Delete":"Confirm"}</button>
        </div>
      </div>
    </div>
  );
}

function TaxView({expenses,income,trades,shifts,appName}){
  const now=new Date();const yr=now.getFullYear();
  const ti=(parseFloat(income.primary||0))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const annualIncome=ti*12;
  const tradePnl=trades.filter(t=>t.date?.startsWith(String(yr))).reduce((s,t)=>s+(parseFloat(t.pnl)||0),0);
  const shiftEarnings=shifts.filter(s=>s.date?.startsWith(String(yr))).reduce((s,x)=>s+(parseFloat(x.gross)||0),0);
  const catMap=expenses.filter(e=>e.date?.startsWith(String(yr))).reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount)||0);return a},{});
  const totalExp=Object.values(catMap).reduce((s,v)=>s+v,0);
  function exportCSV(){const hdr=["Date","Name","Category","Amount"];const rowData=expenses.filter(e=>e.date?.startsWith(String(yr))).map(e=>[e.date,e.name.replace(/,/g," "),e.category,parseFloat(e.amount).toFixed(2)]);const csv=[hdr,...rowData].map(r=>r.join(",")).join("\r\n");const b=new Blob([csv],{type:"text/csv"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=(appName||"trackfi")+"-ytd-"+yr+".csv";a.click();URL.revokeObjectURL(u);}
  return(
    <div className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text}}>Tax Summary {yr}</div>
        <button onClick={exportCSV} style={{display:"flex",alignItems:"center",gap:5,background:C.green,border:"none",borderRadius:10,padding:"8px 12px",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}}><Download size={13}/>CSV</button>
      </div>
      <div style={{fontSize:13,color:C.textLight,marginBottom:16}}>Year-to-date overview for tax preparation</div>
      <div style={{background:C.navy,borderRadius:18,padding:20,marginBottom:14,color:"#fff"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[["Annual Income",fmt(annualIncome),C.greenMid],["YTD Expenses",fmt(totalExp),C.redMid],["Trading P&L",(tradePnl>=0?"+":"")+fmt(tradePnl),tradePnl>=0?C.greenMid:C.redMid],["Shift Earnings",fmt(shiftEarnings),C.accentMid]].map(([l,v,c])=><div key={l} style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"10px 12px"}}><div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:3}}>{l.toUpperCase()}</div><div style={{fontFamily:MF,fontSize:16,fontWeight:800,color:c}}>{v}</div></div>)}
        </div>
      </div>
      <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"11px 14px",marginBottom:14,fontSize:13,color:C.accent}}>⚠️ For reference only. Consult a tax professional.</div>
      <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>Expenses by Category</div>
      {annualIncome>0&&(()=>{
        const sources=[{name:"Salary",amt:parseFloat(income.primary||0)*12,color:C.accent},{name:"Other",amt:parseFloat(income.other||0)*12,color:C.green},{name:"Trading P&L",amt:tradePnl,color:tradePnl>=0?C.green:C.red},{name:"Shifts",amt:shiftEarnings,color:C.purple}].filter(s=>s.amt>0);
        const totalYTD=sources.reduce((s,x)=>s+x.amt,0);
        const bracket=totalYTD<11600?0.10:totalYTD<47150?0.12:totalYTD<100525?0.22:totalYTD<191950?0.24:0.32;
        const estTax=totalYTD*bracket;
        return(<div style={{background:C.surface,borderRadius:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"14px",marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:600,color:C.textLight}}>Estimated Tax Liability</div>
            <div style={{background:C.amberBg,border:`1px solid ${C.amberMid}`,borderRadius:8,padding:"3px 10px",fontSize:11,fontWeight:700,color:C.amber}}>~{Math.round(bracket*100)}% bracket</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
            <div style={{background:C.redBg,borderRadius:10,padding:"10px",textAlign:"center"}}><div style={{fontSize:10,color:C.red,fontWeight:600,marginBottom:2}}>ANNUAL EST.</div><div style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.red}}>{fmt(estTax)}</div></div>
            <div style={{background:C.amberBg,borderRadius:10,padding:"10px",textAlign:"center"}}><div style={{fontSize:10,color:C.amber,fontWeight:600,marginBottom:2}}>QUARTERLY</div><div style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.amber}}>{fmt(estTax/4)}</div></div>
            <div style={{background:C.greenBg,borderRadius:10,padding:"10px",textAlign:"center"}}><div style={{fontSize:10,color:C.green,fontWeight:600,marginBottom:2}}>EFFECTIVE</div><div style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.green}}>{Math.round(bracket*100)}%</div></div>
          </div>
          {sources.map(s=>{const w=totalYTD>0?Math.max(2,s.amt/totalYTD*100):0;return(<div key={s.name} style={{marginBottom:7}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:12,color:C.textMid}}>{s.name}</span><span style={{fontSize:12,fontFamily:MF,fontWeight:600}}>{fmt(s.amt)}</span></div><div style={{height:5,background:C.borderLight,borderRadius:3}}><div style={{height:5,width:w.toFixed(1)+"%",background:s.color||C.accent,borderRadius:3}}/></div></div>);})}
        </div>);
      })()}
        {Object.entries(catMap).sort((a,b)=>b[1]-a[1]).map(([cat,amt],i)=>(<div key={cat} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,fontWeight:600,color:C.text}}>{cat}</span><span style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>{fmt(amt)}</span></div><BarProg pct={totalExp>0?amt/totalExp*100:0} color={PIE_COLORS[i%PIE_COLORS.length]} h={5}/></div>))}
        <div style={{display:"flex",justifyContent:"space-between",paddingTop:12,marginTop:4,borderTop:`1px solid ${C.border}`}}><span style={{fontSize:13,fontWeight:700,color:C.text}}>Total YTD</span><span style={{fontFamily:MF,fontWeight:800,fontSize:16,color:C.red}}>{fmt(totalExp)}</span></div>
      </div>
    </div>
  );
}

function SubsView({detectedSubs,expenses}){
  const[dismissed,setDismissed]=useState([]);
  const monthly=detectedSubs.filter(s=>!dismissed.includes(s.name)).filter(s=>s.interval==="Monthly");
  const other=detectedSubs.filter(s=>s.interval!=="Monthly");
  const totalMo=monthly.reduce((s,x)=>s+(parseFloat(x.amount)||0),0);
  return(
    <div className="fu">
      <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.3,marginBottom:4}}>Subscriptions</div>
      <div style={{fontSize:13,color:C.textLight,marginBottom:16}}>Auto-detected from your expenses</div>
      {detectedSubs.length===0&&<div style={{textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:36,marginBottom:12}}>🔍</div><div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:4}}>No subscriptions detected yet</div><div style={{fontSize:13,color:C.textLight}}>Add more expenses and Trackfi will find recurring patterns.</div></div>}
      {monthly.length>0&&<>
        <div style={{background:C.navy,borderRadius:16,padding:18,marginBottom:14,color:"#fff"}}>
          <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Monthly Subscriptions</div>
          <div style={{fontFamily:MF,fontSize:28,fontWeight:800,color:"#fff",marginBottom:2}}>{fmt(totalMo)}<span style={{fontSize:14,fontWeight:500,color:"rgba(255,255,255,.5)"}}>/mo</span></div>
          <div style={{fontSize:12,color:"rgba(255,255,255,.4)"}}>{fmt(totalMo*12)}/year</div>
        </div>
        {monthly.map((s,i)=>(<div key={i} style={{background:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:16,padding:"14px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12}}><div style={{width:40,height:40,borderRadius:12,background:PIE_COLORS[i%PIE_COLORS.length]+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🔄</div><div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:C.text}}>{s.name}</div><div style={{fontSize:12,color:C.textLight,marginTop:1}}>{s.interval} · {s.occurrences} times · Last: {s.lastDate}</div></div><div style={{textAlign:"right"}}><div style={{fontFamily:MF,fontWeight:700,fontSize:16,color:C.red}}>{fmt(s.amount)}</div><div style={{fontSize:11,color:C.textLight}}>{s.category}</div></div></div>))}
      </>}
    </div>
  );
}

function ExtraPayModal({debt,onConfirm,onClose}){
  const[amt,setAmt]=useState("");
  const bal=parseFloat(debt?.balance||0);
  const pay=parseFloat(amt)||0;
  const newBal=Math.max(0,bal-pay);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:9999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:C.surface,borderRadius:"24px 24px 0 0",padding:28,width:"100%",maxWidth:480}} onClick={e=>e.stopPropagation()}>
        <div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text,marginBottom:4}}>Extra Payment</div>
        <div style={{fontSize:13,color:C.textLight,marginBottom:18}}>{debt?.name} — current balance {fmt(bal)}</div>
        <div style={{position:"relative",marginBottom:16}}>
          <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontWeight:700,color:C.textMid,fontSize:16}}>$</span>
          <input autoFocus type="number" value={amt} onChange={e=>setAmt(e.target.value)} placeholder="0.00" style={{width:"100%",border:`2px solid ${pay>0?C.green:C.border}`,borderRadius:14,padding:"14px 14px 14px 30px",fontSize:20,fontFamily:MF,fontWeight:700,color:C.text,outline:"none",boxSizing:"border-box",background:C.surface}}/>
        </div>
        {pay>0&&<div style={{background:C.greenBg,border:`1px solid ${C.greenMid}`,borderRadius:12,padding:"11px 14px",marginBottom:16,fontSize:13,color:C.green,fontWeight:500}}>New balance: <strong>{fmt(newBal)}</strong>{newBal===0?" — PAID OFF! 🎉":""}</div>}
        <div style={{display:"flex",gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:"13px",borderRadius:14,border:`1.5px solid ${C.border}`,background:C.surface,color:C.textMid,fontWeight:700,fontSize:16,cursor:"pointer"}}>Cancel</button>
          <button onClick={()=>{if(pay<=0)return;onConfirm(pay);}} disabled={pay<=0} style={{flex:2,padding:"13px",borderRadius:14,border:"none",background:pay>0?C.green:C.border,color:"#fff",fontWeight:800,fontSize:16,cursor:pay>0?"pointer":"default",fontFamily:MF}}>Confirm Payment</button>
        </div>
      </div>
    </div>
  );
}

function AuthScreen({onAuth,onSkip}){
  const[mode,setMode]=useState("login");
  const[email,setEmail]=useState("");const[pass,setPass]=useState("");
  const[err,setErr]=useState("");const[loading,setLoading]=useState(false);
  const[confirmed,setConfirmed]=useState(false);
  const[showPass,setShowPass]=useState(false);
  async function submit(){
    if(!email.trim()||!pass.trim()){setErr("Please fill in all fields.");return;}
    if(mode==="signup"&&pass.length<6){setErr("Password must be at least 6 characters.");return;}
    setLoading(true);setErr("");
    try{
      if(mode==="login"){
        const r=await signIn(email.trim(),pass);
        if(r.error==="network"||r.message?.includes("Failed to fetch")||r.message?.includes("NetworkError")){setErr("Can't reach server — tap 'Continue without account' to use offline mode.");setLoading(false);return;}
        if(r.error_description||r.msg||r.error){
          const msg=(r.error_description||r.msg||r.error||"").toLowerCase();
          if(msg.includes("invalid")||msg.includes("credentials")||msg.includes("password")){setErr("Wrong password. Try again or reset below.");}
          else if(msg.includes("confirm")||msg.includes("email")){setErr("Please confirm your email first — check your inbox.");}
          else if(msg.includes("not found")||msg.includes("user")){setErr("No account found. Sign up first or continue without account.");}
          else{setErr("Sign in failed. Check your email and password.");}
          setLoading(false);return;
        }
        if(!r.access_token){setErr("Sign in failed — try again.");setLoading(false);return;}
        onAuth(r);
      }else{
        const r=await signUp(email.trim(),pass);
        if(r.access_token){onAuth(r);return;}
        if(r.error==="network"||r.message?.includes("Failed to fetch")||r.message?.includes("NetworkError")){setErr("Can't reach server — tap 'Continue without account' to use offline mode.");setLoading(false);return;}
        if(r.error_description||r.msg||r.error){
          const msg=(r.error_description||r.msg||r.error||"").toLowerCase();
          if(msg.includes("already")||msg.includes("registered")||msg.includes("exists")){
            setErr("");
            setMode("login");
            setTimeout(()=>setErr("Account found for that email — enter your password to sign in."),100);
          }else{setErr(r.error_description||r.msg||"Sign up failed. Try again.");}
          setLoading(false);return;
        }
        // No access_token and no error = email confirmation required
        setConfirmed(true);
      }
    }catch(e){setErr("Network error — check connection and try again.");}
    setLoading(false);
  }
  if(confirmed)return(
    <div style={{minHeight:"100vh",background:`linear-gradient(160deg,${C.navy} 0%,${C.navyMid} 50%,${C.accent} 100%)`,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <style>{CSS}</style>
      <div style={{background:"#fff",borderRadius:24,width:"100%",maxWidth:420,padding:"36px 28px",textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
        <div style={{width:72,height:72,borderRadius:"50%",background:C.accentBg,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px"}}><div style={{fontSize:36}}>📧</div></div>
        <div style={{fontFamily:MF,fontSize:22,fontWeight:800,color:C.navy,marginBottom:8}}>Check your inbox</div>
        <div style={{fontSize:14,color:C.textLight,marginBottom:6,lineHeight:1.6}}>We sent a confirmation link to</div>
        <div style={{fontWeight:700,color:C.accent,fontSize:15,marginBottom:20}}>{email}</div>
        <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"12px 16px",fontSize:13,color:C.accent,marginBottom:20,lineHeight:1.5}}>Click the link in the email, then come back here to sign in.</div>
        <button onClick={()=>{setConfirmed(false);setMode("login");setPass("");setErr("");}} style={{width:"100%",padding:"14px",borderRadius:14,border:"none",background:`linear-gradient(135deg,${C.accent},${C.green})`,color:"#fff",fontFamily:MF,fontWeight:800,fontSize:16,cursor:"pointer",marginBottom:12}}>I confirmed — Sign In</button>
        <button onClick={()=>setConfirmed(false)} style={{width:"100%",padding:"12px",borderRadius:14,border:`1px solid ${C.border}`,background:"transparent",color:C.textLight,fontWeight:600,fontSize:14,cursor:"pointer",marginBottom:12}}>← Back</button>
        {onSkip&&<button onClick={onSkip} style={{background:"none",border:"none",color:C.textFaint,fontSize:12,cursor:"pointer"}}>Continue without account →</button>}
      </div>
    </div>
  );
  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(160deg,${C.navy} 0%,${C.accent} 100%)`,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <style>{CSS}</style>
      <div style={{background:"#fff",borderRadius:24,width:"100%",maxWidth:420,padding:"32px 28px",boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontFamily:MF,fontSize:32,fontWeight:900,color:C.navy,marginBottom:6,letterSpacing:-1}}>💰 Trackfi</div>
          <div style={{fontSize:14,color:C.textLight,lineHeight:1.5}}>{mode==="login"?"Welcome back — your data is ready":"Create your free account to get started"}</div>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Email</div>
          <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setErr("");}} placeholder="you@email.com" style={{...iS(false,!!err),fontSize:15}} autoCapitalize="none" autoComplete="email" onKeyDown={e=>e.key==="Enter"&&document.getElementById("pw-input")?.focus()}/>
        </div>
        <div style={{marginBottom:err?8:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5}}>Password</div>
            {mode==="login"&&<button onClick={async()=>{if(!email.trim()){setErr("Enter your email first.");return;}const r=await supaFetch("/auth/v1/recover",{method:"POST",body:JSON.stringify({email:email.trim()})});setErr("Reset link sent to "+email+" — check your inbox.");}} style={{background:"none",border:"none",color:C.accent,fontSize:12,fontWeight:600,cursor:"pointer"}}>Forgot password?</button>}
          </div>
          <div style={{position:"relative"}}>
            <input id="pw-input" type={showPass?"text":"password"} value={pass} onChange={e=>{setPass(e.target.value);setErr("");}} placeholder={mode==="login"?"Your password":"At least 6 characters"} style={{...iS(false,!!err&&err.toLowerCase().includes("password")),fontSize:15,paddingRight:44}} onKeyDown={e=>e.key==="Enter"&&!loading&&submit()}/>
            <button onClick={()=>setShowPass(p=>!p)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:C.textLight,fontSize:13,fontWeight:600}}>{showPass?"Hide":"Show"}</button>
          </div>
        </div>
        {err&&<div style={{background:err.includes("found")||err.includes("sent")?C.accentBg:C.redBg,border:`1px solid ${err.includes("found")||err.includes("sent")?C.accentMid:C.redMid}`,borderRadius:10,padding:"10px 14px",fontSize:13,color:err.includes("found")||err.includes("sent")?C.accent:C.red,marginBottom:14,lineHeight:1.5}}>{err}</div>}
        <button onClick={submit} disabled={loading||!email.trim()||!pass.trim()} style={{width:"100%",padding:"15px",borderRadius:14,border:"none",background:loading||!email.trim()||!pass.trim()?C.borderLight:`linear-gradient(135deg,${C.accent},${C.green})`,color:loading||!email.trim()||!pass.trim()?C.textFaint:"#fff",fontFamily:MF,fontWeight:800,fontSize:16,cursor:loading||!email.trim()||!pass.trim()?"default":"pointer",marginBottom:16,letterSpacing:.2,transition:"all .2s"}}>{loading?"Just a sec...":(mode==="login"?"Sign In →":"Create Account →")}</button>
        <div style={{textAlign:"center",fontSize:13,color:C.textLight,marginBottom:16}}>
          {mode==="login"?"No account yet? ":"Already have an account? "}
          <button onClick={()=>{setMode(mode==="login"?"signup":"login");setErr("");setPass("");}} style={{background:"none",border:"none",color:C.accent,fontWeight:700,cursor:"pointer",fontSize:13}}>{mode==="login"?"Sign up free":"Sign in"}</button>
        </div>
        {onSkip&&<div style={{borderTop:`1px solid ${C.border}`,paddingTop:16}}>
          <button onClick={onSkip} style={{width:"100%",background:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"12px 0",color:C.textMid,fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:6}}>Use without account →</button>
          <div style={{fontSize:11,color:C.textFaint,textAlign:"center"}}>All data saved locally on your device</div>
        </div>}
      </div>
    </div>
  );
}
function RecurringView({expenses,setExpenses,categories,showToast,appReady}){
  const[showAdd,setShowAdd]=useState(false);
  const[form,setForm]=useState({name:"",amount:"",category:"Food",frequency:"Monthly",nextDate:todayStr(),icon:""});
  const[recurrings,setRecurrings]=useState(()=>{try{const r=localStorage.getItem("fv_recurring");return r?JSON.parse(r):[];}catch{return[];}});
  useEffect(()=>{try{localStorage.setItem("fv_recurring",JSON.stringify(recurrings));}catch{}},[recurrings]);
  useEffect(()=>{
    if(!appReady)return;
    const today=todayStr();
    const updated=recurrings.map(r=>{
      if(r.nextDate<=today&&r.active!==false){
        setExpenses(p=>[...p,{id:Date.now()+Math.random(),name:r.name,amount:r.amount,category:r.category,date:today,notes:"Auto-logged"}]);
        if(showToast)showToast("🔄 Auto-logged: "+r.name+" "+r.amount);
        const d=new Date(r.nextDate+"T00:00:00");
        if(r.frequency==="Weekly")d.setDate(d.getDate()+7);
        else if(r.frequency==="Bi-weekly")d.setDate(d.getDate()+14);
        else if(r.frequency==="Monthly")d.setMonth(d.getMonth()+1);
        else if(r.frequency==="Quarterly")d.setMonth(d.getMonth()+3);
        else if(r.frequency==="Annual")d.setFullYear(d.getFullYear()+1);
        return{...r,nextDate:d.toISOString().split("T")[0],lastLogged:today};
      }
      return r;
    });
    setRecurrings(updated);
  },[appReady]);
  const FREQS=["Weekly","Bi-weekly","Monthly","Quarterly","Annual"];
  const ICONS=["🏠","🚗","📱","💪","🎮","📺","☕","🛒","💊","🐕","🎓","⚡","💧","🌐","🎵","🏋️","🍕","✈️","👶","🐱"];
  function add(){if(!form.name||!form.amount)return;setRecurrings(p=>[...p,{id:Date.now(),name:form.name,amount:form.amount,category:form.category,frequency:form.frequency,nextDate:form.nextDate,icon:form.icon||"🔄",active:true}]);setForm({name:"",amount:"",category:"Food",frequency:"Monthly",nextDate:todayStr(),icon:""});if(showToast)showToast("Recurring added — "+form.name);setShowAdd(false);}
  const active=recurrings.filter(r=>r.active!==false);
  const totalMonthly=active.reduce((s,r)=>{const amt=parseFloat(r.amount||0);if(r.frequency==="Weekly")return s+amt*4.33;if(r.frequency==="Bi-weekly")return s+amt*2.17;if(r.frequency==="Monthly")return s+amt;if(r.frequency==="Quarterly")return s+amt/3;if(r.frequency==="Annual")return s+amt/12;return s+amt;},0);
  const dueSoon=recurrings.filter(r=>r.active!==false&&r.nextDate&&Math.ceil((new Date(r.nextDate)-new Date(todayStr()))/86400000)<=7);
  return(
    <div className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div><div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text}}>Recurring Expenses</div><div style={{fontSize:13,color:C.textLight}}>{active.length} active · auto-logged when due</div></div>
        <button onClick={()=>setShowAdd(true)} style={{background:C.accent,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}><Plus size={13}/>Add</button>
      </div>
      <div style={{background:`linear-gradient(135deg,${C.navy},${C.navyLight})`,borderRadius:16,padding:18,marginBottom:14,color:"#fff"}}>
        <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Monthly Recurring Total</div>
        <div style={{fontFamily:MF,fontSize:32,fontWeight:800,color:"#fff"}}>{fmt(totalMonthly)}</div>
        <div style={{display:"flex",gap:8,marginTop:12}}>
          {[["Active",String(active.length),C.greenMid],["Due Soon",String(dueSoon.length),dueSoon.length>0?C.amberMid:C.greenMid],["Annual",fmt(totalMonthly*12),C.accentMid]].map(([l,v,c])=>(<div key={l} style={{flex:1,background:"rgba(255,255,255,.08)",borderRadius:10,padding:"9px 8px"}}><div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:2}}>{l.toUpperCase()}</div><div style={{fontFamily:MF,fontSize:13,fontWeight:700,color:c}}>{v}</div></div>))}
        </div>
      </div>
      
      {active.length>1&&(()=>{const catData=Object.entries(active.reduce((m,r)=>{const k=r.category||"Other";const mo=parseFloat(r.amount||0)*(r.frequency==="Weekly"?4.33:r.frequency==="Bi-weekly"?2.17:r.frequency==="Quarterly"?0.33:r.frequency==="Annual"?0.083:1);m[k]=(m[k]||0)+mo;return m;},{})).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,amt])=>({name,amt}));const mx=catData[0]?.amt||1;return(<div style={{background:C.surface,borderRadius:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"14px 14px 8px",marginBottom:14}}><div style={{fontSize:12,fontWeight:600,color:C.textLight,marginBottom:10}}>Monthly by Category</div>{catData.map(({name,amt})=><div key={name} style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12,color:C.textMid}}>{name}</span><span style={{fontSize:12,fontFamily:MF,fontWeight:700,color:C.red}}>{fmt(amt)}/mo</span></div><div style={{height:5,background:C.borderLight,borderRadius:3}}><div style={{height:5,width:`${(amt/mx*100).toFixed(1)}%`,background:C.accent,borderRadius:3}}/></div></div>)}</div>);})()}{recurrings.length===0&&<Empty text="Add rent, subscriptions, or any regular expense — they log automatically when due." icon={RefreshCw} cta="Add First" onCta={()=>setShowAdd(true)}/>}
      {recurrings.map(r=>{
        const due=r.nextDate?Math.ceil((new Date(r.nextDate)-new Date(todayStr()))/86400000):0;
        const col=due<0?C.red:due<=3?C.red:due<=7?C.amber:C.textLight;
        return(<div key={r.id} style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"14px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12,opacity:r.active===false?.5:1}}>
          <div style={{width:40,height:40,borderRadius:12,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{r.icon||"🔄"}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:600,color:C.text}}>{r.name}</div>
            <div style={{fontSize:12,color:C.textLight,marginTop:2,display:"flex",gap:8,flexWrap:"wrap"}}>
              <span>{r.frequency}</span>
              <span style={{color:col,fontWeight:500}}>{due<0?Math.abs(due)+"d overdue":due===0?"Due today":due===1?"Tomorrow":"In "+due+"d"}</span>
            </div>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontFamily:MF,fontWeight:700,fontSize:16,color:C.text}}>{fmt(r.amount)}</div>
            <button onClick={()=>setRecurrings(p=>p.map(x=>x.id===r.id?{...x,active:x.active===false?true:false}:x))} style={{fontSize:11,color:r.active===false?C.green:C.textLight,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>{r.active===false?"Resume":"Pause"}</button>
          </div>
          <button onClick={()=>{if(window.confirm("Delete recurring expense?"))setRecurrings(p=>p.filter(x=>x.id!==r.id));}} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,display:"flex"}}><Trash2 size={14}/></button>
        </div>);
      })}
      {showAdd&&<Modal title="Add Recurring" icon={RefreshCw} onClose={()=>setShowAdd(false)} onSubmit={add} submitLabel="Add Recurring">
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>{ICONS.map(ic=><button key={ic} onClick={()=>setForm(p=>({...p,icon:ic}))} style={{fontSize:20,background:form.icon===ic?C.accentBg:C.surfaceAlt,border:form.icon===ic?`2px solid ${C.accent}`:"2px solid transparent",borderRadius:8,padding:"4px 6px",cursor:"pointer"}}>{ic}</button>)}</div>
        <FI label="Name" placeholder="Rent, Netflix, Gym..." value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
        <div style={{display:"flex",gap:12}}><FI half label="Amount ($)" type="number" placeholder="0.00" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))}/><FI half label="Next Due Date" type="date" value={form.nextDate} onChange={e=>setForm(p=>({...p,nextDate:e.target.value}))}/></div>
        <FS label="Frequency" options={FREQS} value={form.frequency} onChange={e=>setForm(p=>({...p,frequency:e.target.value}))}/>
        <FS label="Category" options={categories.map(c=>c.name)} value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}/>
      </Modal>}
    </div>
  );
}

function CategoriesView({categories,setCategories,showToast}){
  const[showAdd,setShowAdd]=useState(false);
  const[form,setForm]=useState({name:"",icon:""});
  const[editCat,setEditCat]=useState(null);
  const[editForm,setEditForm]=useState({});
  const EMOJIS=["🍔","🚗","🏠","💊","🎮","✈️","👗","📱","💰","🐶","🎵","⚽","🎓","💅","🍺","🎁","🏋️","🛁","🐱","🌿","🔧","💻","🎨","📚","☕","🍕","🏖️","🎯","💳","🛍️"];
  const DEFAULT_IDS=["food","housing","transport","bills_cat","subs","health","personal","entertainment","savings_cat","misc"];
  function add(){if(!form.name.trim())return;const id="cat_"+Date.now();setCategories(p=>[...p,{id,name:form.name.trim(),icon:form.icon||"📦",color:form.color||C.accent}]);showToast&&showToast("Category added — "+form.name.trim());setForm({name:"",icon:"",color:""});setShowAdd(false);}
  return(
    <div className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div><div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text}}>Categories</div><div style={{fontSize:13,color:C.textLight}}>{categories.length} categories</div></div>
        <button onClick={()=>setShowAdd(true)} style={{background:C.accent,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}><Plus size={13}/>Add</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {categories.map(cat=>{const isDefault=DEFAULT_IDS.includes(cat.id);return(<div key={cat.id} style={{background:C.surface,borderRadius:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}><div style={{width:40,height:40,borderRadius:10,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{cat.icon}</div><div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:C.text}}>{cat.name}</div>{isDefault&&<div style={{fontSize:11,color:C.textFaint}}>Default</div>}</div>{!isDefault&&<><button onClick={()=>{setEditCat(cat);setEditForm({name:cat.name,icon:cat.icon||""});}} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,padding:"4px 6px",fontSize:12,fontWeight:600}}>Edit</button><button onClick={()=>{setCategories(p=>p.filter(c=>c.id!==cat.id));showToast&&showToast("Category removed","error");}} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,display:"flex"}}><Trash2 size={14}/></button></>}</div>);})}
      </div>
      {editCat&&<Modal title="Edit Category" icon={Target} onClose={()=>setEditCat(null)} onSubmit={()=>{setCategories(p=>p.map(c=>c.id===editCat.id?{...c,name:editForm.name||c.name,icon:editForm.icon||c.icon}:c));showToast&&showToast("✓ Category updated");setEditCat(null);}} submitLabel="Save"><div style={{marginBottom:14}}><div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Icon</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{["🍔","🚗","🏠","💊","🎮","✈️","👗","📱","💰","🐶","🎵","⚽","🎓","💅","🍺","🎁","🏋️","🛁","🐱","🌿","🔧","💻","🎨","📚","☕","🍕","🏖️","🎯","💳","🛍️"].map(e=><button key={e} onClick={()=>setEditForm(p=>({...p,icon:e}))} style={{fontSize:20,background:editForm.icon===e?C.accentBg:C.surfaceAlt,border:editForm.icon===e?`2px solid ${C.accent}`:"2px solid transparent",borderRadius:8,padding:"4px 6px",cursor:"pointer"}}>{e}</button>)}</div></div><FI label="Category Name" value={editForm.name||""} onChange={e=>setEditForm(p=>({...p,name:e.target.value}))}/></Modal>}
      {showAdd&&<Modal title="New Category" icon={Target} onClose={()=>setShowAdd(false)} onSubmit={add} submitLabel="Add Category">
        <div style={{marginBottom:14}}><div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Pick an Icon</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{EMOJIS.map(e=><button key={e} onClick={()=>setForm(p=>({...p,icon:e}))} style={{fontSize:20,background:form.icon===e?C.accentBg:C.surfaceAlt,border:form.icon===e?`2px solid ${C.accent}`:"2px solid transparent",borderRadius:8,padding:"4px 6px",cursor:"pointer"}}>{e}</button>)}</div></div>
        <FI label="Category Name" placeholder="Coffee, Travel, Pet..." value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
      </Modal>}
    </div>
  );
}

function AppInner(){
  const[tab,setTabRaw]=useState("home");
  const[tabHistory,setTabHistory]=useState([]);
  function navTo(t){if(t===tab)return;setTabHistory(h=>[...h.slice(-19),tab]);setTabRaw(t);requestAnimationFrame(()=>requestAnimationFrame(()=>{const el=document.getElementById("fv-scroll");if(el)el.scrollTop=0;}));}
  function goBack(){setTabHistory(h=>{if(!h.length)return h;const p=h[h.length-1];setTabRaw(p);requestAnimationFrame(()=>requestAnimationFrame(()=>{const el=document.getElementById("fv-scroll");if(el)el.scrollTop=0;}));return h.slice(0,-1);});}
  const canGoBack=tabHistory.length>0;
  const[authSession,setAuthSession]=useState(null);
  const[authLoading,setAuthLoading]=useState(true);
  const[skipAuth,setSkipAuth]=useState(()=>{try{return localStorage.getItem("fv_skip_auth")==="1";}catch{return false;}});
  const authToken=authSession?.access_token||null;
  useEffect(()=>{const s=JSON.parse(localStorage.getItem("fv_session")||"null");if(!s?.access_token){setAuthLoading(false);return;}supaFetch("/auth/v1/user",{headers:{"Authorization":"Bearer "+s.access_token}}).then(u=>{if(u?.data?.id||u?.id){setAuthSession(s);}else{localStorage.removeItem("fv_session");}setAuthLoading(false);}).catch(()=>setAuthLoading(false));},[]);
  function handleAuth(sess){setAuthSession(sess);localStorage.setItem("fv_session",JSON.stringify(sess));try{const uid=sess?.user?.id?.slice(0,8);if(uid){const scope="fv6_"+uid+":";["accounts","income","expenses","bills","debts","bgoals","sgoals","cats","trades","taccount","settings","calColors","notifs","balHist","shifts","prof","profSub","dashConfig","appName","greetName"].forEach(k=>{const legacy=localStorage.getItem("fv6:"+k);const scoped=localStorage.getItem(scope+k);if(legacy&&!scoped)localStorage.setItem(scope+k,legacy);});}}catch{}}
  function handleSkip(){localStorage.setItem("fv_skip_auth","1");setSkipAuth(true);}
  function handleSignOut(){if(authToken)supaFetch("/auth/v1/logout",{method:"POST"});setAuthSession(null);localStorage.removeItem("fv_session");localStorage.removeItem("fv_skip_auth");setSkipAuth(false);}
  const[ready,setReady]=useState(false);
  const[accounts,setAccounts]=useState({checking:"",savings:"",cushion:"",investments:"",property:"",vehicles:""});
  const[income,setIncome]=useState({primary:"",other:"",trading:"",rental:"",dividends:"",freelance:""});
  const[expenses,setExpenses]=useState([]);
  const[bills,setBills]=useState([]);
  const[debts,setDebts]=useState([]);
  const[budgetGoals,setBGoals]=useState([]);
  const[savingsGoals,setSGoals]=useState([]);
  const[categories,setCats]=useState(DEF_CATS);
  const[trades,setTrades]=useState([]);
  const[tradingAccount,setTradingAccount]=useState({deposit:"",balance:""});
  const[shifts,setShifts]=useState([]);
  const[balHist,setBalHist]=useState([]);
  const[notifs,setNotifs]=useState([]);
  const[calColors,setCalColors]=useState({expense:C.red,bill:C.amber,today:C.accent,dotStyle:"circle"});
  const[settings,setSettings]=useState({showTrading:true,showCrypto:false,showHealth:true,showSavings:true,showForecast:true,quickActions:["expense","receipt","bill","debt","simulator","budget"]});
  const[dashConfig,setDashConfig]=useState({showIncomeChart:true,showMetrics:true,showAccounts:true,showBills:true,showDebts:true,showGoals:true});
  const[appName,setAppName]=useState("Trackfi");
  const[greetName,setGreetName]=useState("");
  const[profCategory,setProfCategory]=useState("healthcare");
  const[profSub,setProfSub]=useState("nurse_rn");
  const[darkMode,setDarkMode]=useState(()=>{try{return localStorage.getItem("fv_dark")==="1";}catch{return false;}});
  const[hidden,setHidden]=useState(false);
  const[heroIdx,setHeroIdx]=useState(0);
  const[pinEnabled,setPinEnabled]=useState(()=>{try{return!!localStorage.getItem("fv_pin_hash");}catch{return false;}});
  const[locked,setLocked]=useState(()=>{try{return!!localStorage.getItem("fv_pin_hash");}catch{return false;}});
  const[onboarded,setOnboarded]=useState(()=>{try{return localStorage.getItem("fv_onboarded")==="1";}catch{return false;}});
  const[modal,setModal]=useState(null);
  const[form,setForm]=useState({});
  const[editItem,setEditItem]=useState(null);
  const[confirm,setConfirm]=useState(null);
  const[syncing,setSyncing]=useState(false);
  const[syncStatus,setSyncStatus]=useState(null);
  const[toast,setToast]=useState(null);
  const showToast=(msg,type='success')=>{setToast({msg,type});setTimeout(()=>setToast(null),2500);};

  const[isDemoMode,setIsDemoMode]=useState(()=>{try{return localStorage.getItem("fv_demo")==="1";}catch{return false;}});

  useEffect(()=>{
    (async()=>{
      try{
        const keys=["fv6:accounts","fv6:income","fv6:expenses","fv6:bills","fv6:debts","fv6:bgoals","fv6:sgoals","fv6:cats","fv6:trades","fv6:taccount","fv6:settings","fv6:calColors","fv6:notifs","fv6:balHist","fv6:shifts","fv6:prof","fv6:profSub","fv6:dashConfig","fv6:appName","fv6:greetName","fv6:merchantCats"];
        const vals=await Promise.all(keys.map(k=>sg(k)));
        const[ac,inc,exp,bll,dbt,bg,sg2,cats,tr,ta,sett,cc,nts,bh,sh,prof,psub,dc,an,gn,mc]=vals;
        try{if(exp&&exp.length)setExpenses(exp);}catch{}
        try{if(bll&&bll.length)setBills(bll);}catch{}
        try{if(dbt&&dbt.length)setDebts(dbt);}catch{}
        try{if(bg&&bg.length)setBGoals(bg);}catch{}
        try{if(sg2&&sg2.length)setSGoals(sg2);}catch{}
        try{if(cats&&cats.length)setCats(cats);}catch{}
        try{if(tr&&tr.length)setTrades(tr);}catch{}
        try{if(ta)setTradingAccount(ta);}catch{}
        try{if(ac)setAccounts(a=>({...a,...ac}));}catch{}
        try{if(inc)setIncome(a=>({primary:"",other:"",trading:"",rental:"",dividends:"",freelance:"",...a,...inc}));}catch{}
        try{if(sett)setSettings(a=>({...a,...sett}));}catch{}
        try{if(cc)setCalColors(a=>({...a,...cc}));}catch{}
        try{if(nts&&nts.length)setNotifs(nts);}catch{}
        try{if(bh&&bh.length)setBalHist(bh);}catch{}
        try{if(sh&&sh.length)setShifts(sh);}catch{}
        try{if(prof)setProfCategory(prof);}catch{}
        try{if(psub)setProfSub(psub);}catch{}
        try{if(dc)setDashConfig(a=>({...a,...dc}));}catch{}
        try{if(an)setAppName(an);}catch{}
        try{if(gn)setGreetName(gn);}catch{}
        try{if(mc)window._merchantCats=mc;}catch{}
      }catch(e){console.error("Load error",e);}
      setReady(true);
    })();
  },[]);

  useEffect(()=>{if(!ready)return;ss("fv6:accounts",accounts);const tod=todayStr();setBalHist(prev=>{const last=prev[prev.length-1];if(last?.date===tod)return prev;const ds=last?Math.floor((new Date(tod)-new Date(last.date+"T00:00:00"))/86400000):999;if(ds<6)return prev;return[...prev,{date:tod,checking:parseFloat(accounts.checking||0),savings:parseFloat(accounts.savings||0),cushion:parseFloat(accounts.cushion||0),investments:parseFloat(accounts.investments||0),total:parseFloat(accounts.checking||0)+parseFloat(accounts.savings||0)+parseFloat(accounts.cushion||0)+parseFloat(accounts.investments||0)}].slice(-104);});},[accounts,ready]);
  useEffect(()=>{if(ready)ss("fv6:income",income);},[income,ready]);
  useEffect(()=>{if(ready)ss("fv6:expenses",expenses);},[expenses,ready]);
  useEffect(()=>{if(ready)ss("fv6:bills",bills);},[bills,ready]);
  useEffect(()=>{if(ready)ss("fv6:debts",debts);},[debts,ready]);
  useEffect(()=>{if(ready)ss("fv6:bgoals",budgetGoals);},[budgetGoals,ready]);
  useEffect(()=>{if(ready)ss("fv6:sgoals",savingsGoals);},[savingsGoals,ready]);
  useEffect(()=>{if(ready)ss("fv6:cats",categories);},[categories,ready]);
  useEffect(()=>{if(ready)ss("fv6:trades",trades);},[trades,ready]);
  useEffect(()=>{if(ready)ss("fv6:notifs",notifs);},[notifs,ready]);
  useEffect(()=>{if(ready)ss("fv6:balHist",balHist);},[balHist,ready]);
  useEffect(()=>{if(ready)ss("fv6:shifts",shifts);},[shifts,ready]);
  useEffect(()=>{if(ready)ss("fv6:prof",profCategory);},[profCategory,ready]);
  useEffect(()=>{if(ready)ss("fv6:profSub",profSub);},[profSub,ready]);
  useEffect(()=>{if(ready)ss("fv6:dashConfig",dashConfig);},[dashConfig,ready]);
  useEffect(()=>{if(ready)ss("fv6:appName",appName);},[appName,ready]);
  useEffect(()=>{if(ready)ss("fv6:greetName",greetName);},[greetName,ready]);
  useEffect(()=>{if(ready)ss("fv6:settings",settings);},[settings,ready]);
  useEffect(()=>{if(ready)ss("fv6:calColors",calColors);},[calColors,ready]);
  useEffect(()=>{if(ready)ss("fv6:taccount",tradingAccount);},[tradingAccount,ready]);
  useEffect(()=>{try{localStorage.setItem("fv_dark",darkMode?"1":"0");}catch{}},[darkMode]);

  const totalIncome=useMemo(()=>(parseFloat(income.primary||0))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0)),[income]);
  const totalAssets=useMemo(()=>(parseFloat(accounts.checking||0))+(parseFloat(accounts.savings||0))+(parseFloat(accounts.cushion||0))+(parseFloat(accounts.investments||0))+(parseFloat(accounts.property||0))+(parseFloat(accounts.vehicles||0)),[accounts]);
  const totalExp=useMemo(()=>expenses.reduce((s,e)=>s+(parseFloat(e.amount)||0),0),[expenses]);
  const totalDebt=useMemo(()=>debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0),[debts]);
  const cashflow=totalIncome-totalExp;
  const netWorth=totalAssets-totalDebt;
  const overdue=useMemo(()=>bills.filter(b=>!b.paid&&dueIn(b.dueDate)<0),[bills]);
  const dueSoon=useMemo(()=>bills.filter(b=>!b.paid&&dueIn(b.dueDate)>=0&&dueIn(b.dueDate)<=7),[bills]);
  const billsSoonAmt=useMemo(()=>dueSoon.reduce((s,b)=>s+(parseFloat(b.amount)||0),0),[dueSoon]);
  const burnRate=dayOfMonth()>0?totalExp/dayOfMonth():0;
  const projected=burnRate*daysInMonth();
  const sts=Math.max(0,(parseFloat(accounts.checking||0))-billsSoonAmt-200);
  const liquid=(parseFloat(accounts.savings||0))+(parseFloat(accounts.cushion||0));
  const savingsRate=totalIncome>0?Math.max(0,cashflow/totalIncome*100):0;
  const spendingStreak=useMemo(()=>{
    if(expenses.length<3)return 0;
    const dailyAvgBase=burnRate||50;
    let streak=0;
    const today2=new Date();
    for(let i=0;i<30;i++){
      const d=new Date(today2);d.setDate(d.getDate()-i);
      const ds=d.toISOString().split("T")[0];
      const dayTotal=expenses.filter(e=>e.date===ds).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
      if(i===0&&dayTotal===0){continue;}
      if(dayTotal<dailyAvgBase){streak++;}else{break;}
    }
    return streak;
  },[expenses,burnRate]);
  const unreadNotifs=useMemo(()=>notifs.filter(n=>!n.read).length,[notifs]);
  const pushNotif=(id,title,body,type)=>setNotifs(p=>{if(p.find(n=>n.id===id))return p;return[{id,title,body,type,time:Date.now(),read:false},...p.slice(0,49)];});
  useEffect(()=>{
    if(!ready)return;
    bills.forEach(b=>{if(b.paid)return;const d=dueIn(b.dueDate);if(d<0)pushNotif('ov_'+b.id,'🚨 Overdue: '+b.name,fmt(b.amount)+' was due '+Math.abs(d)+'d ago','danger');else if(d<=3)pushNotif('due3_'+b.id,'⚠️ Due soon: '+b.name,fmt(b.amount)+' due in '+d+' day'+(d!==1?'s':''),'warning');});
    const _now=new Date();const _ms=_now.getFullYear()+'-'+String(_now.getMonth()+1).padStart(2,'0');
    budgetGoals.forEach(g=>{const spent=expenses.filter(e=>e.category===g.category&&e.date?.startsWith(_ms)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);const pct=parseFloat(g.limit)>0?(spent/parseFloat(g.limit)*100):0;if(pct>=100)pushNotif('bud_over_'+g.id,'🔴 Over budget: '+g.category,'Spent '+fmt(spent)+' of '+fmt(g.limit),'danger');else if(pct>=80)pushNotif('bud_warn_'+g.id,'🟡 '+Math.round(pct)+'% used: '+g.category,fmt(Math.max(0,parseFloat(g.limit)-spent))+' remaining','warning');});
    savingsGoals.forEach(g=>{const pct=parseFloat(g.target||1)>0?(parseFloat(g.saved||0)/parseFloat(g.target))*100:0;if(pct>=100)pushNotif('goal_done_'+g.id,'🎉 Goal complete: '+g.name,'You hit your '+fmt(g.target)+' target!','success');else if(pct>=75)pushNotif('goal_75_'+g.id,'🎯 75% reached: '+g.name,fmt(Math.max(0,parseFloat(g.target)-parseFloat(g.saved||0)))+' left to go','info');});
  },[ready,bills,budgetGoals,expenses]);
  const detectedSubs=useMemo(()=>{
    if(expenses.length<2)return[];
    const nameMap={};
    expenses.forEach(e=>{const key=e.name?.toLowerCase().trim();if(!key)return;if(!nameMap[key])nameMap[key]=[];nameMap[key].push(e);});
    const subs=[];
    Object.entries(nameMap).forEach(([name,exps])=>{
      if(exps.length<2)return;
      const sorted=[...exps].sort((a,b)=>a.date?.localeCompare(b.date));
      const amounts=exps.map(e=>parseFloat(e.amount)||0);
      const avgAmt=amounts.reduce((s,a)=>s+a,0)/amounts.length;
      if(!amounts.every(a=>Math.abs(a-avgAmt)<avgAmt*0.1))return;
      const gaps=[];
      for(let i=1;i<sorted.length;i++){gaps.push(Math.round((new Date(sorted[i].date+"T00:00:00")-new Date(sorted[i-1].date+"T00:00:00"))/(1000*60*60*24)));}
      const avgGap=gaps.reduce((s,g)=>s+g,0)/gaps.length;
      let interval=null;
      if(avgGap>=25&&avgGap<=35){interval="Monthly";}else if(avgGap>=6&&avgGap<=8){interval="Weekly";}else if(avgGap>=350&&avgGap<=380){interval="Annual";}
      if(!interval)return;
      subs.push({name:exps[0].name,amount:avgAmt.toFixed(2),interval,occurrences:exps.length,lastDate:sorted[sorted.length-1].date,category:exps[0].category});
    });
    return subs.sort((a,b)=>parseFloat(b.amount)-parseFloat(a.amount));
  },[expenses]);

  const om=(t,d={})=>{setModal(t);setForm(d);};
  const cl=()=>{setModal(null);setForm({});};
  const ff=(k,v)=>setForm(p=>({...p,[k]:v}));

  // ── THE FIX: submit function ──────────────────────────────────────────────
  function submit(){
    if(modal==="expense"){
      if(!form.name||!form.amount)return;
      const amt=parseFloat(form.amount)||0;
      if(amt<=0){showToast("Enter a valid amount","error");return;}
      const now60=Date.now()-60000;
      const isDupe=expenses.some(e=>e.name?.toLowerCase()===form.name.toLowerCase()&&parseFloat(e.amount)===amt&&e.id>now60);
      if(isDupe&&!form.forceAdd){ff("forceAdd",true);showToast("Already logged — tap again to add anyway","error");return;}
      setExpenses(p=>[...p,{id:Date.now(),name:form.name,amount:String(amt),category:form.category||"Misc",date:form.date||todayStr(),notes:form.notes||"",tags:[]}]);try{const mc=window._merchantCats||{};mc[form.name.toLowerCase().trim()]=form.category||"Misc";window._merchantCats=mc;ss("fv6:merchantCats",mc);}catch{}
      showToast("✓ "+form.name+" — "+fmt(amt));
      cl();
    }else if(modal==="bill"){
      if(!form.name||!form.amount)return;
      const billAmt=parseFloat(form.amount)||0;
      if(billAmt<=0){showToast("Enter a valid amount","error");return;}
      setBills(p=>[...p,{id:Date.now(),name:form.name,amount:String(billAmt),dueDate:form.dueDate||"",recurring:form.recurring||"Monthly",paid:false,autoPay:false}]);
      showToast("✓ "+form.name+" bill added");
      cl();
    }else if(modal==="debt"){
      if(!form.name||!form.balance)return;
      setDebts(p=>[...p,{id:Date.now(),name:form.name,balance:form.balance,original:form.original||form.balance,rate:form.rate||"",minPayment:form.minPayment||"",type:form.type||""}]);
      showToast("✓ "+form.name+" tracked — "+fmt(form.balance));
      cl();
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const today=todayStr();
  const unread=unreadNotifs;
  const GROUPS=[
    {key:"daily",label:"Daily Drivers",desc:"Most-used",items:[{id:"accounts",icon:Wallet,label:"Accounts & Income"},{id:"recurring",icon:RefreshCw,label:"Recurring Expenses"},{id:"calendar",icon:Calendar,label:"Calendar"},{id:"paycheck",icon:DollarSign,label:"Paycheck Planner"},{id:"chat",icon:MessageCircle,label:"AI Assistant"}]},
    {key:"work",label:"Work & Income",desc:"Shifts and trading",items:[{id:"shifts",icon:Clock,label:"Shift Tracker"},...(settings.showTrading?[{id:"trading",icon:TrendingUp,label:"Trading"}]:[]),{id:"cashflow",icon:BarChart2,label:"Income vs Spending"}]},
    {key:"reports",label:"Reports",desc:"History and analysis",items:[{id:"statement",icon:FileText,label:"Monthly Statement"},{id:"tax",icon:FileText,label:"Tax Summary"},{id:"trend",icon:TrendingUp,label:"Balance Trend"},{id:"networthtrend",icon:TrendingUp,label:"Net Worth Trend"},{id:"physical",icon:Activity,label:"Financial Physical"}]},
    {key:"tools",label:"Tools",desc:"Search, settings, help",items:[{id:"search",icon:Search,label:"Search"},{id:"notifs",icon:Bell,label:"Notifications"},{id:"subscriptions",icon:RefreshCw,label:"Subscriptions"},{id:"insights",icon:Zap,label:"Spending Insights"},{id:"health",icon:Activity,label:"Health Score"},{id:"categories",icon:Filter,label:"Categories"},{id:"settings",icon:Settings,label:"Settings"}]},
  ];
  const allTabIds=GROUPS.flatMap(g=>g.items.map(i=>i.id));
  const isMoreTab=allTabIds.includes(tab);
  const NAV=[
    {id:"home",icon:LayoutDashboard,label:"Home"},
    {id:"spend",icon:Wallet,label:"Spending"},
    {id:"bills",icon:CalendarClock,label:"Bills"},
    {id:"debt",icon:CreditCard,label:"Debt"},
    {id:"savings",icon:Target,label:"Goals"},
    {id:"more",icon:Menu,label:"More",badge:unread>0?unread:null},
  ];

  async function loadDemo(){
    const d=generateDemoData();
    setAccounts({checking:"4280",savings:"9400",cushion:"1000",investments:"14200",property:"0",vehicles:"12000"});
    setIncome({primary:"4200",other:"300",trading:"",rental:"",dividends:"",freelance:"500"});
    setExpenses(d.expenses);setBills(d.bills);setDebts(d.debts);setSGoals(d.savingsGoals);
    setBGoals(d.budgetGoals);setTrades(d.trades);setShifts(d.shifts);setBalHist(d.balHist);
    setAppName("Victor");setProfCategory("healthcare");setProfSub("nurse_rn");
    setTradingAccount({deposit:"5000",balance:"5200"});
    setSettings(p=>({...p,showTrading:true,showHealth:true,showSavings:true}));
    try{localStorage.setItem("fv_onboarded","1");localStorage.setItem("fv_demo","1");}catch{}
    setIsDemoMode(true);setOnboarded(true);
  }
  useEffect(()=>{window._loadDemo=loadDemo;return()=>{delete window._loadDemo;};},[]);

  async function exitDemo(){
    setExpenses([]);setBills([]);setDebts([]);setTrades([]);setShifts([]);
    setSGoals([]);setBGoals([]);setBalHist([]);setNotifs([]);
    setAccounts({checking:"",savings:"",cushion:"",investments:"",property:"",vehicles:""});
    setIncome({primary:"",other:"",trading:"",rental:"",dividends:"",freelance:""});
    setTradingAccount({deposit:"",balance:""});setAppName("Trackfi");
    setIsDemoMode(false);try{localStorage.removeItem("fv_demo");}catch{}
    navTo("home");
  }

  if(authLoading)return(<div style={{minHeight:"100vh",background:C.navy,display:"flex",alignItems:"center",justifyContent:"center"}}><style>{CSS}</style><div style={{textAlign:"center"}}><div style={{fontFamily:MF,fontSize:28,fontWeight:900,color:"#fff",marginBottom:8}}>💰 Trackfi</div><div style={{fontSize:13,color:"rgba(255,255,255,.5)"}}>Loading...</div></div></div>);
  if(!authSession&&!skipAuth)return <AuthScreen onAuth={handleAuth} onSkip={handleSkip}/>;
  if(!ready)return(<div style={{minHeight:"100vh",background:`linear-gradient(160deg,${C.navy} 0%,${C.navyMid} 100%)`,display:"flex",alignItems:"center",justifyContent:"center"}}><style>{CSS}</style><div style={{textAlign:"center"}}><div style={{fontFamily:MF,fontSize:28,fontWeight:900,color:"#fff",marginBottom:20}}>💰 Trackfi</div><div style={{width:36,height:36,border:"3px solid rgba(255,255,255,.2)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 14px"}}/><div style={{fontSize:13,color:"rgba(255,255,255,.5)"}}>Loading your data...</div></div></div>);
  if(!onboarded)return(<><style>{CSS}</style><OnboardingWizard onComplete={async d=>{
    if(d.name)setGreetName(d.name);
    setAppName("Trackfi");
    if(d.profCategory)setProfCategory(d.profCategory);if(d.profSub)setProfSub(d.profSub);
    if(d.income)setIncome(d.income);if(d.accounts)setAccounts({...d.accounts});
    if(d.goalName&&d.goalTarget){setSGoals(p=>[...p,{id:Date.now().toString(),name:d.goalName,target:parseFloat(d.goalTarget),saved:0,monthly:0,icon:"🎯",color:C.accent}]);}
    if(d.bills&&d.bills.length){const validBills=d.bills.filter(b=>b.name&&b.amount);if(validBills.length){setBills(p=>[...p,...validBills.map(b=>({id:Date.now()+Math.random(),name:b.name,amount:String(parseFloat(b.amount)||0),dueDate:"",recurring:"Monthly",paid:false,autoPay:false}))]);}}
    const hasTrading=parseFloat(d.income?.trading||0)>0;
    setSettings(p=>({...p,showTrading:hasTrading,showHealth:true,showSavings:true,showForecast:true}));
    try{localStorage.setItem("fv_onboarded","1");}catch{}
    setOnboarded(true);
  }}/></>);
  if(locked&&pinEnabled)return(<><style>{CSS}</style><PINLock onUnlock={()=>setLocked(false)} appName={appName} darkMode={darkMode}/></>);

  return(
    <div style={{minHeight:"100vh",background:darkMode?C.navy:C.bg,fontFamily:IF,display:"flex",flexDirection:"column",maxWidth:640,margin:"0 auto",minHeight:"100vh",position:"relative"}}>
      <style>{CSS}</style>
      <div id="fv-scroll" style={{flex:1,overflowY:"auto",padding:"16px 16px 110px"}}>
        {["spend","home"].includes(tab)&&<button className="ba" onClick={()=>om("expense")} style={{position:"fixed",right:16,bottom:90,width:52,height:52,borderRadius:"50%",background:`linear-gradient(135deg,${C.accent},${C.purple})`,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 20px ${C.accent}50,0 2px 8px rgba(10,22,40,.15)`,zIndex:50,transition:"transform .2s,box-shadow .2s"}}><Plus size={22} color="#fff"/></button>}
        {canGoBack&&tab!=="home"&&<div style={{marginBottom:12}}><button className="ba" onClick={goBack} style={{display:"flex",alignItems:"center",gap:5,background:"transparent",border:"none",cursor:"pointer",color:C.accent,fontWeight:700,fontSize:16,padding:"4px 0"}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>Back</button></div>}

        {tab==="home"&&(
          <div className="fu">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div>
                <div style={{fontFamily:MF,fontSize:22,fontWeight:800,color:C.text}}>
                  {new Date().getHours()<12?"Good morning":new Date().getHours()<17?"Good afternoon":"Good evening"} {greetName||"there"} {getProfession(profCategory).icon}
                </div>
                <div style={{fontSize:13,color:C.textLight,marginTop:2}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button className="ba" onClick={()=>navTo("dashsettings")} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 10px",cursor:"pointer",display:"flex",color:C.textLight}}><Filter size={16}/></button>
                <button className="ba" onClick={()=>setDarkMode(d=>!d)} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 10px",cursor:"pointer",display:"flex",color:C.textMid}}>{darkMode?<Sun size={16}/>:<Moon size={16}/>}</button>
                <button className="ba" onClick={()=>setHidden(h=>!h)} style={{background:hidden?C.accentBg:C.bg,border:`1px solid ${hidden?C.accentMid:C.border}`,borderRadius:10,padding:"8px 10px",cursor:"pointer",display:"flex",alignItems:"center",color:hidden?C.accent:C.textMid}}>{hidden?<EyeOff size={16}/>:<Eye size={16}/>}</button>
              </div>
            </div>

            {isDemoMode&&expenses.length>0&&<div style={{background:`linear-gradient(135deg,${C.amber},#d97706)`,borderRadius:14,padding:"12px 16px",marginBottom:12,display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:18}}>🧪</span>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"#fff"}}>Demo Mode</div><div style={{fontSize:11,color:"rgba(255,255,255,.8)"}}>Viewing sample data</div></div>
              <button onClick={()=>setConfirm({title:"Exit Demo",message:"This will clear all demo data.",onConfirm:()=>{exitDemo();setConfirm(null);},danger:false})} style={{background:"rgba(255,255,255,.25)",border:"none",borderRadius:8,padding:"7px 12px",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}}>Exit</button>
            </div>}

            {sts>0&&expenses.length>0&&<div style={{background:`linear-gradient(135deg,${sts>500?C.green:sts>0?C.amber:C.red},${sts>500?"#059669":sts>0?"#b45309":C.red}cc)`,borderRadius:16,padding:"14px 18px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}} onClick={()=>navTo("paycheck")}><div><div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.7)",textTransform:"uppercase",letterSpacing:.5,marginBottom:2}}>Safe to Spend</div><div className={hidden?"blurred":"unblurred"} style={{fontFamily:MF,fontSize:28,fontWeight:800,color:"#fff",lineHeight:1}}>{fmt(sts)}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:12,color:"rgba(255,255,255,.7)"}}>after bills</div><ChevronRight size={16} color="rgba(255,255,255,.7)"/></div></div>}
      {overdue.length>0&&<div onClick={()=>navTo("bills")} style={{background:C.redBg,border:`1px solid ${C.redMid}`,borderRadius:14,padding:"12px 16px",marginBottom:12,display:"flex",gap:10,alignItems:"center",cursor:"pointer"}}><AlertCircle size={16} color={C.red} style={{flexShrink:0}}/><div style={{flex:1,fontSize:13,color:C.red,fontWeight:600}}>{overdue.length} bill{overdue.length!==1?"s":""} overdue — tap to resolve</div><ChevronRight size={14} color={C.red}/></div>}
            {!overdue.length&&dueSoon.length>0&&<div onClick={()=>navTo("bills")} style={{background:C.amberBg,border:`1px solid ${C.amberMid}`,borderRadius:14,padding:"12px 16px",marginBottom:12,display:"flex",gap:10,alignItems:"center",cursor:"pointer"}}><AlertCircle size={16} color={C.amber} style={{flexShrink:0}}/><div style={{flex:1,fontSize:13,color:C.amber,fontWeight:600}}>{dueSoon.length} bill{dueSoon.length!==1?"s":""} due within 7 days</div><ChevronRight size={14} color={C.amber}/></div>}

            {(()=>{
              const cards=[
                {label:"Safe to Spend",sub:"Tap for paycheck breakdown",val:fmt(sts),color:sts>500?C.green:sts>0?C.amber:C.red,tab:"paycheck",stats:[["Income",fmt(totalIncome),C.green],["Spent",fmt(totalExp),C.red],["Left",fmt(Math.max(0,totalIncome-totalExp)),cashflow>=0?C.green:C.red]]},
                {label:"Net Worth",sub:"Tap to see wealth over time",val:fmt(totalAssets-totalDebt),color:totalAssets-totalDebt>=0?C.green:C.red,tab:"networthtrend",spark:balHist.slice(-8).map((h,i)=>({i,v:Object.values(h.accounts||{}).reduce((s,v)=>s+(parseFloat(v)||0),0)})),stats:[["Assets",fmt(totalAssets),C.green],["Debt",fmt(totalDebt),C.red],["Trend",totalAssets-totalDebt>=0?"Positive":"Negative",totalAssets-totalDebt>=0?C.green:C.red]]},
                {label:"Monthly Cashflow",sub:"Tap to see income vs spending",val:(cashflow>=0?"+":"")+fmt(cashflow),color:cashflow>=0?C.green:C.red,tab:"cashflow",stats:[["Income",fmt(totalIncome),C.green],["Spent",fmt(totalExp),C.red],["Saved",savingsRate.toFixed(1)+"%",savingsRate>=15?C.green:savingsRate>=5?C.amber:C.red]]},
                {label:"Debt Overview",sub:"Tap to see payoff plan",val:fmt(totalDebt),color:totalDebt===0?C.green:C.red,tab:"debt",stats:[["Accounts",String(debts.length),C.textFaint],["Min/mo",fmt(debts.reduce((s,d)=>s+(parseFloat(d.minPayment)||0),0)),C.red],["DTI",((debts.reduce((s,d)=>s+(parseFloat(d.minPayment)||0),0)/Math.max(1,totalIncome))*100).toFixed(1)+"%",C.textFaint]]},
                {label:"Savings Progress",sub:savingsGoals.length?"Tap to track goals":"Add your first goal",val:savingsGoals.length?Math.round((parseFloat(savingsGoals[0].saved||0)/parseFloat(savingsGoals[0].target||1))*100)+"%":"--",color:C.green,tab:"savings",stats:savingsGoals.length?[["Saved",fmt(savingsGoals[0].saved||0),C.green],["Target",fmt(savingsGoals[0].target||0),C.textFaint],["Goals",String(savingsGoals.length),C.textFaint]]:[["Tap","to add",C.textFaint],["your","first",C.textFaint],["goal","→",C.textFaint]]},
                {label:"Bills This Month",sub:"Tap to manage bills",val:fmt(bills.reduce((s,b)=>s+(parseFloat(b.amount)||0),0)),color:bills.filter(b=>!b.paid&&dueIn(b.dueDate)<0).length>0?C.red:C.amber,tab:"bills",stats:[["Unpaid",String(bills.filter(b=>!b.paid).length),C.red],["Paid",String(bills.filter(b=>b.paid).length),C.green],["Overdue",String(bills.filter(b=>!b.paid&&dueIn(b.dueDate)<0).length),bills.filter(b=>!b.paid&&dueIn(b.dueDate)<0).length>0?C.red:C.textFaint]]},
              ];
              const card=cards[heroIdx];
              const goNext=()=>setHeroIdx(i=>(i+1)%cards.length);
              const goPrev=()=>setHeroIdx(i=>(i-1+cards.length)%cards.length);
              return(
                <div style={{marginBottom:14}}>
                  <div style={{position:"relative"}}>
                    <div style={{background:`linear-gradient(135deg,${C.navy} 0%,${C.navyLight} 60%,${C.accent} 100%)`,borderRadius:22,padding:"22px 20px",cursor:"pointer"}}
                      onTouchStart={e=>{window._hts=e.touches[0].clientX;window._htsy=e.touches[0].clientY;}}
                      onTouchEnd={e=>{const dx=window._hts-(e.changedTouches[0].clientX||0);const dy=Math.abs((window._htsy||0)-e.changedTouches[0].clientY);if(dy>30)return;if(dx>40)goNext();else if(dx<-40)goPrev();}}
                      onClick={()=>navTo(card.tab)}>
                      <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{card.label}</div>
                      <div className={hidden?"blurred":"unblurred"} style={{fontFamily:MF,fontSize:46,fontWeight:800,color:card.color,lineHeight:1,marginBottom:4}}>{card.val}</div>
                      <div style={{fontSize:12,color:"rgba(255,255,255,.4)",marginBottom:16}}>{card.sub}</div>
                      <div style={{display:"flex",gap:6}}>{card.stats.map(([l,v,c])=><div key={l} style={{flex:1,background:"rgba(255,255,255,.08)",borderRadius:12,padding:"10px 8px"}}><div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:3}}>{l}</div><div className={hidden?"blurred":"unblurred"} style={{fontFamily:MF,fontSize:13,fontWeight:800,color:c}}>{v}</div></div>)}</div>
                    </div>
                    <button onClick={e=>{e.stopPropagation();goPrev();}} style={{position:"absolute",left:-10,top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,.15)",border:"none",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#fff"}}>‹</button>
                    <button onClick={e=>{e.stopPropagation();goNext();}} style={{position:"absolute",right:-10,top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,.15)",border:"none",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#fff"}}>›</button>
                  </div>
                  <div style={{display:"flex",justifyContent:"center",gap:6,marginTop:10}}>
                    {cards.map((_,i)=><div key={i} onClick={()=>setHeroIdx(i)} style={{width:i===heroIdx?20:6,height:6,borderRadius:99,background:i===heroIdx?C.accent:C.border,transition:"all .3s ease",cursor:"pointer"}}/>)}
                  </div>
                </div>
              );
            })()}

            {(()=>{
              const todayStr2=new Date().toISOString().split('T')[0];
              const todayExp=expenses.filter(e=>e.date===todayStr2);
              const todayTotal=todayExp.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
              const todayBills=bills.filter(b=>!b.paid&&b.dueDate===todayStr2);
              const overdueBills=bills.filter(b=>!b.paid&&dueIn(b.dueDate)<0);
              const ms3=new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0');
              const mtdSpend=expenses.filter(e=>e.date?.startsWith(ms3)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
              const dayOfMo=new Date().getDate();
              const dailyAvg=dayOfMo>0?(mtdSpend/dayOfMo):0;
              const daysLeft=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate()-dayOfMo;
              const forecast=mtdSpend+(dailyAvg*daysLeft);
              if(todayTotal===0&&todayBills.length===0&&overdueBills.length===0)return null;
              return(<div style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:'14px 16px',marginBottom:14}}>
                <div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.text,marginBottom:10}}>Today</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                  <div style={{textAlign:'center'}}><div style={{fontSize:10,color:C.textLight,fontWeight:600,marginBottom:3}}>SPENT</div><div className={hidden?'blurred':'unblurred'} style={{fontFamily:MF,fontWeight:800,fontSize:16,color:todayTotal>0?C.red:C.textLight}}>{todayTotal>0?fmt(todayTotal):'$0'}</div></div>
                  <div style={{textAlign:'center'}}><div style={{fontSize:10,color:C.textLight,fontWeight:600,marginBottom:3}}>DAILY AVG</div><div className={hidden?'blurred':'unblurred'} style={{fontFamily:MF,fontWeight:800,fontSize:16,color:C.textMid}}>{fmt(dailyAvg)}</div></div>
                  <div style={{textAlign:'center'}}><div style={{fontSize:10,color:C.textLight,fontWeight:600,marginBottom:3}}>FORECAST</div><div className={hidden?'blurred':'unblurred'} style={{fontFamily:MF,fontWeight:800,fontSize:16,color:forecast>totalIncome?C.red:C.amber}}>{fmt(forecast)}</div></div>{spendingStreak>1&&<div style={{textAlign:'center'}}><div style={{fontSize:10,color:C.textLight,fontWeight:600,marginBottom:3}}>STREAK</div><div style={{fontFamily:MF,fontWeight:800,fontSize:16,color:C.green}}>🔥{spendingStreak}d</div></div>}
                </div>
                {(todayBills.length>0||overdueBills.length>0)&&<div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${C.border}`}}>
                  {overdueBills.length>0&&<div style={{fontSize:12,color:C.red,fontWeight:600}}>⚠ {overdueBills.length} overdue bill{overdueBills.length!==1?'s':''} — <span onClick={()=>navTo('bills')} style={{cursor:'pointer',textDecoration:'underline'}}>pay now</span></div>}
                  {todayBills.map(b=><div key={b.id} style={{fontSize:12,color:C.amber,fontWeight:600}}>📅 {b.name} {fmt(b.amount)} due today</div>)}
                </div>}
              </div>);
            })()}

            {expenses.length>0&&(()=>{
              const now2=new Date();
              const thisMs=now2.getFullYear()+"-"+String(now2.getMonth()+1).padStart(2,"0");
              const lastMs=new Date(now2.getFullYear(),now2.getMonth()-1,1).getFullYear()+"-"+String(new Date(now2.getFullYear(),now2.getMonth()-1,1).getMonth()+1).padStart(2,"0");
              const thisE=expenses.filter(e=>e.date?.startsWith(thisMs)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
              const lastE=expenses.filter(e=>e.date?.startsWith(lastMs)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
              const topCat=Object.entries(expenses.filter(e=>e.date?.startsWith(thisMs)).reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount)||0);return a},{})).sort((a,b)=>b[1]-a[1])[0];
              const diff=lastE>0?((thisE-lastE)/lastE*100):0;
              const nextBill=bills.filter(b=>!b.paid&&dueIn(b.dueDate)>=0).sort((a,b)=>dueIn(a.dueDate)-dueIn(b.dueDate))[0];
              const insights=[
                thisE>0&&lastE>0&&`You're spending ${Math.abs(diff).toFixed(0)}% ${diff>0?"more":"less"} than last month`,
                topCat&&`Biggest expense: ${topCat[0]} at ${fmt(topCat[1])} this month`,
                nextBill&&`Next bill: ${nextBill.name} ${fmt(nextBill.amount)} in ${dueIn(nextBill.dueDate)}d`,
                savingsRate>0&&`Saving ${savingsRate.toFixed(1)}% of income this month`,
                totalDebt>0&&`Paying ${fmt(debts.reduce((s,d)=>s+(parseFloat(d.balance||0)*(parseFloat(d.rate||0)/100/12)),0))}/mo in interest`,
                burnRate>0&&`Daily burn rate: ${fmt(burnRate)} — monthly forecast ${fmt(burnRate*30)}`,
                savingsGoals.length>0&&`${savingsGoals.filter(g=>parseFloat(g.saved||0)>=parseFloat(g.target||1)).length} of ${savingsGoals.length} savings goals complete`,
                overdue.length>0&&`⚠️ ${overdue.length} bill${overdue.length!==1?"s":""} overdue — take action now`,
              ].filter(Boolean);
              const insight=insights[new Date().getDate()%insights.length]||insights[0];
              if(!insight)return null;
              return(<div onClick={()=>navTo("insights")} style={{background:`linear-gradient(135deg,${C.accentBg},${C.purpleBg})`,border:`1px solid ${C.accentMid}`,borderRadius:16,padding:"14px 16px",marginBottom:14,cursor:"pointer",display:"flex",gap:12,alignItems:"center"}}><div style={{width:36,height:36,borderRadius:10,background:C.accentBg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:18}}>💡</div><div style={{flex:1}}><div style={{fontSize:11,fontWeight:700,color:C.accent,textTransform:"uppercase",letterSpacing:.5,marginBottom:3}}>Today's Insight</div><div style={{fontSize:13,color:C.text,lineHeight:1.5,fontWeight:500}}>{insight}</div></div><ChevronRight size={14} color={C.accent}/></div>);
            })()}

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <div onClick={()=>navTo("spend")} style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"14px",cursor:"pointer"}}>
                <div style={{fontSize:11,color:C.textLight,fontWeight:600,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Spending</div>
                {(()=>{
                  const now3=new Date();
                  const ms=now3.getFullYear()+"-"+String(now3.getMonth()+1).padStart(2,"0");
                  const cats=Object.entries(expenses.filter(e=>e.date?.startsWith(ms)).reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount)||0);return a},{})).sort((a,b)=>b[1]-a[1]).slice(0,4);
                  const total=cats.reduce((s,[,v])=>s+v,0);
                  if(!total)return <div style={{fontSize:12,color:C.textLight,textAlign:"center",padding:"10px 0"}}>No spending yet</div>;
                  return(<div><div className={hidden?"blurred":"unblurred"} style={{fontFamily:MF,fontWeight:800,fontSize:20,color:C.red,marginBottom:8}}>{fmt(total)}</div>{cats.slice(0,3).map(([cat,amt],i)=>(<div key={cat} style={{marginBottom:5}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:11,color:C.textMid}}>{cat}</span><span style={{fontSize:11,fontWeight:700,color:PIE_COLORS[i]}}>{fmt(amt)}</span></div><div style={{height:3,background:C.bg,borderRadius:99}}><div style={{height:"100%",width:`${(amt/total*100).toFixed(0)}%`,background:PIE_COLORS[i],borderRadius:99}}/></div></div>))}</div>);
                })()}
              </div>
              <div onClick={()=>navTo("accounts")} style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"14px",cursor:"pointer"}}>
                <div style={{fontSize:11,color:C.textLight,fontWeight:600,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Net Worth</div>
                <div className={hidden?"blurred":"unblurred"} style={{fontFamily:MF,fontWeight:800,fontSize:20,color:totalAssets-totalDebt>=0?C.green:C.red,marginBottom:8}}>{fmt(totalAssets-totalDebt)}</div>
                {[{l:"Assets",v:fmt(totalAssets),c:C.green},{l:"Debt",v:fmt(totalDebt),c:C.red},{l:"Liquid",v:fmt((parseFloat(accounts.checking||0))+(parseFloat(accounts.savings||0))+(parseFloat(accounts.cushion||0))),c:C.accent}].map(r=>(<div key={r.l} style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,color:C.textMid}}>{r.l}</span><span className={hidden?"blurred":"unblurred"} style={{fontSize:11,fontWeight:700,color:r.c}}>{r.v}</span></div>))}
              </div>
            </div>

            {bills.filter(b=>!b.paid).length>0&&<div style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Upcoming Bills</div>
                <button onClick={()=>navTo("bills")} style={{fontSize:12,color:C.accent,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>See all</button>
              </div>
              <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
                {bills.filter(b=>!b.paid).sort((a,b2)=>new Date(a.dueDate)-new Date(b2.dueDate)).slice(0,6).map(b=>{
                  const d=dueIn(b.dueDate);
                  const col=d<0?C.red:d<=3?C.red:d<=7?C.amber:C.textLight;
                  const bg=d<0?C.redBg:d<=7?C.amberBg:C.surface;
                  const br=d<0?C.redMid:d<=7?C.amberMid:C.border;
                  return(<div key={b.id} onClick={()=>navTo("bills")} style={{background:bg,border:`1px solid ${br}`,borderRadius:14,padding:"10px 14px",flexShrink:0,cursor:"pointer",minWidth:110}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:95}}>{b.name}</div>
                    <div className={hidden?"blurred":"unblurred"} style={{fontFamily:MF,fontWeight:800,fontSize:14,color:col,marginBottom:1}}>{fmt(b.amount)}</div>
                    <div style={{fontSize:11,color:col,fontWeight:600}}>{d<0?Math.abs(d)+"d late":d===0?"Today":d+"d left"}</div>
                  </div>);
                })}
              </div>
            </div>}

            {(()=>{
              const ALL_QA=[
                {id:"expense",l:"Log Expense",ic:"💸",a:()=>om("expense"),bg:C.accentBg,c:C.accent},
                {id:"receipt",l:"Scan Receipt",ic:"📷",a:()=>om("receipt"),bg:C.purpleBg,c:C.purple},
                {id:"bill",l:"Add Bill",ic:"📅",a:()=>om("bill"),bg:C.amberBg,c:C.amber},
                {id:"debt",l:"Add Debt",ic:"💳",a:()=>om("debt"),bg:C.redBg,c:C.red},
                {id:"simulator",l:"Payoff Sim",ic:"🧮",a:()=>debts.length?setModal("simulator"):om("debt"),bg:C.greenBg,c:C.green},
                {id:"budget",l:"Set Budget",ic:"🎯",a:()=>om("bgoal_home"),bg:C.purpleBg,c:C.purple},
                {id:"shift",l:"Log Shift",ic:"🏥",a:()=>navTo("shifts"),bg:C.accentBg,c:C.accent},
                {id:"trade",l:"Log Trade",ic:"📈",a:()=>navTo("trading"),bg:C.greenBg,c:C.green},
                {id:"savings",l:"Add Goal",ic:"🎯",a:()=>navTo("savings"),bg:C.amberBg,c:C.amber},
                {id:"networth",l:"Net Worth",ic:"📊",a:()=>navTo("networthtrend"),bg:C.accentBg,c:C.accent},
                {id:"insights",l:"Insights",ic:"🔍",a:()=>navTo("insights"),bg:C.purpleBg,c:C.purple},
                {id:"paycheck",l:"Paycheck",ic:"💰",a:()=>navTo("paycheck"),bg:C.greenBg,c:C.green},
              ];
              const activeIds=settings.quickActions||["expense","receipt","bill","debt","simulator","budget"];
              const active=ALL_QA.filter(q=>activeIds.includes(q.id));
              return(
                <div style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Quick Actions</div>
                    <button onClick={()=>setModal("quickactions")} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:C.textLight,fontWeight:600,display:"flex",alignItems:"center",gap:4}}><Settings size={12}/>Customize</button>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                    {active.map(q=>(<button key={q.id} onClick={q.a} style={{background:q.bg,borderRadius:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"14px 10px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:8}}><span style={{fontSize:22}}>{q.ic}</span><span style={{fontSize:11,fontWeight:700,color:q.c,lineHeight:1.2,textAlign:"center"}}>{q.l}</span></button>))}
                  </div>
                </div>
              );
            })()}

            {expenses.length===0&&<div style={{background:`linear-gradient(135deg,${C.navy} 0%,${C.accent} 100%)`,borderRadius:18,padding:24,marginBottom:14,textAlign:"center"}}>
              <div style={{fontSize:32,marginBottom:10}}>🧪</div>
              <div style={{fontFamily:MF,fontWeight:800,fontSize:18,color:"#fff",marginBottom:6}}>See it in action</div>
              <div style={{fontSize:13,color:"rgba(255,255,255,.8)",marginBottom:18}}>Load a year of realistic data to explore every feature</div>
              <button onClick={()=>setConfirm({title:"Load Demo Data",message:"This will replace your current data with 1 year of sample data. Continue?",onConfirm:()=>{loadDemo();setConfirm(null);},danger:false})} style={{background:"#fff",border:"none",borderRadius:12,padding:"13px 32px",color:C.accent,fontWeight:800,fontSize:16,cursor:"pointer",fontFamily:MF}}>Load Demo Data</button>
            </div>}

            {expenses.length>0&&<div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Recent</div>
                <button onClick={()=>navTo("spend")} style={{fontSize:12,color:C.accent,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>See all</button>
              </div>
              {(()=>{const days=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);const ds=d.toISOString().split("T")[0];const amt=expenses.filter(e=>e.date===ds).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);return{d:ds,amt,day:["Su","Mo","Tu","We","Th","Fr","Sa"][d.getDay()]};});const mx=Math.max(...days.map(d=>d.amt))||1;const today3=new Date().toISOString().split("T")[0];return(<div style={{display:"flex",gap:3,alignItems:"flex-end",height:32,marginBottom:12}}>{days.map(({d,amt,day})=>{const h=Math.max(3,Math.round((amt/mx)*28));const isToday=d===today3;return(<div key={d} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}><div style={{width:"100%",height:h,background:isToday?C.accent:amt>0?C.accentBg:C.borderLight,borderRadius:"3px 3px 0 0"}}/><div style={{fontSize:8,color:isToday?C.accent:C.textFaint,fontWeight:isToday?700:400}}>{day}</div></div>);})}</div>);})()}
              {expenses.sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,4).map(e=>{
                const cat=categories.find(c=>c.name===e.category);
                return(<div key={e.id} onClick={()=>setEditItem({type:"expense",data:e})} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.border}`,cursor:"pointer"}}>
                  <div style={{width:36,height:36,borderRadius:10,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{cat?.icon||"💸"}</div>
                  <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:C.text}}>{e.name}</div><div style={{fontSize:11,color:C.textLight}}>{e.date} · {e.category}</div></div>
                  <div className={hidden?"blurred":"unblurred"} style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>-{fmt(e.amount)}</div>
                </div>);
              })}
            </div>}
          </div>
        )}

        {tab==="chat"&&<div style={{height:"calc(100vh - 110px)",display:"flex",flexDirection:"column"}}><div style={{marginBottom:14}}><div style={{fontFamily:MF,fontSize:18,fontWeight:800}}>AI Assistant</div><div style={{fontSize:13,color:C.textLight,marginTop:1}}>Log everything offline — just type naturally</div></div><div style={{flex:1,minHeight:0}}><ChatView categories={categories} expenses={expenses} bills={bills} debts={debts} accounts={accounts} income={income} savingsGoals={savingsGoals} trades={trades} tradingAccount={tradingAccount} setExpenses={setExpenses} setBills={setBills} setDebts={setDebts} setSGoals={setSGoals} setAccounts={setAccounts} setIncome={setIncome} setTrades={setTrades} setBGoals={setBGoals}/></div></div>}
        {tab==="categories"&&<CategoriesView categories={categories} setCategories={setCats} showToast={showToast}/>}
        {tab==="spend"&&<SpendingView expenses={expenses} setExpenses={setExpenses} budgetGoals={budgetGoals} setBGoals={setBGoals} categories={categories} setEditItem={setEditItem} onAdd={()=>om("expense")} showToast={showToast}/>}
        {tab==="bills"&&<BillsView bills={bills} setBills={setBills} setEditItem={setEditItem} onAdd={()=>om("bill")} showToast={showToast}/>}
        {tab==="more"&&!isMoreTab&&(
          <div className="fu">
            <div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text,marginBottom:2}}>More</div>
            <div style={{fontSize:13,color:C.textLight,marginBottom:20}}>Everything in one place</div>
            {GROUPS.map(sec=>(
              <div key={sec.key} style={{marginBottom:22}}>
                <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:10}}><div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.text}}>{sec.label}</div><div style={{fontSize:11,color:C.textLight}}>{sec.desc}</div></div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {sec.items.map(t=>{const badge=t.id==="notifs"&&unread>0?unread:null;return(
                    <button key={t.id} className="ba" onClick={()=>navTo(t.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",background:C.surface,borderRadius:12,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",cursor:"pointer",textAlign:"left",width:"100%"}}>
                      <div style={{width:36,height:36,background:badge?C.redBg:C.accentBg,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,position:"relative"}}><t.icon size={17} color={badge?C.red:C.accent}/>{badge&&<div style={{position:"absolute",top:-4,right:-4,width:16,height:16,background:C.red,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:"#fff",border:"2px solid #fff"}}>{badge>9?"9+":badge}</div>}</div>
                      <span style={{fontSize:14,fontWeight:600,color:C.text,flex:1}}>{t.label}</span>
                      <ChevronRight size={15} color={C.textLight}/>
                    </button>
                  );})}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab==="accounts"&&(
          <div className="fu">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}><div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text}}>Accounts & Income</div><div style={{fontSize:12,color:C.green,fontWeight:600,display:"flex",alignItems:"center",gap:4}}><div style={{width:7,height:7,borderRadius:"50%",background:C.green}}/>Auto-saved</div></div>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
              {[{k:"checking",l:"Checking",ic:"🏦",c:C.navy},{k:"savings",l:"Savings",ic:"💰",c:C.green},{k:"cushion",l:"Cushion",ic:"🛡️",c:C.accent},{k:"investments",l:"Investments",ic:"📈",c:C.green},{k:"property",l:"Property",ic:"🏠",c:C.amber},{k:"vehicles",l:"Vehicles",ic:"🚗",c:C.purple}].map(a=>(
                <div key={a.k} style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,display:"flex",alignItems:"center",gap:14}}>
                  <div style={{width:44,height:44,borderRadius:12,background:a.c+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{a.ic}</div>
                  <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:C.text}}>{a.l}</div></div>
                  <input type="number" placeholder="0.00" value={accounts[a.k]||""} onChange={e=>setAccounts(p=>({...p,[a.k]:e.target.value}))} onBlur={e=>{if(e.target.value)showToast("✓ "+a.l+" saved");}} style={{width:130,background:hidden?C.bg:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"8px 10px",fontSize:18,fontFamily:MF,fontWeight:700,color:a.c,outline:"none",textAlign:"right",fontWeight:800,filter:hidden?"blur(8px)":"none"}}/>
                </div>
              ))}
            </div>
            <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18}}>
              <div style={{fontFamily:MF,fontWeight:700,fontSize:16,color:C.text,marginBottom:14}}>Monthly Income</div>
              {[{k:"primary",l:`${getProfession(profCategory).icon} Primary Income`},{k:"other",l:"Other Income"},{k:"trading",l:"Trading avg"},{k:"rental",l:"Rental Income"},{k:"dividends",l:"Dividends"},{k:"freelance",l:"Freelance"}].map(i=>(
                <div key={i.k} style={{marginBottom:10}}><div style={{fontSize:11,fontWeight:600,color:C.slate,textTransform:"uppercase",letterSpacing:.4,marginBottom:5}}>{i.l}</div><input type="number" placeholder="0.00" value={income[i.k]||""} onChange={e=>setIncome(p=>({...p,[i.k]:e.target.value}))} onBlur={e=>{if(e.target.value)showToast("✓ Income saved");}} style={{width:"100%",background:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"11px 14px",color:C.text,fontSize:14,outline:"none"}}/></div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",marginTop:10,paddingTop:12,borderTop:`1px solid ${C.border}`}}><span style={{fontSize:13,color:C.textMid}}>Total Monthly</span><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:11,color:C.green,fontWeight:600}}>✓ Auto-saved</span><span style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.green}}>{fmt(totalIncome)}</span></div></div>
            </div>
          </div>
        )}

        {tab==="debt"&&<DebtView debts={debts} setDebts={setDebts} setModal={setModal} setEditItem={setEditItem} showToast={showToast}/>}
        {tab==="savings"&&<SavingsGoalsView goals={savingsGoals} setGoals={setSGoals} income={income} showToast={showToast}/>}
        {tab==="recurring"&&<RecurringView expenses={expenses} setExpenses={setExpenses} categories={categories} showToast={showToast} appReady={ready}/>}
        {tab==="cashflow"&&<IncomeSpendingView expenses={expenses} income={income} bills={bills} trades={trades}/>}
        {tab==="physical"&&<FinancialPhysicalView income={income} expenses={expenses} debts={debts} accounts={accounts} bills={bills} savingsGoals={savingsGoals}/>}
        {tab==="health"&&<HealthScoreView income={income} expenses={expenses} debts={debts} accounts={accounts} bills={bills}/>}
        {tab==="trading"&&settings.showTrading&&<TradingView trades={trades} setTrades={setTrades} account={tradingAccount} setAccount={setTradingAccount} showToast={showToast}/>}
        {tab==="calendar"&&<CalendarView expenses={expenses} bills={bills} calColors={calColors} setCalColors={setCalColors} setExpenses={setExpenses} onAdd={()=>om("expense")}/>}
        {tab==="shifts"&&<ShiftView shifts={shifts} setShifts={setShifts} income={income} profCategory={profCategory} profSub={profSub} showToast={showToast}/>}
        {tab==="trend"&&<TrendView balHist={balHist} accounts={accounts} expenses={expenses} onNavigate={navTo}/>}
        {tab==="statement"&&<StatementView expenses={expenses} bills={bills} income={income} accounts={accounts} debts={debts} trades={trades} appName={appName} categories={categories} onAdd={()=>om("expense")}/>}
        {tab==="search"&&<SearchView expenses={expenses} bills={bills} debts={debts} trades={trades} categories={categories} setEditItem={setEditItem} onNavigate={navTo}/>}
        {tab==="subscriptions"&&<SubsView detectedSubs={detectedSubs} expenses={expenses}/>}
        {tab==="insights"&&<InsightsView expenses={expenses} income={income} bills={bills} debts={debts} budgetGoals={budgetGoals} savingsGoals={savingsGoals}/>}
        {tab==="paycheck"&&<PaycheckView bills={bills} income={income} expenses={expenses} accounts={accounts} onAdd={()=>om("expense")}/>}
        {tab==="networthtrend"&&<NetWorthTrendView balHist={balHist} debts={debts} accounts={accounts} onNavigate={navTo}/>}
        {tab==="tax"&&<TaxView expenses={expenses} income={income} trades={trades} shifts={shifts} appName={appName}/>}
        {tab==="dashsettings"&&<DashSettingsView config={dashConfig} setConfig={setDashConfig} showTrading={settings.showTrading}/>}
        {tab==="settings"&&<SettingsView settings={settings} setSettings={setSettings} appName={appName} setAppName={setAppName} profCategory={profCategory} setProfCategory={setProfCategory} profSub={profSub} setProfSub={setProfSub} darkMode={darkMode} setDarkMode={setDarkMode} pinEnabled={pinEnabled} setPinEnabled={setPinEnabled} expenses={expenses} bills={bills} debts={debts} trades={trades} accounts={accounts} income={income} shifts={shifts} savingsGoals={savingsGoals} budgetGoals={budgetGoals} setBills={setBills} setDebts={setDebts} setTrades={setTrades} setShifts={setShifts} setSGoals={setSGoals} setBGoals={setBGoals} setAccounts={setAccounts} setIncome={setIncome} setExpenses={setExpenses} categories={categories} setCategories={setCats} greetName={greetName} setGreetName={setGreetName} onResetAllData={()=>setConfirm({title:"Reset All Data",message:"This will permanently delete all your expenses, bills, debts, goals and settings. This cannot be undone.",onConfirm:()=>{setExpenses([]);setBills([]);setDebts([]);setSGoals([]);setBGoals([]);setTrades([]);setShifts([]);setBalHist([]);setNotifs([]);setAccounts({checking:"",savings:"",cushion:"",investments:"",property:"",vehicles:""});setIncome({primary:"",other:"",trading:"",rental:"",dividends:"",freelance:""});showToast("All data cleared","error");setConfirm(null);},danger:true})} onResetOnboarding={()=>{try{localStorage.removeItem("fv_onboarded");}catch{}setOnboarded(false);}} onSignOut={authSession?handleSignOut:null} onSignIn={!authSession&&skipAuth?()=>{localStorage.removeItem("fv_skip_auth");setSkipAuth(false);}:null} userEmail={authSession?.user?.email}/>}

        {tab==="notifs"&&(
          <div className="fu">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div><div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text}}>Notifications</div><div style={{fontSize:13,color:C.textLight}}>{notifs.filter(n=>!n.read).length} unread</div></div>
              <div style={{display:"flex",gap:8}}>{notifs.some(n=>!n.read)&&<button className="ba" onClick={()=>setNotifs(p=>p.map(n=>({...n,read:true})))} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 12px",fontSize:12,fontWeight:600,color:C.textMid,cursor:"pointer"}}>Mark all read</button>}{notifs.length>0&&<button className="ba" onClick={()=>{if(window.confirm("Clear all?"))setNotifs([]);}} style={{background:C.redBg,border:`1px solid ${C.redMid}`,borderRadius:8,padding:"7px 12px",fontSize:12,fontWeight:600,color:C.red,cursor:"pointer"}}>Clear</button>}</div>
            </div>
            {notifs.length===0&&<Empty text="All clear — alerts will show here" icon={Bell}/>}
            {notifs.map(n=>{const S={danger:{bg:C.redBg,br:C.redMid,c:C.red,ic:"🚨"},warning:{bg:C.amberBg,br:C.amberMid,c:C.amber,ic:"⚠️"},success:{bg:C.greenBg,br:C.greenMid,c:C.green,ic:"✅"},info:{bg:C.accentBg,br:C.accentMid,c:C.accent,ic:"💡"}}[n.type]||{bg:C.bg,br:C.border,c:C.text,ic:"🔔"};const ago=Date.now()-n.time;const ta=ago<60000?"just now":ago<3600000?Math.floor(ago/60000)+"m ago":ago<86400000?Math.floor(ago/3600000)+"h ago":Math.floor(ago/86400000)+"d ago";return(<div key={n.id} style={{background:n.read?C.surface:S.bg,border:`1.5px solid ${n.read?C.border:S.br}`,borderRadius:14,padding:"13px 14px",marginBottom:8}}><div style={{display:"flex",gap:10,alignItems:"flex-start"}}><span style={{fontSize:20,flexShrink:0}}>{S.ic}</span><div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:n.read?C.textMid:S.c}}>{n.title}</div><div style={{fontSize:12,color:C.textLight,marginTop:3,lineHeight:1.4}}>{n.body}</div><div style={{fontSize:11,color:C.textLight,marginTop:4}}>{ta}</div></div>{!n.read&&<div style={{width:8,height:8,borderRadius:"50%",background:S.c,flexShrink:0,marginTop:4}}/>}</div><div style={{display:"flex",gap:7,marginTop:10,paddingTop:10,borderTop:`1px solid ${C.border}`}}><button className="ba" onClick={()=>setNotifs(p=>p.map(x=>x.id===n.id?{...x,read:true}:x))} style={{flex:1,background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 0",color:C.textMid,fontWeight:600,fontSize:12,cursor:"pointer"}}>Dismiss</button><button className="ba" onClick={()=>setNotifs(p=>p.filter(x=>x.id!==n.id))} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",color:C.textLight,cursor:"pointer",display:"flex",alignItems:"center"}}><X size={13}/></button></div></div>);})}
          </div>
        )}
      </div>

      {toast&&<div style={{position:"fixed",bottom:88,left:"50%",transform:"translateX(-50%)",zIndex:200,background:toast.type==="success"?C.green:toast.type==="error"?C.red:C.navy,color:"#fff",borderRadius:14,padding:"12px 20px",fontSize:13,fontWeight:600,boxShadow:"0 8px 32px rgba(10,22,40,.25),0 2px 8px rgba(10,22,40,.15)",display:"flex",alignItems:"center",gap:8,maxWidth:300,animation:"slideUp .22s cubic-bezier(.22,1,.36,1)",backdropFilter:"blur(8px)",letterSpacing:.1}}>{toast.type==="success"?"✓":toast.type==="error"?"✗":"·"} {toast.msg}</div>}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:640,background:"rgba(255,255,255,.88)",backdropFilter:"blur(32px)",WebkitBackdropFilter:"blur(32px)",borderTop:`1px solid rgba(226,229,238,.5)`,display:"flex",padding:"10px 8px max(14px,env(safe-area-inset-bottom))",zIndex:100,boxShadow:"0 -1px 0 rgba(10,22,40,.04),0 -12px 40px rgba(10,22,40,.07)"}}>
        {NAV.map(n=>{const active=n.id==="more"?isMoreTab||tab==="more":tab===n.id;return(
          <button key={n.id} className="ba" onClick={()=>navTo(n.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"6px 4px",background:"none",border:"none",cursor:"pointer",color:active?C.accent:C.textFaint,position:"relative",borderRadius:12,padding:"4px 12px 6px",background:active?"rgba(99,102,241,.08)":"transparent",transition:"all .18s"}}>
            <div style={{position:"relative"}}><n.icon size={21} strokeWidth={active?2.4:1.6}/>{n.badge&&n.badge>0&&<div style={{position:"absolute",top:-4,right:-6,width:16,height:16,background:C.red,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:"#fff",border:"2px solid #fff"}}>{n.badge>9?"9+":n.badge}</div>}</div>
            <span style={{fontSize:10,fontWeight:active?700:500}}>{n.label}</span>
          </button>
        );})}
      </div>

      {modal==="expense"&&<Modal title="Log Expense" icon={Wallet} onClose={cl} onSubmit={submit} submitLabel="Add Expense"><FI label="Name" placeholder="Coffee, groceries, gas..." value={form.name||""} onChange={e=>{ff("name",e.target.value);if(!form.category){const t=e.target.value.toLowerCase().trim();const mc=window._merchantCats||{};if(mc[t]){ff("category",mc[t]);}else{const catMap={Food:["lunch","dinner","coffee","food","eat","restaurant","pizza","burger","groceries","doordash","starbucks","chipotle"],Transport:["gas","uber","lyft","parking","toll"],Housing:["rent","mortgage","repair"],Subscriptions:["netflix","hulu","spotify","gym","membership"],Health:["doctor","pharmacy","medicine","dental"],Entertainment:["movie","game","bar","concert"],Personal:["haircut","barber","clothes","shopping","amazon","target"]};for(const[cat,kws]of Object.entries(catMap)){if(kws.some(k=>t.includes(k))){ff("category",cat);break;}}}}}}/><div style={{display:"flex",gap:12}}><FI half label="Amount ($)" type="number" value={form.amount||""} onChange={e=>ff("amount",e.target.value)} autoFocus={!!form.name}/><FI half label="Date" type="date" value={form.date||todayStr()} onChange={e=>ff("date",e.target.value)}/></div><FS label="Category" options={categories.map(c=>c.name)} value={form.category||""} onChange={e=>ff("category",e.target.value)}/><FI label="Notes" placeholder="Optional" value={form.notes||""} onChange={e=>ff("notes",e.target.value)}/><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderTop:`1px solid ${C.border}`,marginTop:4}}><div><div style={{fontSize:13,fontWeight:600,color:C.text}}>Recurring</div><div style={{fontSize:12,color:C.textLight}}>Auto-log this monthly</div></div><button onClick={()=>ff("recurring",!form.recurring)} style={{background:"none",border:"none",cursor:"pointer",color:form.recurring?C.accent:C.borderLight,padding:0,display:"flex"}}>{form.recurring?<ToggleRight size={28}/>:<ToggleLeft size={28}/>}</button></div></Modal>}
      {modal==="bill"&&<Modal title="Add Bill" icon={CalendarClock} onClose={cl} onSubmit={submit} submitLabel="Add Bill" accent={C.amber}><FI label="Bill Name" placeholder="Rent, Electric, Netflix..." value={form.name||""} onChange={e=>ff("name",e.target.value)}/><div style={{display:"flex",gap:12}}><FI half label="Amount ($)" type="number" value={form.amount||""} onChange={e=>ff("amount",e.target.value)}/><FI half label="Due Date" type="date" value={form.dueDate||""} onChange={e=>ff("dueDate",e.target.value)}/></div><FS label="Recurring" options={["Monthly","Bi-weekly","Quarterly","Annual","One-time"]} value={form.recurring||""} onChange={e=>ff("recurring",e.target.value)}/></Modal>}
      {modal==="debt"&&<Modal title="Add Debt" icon={CreditCard} onClose={cl} onSubmit={submit} submitLabel="Track Debt" accent={C.red} wide><FI label="Name" placeholder="Car loan, student debt..." value={form.name||""} onChange={e=>ff("name",e.target.value)}/><div style={{display:"flex",gap:12}}><FI half label="Balance ($)" type="number" value={form.balance||""} onChange={e=>ff("balance",e.target.value)}/><FI half label="Original ($)" type="number" value={form.original||""} onChange={e=>ff("original",e.target.value)}/></div><div style={{display:"flex",gap:12}}><FI half label="Rate %" type="number" value={form.rate||""} onChange={e=>ff("rate",e.target.value)}/><FI half label="Min Payment ($)" type="number" value={form.minPayment||""} onChange={e=>ff("minPayment",e.target.value)}/></div></Modal>}
      {modal==="bgoal_home"&&<Modal title="Budget Goal" icon={Target} onClose={cl} onSubmit={()=>{if(!form.category||!form.limit)return;setBGoals(p=>[...p,{id:Date.now(),...form}]);cl();}} submitLabel="Set Goal" accent={C.purple}><FS label="Category" options={categories.map(c=>c.name)} value={form.category||""} onChange={e=>ff("category",e.target.value)}/><FI label="Monthly Limit ($)" type="number" placeholder="400" value={form.limit||""} onChange={e=>ff("limit",e.target.value)}/></Modal>}
      {modal==="receipt"&&<Modal title="Scan Receipt" icon={Scan} onClose={cl} accent={C.purple}><div style={{textAlign:"center",padding:"10px 0 20px"}}><div style={{width:64,height:64,borderRadius:18,background:C.purpleBg,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}><Scan size={30} color={C.purple}/></div><div style={{fontFamily:MF,fontWeight:700,fontSize:16,color:C.text,marginBottom:8}}>Scan Receipt</div><label style={{display:"block",background:C.purple,borderRadius:12,padding:"13px 0",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:10}}>📷 Take Photo<input type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>{const file=e.target.files[0];if(!file)return;cl();om("expense",{name:"Receipt",amount:"",category:"Misc",date:todayStr()});}}/></label><label style={{display:"block",background:C.purpleBg,border:`1px solid ${C.purpleMid}`,borderRadius:12,padding:"13px 0",color:C.purple,fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:10}}>🖼 Choose from Library<input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const file=e.target.files[0];if(!file)return;cl();om("expense",{name:"Receipt",amount:"",category:"Misc",date:todayStr()});}}/></label><button className="ba" onClick={cl} style={{background:C.bg,borderRadius:12,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"12px 0",color:C.textMid,fontWeight:600,fontSize:14,cursor:"pointer",width:"100%"}}>Cancel</button></div></Modal>}
      {modal==="simulator"&&debts.length>0&&(()=>{const dL=debts.map(d=>({...d,bal:parseFloat(d.balance||0),rate:parseFloat(d.rate||0)/100/12,min:parseFloat(d.minPayment||0)}));const tm=dL.reduce((s,d)=>s+d.min,0);const ex=parseFloat(form.extra||"0")||0;function sim(strat){let r=dL.map(d=>({...d}));let mo=0,ti=0;while(r.some(d=>d.bal>0)&&mo<600){mo++;let av=tm+ex;r=r.map(d=>{if(d.bal<=0)return d;const i=d.bal*d.rate;ti+=i;const p=Math.min(d.min,d.bal+i);av-=p;return{...d,bal:Math.max(0,d.bal+i-p)};});const ac=r.filter(d=>d.bal>0);if(ac.length&&av>0){const tgt=strat==="avalanche"?ac.reduce((a,b)=>a.rate>b.rate?a:b):ac.reduce((a,b)=>a.bal<b.bal?a:b);const idx=r.findIndex(d=>d.name===tgt.name);r[idx].bal=Math.max(0,r[idx].bal-av);}}return{months:mo,interest:ti};}const sn=sim("snowball"),av=sim("avalanche"),diff=sn.interest-av.interest;return(<Modal title="Payoff Simulator" icon={Calculator} onClose={cl} accent={C.green} wide><div style={{background:C.navy,borderRadius:14,padding:16,marginBottom:14,color:"#fff"}}><div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",marginBottom:4}}>TOTAL DEBT</div><div style={{fontFamily:MF,fontSize:26,fontWeight:800,color:C.red}}>{fmt(debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0))}</div><div style={{fontSize:12,color:"rgba(255,255,255,.4)",marginTop:2}}>Min payments: {fmt(tm)}/mo</div></div><div style={{marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5}}>Extra Monthly Payment</div><div style={{fontFamily:MF,fontWeight:800,fontSize:18,color:C.accent}}>{ex>0?"+"+fmt(ex):"$0"}</div></div><input type="range" min="0" max="1000" step="25" value={form.extra||0} onChange={e=>ff("extra",e.target.value)} style={{width:"100%",accentColor:C.accent,cursor:"pointer",marginBottom:6}}/><div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.textFaint}}><span>$0</span><span>$500</span><span>$1,000</span></div><div style={{marginTop:8,fontSize:12,color:C.textLight}}>Total: <span style={{fontWeight:700,color:C.text}}>{fmt(tm+ex)}/mo</span></div></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>{[{label:"❄️ Snowball",sub:"Smallest first",m:sn.months,i:sn.interest,c:C.accent},{label:"🔥 Avalanche",sub:"Highest rate first",m:av.months,i:av.interest,c:C.green}].map(s=><div key={s.label} style={{background:C.surface,border:`1.5px solid ${s.c}44`,borderRadius:14,padding:14,borderTop:`3px solid ${s.c}`}}><div style={{fontFamily:MF,fontWeight:800,fontSize:13,color:s.c,marginBottom:2}}>{s.label}</div><div style={{fontSize:11,color:C.textLight,marginBottom:10}}>{s.sub}</div><div style={{marginBottom:6}}><div style={{fontSize:10,color:C.textLight,fontWeight:600,marginBottom:2}}>DEBT FREE</div><div style={{fontFamily:MF,fontWeight:800,fontSize:18,color:C.text}}>{s.m>=600?"∞":s.m<12?s.m+"mo":Math.floor(s.m/12)+"y "+(s.m%12)+"mo"}</div></div><div><div style={{fontSize:10,color:C.textLight,fontWeight:600,marginBottom:2}}>INTEREST</div><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.red}}>{fmt(s.i)}</div></div></div>)}</div>{diff>0&&<div style={{background:C.greenBg,border:`1px solid ${C.greenMid}`,borderRadius:12,padding:"11px 14px",fontSize:13,color:C.green,fontWeight:500}}>💡 Avalanche saves <strong>{fmt(diff)}</strong> vs Snowball</div>}</Modal>);})()} 

      {confirm&&<ConfirmDialog title={confirm.title} message={confirm.message} onConfirm={confirm.onConfirm} onCancel={()=>setConfirm(null)} danger={confirm.danger}/>}
      {editItem&&editItem.type==="expense"&&<EditModal item={editItem} categories={categories} onSave={u=>{setExpenses(p=>p.map(x=>x.id===editItem.data.id?{...x,...u}:x));showToast("✓ Expense updated");setEditItem(null);}} onDelete={()=>setConfirm({title:"Delete Expense",message:`Delete "${editItem.data.name}"?`,onConfirm:()=>{setExpenses(p=>p.filter(x=>x.id!==editItem.data.id));setEditItem(null);setConfirm(null);},danger:true})} onClose={()=>setEditItem(null)}/>}
      {editItem&&editItem.type==="bill"&&<EditModal item={editItem} categories={categories} onSave={u=>{setBills(p=>p.map(x=>x.id===editItem.data.id?{...x,...u}:x));showToast("✓ Bill updated");setEditItem(null);}} onDelete={()=>setConfirm({title:"Delete Bill",message:`Delete "${editItem.data.name}"?`,onConfirm:()=>{setBills(p=>p.filter(x=>x.id!==editItem.data.id));setEditItem(null);setConfirm(null);},danger:true})} onClose={()=>setEditItem(null)}/>}
      {editItem&&editItem.type==="debt"&&<EditModal item={editItem} categories={categories} onSave={u=>{setDebts(p=>p.map(x=>x.id===editItem.data.id?{...x,...u}:x));showToast("✓ Debt updated");setEditItem(null);}} onDelete={()=>setConfirm({title:"Delete Debt",message:`Delete "${editItem.data.name}"?`,onConfirm:()=>{setDebts(p=>p.filter(x=>x.id!==editItem.data.id));setEditItem(null);setConfirm(null);},danger:true})} onClose={()=>setEditItem(null)}/>}
      {modal==="quickactions"&&(()=>{
        const QA_ALL=[{id:"expense",l:"Log Expense",ic:"💸"},{id:"receipt",l:"Scan Receipt",ic:"📷"},{id:"bill",l:"Add Bill",ic:"📅"},{id:"debt",l:"Add Debt",ic:"💳"},{id:"simulator",l:"Payoff Sim",ic:"🧮"},{id:"budget",l:"Set Budget",ic:"🎯"},{id:"shift",l:"Log Shift",ic:"🏥"},{id:"trade",l:"Log Trade",ic:"📈"},{id:"savings",l:"Add Goal",ic:"🎯"},{id:"networth",l:"Net Worth",ic:"📊"},{id:"insights",l:"Insights",ic:"🔍"},{id:"paycheck",l:"Paycheck",ic:"💰"}];
        const active=settings.quickActions||["expense","receipt","bill","debt","simulator","budget"];
        const toggle=id=>setSettings(p=>{const cur=p.quickActions||["expense","receipt","bill","debt","simulator","budget"];const next=cur.includes(id)?cur.filter(x=>x!==id):[...cur,id];return{...p,quickActions:next};});
        return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:9999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setModal(null)}><div style={{background:C.surface,borderRadius:"24px 24px 0 0",padding:28,width:"100%",maxWidth:480,maxHeight:"80vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}><div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text,marginBottom:4}}>Customize Quick Actions</div><div style={{fontSize:13,color:C.textLight,marginBottom:18}}>Choose up to 6 actions</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>{QA_ALL.map(q=>{const on=active.includes(q.id);return(<button key={q.id} onClick={()=>toggle(q.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderRadius:14,border:`2px solid ${on?C.accent:C.border}`,background:on?C.accentBg:"#fff",cursor:"pointer",textAlign:"left"}}><span style={{fontSize:20}}>{q.ic}</span><span style={{fontSize:13,fontWeight:700,color:on?C.accent:C.text}}>{q.l}</span>{on&&<Check size={14} color={C.accent} style={{marginLeft:"auto",flexShrink:0}}/>}</button>);})}</div><button onClick={()=>setModal(null)} style={{width:"100%",padding:"14px",borderRadius:14,border:"none",background:C.accent,color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",fontFamily:MF}}>Done</button></div></div>);
      })()}
    </div>
  );
}

if(typeof window!=="undefined"){
  window.addEventListener("error",function(e){
    console.error("GLOBAL ERROR:",e.message,e.filename,e.lineno,e.colno,e.error?.stack);
  });
}

export default function App(){return(<ErrorBoundary><AppInner/></ErrorBoundary>);}