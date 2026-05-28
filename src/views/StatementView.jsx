import React, { useState, useMemo } from "react";
import { Plus, Download, Printer } from "lucide-react";
import { C, MF, FULL_MOS, PIE_COLORS } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";
import { BarProg, Empty } from "../components/ui.jsx";
import { totalCheckingBalance, totalSavingsBalance } from "../lib/cashAccounts.js";

export default function StatementView({expenses,bills,income,accounts,debts,trades,appName,categories,onAdd}){
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
  const ti=(parseFloat(income.primary||0)*(income.payFrequency==="Weekly"?(52/12):income.payFrequency==="Twice Monthly"?2:income.payFrequency==="Monthly"?1:(26/12)))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const catMap=mExp.reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount)||0);return a},{});
  function exportHTML(){const rows=mExp.map(e=>"<tr><td>"+e.date+"</td><td>"+e.name+"</td><td>"+e.category+"</td><td>$"+parseFloat(e.amount).toFixed(2)+"</td></tr>").join("");const html="<html><head><title>"+FULL_MOS[mo]+" "+yr+" Statement</title></head><body><h1>"+(appName||"Finances")+" — "+FULL_MOS[mo]+" "+yr+"</h1><table border='1'><tr><th>Date</th><th>Name</th><th>Category</th><th>Amount</th></tr>"+rows+"<tr><td colspan='3'><b>Total</b></td><td><b>$"+totE.toFixed(2)+"</b></td></tr></table></body></html>";const b=new Blob([html],{type:"text/html"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=(appName||"finances")+"-"+FULL_MOS[mo]+"-"+yr+".html";a.click();URL.revokeObjectURL(u);}
  function exportCSV(){const hdr=["Date","Name","Category","Amount"];const rowData=mExp.map(e=>[e.date,e.name.replace(/,/g," "),e.category,parseFloat(e.amount).toFixed(2)]);const csv=[hdr,...rowData].map(r=>r.join(",")).join("\r\n");const b=new Blob([csv],{type:"text/csv"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=(appName||"trackfi")+"-"+FULL_MOS[mo]+"-"+yr+".csv";a.click();URL.revokeObjectURL(u);}
  return(<div className="fu fv-view-root">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
      <div><div className="fv-page-title" style={{fontSize:18}}>Monthly statement</div><div className="fv-page-sub">{FULL_MOS[mo]} {yr}</div></div>
      <div style={{display:"flex",gap:8}}>
        <button className="ba" onClick={onAdd} style={{background:C.accent,border:"none",borderRadius:10,padding:"8px 12px",cursor:"pointer",color:"#fff",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",gap:4}}><Plus size={13}/>Add</button>
        <button className="ba" onClick={()=>setYtdMode(y=>!y)} style={{background:ytdMode?C.accentBg:C.bg,border:`1px solid ${ytdMode?C.accentMid:C.border}`,borderRadius:10,padding:"8px 12px",cursor:"pointer",color:ytdMode?C.accent:C.textMid,fontWeight:700,fontSize:12}}>YTD</button><button className="ba" onClick={()=>{setYtdMode(false);nav(-1);}} style={{background:C.bg,border:"1px solid "+C.border,borderRadius:10,padding:"8px 12px",cursor:"pointer",color:C.textMid,fontWeight:600}}>←</button>
        <button className="ba" onClick={()=>nav(1)} style={{background:C.bg,border:"1px solid "+C.border,borderRadius:10,padding:"8px 12px",cursor:"pointer",color:C.textMid,fontWeight:600}}>→</button>
        <button className="ba" onClick={exportCSV} style={{background:C.teal,border:"none",borderRadius:10,padding:"8px 12px",cursor:"pointer",color:"#fff",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",gap:4}}><Download size={13}/>CSV</button><button className="ba" onClick={exportHTML} style={{background:C.green,border:"none",borderRadius:10,padding:"8px 12px",cursor:"pointer",color:"#fff",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",gap:4}}><Download size={13}/>HTML</button>
      </div>
    </div>
    <div style={{background:C.navy,borderRadius:18,padding:20,marginBottom:16,color:"#fff"}}>
      <div className="fv-grid-3">
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
      {mExp.length===0&&<Empty text={"No expenses in "+FULL_MOS[mo]+" "+yr} icon={FileText}/>}
    </div>
  </div>);
}
