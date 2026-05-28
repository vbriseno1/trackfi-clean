import React from "react";
import { C, MF } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";
import { totalCheckingBalance, totalSavingsBalance } from "../lib/cashAccounts.js";
import { sumDebtsPrincipalAndAccrued, approxMonthlyInterestOnDebts } from "../lib/debtLogic.js";
import { legacyCreditCardOwed } from "../lib/creditCardTotals.js";
import { dueIn } from "../lib/dateHelpers.js";

export default function FinancialPhysicalView({income,expenses,debts,accounts,bills,savingsGoals}){
  const ti=(parseFloat(income.primary||0)*(income.payFrequency==="Weekly"?(52/12):income.payFrequency==="Twice Monthly"?2:income.payFrequency==="Monthly"?1:(26/12)))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const annualIncome=ti*12;
  const te=expenses.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const td=sumDebtsPrincipalAndAccrued(debts)+legacyCreditCardOwed(accounts,debts);
  const tm=debts.reduce((s,d)=>s+(parseFloat(d.minPayment)||0),0);
  const liq=(totalSavingsBalance(accounts))+(parseFloat(accounts.cushion||0));
  const ta=(totalCheckingBalance(accounts))+(totalSavingsBalance(accounts))+(parseFloat(accounts.cushion||0))+(parseFloat(accounts.investments||0))+(parseFloat(accounts.k401||0))+(parseFloat(accounts.roth_ira||0))+(parseFloat(accounts.brokerage||0))+(parseFloat(accounts.crypto||0))+(parseFloat(accounts.hsa||0))+(parseFloat(accounts.property||0))+(parseFloat(accounts.vehicles||0));
  const mAvg=te/Math.max(1,new Date().getMonth()+1);
  const efMo=mAvg>0?liq/mAvg:0;
  const sr=ti>0?Math.max(0,(ti-mAvg)/ti*100):0;
  const dti=ti>0?(tm/ti)*100:0;
  const nw=ta-td;
  const ov=bills.filter(b=>!b.paid&&dueIn(b.dueDate)<0).length;
  const mi=approxMonthlyInterestOnDebts(debts);
  const priorities=[];
  if(ov)priorities.push({ic:"🚨",c:C.red,t:"Pay overdue bills",d:ov+" bill"+(ov!==1?"s":" ")+"past due"});
  if(liq<1000)priorities.push({ic:"🛡️",c:C.amber,t:"Build $1,000 emergency fund",d:"Have "+fmt(liq)+" — need "+fmt(Math.max(0,1000-liq))+" more"});
  if(dti>36)priorities.push({ic:"💳",c:C.red,t:"Reduce debt load",d:"DTI "+dti.toFixed(1)+"% — target under 28%"});
  if(sr<5&&ti>0)priorities.push({ic:"📉",c:C.amber,t:"Boost savings rate",d:"Currently "+sr.toFixed(1)+"% — target 15-20%"});
  if(efMo<3)priorities.push({ic:"💰",c:C.amber,t:"Grow emergency fund",d:efMo.toFixed(1)+" months saved — target 3-6"});
  if(mi>100)priorities.push({ic:"⚡",c:C.accent,t:"Tackle interest costs",d:"~\u2248 "+fmt(mi)+"/mo at APR\u00f712 on listed debts"});
  return(<div className="fu">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text}}>Financial Physical</div>
      <div style={{fontSize:12,color:C.textLight}}>Dave Ramsey framework</div>
    </div>
    <div style={{background:`linear-gradient(135deg,${C.navy} 0%,${C.navyLight} 50%,${C.accent}22 100%)`,borderRadius:18,padding:20,marginBottom:16,color:"#fff"}}>
      <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Financial Vitals</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
        {[["Net Worth",fmt(nw),nw>=0?C.greenMid:C.redMid,"Your assets minus all debts"],["Emergency Fund",efMo.toFixed(1)+" months",efMo>=6?C.greenMid:efMo>=3?C.amberMid:C.redMid,"Target: 3-6 months"],["Savings Rate",sr.toFixed(1)+"%",sr>=15?C.greenMid:sr>=5?C.amberMid:C.redMid,"Target: 15-20%"],["Debt-to-Income",dti.toFixed(1)+"%",dti<=28?C.greenMid:dti<=36?C.amberMid:C.redMid,"Target: under 28%"]].map(([l,v,c,tip])=>(
          <div key={l} style={{background:"rgba(255,255,255,.08)",borderRadius:12,padding:"12px 12px"}}>
            <div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:3,textTransform:"uppercase"}}>{l}</div>
            <div style={{fontFamily:MF,fontSize:17,fontWeight:800,color:c,marginBottom:3}}>{v}</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,.3)"}}>{tip}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
        {[["Monthly In",fmt(ti),C.greenMid],["Monthly Out",fmt(mAvg),C.redMid],["Net Cash",fmt(ti-mAvg),(ti-mAvg)>=0?C.greenMid:C.redMid]].map(([l,v,c])=>(
          <div key={l} style={{background:"rgba(255,255,255,.06)",borderRadius:10,padding:"9px 8px",textAlign:"center"}}>
            <div style={{fontSize:9,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:2,textTransform:"uppercase"}}>{l}</div>
            <div style={{fontFamily:MF,fontSize:13,fontWeight:700,color:c}}>{v}</div>
          </div>
        ))}
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
