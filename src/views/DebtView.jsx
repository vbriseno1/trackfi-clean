import React, { useState, useMemo, useEffect } from "react";
import { Plus, CreditCard, TrendingDown, ChevronRight, ChevronLeft, Wallet, X, Trash2, Calculator } from "lucide-react";
import { C, MF, debtDisplayColor, PIE_COLORS } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";
import { BarProg, Empty } from "../components/ui.jsx";
import { RechartsReady } from "../components/RechartsBridge.jsx";
import ExtraPayModal from "../modals/ExtraPayModal.jsx";
import { isLoanDebt, splitLoanPayment, applyLoanPaymentToDebtRow, debtOwedForBreakdown, sumDebtsPrincipalAndAccrued, approxMonthlyInterestOnDebts, debtOriginalBaseline, loanDebtsList } from "../lib/debtLogic.js";
import { simRowsFromDebts, simulateMultiDebtPayoff, singleDebtPayoffMonths } from "../lib/debtPayoffSim.js";
import { cardDebtsList, isCreditCardDebt } from "../lib/creditCardTotals.js";
import { todayStr } from "../lib/moneyFormat.js";
import { round2 } from "../lib/loanSplit.js";

export default function DebtView({debts,setDebts,setBills,setModal,setEditItem,showToast,extraPayDebt=0,setExtraPayDebt,onAddDebt,debtSavePing=0}){
  const[selectedDebt,setSelectedDebt]=useState(null);
  const[strategy,setStrategy]=useState("avalanche");
  const[payModal,setPayModal]=useState(null);
  const simRows=useMemo(()=>simRowsFromDebts(debts),[debts]);
  const baseSim=useMemo(()=>simulateMultiDebtPayoff(simRows,{strategy,extraMonthly:0,maxMonths:600,returnSeries:true}),[simRows,strategy]);
  const extraSim=useMemo(()=>(extraPayDebt>0?simulateMultiDebtPayoff(simRows,{strategy,extraMonthly:Number(extraPayDebt)||0,maxMonths:600,returnSeries:true}):null),[simRows,strategy,extraPayDebt]);
  const chartDebtData=useMemo(()=>{
    const s=baseSim.series;
    if(!s?.length)return[];
    const exS=extraSim?.series;
    const last=s[s.length-1]?.month||0;
    const maxPts=15;
    const step=Math.max(1,Math.ceil(last/Math.max(1,maxPts-1)));
    const out=[];
    for(let mo=0;mo<=last;mo+=step){
      const bp=s.find(x=>x.month>=mo)??s[s.length-1];
      let extraPt;
      if(exS?.length)extraPt=(exS.find(x=>x.month>=mo)??exS[exS.length-1])?.totalOwed;
      out.push({mo,base:bp.totalOwed,extra:extraPt});
    }
    const lastPt=s[s.length-1];
    if(out.length&&lastPt&&out[out.length-1].mo<lastPt.month)out.push({mo:lastPt.month,base:lastPt.totalOwed,extra:exS?.length?(exS[exS.length-1]?.totalOwed):undefined});
    return out;
  },[baseSim.series,extraSim?.series]);
  const totalDebt=debts.reduce((s,d)=>s+debtOwedForBreakdown(d),0);
  const totalOriginal=debts.reduce((s,d)=>s+debtOriginalBaseline(d),0);
  const totalPaidDown=Math.max(0,totalOriginal-totalDebt);
  const overallPct=totalOriginal>0?Math.round(totalPaidDown/totalOriginal*100):0;
  const pieData=debts.map((d)=>({name:d.name,value:debtOwedForBreakdown(d),color:debtDisplayColor(d,debts),debt:d}));
  function calcPayoff(d){
    const owed=debtOwedForBreakdown(d);
    const r=singleDebtPayoffMonths(owed,d?.rate,d?.minPayment);
    if(owed<=0)return{months:0,totalInterest:0,payoffDate:"Paid off"};
    if(!r.feasible)return{months:999,totalInterest:999999,payoffDate:"Never"};
    const d2=new Date();d2.setMonth(d2.getMonth()+r.months);
    return{months:r.months,totalInterest:r.totalInterest,payoffDate:d2.toLocaleDateString("en-US",{month:"long",year:"numeric"})};
  }
  const prioritized=[...debts].sort((a,b)=>strategy==="avalanche"?(parseFloat(b.rate)||0)-(parseFloat(a.rate)||0):debtOwedForBreakdown(a)-debtOwedForBreakdown(b));
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
      <div style={{marginBottom:16}}>
        <div style={{display:"flex",flexWrap:"wrap",justifyContent:"space-between",alignItems:"flex-start",gap:10,minWidth:0}}>
          <div style={{minWidth:0,flex:"1 1 min(200px, 100%)"}}>
            <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.4}}>Debt Tracker</div>
            <div style={{fontSize:13,color:C.textLight}}>{fmt(totalDebt)} total across {debts.length} debt{debts.length!==1?"s":""}</div>
            {debts.length>0&&<div style={{fontSize:11,color:C.textLight,marginTop:6,lineHeight:1.45}}>Saves to this device automatically{debtSavePing?<> · last update {new Date(debtSavePing).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}</>:null}. Sign in for cloud backup.</div>}
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end",flex:"1 1 auto",minWidth:0}}>
            {debts.length>0&&<button type="button" className="ba" onClick={()=>setModal("simulator")} style={{display:"flex",alignItems:"center",gap:5,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 12px",color:C.textMid,fontWeight:600,fontSize:13,cursor:"pointer",whiteSpace:"nowrap"}}><Calculator size={13}/>Sim</button>}
            <button type="button" className="ba" onClick={()=>(onAddDebt||(()=>setModal("debt")))()} style={{display:"flex",alignItems:"center",gap:5,background:C.accent,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",whiteSpace:"nowrap"}}><Plus size={13}/>Add Debt</button>
          </div>
        </div>
        {debts.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8,marginTop:14}}><div style={{background:C.redBg,borderRadius:12,padding:"10px 8px",textAlign:"center",minWidth:0}}><div style={{fontSize:10,color:C.red,marginBottom:2,fontWeight:600,letterSpacing:.5}}>REMAINING</div><div style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.red}}>{fmt(totalDebt)}</div></div><div style={{background:C.greenBg,borderRadius:12,padding:"10px 8px",textAlign:"center",minWidth:0}}><div style={{fontSize:10,color:C.green,marginBottom:2,fontWeight:600,letterSpacing:.5}}>PAID DOWN</div><div style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.green}}>{fmt(totalPaidDown)}</div></div><div style={{background:C.accentBg,borderRadius:12,padding:"10px 8px",textAlign:"center",minWidth:0}}><div style={{fontSize:10,color:C.accent,marginBottom:2,fontWeight:600,letterSpacing:.5}}>PROGRESS</div><div style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.accent}}>{overallPct}%</div></div></div>}
      </div>
      {debts.length===0&&<Empty text="No debts tracked. Add one to start your payoff plan!" icon={CreditCard}/>}
      {debts.length>0&&<>
        <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:20,marginBottom:14}}>
          <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>Debt Breakdown</div>
          <div style={{fontSize:12,color:C.textLight,marginBottom:12}}>Tap a slice to see details</div>
          <div className="debt-pie-row">
            <div className="fv-chart-wrap" style={{width:"100%",maxWidth:300,margin:"0 auto"}}>
            <RechartsReady minHeight={200} render={R=>(
            <R.ResponsiveContainer width="100%" height={200}>
              <R.PieChart>
              <R.Pie data={pieData} cx="50%" cy="50%" innerRadius="28%" outerRadius="48%" dataKey="value" labelLine={false} label={renderLabel} onClick={(entry)=>setSelectedDebt(selectedDebt?.debt?.id===entry.debt?.id?null:entry)}>
                {pieData.map((entry,i)=>(<R.Cell key={i} fill={entry.color} stroke={selectedDebt?.debt?.id===entry.debt?.id?"#fff":"transparent"} strokeWidth={selectedDebt?.debt?.id===entry.debt?.id?3:0} style={{cursor:"pointer",opacity:selectedDebt&&selectedDebt.debt?.id!==entry.debt?.id?0.5:1}}/>))}
              </R.Pie>
            </R.PieChart>
            </R.ResponsiveContainer>
            )}/>
            </div>
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
            const orig=debtOriginalBaseline(d);
            const pct=orig>0?Math.min(100,((orig-bal)/orig)*100):0;
            return(
              <div style={{marginTop:14,background:selectedDebt.color+"12",border:`1.5px solid ${selectedDebt.color}33`,borderRadius:14,padding:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div><div style={{fontFamily:MF,fontSize:16,fontWeight:800,color:C.text}}>{d.name}</div>
                    <div style={{display:"flex",gap:6,marginTop:3,flexWrap:"wrap"}}>
                      {d.type&&<span style={{fontSize:11,fontWeight:600,background:selectedDebt.color+"20",color:selectedDebt.color,padding:"2px 8px",borderRadius:99}}>{d.type}</span>}
                      {d.rate&&<span style={{fontSize:11,color:C.textLight,fontWeight:500}}>{d.rate}% APR</span>}{(()=>{const po=calcPayoff(d);return po.months>0&&po.months<500?<span style={{fontSize:11,color:C.green,fontWeight:600}}> · payoff {po.months}mo</span>:null;})()}
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:MF,fontSize:22,fontWeight:800,color:C.red}}>{fmt(debtOwedForBreakdown(d))}</div>
                    <div style={{fontSize:10,color:C.textLight,marginTop:2,fontWeight:500}}>{isLoanDebt(d)?(parseFloat(d.loanAccruedInterest)>0.001?`${fmt(bal)} principal + ${fmt(d.loanAccruedInterest)} accrued`:"Principal balance"):isCreditCardDebt(d)?"Principal balance":"Owed"}</div>
                  </div>
                </div>
                {isLoanDebt(d)&&(parseFloat(d.loanAccruedInterest)||0)>0.001&&bal>0&&(()=>{const c=parseFloat(d.loanAccruedInterest)||0,t=bal+c;return(<div style={{marginBottom:10}}><div style={{height:8,borderRadius:99,overflow:"hidden",display:"flex",marginBottom:6}}><div style={{width:(100*bal/t).toFixed(1)+"%",background:C.red,transition:"width .3s"}}/><div style={{flex:1,minWidth:0,background:C.amber,opacity:.85}}/></div><div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.textLight}}><span>Principal</span><span>Accrued interest</span></div></div>);})()}
                {orig>bal&&<><BarProg pct={pct} color={selectedDebt.color} h={7}/><div style={{display:"flex",justifyContent:"space-between",marginTop:4,marginBottom:10,fontSize:12,color:C.textLight}}><span>{pct.toFixed(0)}% paid off</span><span>of {fmt(orig)}</span></div></>}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                  {(isCreditCardDebt(d)
                    ?[["Payoff",proj.payoffDate],["Time left",proj.months<600?proj.months+" months":"Too long"],["Total Int.",proj.totalInterest<999999?fmt(proj.totalInterest):"—"],["APR",(d.rate||"0")+"%"]]
                    :[["Payoff",proj.payoffDate],["Time left",proj.months<600?proj.months+" months":"Too long"],["Total Int.",proj.totalInterest<999999?fmt(proj.totalInterest):"Reduce payment"],["Mo. Interest","~\u2248 "+fmt((parseFloat(d.rate)||0)/100/12*debtOwedForBreakdown(d))]]
                  ).map(([l,v])=>(
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
          const totalBal=debts.reduce((s,d)=>s+debtOwedForBreakdown(d),0);
          const totalMin=debts.reduce((s,d)=>{const ow=debtOwedForBreakdown(d);if(ow<=0)return s;const r=(parseFloat(d.rate)||0)/100/12;return s+(parseFloat(d.minPayment)>0?parseFloat(d.minPayment):Math.max(25,ow*0.02+r*ow));},0);
          const withExtra=extraSim;
          const moSaved=withExtra?Math.max(0,baseSim.months-withExtra.months):0;
          const intSaved=withExtra?Math.max(0,baseSim.totalInterest-withExtra.totalInterest):0;
          const dfDate=new Date();dfDate.setMonth(dfDate.getMonth()+baseSim.months);
          const dfDateExtra=withExtra?new Date():null;if(dfDateExtra)dfDateExtra.setMonth(dfDateExtra.getMonth()+withExtra.months);
          const yrs=Math.floor(baseSim.months/12);const mos2=baseSim.months%12;
          const timeStr=yrs>0?yrs+"y "+(mos2>0?mos2+"mo":""):mos2+"mo";
          const stratLabel=strategy==="avalanche"?"highest APR":"smallest balance";
          const stuck=baseSim.capped||!baseSim.debtFree;
          return(
            <div style={{background:`linear-gradient(135deg,${C.navy},${C.navyLight})`,borderRadius:18,padding:20,marginBottom:14,color:"#fff"}}>
              <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>🎯 Debt-Free Projection</div>
              <div style={{fontFamily:MF,fontSize:30,fontWeight:800,color:C.greenMid,marginBottom:2,letterSpacing:-.5}}>{stuck?"Increase payments":dfDate.toLocaleDateString("en-US",{month:"long",year:"numeric"})}</div>
              <div style={{fontSize:13,color:"rgba(255,255,255,.5)",marginBottom:16}}>{stuck?"Payments may not cover interest on one or more debts":`${timeStr} · APR÷12 estimate · minimums on all, roll freed cash to ${stratLabel}`}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8,marginBottom:16}}>
                {[["Total Owed",fmt(totalBal),"#fca5a5"],["Min/mo",fmt(totalMin),"rgba(255,255,255,.8)"],["Total Interest",!stuck?fmt(baseSim.totalInterest):"—","rgba(255,255,255,.6)"]].map(([l,v,c])=>(
                  <div key={l} style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"9px 8px"}}>
                    <div style={{fontSize:9,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:2,textTransform:"uppercase"}}>{l}</div>
                    <div style={{fontFamily:MF,fontSize:12,fontWeight:700,color:c}}>{v}</div>
                  </div>
                ))}
              </div>
              {!stuck&&baseSim.months>0&&baseSim.months<500&&chartDebtData.length>0&&(()=>{
                const chartData=chartDebtData;
                return(
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,.6)",marginBottom:8}}>Payoff Timeline</div>
                    <RechartsReady minHeight={120} render={R=>(
                    <R.ResponsiveContainer width="100%" height={120}>
                      <R.AreaChart data={chartData} margin={{left:0,right:8,top:4,bottom:0}}>
                        <defs>
                          <linearGradient id="debtGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#fca5a5" stopOpacity={.3}/>
                            <stop offset="95%" stopColor="#fca5a5" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="debtGradX" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={C.green} stopOpacity={.3}/>
                            <stop offset="95%" stopColor={C.green} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <R.XAxis dataKey="mo" tick={{fill:"rgba(255,255,255,.3)",fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>v+"mo"}/>
                        <R.YAxis tick={{fill:"rgba(255,255,255,.3)",fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+(v>=1000?(v/1000).toFixed(0)+"k":v)} width={40}/>
                        <R.Tooltip formatter={(v,n)=>[fmt(v),n==="base"?`Combined (${strategy})`:"With extra"]} contentStyle={{background:C.navy,border:"1px solid rgba(255,255,255,.15)",borderRadius:10,fontSize:11}} labelFormatter={v=>v+"mo"}/>
                        <R.Area type="monotone" dataKey="base" stroke="#fca5a5" strokeWidth={2} fill="url(#debtGrad)" dot={false} name="base"/>
                        {withExtra&&<R.Area type="monotone" dataKey="extra" stroke={C.greenMid} strokeWidth={2} fill="url(#debtGradX)" dot={false} name="extra"/>}
                      </R.AreaChart>
                    </R.ResponsiveContainer>
                    )}/>
                    {withExtra&&<div style={{display:"flex",gap:12,justifyContent:"center",marginTop:4}}>
                      <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"rgba(255,255,255,.5)"}}><div style={{width:12,height:2,background:"#fca5a5",borderRadius:1}}/> {strategy==="avalanche"?"Avalanche baseline":"Snowball baseline"}</div>
                      <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"rgba(255,255,255,.5)"}}><div style={{width:12,height:2,background:C.greenMid,borderRadius:1}}/> With extra</div>
                    </div>}
                  </div>
                );
              })()}
              <div style={{background:"rgba(255,255,255,.06)",borderRadius:12,padding:"12px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,.7)"}}>What if you paid extra?</div>
                  <div style={{fontFamily:MF,fontWeight:800,fontSize:15,color:extraPayDebt>0?C.greenMid:"rgba(255,255,255,.4)"}}>+{fmt(extraPayDebt)}/mo</div>
                </div>
                {/* Quick amounts */}
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                  {[25,50,100,200,500,1000].map(amt=>(
                    <button key={amt} onClick={()=>setExtraPayDebt(amt)}
                      style={{padding:"5px 11px",borderRadius:99,border:`1.5px solid ${extraPayDebt===amt?"rgba(52,211,153,.8)":"rgba(255,255,255,.15)"}`,background:extraPayDebt===amt?"rgba(52,211,153,.15)":"rgba(255,255,255,.06)",color:extraPayDebt===amt?"#34D399":"rgba(255,255,255,.5)",fontSize:11,fontWeight:extraPayDebt===amt?700:500,cursor:"pointer",fontFamily:MF}}>
                      +${amt}
                    </button>
                  ))}
                </div>
                {/* Typed input */}
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:extraPayDebt>0?10:0}}>
                  <div style={{position:"relative",flex:1}}>
                    <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,.4)",fontWeight:700,fontSize:15}}>$</span>
                    <input type="number" value={extraPayDebt||""} onChange={e=>setExtraPayDebt(Math.max(0,parseInt(e.target.value)||0))}
                      placeholder="Custom amount"
                      style={{width:"100%",background:"rgba(255,255,255,.08)",border:`1.5px solid ${extraPayDebt>0?"rgba(52,211,153,.5)":"rgba(255,255,255,.15)"}`,borderRadius:10,padding:"10px 12px 10px 28px",fontSize:15,fontFamily:MF,fontWeight:700,color:extraPayDebt>0?"#34D399":"#fff",outline:"none",boxSizing:"border-box"}}/>
                  </div>
                  {extraPayDebt>0&&<button onClick={()=>setExtraPayDebt(0)} style={{background:"rgba(255,255,255,.08)",border:"none",borderRadius:8,padding:"10px 12px",color:"rgba(255,255,255,.4)",cursor:"pointer",fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>Clear</button>}
                </div>
                {extraPayDebt>0&&withExtra&&withExtra.months<baseSim.months&&<div style={{background:"rgba(52,211,153,.15)",border:"1px solid rgba(52,211,153,.3)",borderRadius:10,padding:"10px 12px"}}>
                  <div style={{fontFamily:MF,fontWeight:800,fontSize:16,color:C.greenMid,marginBottom:2}}>{dfDateExtra.toLocaleDateString("en-US",{month:"long",year:"numeric"})}</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,.6)"}}>🎉 {moSaved} months sooner · save {fmt(intSaved)} in interest</div>
                </div>}
                {extraPayDebt>0&&withExtra&&withExtra.months>=baseSim.months&&<div style={{fontSize:12,color:"rgba(255,255,255,.4)"}}>Already at minimum threshold</div>}
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
            const color=debtDisplayColor(d,debts);
            return(
              <div key={d.id} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"12px 0",borderBottom:i<prioritized.length-1?`1px solid ${C.border}`:"none"}}>
                <div style={{width:28,height:28,borderRadius:8,background:color+"20",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:MF,fontWeight:800,fontSize:13,color,flexShrink:0}}>#{i+1}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:2}}>{d.name}</div>
                  <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                    <span style={{fontSize:12,color:C.red,fontWeight:600}}>{fmt(debtOwedForBreakdown(d))}</span>
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
          const mi=(parseFloat(d.rate)||0)/100/12*debtOwedForBreakdown(d);
          const color=debtDisplayColor(d,debts);
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
                      {!isCreditCardDebt(d)&&mi>0&&<span style={{fontSize:11,color:C.textLight}}>~\u2248 {fmt(mi)}/mo (APR\u00f712)</span>}
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontFamily:MF,fontWeight:800,fontSize:16,color:C.red}}>{fmt(bal)}{isCreditCardDebt(d)&&<span style={{display:"block",fontSize:9,color:C.textLight,fontWeight:500,marginTop:1}}>principal</span>}</span>
                  <button onClick={()=>setPayModal(d)} style={{background:C.greenBg,border:`1px solid ${C.greenMid}`,borderRadius:8,cursor:"pointer",color:C.green,fontSize:11,fontWeight:700,padding:"4px 8px"}}>💳 Pay</button>
                  <button onClick={()=>setEditItem({type:"debt",data:d})} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,fontSize:12,fontWeight:600,padding:"4px 6px"}}>Edit</button>
                  <button onClick={()=>{setDebts(p=>p.filter(x=>x.id!==d.id));setBills&&setBills(p=>p.filter(x=>String(x.linkedDebtId)!==String(d.id)));showToast&&showToast("Debt removed","error");}} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,padding:"4px 3px",display:"flex"}}><Trash2 size={13}/></button>
                </div>
              </div>
              {d.original&&<><BarProg pct={pct} color={pct>60?C.green:pct>30?C.accent:C.red} h={6}/><div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:11,color:C.textLight}}><span>{pct.toFixed(0)}% paid off</span><span>of {fmt(orig)}</span></div></>}
            </div>
          );
        })}
      </>}
  
    {debts.length>0&&(()=>{
      const ex=Number(extraPayDebt)||0;
      const baselineAva=simulateMultiDebtPayoff(simRows,{strategy:"avalanche",extraMonthly:0,maxMonths:600});
      const road=simulateMultiDebtPayoff(simRows,{strategy,extraMonthly:ex,maxMonths:600});
      const sameExtraAva=ex>0&&strategy==="snowball"?simulateMultiDebtPayoff(simRows,{strategy:"avalanche",extraMonthly:ex,maxMonths:600}):null;
      return(
        <div style={{background:C.surface,borderRadius:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:14,marginTop:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
            <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Roadmap</div>
            <div style={{display:"flex",gap:4,background:C.borderLight,borderRadius:8,padding:2}}>
              {[["avalanche","⬆ Avalanche"],["snowball","⬇ Snowball"]].map(([s,l])=>(
                <button key={s} type="button" onClick={()=>setStrategy(s)} style={{padding:"5px 10px",borderRadius:6,border:"none",background:strategy===s?C.surface:"transparent",fontWeight:strategy===s?700:500,fontSize:11,cursor:"pointer",color:strategy===s?C.accent:C.textMid}}>{l}</button>
              ))}
            </div>
          </div>
          <div style={{fontSize:11,color:C.textLight,marginBottom:12,lineHeight:1.45}}>
            Each month: accrue <strong>APR÷12</strong> on every open balance, pay each debt's <strong>minimum</strong> (or payoff if less), then send what's left to <strong>{strategy==="avalanche"?"the highest APR debt":"the smallest balance"}</strong>. Matches the navy card + slider. Real loan payments in Trackfi still use <strong>actual/365</strong> between payment dates.
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(148px,1fr))",gap:10,marginBottom:14}}>
            <div style={{background:C.surfaceAlt,borderRadius:10,padding:"10px 12px"}}>
              <div style={{fontSize:10,color:C.textLight,fontWeight:600}}>BASELINE · MINS + AVALANCHE</div>
              <div style={{fontFamily:MF,fontWeight:800,fontSize:15,color:C.text}}>{baselineAva.debtFree?baselineAva.months+" mo":"—"}</div>
              <div style={{fontSize:11,color:C.textLight}}>{baselineAva.debtFree?fmt(baselineAva.totalInterest)+" est. interest":baselineAva.capped?"Raise payments":"—"}</div>
            </div>
            <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:10,padding:"10px 12px"}}>
              <div style={{fontSize:10,color:C.accent,fontWeight:600}}>YOUR PLAN · {strategy.toUpperCase()}{ex>0?" + "+fmt(ex)+"/MO":""}</div>
              <div style={{fontFamily:MF,fontWeight:800,fontSize:15,color:C.text}}>{road.debtFree?road.months+" mo":"—"}</div>
              <div style={{fontSize:11,color:C.textLight}}>{road.debtFree?fmt(road.totalInterest)+" est. interest":road.capped?"Raise payments":"—"}</div>
            </div>
          </div>
          {sameExtraAva&&sameExtraAva.debtFree&&road.debtFree&&(
            <div style={{fontSize:12,color:C.textMid,marginBottom:12,padding:"8px 10px",background:C.greenBg,borderRadius:8,border:`1px solid ${C.greenMid}`}}>
              Same <strong>+{fmt(ex)}/mo</strong> aimed at <strong>highest APR</strong> instead: <strong>{sameExtraAva.months} mo</strong> · {fmt(sameExtraAva.totalInterest)} interest
              {sameExtraAva.months<road.months?<> ({road.months-sameExtraAva.months} mo faster than snowball)</>:sameExtraAva.months>road.months?<> (snowball wins on time here)</>:null}
            </div>
          )}
          {road.milestones.length>0&&(
            <>
              <div style={{fontSize:11,fontWeight:700,color:C.text,marginBottom:6}}>Milestones — loans disappearing ({strategy}{ex>0?", +"+fmt(ex)+"/mo":""})</div>
              <div style={{maxHeight:220,overflowY:"auto",border:`1px solid ${C.border}`,borderRadius:10}}>
                {road.milestones.slice(0,50).map((m,i)=>(
                  <div key={`${m.id}-${i}`} style={{display:"flex",justifyContent:"space-between",gap:8,padding:"8px 12px",borderBottom:i<Math.min(49,road.milestones.length-1)?`1px solid ${C.border}`:"none",fontSize:12}}>
                    <span style={{color:C.text,minWidth:0}}>Mo {m.month}: <strong>{m.name}</strong> paid off</span>
                    <span style={{color:C.textLight,fontFamily:MF,fontSize:11,flexShrink:0}}>{fmt(m.totalOwed)} remaining</span>
                  </div>
                ))}
              </div>
              {road.milestones.length>50&&<div style={{fontSize:11,color:C.textLight,marginTop:6}}>Showing first 50 payoffs.</div>}
            </>
          )}
        </div>
      );
    })()}
        {payModal&&<ExtraPayModal debt={payModal} onConfirm={pay=>{const raw=parseFloat(pay)||0;if(raw<=0)return;const d=payModal;const payDay=todayStr();if(isLoanDebt(d)){const sp=splitLoanPayment(d,raw,payDay);setDebts(p=>p.map(x=>String(x.id)===String(payModal.id)?applyLoanPaymentToDebtRow(x,sp.principal,payDay,sp.newAccruedCarryover):x));const tail=sp.newAccruedCarryover>0.001?` · ${fmt(sp.newAccruedCarryover)} accrued pending`:"";showToast(`Payment applied — ${fmt(sp.principal)} principal, ${fmt(sp.interest)} to interest (${sp.days}d)${tail}`);}else{setDebts(p=>p.map(x=>String(x.id)===String(payModal.id)?{...x,balance:String(Math.max(0,parseFloat(x.balance||0)-raw))}:x));showToast("Payment applied!");}setSelectedDebt(null);setPayModal(null);}} onClose={()=>setPayModal(null)}/>}
    </div>
  );
}
