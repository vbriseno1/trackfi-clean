import React, { useState } from "react";
import { C, MF, FULL_MOS } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";

export default function CategoryDrillView({category,expenses,income,onBack}){
  const now=new Date();
  const months=Array.from({length:6},(_,i)=>{
    const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);
    const ms=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
    const exps=expenses.filter(e=>e.category===category&&e.date?.startsWith(ms));
    return{month:FULL_MOS[d.getMonth()].slice(0,3),ms,exps,total:exps.reduce((s,e)=>s+(parseFloat(e.amount)||0),0),count:exps.length,isCurrent:i===5};
  });
  const thisMs=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
  const allExps=expenses.filter(e=>e.category===category).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const thisTotal=months[5].total;
  const maxMonth=Math.max(...months.map(m=>m.total))||1;
  const avgMonthly=months.filter(m=>m.total>0).reduce((s,m)=>s+m.total,0)/Math.max(1,months.filter(m=>m.total>0).length);
  const merchants=allExps.reduce((a,e)=>{const k=(e.name||"").toLowerCase().trim();a[k]=(a[k]||0)+(parseFloat(e.amount)||0);return a},{});
  const topMerchants=Object.entries(merchants).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const [selectedMonth,setSelectedMonth]=useState(null);
  const displayExps=selectedMonth?months.find(m=>m.ms===selectedMonth)?.exps||[]:allExps.slice(0,20);
  return(
    <div className="fu">
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
        <button onClick={onBack} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"7px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontWeight:600,fontSize:13,color:C.textMid}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>Insights</button>
        <div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text}}>{category}</div>
      </div>
      {/* Header stats */}
      <div className="fv-hero-panel" style={{marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>This Month</div>
        <div style={{fontFamily:MF,fontSize:36,fontWeight:900,color:"#fff",letterSpacing:-1,marginBottom:4}}>{fmt(thisTotal)}</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,.5)"}}>Avg {fmt(avgMonthly)}/mo · {allExps.length} total transactions</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:14}}>
          {[["Avg/visit",fmt(allExps.length?allExps.reduce((s,e)=>s+(parseFloat(e.amount)||0),0)/allExps.length:0)],
            ["This month",String(months[5].count)+" visits"],
            ["vs avg",avgMonthly>0?((thisTotal-avgMonthly)/avgMonthly*100).toFixed(0)+"%":"—"]].map(([l,v])=>(
            <div key={l} style={{background:"rgba(255,255,255,.1)",borderRadius:10,padding:"9px 10px"}}>
              <div style={{fontSize:9,color:"rgba(255,255,255,.4)",fontWeight:600,textTransform:"uppercase",marginBottom:2}}>{l}</div>
              <div style={{fontFamily:MF,fontSize:13,fontWeight:700,color:thisTotal>avgMonthly&&l==="vs avg"?"#fca5a5":thisTotal<avgMonthly&&l==="vs avg"?C.greenMid:"#fff"}}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      {/* 6-month bar chart */}
      <div style={{background:C.surface,borderRadius:18,padding:18,marginBottom:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)"}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>6-Month History</div>
        <div style={{display:"flex",gap:4,alignItems:"flex-end",height:80,marginBottom:10}}>
          {months.map((m,i)=>{
            const h=Math.max(4,Math.round((m.total/maxMonth)*72));
            const isSelected=selectedMonth===m.ms;
            return(
              <div key={i} onClick={()=>setSelectedMonth(isSelected?null:m.ms)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:"pointer"}}>
                <div style={{fontSize:8,color:C.textFaint}}>{m.total>0?fmt(m.total).replace("$","$").replace(".00",""):"—"}</div>
                <div style={{width:"100%",height:h,background:isSelected?C.accent:m.isCurrent?C.accent+"bb":C.accentBg,borderRadius:"4px 4px 0 0",transition:"height .3s",outline:isSelected?`2px solid ${C.accent}`:""}}/>
                <div style={{fontSize:9,color:m.isCurrent||isSelected?C.accent:C.textLight,fontWeight:m.isCurrent||isSelected?700:400}}>{m.month}</div>
              </div>
            );
          })}
        </div>
        {selectedMonth&&<div style={{fontSize:12,color:C.accent,fontWeight:600,textAlign:"center",marginBottom:4}}>Showing {FULL_MOS[months.find(m=>m.ms===selectedMonth)?.exps[0]?new Date(months.find(m=>m.ms===selectedMonth).ms+"-01").getMonth():now.getMonth()]} only — tap again to show all</div>}
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.textLight,paddingTop:8,borderTop:`1px solid ${C.border}`}}>
          <span>Avg: {fmt(avgMonthly)}/mo</span>
          <span>{months.reduce((s,m)=>s+m.count,0)} total visits</span>
        </div>
      </div>
      {/* Top merchants */}
      {topMerchants.length>0&&<div style={{background:C.surface,borderRadius:18,padding:18,marginBottom:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)"}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:12}}>Top Merchants</div>
        {topMerchants.map(([name,amt],i)=>{
          const count=allExps.filter(e=>(e.name||"").toLowerCase().trim()===name).length;
          return(
            <div key={name} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 0",borderBottom:i<topMerchants.length-1?`1px solid ${C.border}`:"none"}}>
              <div style={{width:30,height:30,borderRadius:8,background:C.accentBg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:MF,fontWeight:800,fontSize:12,color:C.accent,flexShrink:0}}>{i+1}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:C.text,textTransform:"capitalize"}}>{name}</div>
                <div style={{fontSize:11,color:C.textLight}}>{count} visit{count!==1?"s":""} · {fmt(amt/count)} avg</div>
              </div>
              <div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>{fmt(amt)}</div>
            </div>
          );
        })}
      </div>}
      {/* Transaction list */}
      <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:10}}>
        {selectedMonth?`Transactions — ${FULL_MOS[new Date(selectedMonth+"-01T00:00:00").getMonth()]}`:displayExps.length<allExps.length?`Recent (${displayExps.length} of ${allExps.length})`:"All Transactions"}
      </div>
      {displayExps.length===0&&<div style={{textAlign:"center",padding:30,color:C.textLight,fontSize:13}}>No transactions in this period</div>}
      {displayExps.map((e,i)=>(
        <div key={e.id||i} style={{background:C.surface,borderRadius:14,padding:"12px 14px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:"0 1px 3px rgba(10,22,40,.05)"}}>
          <div>
            <div style={{fontSize:14,fontWeight:600,color:C.text}}>{e.name}</div>
            <div style={{fontSize:11,color:C.textLight,marginTop:2}}>{e.date}{e.notes?" · "+e.notes:""}</div>
          </div>
          <div style={{fontFamily:MF,fontWeight:700,fontSize:15,color:C.red}}>{fmt(e.amount)}</div>
        </div>
      ))}
    </div>
  );
}
