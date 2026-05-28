import React, { useMemo } from "react";
import { Download } from "lucide-react";
import { C, MF, PIE_COLORS } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";
import { BarProg } from "../components/ui.jsx";

export default function TaxView({expenses,income,trades,shifts,appName}){
  const now=new Date();const yr=now.getFullYear();
  const ti=(parseFloat(income.primary||0)*(income.payFrequency==="Weekly"?(52/12):income.payFrequency==="Twice Monthly"?2:income.payFrequency==="Monthly"?1:(26/12)))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const annualIncome=ti*12;
  const tradePnl=trades.filter(t=>t.date?.startsWith(String(yr))).reduce((s,t)=>s+(parseFloat(t.pnl)||0),0);
  const shiftEarnings=shifts.filter(s=>s.date?.startsWith(String(yr))).reduce((s,x)=>s+(parseFloat(x.gross)||0),0);
  const catMap=expenses.filter(e=>e.date?.startsWith(String(yr))).reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount)||0);return a},{});
  const totalExp=Object.values(catMap).reduce((s,v)=>s+v,0);
  function exportCSV(){const hdr=["Date","Name","Category","Amount"];const rowData=expenses.filter(e=>e.date?.startsWith(String(yr))).map(e=>[e.date,e.name.replace(/,/g," "),e.category,parseFloat(e.amount).toFixed(2)]);const csv=[hdr,...rowData].map(r=>r.join(",")).join("\r\n");const b=new Blob([csv],{type:"text/csv"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=(appName||"trackfi")+"-ytd-"+yr+".csv";a.click();URL.revokeObjectURL(u);}
  return(
    <div className="fu fv-view-root">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <div className="fv-page-title" style={{fontSize:18}}>Tax summary {yr}</div>
        <button onClick={exportCSV} style={{display:"flex",alignItems:"center",gap:5,background:C.green,border:"none",borderRadius:10,padding:"8px 12px",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}}><Download size={13}/>CSV</button>
      </div>
      <div style={{fontSize:13,color:C.textLight,marginBottom:16}}>Year-to-date overview for tax preparation</div>
      <div style={{background:C.navy,borderRadius:18,padding:20,marginBottom:14,color:"#fff"}}>
        <div className="fv-grid-2">
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
          <div className="fv-grid-3" style={{marginBottom:12}}>
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
