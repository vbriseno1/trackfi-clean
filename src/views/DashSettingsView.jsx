import React from "react";
import { ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { C, MF } from "../theme.js";

export default function DashSettingsView({config,setConfig,showTrading}){
  const toggle=k=>setConfig(p=>({...p,[k]:!p[k]}));
  const items=[{k:"showIncomeChart",icon:"📊",label:"Income vs Spending Chart",desc:"3-month bar chart on home"},{k:"showMetrics",icon:"📐",label:"Key Metrics Grid",desc:"Net worth, health, emergency fund"},{k:"showAccounts",icon:"🏦",label:"Account Cards",desc:"Scrollable balance overview"},{k:"showForecast",icon:"🔮",label:"Month Forecast",desc:"Burn rate and projected spend"},{k:"showBills",icon:"📅",label:"Upcoming Bills",desc:"Next 3 bills with countdown"},{k:"showRecent",icon:"🕒",label:"Recent Transactions",desc:"Last 4 logged expenses"},...(showTrading?[{k:"showTradeCard",icon:"📈",label:"Trading Summary",desc:"P&L and record"}]:[])];
  return(
    <div className="fu fv-view-root">
      <div className="fv-page-title" style={{marginBottom:4}}>Customize dashboard</div>
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
}function Row({icon,title,sub,right,rightColor,rightSub,onDelete,badge,onClick}){
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
