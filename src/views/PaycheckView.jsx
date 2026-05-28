import React, { useState } from "react";
import { DollarSign, Plus } from "lucide-react";
import { C, MF } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";
import { BarProg } from "../components/ui.jsx";
import { totalCheckingBalance } from "../lib/cashAccounts.js";
import { sumMtdCheckingSpend } from "../lib/accountsLogic.js";
import { dueIn } from "../lib/dateHelpers.js";

export default function PaycheckView({bills,income,setIncome,expenses,accounts,budgetGoals=[],onAdd,onRecordPaycheck}){
  const now=new Date();
  const ti=(parseFloat(income.primary||0)*(income.payFrequency==="Weekly"?(52/12):income.payFrequency==="Twice Monthly"?2:income.payFrequency==="Monthly"?1:(26/12)))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const checking=totalCheckingBalance(accounts);
  const payFreq=income.payFrequency||"Biweekly";
  // Pay per period based on frequency
  const payPerPeriod=payFreq==="Weekly"?ti/(52/12):payFreq==="Biweekly"?ti/(26/12):payFreq==="Twice Monthly"?ti/2:ti;
  const payPeriodLabel=payFreq==="Weekly"?"weekly":payFreq==="Biweekly"?"biweekly":payFreq==="Twice Monthly"?"semi-monthly":"monthly";
  // Next payday — uses lastPayDate anchor if set, else freq-based estimate
  const today=now.getDate();
  let nextPay,daysUntilPay;
  if(income.lastPayDate){
    const last=new Date(income.lastPayDate+"T00:00:00");
    const nxt=new Date(last);let safety=0;
    while(nxt<=now&&safety<60){
      if(payFreq==="Weekly")nxt.setDate(nxt.getDate()+7);
      else if(payFreq==="Twice Monthly"){if(nxt.getDate()<15)nxt.setDate(15);else nxt.setMonth(nxt.getMonth()+1,1);}
      else if(payFreq==="Monthly")nxt.setMonth(nxt.getMonth()+1);
      else nxt.setDate(nxt.getDate()+14);
      safety++;
    }
    nextPay=nxt;daysUntilPay=Math.max(0,Math.ceil((nxt-now)/86400000));
  }else if(payFreq==="Twice Monthly"){
    if(today<15){nextPay=new Date(now.getFullYear(),now.getMonth(),15);daysUntilPay=15-today;}
    else{nextPay=new Date(now.getFullYear(),now.getMonth()+1,1);daysUntilPay=new Date(now.getFullYear(),now.getMonth()+1,0).getDate()-today+1;}
  }else if(payFreq==="Monthly"){
    nextPay=new Date(now.getFullYear(),now.getMonth()+1,1);daysUntilPay=new Date(now.getFullYear(),now.getMonth()+1,0).getDate()-today+1;
  }else if(payFreq==="Weekly"){
    nextPay=new Date(now);nextPay.setDate(now.getDate()+7);daysUntilPay=7;
  }else{
    nextPay=new Date(now);nextPay.setDate(now.getDate()+14);daysUntilPay=14;
  }
  const billsBeforePay=bills.filter(b=>{if(b.paid)return false;const d=new Date(b.dueDate+"T00:00:00");return d<=nextPay;});
  const beforeTotal=billsBeforePay.reduce((s,b)=>s+(parseFloat(b.amount)||0),0);
  const thisMs=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
  const spentSoFar=expenses.filter(e=>e.date?.startsWith(thisMs)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const spentCheckingMtd=sumMtdCheckingSpend(expenses,thisMs);
  const mSpent=spentSoFar;const _pvMult=income.payFrequency==="Weekly"?(52/12):income.payFrequency==="Twice Monthly"?2:income.payFrequency==="Monthly"?1:(26/12);const ti2=(parseFloat(income.primary||0)*_pvMult)+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const dailyBurnChecking=spentCheckingMtd/Math.max(1,today);
  const projectedSpend=dailyBurnChecking*daysUntilPay;
  // Match AppInner sts formula: checking + other income - bills before pay - projected - envelopes - buffer
  const _pvOtherMonthly=(parseFloat(income.other||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const _pvOtherProRated=_pvOtherMonthly*(daysUntilPay/30);
  const _pvEnvMs=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
  const _pvEnvReserve=budgetGoals.reduce((s,g)=>{
    const lim=parseFloat(g.limit||0);if(!lim)return s;
    const spentG=expenses.filter(e=>e.category===g.category&&(e.date||"").startsWith(_pvEnvMs)).reduce((a,e)=>a+(parseFloat(e.amount)||0),0);
    return s+(Math.max(0,lim-spentG)*Math.min(1,daysUntilPay/30));
  },0);
  const[editSched,setEditSched]=useState(false);
  const[localFreq,setLocalFreq]=useState(()=>income.payFrequency||"Biweekly");
  const[localDate,setLocalDate]=useState(()=>income.lastPayDate||"");
  const safeToSpend=Math.max(0,checking+_pvOtherProRated-beforeTotal-projectedSpend-_pvEnvReserve-200);
  return(
    <div className="fu fv-view-root">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4,flexWrap:"wrap",gap:8}}>
        <div className="fv-page-title">Paycheck planner</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          {parseFloat(income.primary||0)>0&&income.lastPayDate&&typeof onRecordPaycheck==="function"&&(
            <button type="button" className="ba" onClick={onRecordPaycheck} style={{display:"flex",alignItems:"center",gap:5,background:C.green,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer"}}><DollarSign size={14}/>Record paycheck</button>
          )}
          <button type="button" className="ba" onClick={onAdd} style={{display:"flex",alignItems:"center",gap:5,background:C.accent,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer"}}><Plus size={13}/>Log Spending</button>
        </div>
      </div>
      {(()=>{
        return(<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:editSched?10:16}}>
            <div style={{fontSize:13,color:C.textLight}}>
              {income.lastPayDate?<span>📅 Anchored to {new Date(income.lastPayDate+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>:<span>Plan your spending around your next paycheck</span>}
            </div>
            <button onClick={()=>setEditSched(e=>!e)} style={{background:C.surfaceAlt,border:`1px solid ${C.border}`,borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:700,color:C.textMid,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
              ⚙️ Pay Schedule
            </button>
          </div>
          {editSched&&<div style={{background:C.surface,border:`1.5px solid ${C.accentMid}`,borderRadius:14,padding:16,marginBottom:16}}>
            <div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.text,marginBottom:12}}>Pay Schedule</div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:700,color:C.textLight,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Frequency</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {["Weekly","Biweekly","Twice Monthly","Monthly"].map(f=>(
                  <button key={f} onClick={()=>setLocalFreq(f)} style={{padding:"6px 11px",borderRadius:99,border:`1.5px solid ${localFreq===f?C.accent:C.border}`,background:localFreq===f?C.accentBg:"transparent",fontSize:12,fontWeight:localFreq===f?700:500,color:localFreq===f?C.accent:C.textMid,cursor:"pointer"}}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:C.textLight,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Last Payday Date</div>
              <input type="date" value={localDate} onChange={e=>setLocalDate(e.target.value)}
                style={{width:"100%",background:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"10px 12px",fontSize:14,color:C.text,outline:"none",boxSizing:"border-box"}}/>
              <div style={{fontSize:11,color:C.textLight,marginTop:4}}>The app will calculate your exact next payday from this anchor date</div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{setIncome(p=>({...p,payFrequency:localFreq,lastPayDate:localDate}));setEditSched(false);}} style={{flex:1,padding:"10px",borderRadius:12,background:C.accent,border:"none",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>Save Schedule</button>
              <button onClick={()=>setEditSched(false)} style={{padding:"10px 14px",borderRadius:12,background:C.bg,border:`1px solid ${C.border}`,color:C.textMid,fontWeight:600,fontSize:13,cursor:"pointer"}}>Cancel</button>
            </div>
          </div>}
        </>);
      })()}
      <div className="fv-hero-panel" style={{marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Next Payday</div>
        <div style={{fontFamily:MF,fontSize:32,fontWeight:800,color:"#fff",marginBottom:4}}>{daysUntilPay===0?"Today!":daysUntilPay+" days"}</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,.5)",marginBottom:16}}>{nextPay.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div>
        <div className="fv-grid-3">{[["Expected "+payPeriodLabel,fmt(payPerPeriod),C.greenMid],["Bills due",fmt(beforeTotal),C.redMid],["Safe to spend",fmt(safeToSpend),safeToSpend>500?C.greenMid:safeToSpend>0?C.amberMid:C.redMid]].map(([l,v,c])=><div key={l} style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"9px 8px"}}><div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:2}}>{l.toUpperCase()}</div><div style={{fontFamily:MF,fontSize:13,fontWeight:700,color:c}}>{v}</div></div>)}</div>
      </div>
      <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:12}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>Bills Before Payday</div>
        <div style={{fontSize:12,color:C.textLight,marginBottom:12}}>Due before {nextPay.toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>
      <div style={{background:C.surface,borderRadius:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"12px 14px",marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{fontSize:12,fontWeight:600,color:C.textLight}}>Spending So Far This Month</div><div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>-{fmt(mSpent)}</div></div><BarProg pct={ti2>0?Math.min(100,mSpent/ti2*100):0} color={mSpent>ti2*0.8?C.red:mSpent>ti2*0.5?C.amber:C.green} h={8}/><div style={{display:"flex",justifyContent:"space-between",marginTop:6}}><span style={{fontSize:11,color:C.textLight}}>{ti2>0?Math.round(mSpent/ti2*100):0}% of income</span><span style={{fontSize:11,color:C.green}}>{fmt(Math.max(0,ti2-mSpent))} left</span></div></div>
        {billsBeforePay.length===0?<div style={{fontSize:13,color:C.green,fontWeight:500}}>✅ No bills due before payday</div>:billsBeforePay.map(b=>{const d=dueIn(b.dueDate);const col=d<0?C.red:d<=3?C.red:d<=7?C.amber:C.textLight;return(<div key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${C.border}`}}><div><div style={{fontSize:13,fontWeight:600,color:C.text}}>{b.name}</div><div style={{fontSize:11,color:col,fontWeight:500}}>{d<0?Math.abs(d)+"d overdue":d===0?"Today":d+"d left"}</div></div><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:col}}>{fmt(b.amount)}</div></div>);})}
        {billsBeforePay.length>0&&<div style={{display:"flex",justifyContent:"space-between",paddingTop:10,marginTop:4,borderTop:`1px solid ${C.border}`}}><span style={{fontSize:13,fontWeight:600,color:C.text}}>Total</span><span style={{fontFamily:MF,fontWeight:800,fontSize:16,color:C.red}}>{fmt(beforeTotal)}</span></div>}
      </div>
      <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:12}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:12}}>Projected Spending</div>
        <div style={{fontSize:11,color:C.textLight,marginBottom:10,lineHeight:1.45}}>Burn & projection use <strong>checking</strong> spending only. Credit card, savings, and “track only” don’t reduce this cash forecast.</div>
        {[["Daily burn (checking)",fmt(dailyBurnChecking)+"/day",C.textMid],["Days until pay",String(daysUntilPay)+" days",C.textMid],["Projected spend",fmt(projectedSpend),projectedSpend>payPerPeriod?C.red:C.amber],["Checking balance",fmt(checking),C.green],["Bills due","-"+fmt(beforeTotal),C.red],["Safe to spend",fmt(safeToSpend),safeToSpend>500?C.green:safeToSpend>0?C.amber:C.red]].map(([l,v,c])=><div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:13,color:C.textMid}}>{l}</span><span style={{fontFamily:MF,fontWeight:700,fontSize:13,color:c}}>{v}</span></div>)}
      </div>
      {budgetGoals.length>0&&(()=>{
        const thisMs=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
        const envelopes=budgetGoals.map(g=>{
          const lim=parseFloat(g.limit||0);
          const spent=expenses.filter(e=>e.category===g.category&&(e.date||"").startsWith(thisMs)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
          const remaining=Math.max(0,lim-spent);
          const reserve=remaining*(Math.min(1,daysUntilPay/30));
          return{...g,lim,spent,reserve};
        }).filter(g=>g.lim>0);
        if(!envelopes.length)return null;
        const totalReserve=envelopes.reduce((s,g)=>s+g.reserve,0);
        return(
          <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Envelope Reserves</div>
              <div style={{fontSize:12,color:C.purple,fontWeight:700,background:C.purpleBg,borderRadius:99,padding:"2px 8px"}}>{fmt(totalReserve)} reserved</div>
            </div>
            <div style={{fontSize:12,color:C.textLight,marginBottom:12}}>Variable budget portions reserved until payday</div>
            {envelopes.map(g=>(
              <div key={g.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${C.borderLight}`}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:C.text}}>{g.category}</div>
                  {g.note&&<div style={{fontSize:11,color:C.textLight}}>{g.note}</div>}
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.purple}}>{fmt(g.reserve)}</div>
                  <div style={{fontSize:10,color:C.textFaint}}>{fmt(g.spent)} spent · {fmt(g.lim)}/mo</div>
                </div>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,marginTop:4,borderTop:`1px solid ${C.border}`}}>
              <span style={{fontSize:13,fontWeight:600,color:C.text}}>Total reserved</span>
              <span style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.purple}}>{fmt(totalReserve)}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
