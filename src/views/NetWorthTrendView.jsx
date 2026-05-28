import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { C, MF, FULL_MOS, debtDisplayColor } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";
import { BarProg } from "../components/ui.jsx";
import { RechartsReady, ChartPanel, useChartTheme } from "../components/RechartsBridge.jsx";
import { totalCheckingBalance, totalSavingsBalance } from "../lib/cashAccounts.js";
import { legacyCreditCardOwed } from "../lib/creditCardTotals.js";
import { sumDebtsPrincipalAndAccrued, debtOwedForBreakdown, debtOriginalBaseline } from "../lib/debtLogic.js";

export default function NetWorthTrendView({balHist,debts,accounts,tradingAccount,onNavigate,nwGoal,setNwGoal}){
  const ct=useChartTheme();
  const[showGoalInput,setShowGoalInput]=useState(false);
  const[goalInput,setGoalInput]=useState("");
  function saveGoal(){const v=parseFloat(goalInput);if(v>0){const g={target:v,created:Date.now()};setNwGoal(g);setShowGoalInput(false);}}

  const ccOwedNw=legacyCreditCardOwed(accounts,debts);
  const loanOwedNw=sumDebtsPrincipalAndAccrued(debts);
  const totalDebt=loanOwedNw+ccOwedNw;
  const totalOriginal=debts.reduce((s,d)=>s+debtOriginalBaseline(d),0);
  const totalPaidDown=Math.max(0,totalOriginal-loanOwedNw);
  const overallPct=totalOriginal>0?Math.round(totalPaidDown/totalOriginal*100):0;
  const totalAssets=totalCheckingBalance(accounts)+totalSavingsBalance(accounts)+(parseFloat(accounts.cushion||0))+(parseFloat(accounts.investments||0))+(parseFloat(accounts.k401||0))+(parseFloat(accounts.roth_ira||0))+(parseFloat(accounts.brokerage||0))+(parseFloat(accounts.crypto||0))+(parseFloat(accounts.hsa||0))+(parseFloat(accounts.property||0))+(parseFloat(accounts.vehicles||0))+(parseFloat(tradingAccount?.balance||0));
  const currentNW=totalAssets-totalDebt;
  const chartData=balHist.map(h=>{const a=(h.checking||0)+(h.savings||0)+(h.cushion||0)+(h.investments||0)+(h.k401||0)+(h.roth_ira||0)+(h.brokerage||0)+(h.crypto||0)+(h.hsa||0)+(h.property||0)+(h.vehicles||0);const debtAtPoint=h.totalDebt!=null?h.totalDebt:loanOwedNw+ccOwedNw;return{date:h.date,assets:a,netWorth:a-debtAtPoint};}).slice(-52);
  const firstNW=chartData[0]?.netWorth||currentNW;
  const change=currentNW-firstNW;
  const fD=s=>{if(!s)return"";const d=new Date(s+"T00:00:00");return FULL_MOS[d.getMonth()]+" "+d.getDate();};
  const TT=({active,payload,label})=>{if(!active||!payload?.length)return null;const rows=payload.filter(p=>p!=null);if(!rows.length)return null;return(<div style={{background:C.surface,borderRadius:12,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"10px 14px",fontSize:12}}><div style={{fontWeight:700,marginBottom:6}}>{fD(label)}</div>{rows.map((p,i)=><div key={p.dataKey??i} style={{display:"flex",justifyContent:"space-between",gap:16,marginBottom:2}}><span style={{color:C.textLight}}>{p.name}</span><span style={{fontWeight:700}}>{fmt(p.value??0)}</span></div>)}</div>);};
  return(
    <div className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <div className="fv-page-title">Net Worth Trend</div>
        <button className="ba" onClick={()=>onNavigate("accounts")} style={{display:"flex",alignItems:"center",gap:5,background:C.accent,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer"}}><Plus size={13}/>Update</button>
      </div>
      <div style={{fontSize:13,color:C.textLight,marginBottom:16}}>Track your wealth over time</div>
      <div className="fv-hero-panel" style={{marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Current Net Worth</div>
        <div style={{fontFamily:MF,fontSize:36,fontWeight:800,color:currentNW>=0?C.green:C.red,lineHeight:1,marginBottom:8}}>{fmt(currentNW)}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>{[["Assets",fmt(totalAssets),C.greenMid],["Debt",fmt(totalDebt),C.redMid],["Change",`${change>=0?"+":""}${fmt(change)}`,change>=0?C.greenMid:C.redMid]].map(([l,v,c])=><div key={l} style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"9px 8px"}}><div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:2}}>{l.toUpperCase()}</div><div style={{fontFamily:MF,fontSize:12,fontWeight:700,color:c}}>{v}</div></div>)}</div>
      </div>
      {chartData.length>1?<ChartPanel title="Net worth over time" subtitle="Assets and net worth (last 52 snapshots)">
        <div style={{marginBottom:10,display:"flex",gap:16}}>{[[C.positive,"Net worth"],[C.accent,"Assets"]].map(([c,l])=><div key={l} style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:2,background:c}}/><span style={{fontSize:11,color:C.textLight}}>{l}</span></div>)}</div>
        <RechartsReady minHeight={208} render={R=>(
        <R.ResponsiveContainer width="100%" height={208}>
          <R.AreaChart data={chartData} margin={ct.marginWide}>
            <defs>
              <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.positive} stopOpacity={.14}/><stop offset="100%" stopColor={C.positive} stopOpacity={0}/></linearGradient>
              <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.accent} stopOpacity={.1}/><stop offset="100%" stopColor={C.accent} stopOpacity={0}/></linearGradient>
            </defs>
            <R.CartesianGrid stroke={ct.gridStroke} strokeDasharray="3 3" vertical={false}/>
            <R.XAxis dataKey="date" tick={ct.axisTickSm} axisLine={false} tickLine={false} tickFormatter={fD} interval="preserveStartEnd"/>
            <R.YAxis tick={ct.axisTickSm} axisLine={false} tickLine={false} tickFormatter={ct.formatYAxis} width={48}/>
            <R.Tooltip content={<TT/>}/>
            <R.Area type="monotone" dataKey="assets" name="Assets" stroke={C.accent} strokeWidth={ct.areaStrokeWidth} fill="url(#aGrad)" dot={false} activeDot={{ r: 3, strokeWidth: 0 }}/>
            <R.Area type="monotone" dataKey="netWorth" name="Net Worth" stroke={C.positive} strokeWidth={ct.areaStrokeWidth} fill="url(#nwGrad)" dot={false} activeDot={{ r: 3, strokeWidth: 0 }}/>
          </R.AreaChart>
        </R.ResponsiveContainer>
        )}/>
      </ChartPanel>:<ChartPanel title="Building your trend"><div style={{textAlign:"center",padding:"24px 12px"}}><div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:4}}>Not enough history yet</div><div style={{fontSize:13,color:C.textLight}}>Update balances regularly to see your net worth trend.</div></div></ChartPanel>}
      {(debts.length>0||ccOwedNw>0)&&(()=>{
        // Liability vs asset breakdown stacked bar
        const assetBreakdown=[
          {name:"Liquid",value:totalCheckingBalance(accounts)+totalSavingsBalance(accounts)+parseFloat(accounts.cushion||0),color:C.teal},
          {name:"401k",value:parseFloat(accounts.k401||0),color:C.accent},
          {name:"Roth IRA",value:parseFloat(accounts.roth_ira||0),color:C.green},
          {name:"Brokerage",value:parseFloat(accounts.brokerage||0),color:"#06b6d4"},
          {name:"Crypto",value:parseFloat(accounts.crypto||0),color:C.amber},
          {name:"HSA",value:parseFloat(accounts.hsa||0),color:C.purple},
          {name:"Investments",value:parseFloat(accounts.investments||0),color:"#8b5cf6"},
          {name:"Property",value:parseFloat(accounts.property||0)+parseFloat(accounts.vehicles||0),color:"#64748b"},
        ].filter(a=>a.value>0);
        const debtBreakdown=[...debts.map((d,i)=>({name:d.name,value:debtOwedForBreakdown(d),type:d.type||"Debt",color:["#ef4444","#f97316","#eab308","#ec4899","#f43f5e"][i%5]})),...(ccOwedNw>0?[{name:"Credit card (app)",value:ccOwedNw,type:"",color:"#dc2626"}]:[])].filter(d=>d.value>0);
        const maxBar=Math.max(totalAssets,totalDebt,1);
        return(
          <div style={{background:C.surface,borderRadius:18,padding:18,marginBottom:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)"}}>
            <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>Assets vs Liabilities</div>
            {/* Assets bar */}
            <div style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <span style={{fontSize:12,fontWeight:600,color:C.green}}>Assets</span>
                <span style={{fontFamily:MF,fontWeight:700,fontSize:12,color:C.green}}>{fmt(totalAssets)}</span>
              </div>
              <div style={{display:"flex",height:20,borderRadius:10,overflow:"hidden",gap:1}}>
                {assetBreakdown.map(a=>(
                  <div key={a.name} style={{width:((a.value/totalAssets)*100).toFixed(1)+"%",background:a.color,minWidth:a.value>0?4:0,transition:"width .4s"}}
                    title={a.name+": "+fmt(a.value)}/>
                ))}
              </div>
              <div style={{display:"flex",gap:8,marginTop:5,flexWrap:"wrap"}}>
                {assetBreakdown.map(a=>(<div key={a.name} style={{display:"flex",alignItems:"center",gap:3,fontSize:10,color:C.textLight}}>
                  <div style={{width:7,height:7,borderRadius:2,background:a.color}}/>{a.name} {fmt(a.value)}
                </div>))}
              </div>
            </div>
            {/* Debt bar */}
            <div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <span style={{fontSize:12,fontWeight:600,color:C.red}}>Liabilities</span>
                <span style={{fontFamily:MF,fontWeight:700,fontSize:12,color:C.red}}>{fmt(totalDebt)}</span>
              </div>
              <div style={{display:"flex",height:20,borderRadius:10,overflow:"hidden",gap:1}}>
                {debtBreakdown.map(d=>(
                  <div key={d.name} style={{width:((d.value/totalDebt)*100).toFixed(1)+"%",background:d.color,minWidth:d.value>0?4:0,transition:"width .4s"}}
                    title={d.name+": "+fmt(d.value)}/>
                ))}
              </div>
              <div style={{display:"flex",gap:8,marginTop:5,flexWrap:"wrap"}}>
                {debtBreakdown.map(d=>(<div key={d.name} style={{display:"flex",alignItems:"center",gap:3,fontSize:10,color:C.textLight}}>
                  <div style={{width:7,height:7,borderRadius:2,background:d.color}}/>{d.name} {fmt(d.value)}
                </div>))}
              </div>
            </div>
            {/* Net bar */}
            <div style={{marginTop:14,paddingTop:12,borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:12,fontWeight:700,color:C.text}}>Net Worth</span>
              <span style={{fontFamily:MF,fontWeight:800,fontSize:16,color:currentNW>=0?C.green:C.red}}>{currentNW>=0?"+":""}{fmt(currentNW)}</span>
            </div>
          </div>
        );
      })()}
      {nwGoal&&(()=>{const pct=Math.min(100,Math.max(0,(currentNW/nwGoal.target)*100));const rem=Math.max(0,nwGoal.target-currentNW);return(<div style={{background:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:16,padding:18,marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Net Worth Goal</div><div style={{display:"flex",gap:8,alignItems:"center"}}><div style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.accent}}>{fmt(nwGoal.target)}</div><button onClick={()=>setNwGoal(null)} style={{background:"none",border:"none",cursor:"pointer",color:C.textFaint,padding:2}}><X size={13}/></button></div></div><div style={{height:10,background:C.borderLight,borderRadius:99,overflow:"hidden",marginBottom:8}}><div style={{height:"100%",width:pct.toFixed(1)+"%",background:pct>=100?C.positive:C.accent,borderRadius:99,transition:"width .6s"}}/></div><div style={{display:"flex",justifyContent:"space-between",fontSize:12}}><span style={{color:C.textLight}}>{pct.toFixed(1)}% there · {fmt(currentNW)} now</span><span style={{fontWeight:600,color:pct>=100?C.positive:C.text}}>{pct>=100?"Goal reached":fmt(rem)+" to go"}</span></div></div>);})()}
      {!nwGoal&&<button type="button" onClick={()=>setShowGoalInput(true)} style={{width:"100%",background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"11px 0",color:C.accent,fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:14}}>Set a net worth goal</button>}
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
              <div style={{height:10,background:C.borderLight,borderRadius:99,overflow:"hidden",marginBottom:4}}><div style={{height:"100%",width:`${pct}%`,background:C.accent,borderRadius:99,transition:"width .6s"}}/></div>
              <div style={{fontSize:11,color:C.textFaint}}>{fmt(Math.max(0,next-currentNW))} to go - {pct.toFixed(1)}% there</div>
            </div>}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {MILESTONES.map(m=>{const done=currentNW>=m;return(<div key={m} style={{padding:"10px 8px",borderRadius:12,background:done?C.greenBg:C.surfaceAlt,border:`1.5px solid ${done?C.greenMid:C.borderLight}`,textAlign:"center"}}><div style={{fontSize:done?16:14,marginBottom:2,color:done?C.positive:C.textFaint}}>{done?"✓":"—"}</div><div style={{fontFamily:MF,fontWeight:700,fontSize:11,color:done?C.green:C.textFaint}}>{m>=1000000?"$1M":m>=1000?"$"+(m/1000).toFixed(0)+"k":"$"+m}</div></div>);})}
            </div>
          </div>
        );
      })()}
      <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:12}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>Asset Breakdown</div>
        {[{l:"Checking",v:accounts.checking,ic:"🏦"},{l:"Savings",v:accounts.savings,ic:"💰"},{l:"Cushion",v:accounts.cushion,ic:"🛡️"},{l:"Investments",v:accounts.investments,ic:"📈"},{l:"Property",v:accounts.property,ic:"🏠"},{l:"Vehicles",v:accounts.vehicles,ic:"🚗"}].filter(a=>parseFloat(a.v||0)>0).map(a=>{
          const val=parseFloat(a.v||0);const pct=totalAssets>0?(val/totalAssets*100):0;
          return(<div key={a.l} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><div style={{display:"flex",alignItems:"center",gap:6}}><span>{a.ic}</span><span style={{fontSize:13,fontWeight:600,color:C.text}}>{a.l}</span></div><div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:12,color:C.textLight}}>{pct.toFixed(0)}%</span><span style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.green}}>{fmt(val)}</span></div></div><BarProg pct={pct} color={C.green} h={5}/></div>);
        })}
        {totalAssets===0&&<div style={{fontSize:13,color:C.textLight,textAlign:"center",padding:"12px 0"}}>Add account balances in Settings to see your asset breakdown</div>}
      </div>
      {totalDebt>0&&(
        <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:12}}>
          <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>Liability Breakdown</div>
          <div style={{fontSize:12,color:C.textLight,marginBottom:14}}>What you owe — {debts.length} debt{debts.length!==1?"s":""}{ccOwedNw>0?` · card ${fmt(ccOwedNw)}`:""}</div>
          {debts.map((d)=>{
            const owed=debtOwedForBreakdown(d);
            const pct=totalDebt>0?(owed/totalDebt*100):0;
            const minPay=parseFloat(d.minPayment||0);
            const rate=parseFloat(d.rate||0);
            const monthlyInt=owed*(rate/100/12);
            return(
              <div key={d.id} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:debtDisplayColor(d,debts)}}/>
                    <span style={{fontSize:13,fontWeight:600,color:C.text}}>{d.name}</span>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <span style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>{fmt(owed)}</span>
                    {rate>0&&<span style={{fontSize:11,color:C.textLight,marginLeft:6}}>{rate}% APR</span>}
                  </div>
                </div>
                <BarProg pct={pct} color={debtDisplayColor(d,debts)} h={5}/>
                {(minPay>0||monthlyInt>0)&&<div style={{display:"flex",gap:12,marginTop:4,fontSize:11,color:C.textLight}}>
                  {minPay>0&&<span>Min: {fmt(minPay)}/mo</span>}
                  {monthlyInt>0&&<span style={{color:C.red}}>\u2248 {fmt(monthlyInt)}/mo (APR\u00f712)</span>}
                </div>}
              </div>
            );
          })}
          {ccOwedNw>0&&(()=>{
            const pct=totalDebt>0?(ccOwedNw/totalDebt*100):0;
            return(
              <div style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:"#dc2626"}}/>
                    <span style={{fontSize:13,fontWeight:600,color:C.text}}>Credit card (app balance)</span>
                  </div>
                  <span style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>{fmt(ccOwedNw)}</span>
                </div>
                <BarProg pct={pct} color="#dc2626" h={5}/>
              </div>
            );
          })()}
          <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,marginTop:4,borderTop:`1px solid ${C.border}`}}>
            <span style={{fontSize:13,fontWeight:600,color:C.text}}>Total debt</span>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.red}}>{fmt(totalDebt)}</div>
              <div style={{fontSize:11,color:C.textLight}}>= {totalAssets>0?((totalDebt/totalAssets)*100).toFixed(0):100}% of assets</div>
            </div>
          </div>
        </div>
      )}

      {/* ── HYSA / Yield Calculator ─────────────────────────── */}
      <div style={{background:C.surface,borderRadius:18,padding:18,marginTop:14,boxShadow:"0 1px 3px rgba(10,22,40,.06)"}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:15,color:C.text,marginBottom:4}}>💰 Money Growth Calculator</div>
        <div style={{fontSize:12,color:C.textLight,marginBottom:14}}>What your balances earn at different rates</div>
        {(()=>{
          const liquid=totalCheckingBalance(accounts)+totalSavingsBalance(accounts)+(parseFloat(accounts.cushion||0));
          const SCENARIOS=[
            {label:"Traditional Savings",rate:0.5,icon:"🏦",desc:"Big bank",highlight:false},
            {label:"High-Yield Savings",rate:4.75,icon:"⚡",desc:"HYSA / online bank",highlight:true},
            {label:"Money Market",rate:5.1,icon:"📊",desc:"Money market fund",highlight:true},
            {label:"6-Month CD",rate:5.25,icon:"🔒",desc:"Certificate of deposit",highlight:true},
            {label:"S&P 500 avg",rate:10.0,icon:"📈",desc:"Historical avg, not guaranteed",highlight:false},
          ];
          if(liquid<=0)return(<div style={{fontSize:13,color:C.textLight,textAlign:"center",padding:"12px 0"}}>Add liquid balances to see projections</div>);
          return(
            <div>
              <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:10,padding:"9px 14px",marginBottom:12,fontSize:13,color:C.accent}}>
                Liquid balance: <strong style={{fontFamily:MF}}>{fmt(liquid)}</strong>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {SCENARIOS.map(s=>{
                  const yr1=liquid*(s.rate/100);
                  const yr5=liquid*(Math.pow(1+s.rate/100,5)-1);
                  const yr10=liquid*(Math.pow(1+s.rate/100,10)-1);
                  return(
                    <div key={s.label} style={{background:s.highlight?C.greenBg:C.surfaceAlt,border:`1px solid ${s.highlight?C.greenMid:C.border}`,borderRadius:12,padding:"11px 14px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:700,color:s.highlight?C.green:C.text}}>{s.icon} {s.label}</div>
                          <div style={{fontSize:11,color:C.textLight}}>{s.desc} · {s.rate}% APY</div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontFamily:MF,fontWeight:800,fontSize:15,color:s.highlight?C.green:C.text}}>{fmt(yr1)}/yr</div>
                          <div style={{fontSize:10,color:C.textLight}}>{fmt(yr1/12)}/mo</div>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:6}}>
                        {[["5yr gain",yr5],["10yr gain",yr10],["10yr total",liquid+yr10]].map(([l,v])=>(
                          <div key={l} style={{flex:1,background:"rgba(0,0,0,.04)",borderRadius:7,padding:"5px 7px"}}>
                            <div style={{fontSize:9,color:C.textLight,fontWeight:600,marginBottom:1,textTransform:"uppercase"}}>{l}</div>
                            <div style={{fontFamily:MF,fontWeight:700,fontSize:12,color:s.highlight?C.green:C.textMid}}>{fmt(v)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:10,padding:"10px 14px",fontSize:12,color:C.accent,lineHeight:1.5}}>
                  💡 Switching {fmt(liquid)} to a 4.75% HYSA earns <strong>{fmt(liquid*(4.75-0.5)/100)} extra/yr</strong> vs a standard 0.5% savings account — {fmt(liquid*(4.75-0.5)/100/12)}/mo for free.
                </div>
              </div>
            </div>
          );
        })()}
      </div>

    </div>
  );
}
