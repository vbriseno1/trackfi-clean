import React, { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { C, MF, FULL_MOS } from "../theme.js";
import { fmt, todayStr } from "../lib/moneyFormat.js";
import { RechartsReady, useChartTheme } from "../components/RechartsBridge.jsx";
import { totalCheckingBalance, totalSavingsBalance } from "../lib/cashAccounts.js";

export default function TrendView({balHist,accounts,expenses,onNavigate}){
  const ct=useChartTheme();
  const[range,setRange]=useState("1M");
  const[mode,setMode]=useState("total");
  const RANGES=[{id:"7D",days:7},{id:"1M",days:30},{id:"3M",days:90},{id:"6M",days:180},{id:"1Y",days:365},{id:"ALL",days:9999}];
  const days=RANGES.find(r=>r.id===range)?.days||30;
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-days);
  const cutStr=cutoff.getFullYear()+"-"+String(cutoff.getMonth()+1).padStart(2,"0")+"-"+String(cutoff.getDate()).padStart(2,"0");
  const filtered=balHist.filter(s=>s.date>=cutStr);
  const cur=totalCheckingBalance(accounts)+totalSavingsBalance(accounts)+(parseFloat(accounts.cushion||0))+(parseFloat(accounts.investments||0));
  const chartData=useMemo(()=>filtered.length>0?filtered:[{date:todayStr(),checking:totalCheckingBalance(accounts),savings:totalSavingsBalance(accounts),cushion:parseFloat(accounts.cushion||0),total:cur}],[filtered.length,cur]);
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
  const fD=s=>{if(!s)return"";const d=new Date(s+"T00:00:00");return FULL_MOS[d.getMonth()]+" "+d.getDate();};
  const hasData=chartData.length>1;
  return(
    <div className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
        <div>
          <div className="fv-page-title">Balance trend</div>
          <div style={{fontSize:13,color:C.textLight,marginTop:1}}>Track how your money moves over time</div>
        </div>
        <button className="ba" onClick={()=>onNavigate("accounts")} style={{display:"flex",alignItems:"center",gap:5,background:C.accent,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer"}}><Plus size={13}/>Update</button>
      </div>
      <div className="fv-hero-panel" style={{marginBottom:16}}>
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
        {hasData&&mode==="total"&&<RechartsReady minHeight={200} render={R=>(<R.ResponsiveContainer width="100%" height={200}><R.AreaChart data={chartData} margin={ct.marginWide}><defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={lineCol} stopOpacity={.12}/><stop offset="100%" stopColor={lineCol} stopOpacity={0}/></linearGradient></defs><R.CartesianGrid stroke={ct.gridStroke} strokeDasharray="3 3" vertical={false}/><R.XAxis dataKey="date" tick={ct.axisTickSm} axisLine={false} tickLine={false} tickFormatter={fD} interval="preserveStartEnd"/><R.YAxis tick={ct.axisTickSm} axisLine={false} tickLine={false} tickFormatter={ct.formatYAxis} width={48}/><R.Tooltip formatter={(v)=>fmt(v)} contentStyle={ct.tooltipStyle}/><R.Area type="monotone" dataKey="total" name="Balance" stroke={lineCol} strokeWidth={ct.areaStrokeWidth} fill="url(#tg)" dot={false}/></R.AreaChart></R.ResponsiveContainer>)}/>}
        {hasData&&mode==="breakdown"&&<RechartsReady minHeight={200} render={R=>(<R.ResponsiveContainer width="100%" height={200}><R.AreaChart data={chartData} margin={ct.marginWide}><R.CartesianGrid stroke={ct.gridStroke} strokeDasharray="3 3" vertical={false}/><R.XAxis dataKey="date" tick={ct.axisTickSm} axisLine={false} tickLine={false} tickFormatter={fD} interval="preserveStartEnd"/><R.YAxis tick={ct.axisTickSm} axisLine={false} tickLine={false} tickFormatter={ct.formatYAxis} width={48}/><R.Tooltip formatter={(v)=>fmt(v)} contentStyle={ct.tooltipStyle}/><R.Area type="monotone" dataKey="checking" name="Checking" stroke={C.navy} strokeWidth={ct.areaStrokeWidth} fill="transparent" dot={false}/><R.Area type="monotone" dataKey="savings" name="Savings" stroke={C.positive} strokeWidth={ct.areaStrokeWidth} fill="transparent" dot={false}/><R.Area type="monotone" dataKey="cushion" name="Cushion" stroke={C.accent} strokeWidth={ct.areaStrokeWidth} fill="transparent" dot={false}/></R.AreaChart></R.ResponsiveContainer>)}/>}
        {hasData&&mode==="spending"&&<RechartsReady minHeight={200} render={R=>(<R.ResponsiveContainer width="100%" height={200}><R.BarChart data={spendData} margin={ct.marginWide}><R.CartesianGrid stroke={ct.gridStroke} strokeDasharray="3 3" vertical={false}/><R.XAxis dataKey="date" tick={ct.axisTickSm} axisLine={false} tickLine={false} tickFormatter={fD} interval="preserveStartEnd"/><R.YAxis tick={ct.axisTickSm} axisLine={false} tickLine={false} tickFormatter={ct.formatYAxis} width={48}/><R.Tooltip formatter={(v)=>fmt(v)} contentStyle={ct.tooltipStyle}/><R.Bar dataKey="amount" name="Spent" fill={C.negative} radius={ct.barRadius}/></R.BarChart></R.ResponsiveContainer>)}/>}
      </div>
      {hasData&&(()=>{
        const avgBal=chartData.reduce((s,d)=>s+(d.total||0),0)/chartData.length;
        const trend=chartData.length>3?chartData.slice(-3).reduce((s,d)=>s+(d.total||0),0)/3:null;
        const isGrowing=trend&&trend>avgBal;
        const dailyChange=chartData.length>1?((last-first)/(chartData.length-1)):0;
        return(
          <div style={{background:C.surface,borderRadius:16,padding:14,marginBottom:14}}>
            <div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.text,marginBottom:10}}>Trend Insights</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:C.textMid}}>Avg balance ({range})</span><span style={{fontFamily:MF,fontWeight:700,color:C.text}}>{fmt(avgBal)}</span></div>
              <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:C.textMid}}>Daily change</span><span style={{fontFamily:MF,fontWeight:700,color:dailyChange>=0?C.green:C.red}}>{dailyChange>=0?"+":""}{fmt(dailyChange)}/day</span></div>
              <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:C.textMid}}>Trend (last 3 pts)</span><span style={{fontFamily:MF,fontWeight:700,color:isGrowing?C.green:C.red}}>{isGrowing?"↑ Growing":"↓ Declining"}</span></div>
              {change!==0&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:C.textMid}}>Total change</span><span style={{fontFamily:MF,fontWeight:700,color:change>=0?C.green:C.red}}>{change>=0?"+":""}{fmt(change)}</span></div>}
            </div>
          </div>
        );
      })()}
      <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"11px 14px",fontSize:12,color:C.accent}}>💡 Tip: Update balances weekly for the best trend line. The more data points you add, the sharper the picture.</div>
    </div>
  );
}
