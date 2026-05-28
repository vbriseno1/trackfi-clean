import React, { useMemo } from "react";
import { X } from "lucide-react";
import { C, MF, PIE_COLORS } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";

export default function SubsView({detectedSubs,expenses,showToast,dismissed,setDismissed}){
  const active=detectedSubs.filter(s=>!dismissed.includes(s.name));
  const monthly=active.filter(s=>s.interval==="Monthly");
  const other=active.filter(s=>s.interval!=="Monthly");
  const totalMo=monthly.reduce((s,x)=>s+(parseFloat(x.amount)||0),0);
  const totalAll=active.reduce((s,x)=>{const a=parseFloat(x.amount)||0;if(x.interval==="Monthly")return s+a;if(x.interval==="Weekly")return s+a*(52/12);if(x.interval==="Annual")return s+a/12;return s+a;},0);
  const catMap=active.reduce((a,s)=>{const raw=parseFloat(s.amount)||0;const mo=s.interval==="Weekly"?raw*(52/12):s.interval==="Annual"?raw/12:raw;a[s.category]=(a[s.category]||0)+mo;return a},{});
  const cats=Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
  const maxCat=cats[0]?.[1]||1;
  return(
    <div className="fu">
      <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.3,marginBottom:4}}>Subscriptions</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontSize:13,color:C.textLight}}>Auto-detected from your expenses</div>
        {dismissed.length>0&&<button onClick={()=>setDismissed([])} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:C.accent,fontWeight:600,padding:0}}>Restore {dismissed.length} hidden</button>}
      </div>
      {active.length===0&&<div style={{textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:36,marginBottom:12}}>🔍</div><div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:4}}>No subscriptions detected yet</div><div style={{fontSize:13,color:C.textLight}}>Add more expenses and Trackfi will find recurring patterns.</div></div>}
      {active.length>0&&<>
        {/* summary card */}
        <div style={{background:C.navy,borderRadius:18,padding:20,marginBottom:14,color:'#fff'}}>
          <div style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:.5,marginBottom:4}}>Monthly Subscriptions</div>
          <div style={{fontFamily:MF,fontSize:32,fontWeight:800,color:'#fff',marginBottom:2}}>{fmt(totalMo)}<span style={{fontSize:14,fontWeight:500,color:'rgba(255,255,255,.5)'}}>/mo</span></div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginTop:12}}>
            {[['Annual',fmt(totalMo*12),C.amberMid],['Per Day',fmt(totalMo/30.4),C.accentMid],['Count',String(active.length)+'  subs',C.greenMid]].map(([l,v,c])=>(
              <div key={l} style={{background:'rgba(255,255,255,.08)',borderRadius:10,padding:'9px 8px'}}>
                <div style={{fontSize:9,color:'rgba(255,255,255,.4)',fontWeight:600,marginBottom:2}}>{l.toUpperCase()}</div>
                <div style={{fontFamily:MF,fontSize:12,fontWeight:700,color:c}}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        {/* category breakdown */}
        {cats.length>1&&<div style={{background:C.surface,borderRadius:14,padding:'14px',marginBottom:14,boxShadow:'0 1px 4px rgba(10,22,40,.06)'}}>
          <div style={{fontSize:12,fontWeight:700,color:C.textLight,textTransform:'uppercase',letterSpacing:.5,marginBottom:10}}>By Category</div>
          {cats.map(([cat,amt])=><div key={cat} style={{marginBottom:8}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
              <span style={{fontSize:13,color:C.text}}>{cat}</span>
              <span style={{fontSize:13,fontFamily:MF,fontWeight:700,color:C.red}}>{fmt(amt)}/mo</span>
            </div>
            <div style={{height:5,background:C.borderLight,borderRadius:99}}><div style={{height:'100%',width:(amt/maxCat*100).toFixed(1)+'%',background:C.accent,borderRadius:99}}/></div>
          </div>)}
        </div>}
        {/* subscription list */}
        {monthly.length>0&&<div style={{marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:C.textLight,textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>Monthly</div>
          {monthly.map((s,i)=>(<div key={i} style={{background:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:14,padding:'12px 14px',marginBottom:8,display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:38,height:38,borderRadius:10,background:PIE_COLORS[i%PIE_COLORS.length]+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>🔄</div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:C.text}}>{s.name}</div>
              <div style={{fontSize:12,color:C.textLight,marginTop:1}}>{s.occurrences}x · Last: {s.lastDate} · {s.category}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontFamily:MF,fontWeight:700,fontSize:15,color:C.red}}>{fmt(s.amount)}</div>
              <div style={{fontSize:10,color:C.textLight}}>per month</div>
            </div>
            <button onClick={()=>{setDismissed(p=>[...p,s.name]);showToast&&showToast(s.name+' hidden');}} style={{background:'none',border:'none',cursor:'pointer',color:C.textLight,padding:4,display:'flex'}}><X size={14}/></button>
          </div>))}
        </div>}
        {other.length>0&&<div>
          <div style={{fontSize:12,fontWeight:700,color:C.textLight,textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>Other Recurring</div>
          {other.map((s,i)=>(<div key={i} style={{background:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:14,padding:'12px 14px',marginBottom:8,display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:38,height:38,borderRadius:10,background:C.surfaceAlt,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>🔁</div>
            <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:C.text}}>{s.name}</div><div style={{fontSize:12,color:C.textLight}}>{s.interval} · {s.occurrences}x</div></div>
            <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.red}}>{fmt(s.amount)}</div>
            <button onClick={()=>setDismissed(p=>[...p,s.name])} style={{background:'none',border:'none',cursor:'pointer',color:C.textLight,padding:4,display:'flex'}}><X size={14}/></button>
          </div>))}
        </div>}
      </>}
    </div>
  );
}
