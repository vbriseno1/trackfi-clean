import React from "react";
import { C, MF } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";

export function GoalRing({pct,size=80,color,icon,label,saved,target}){
  const r=30,c=2*Math.PI*r;
  const filled=Math.min(1,pct/100)*c;
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
      <div style={{position:"relative",width:size,height:size}}>
        <svg width={size} height={size} viewBox="0 0 80 80" style={{transform:"rotate(-90deg)"}}>
          <circle cx="40" cy="40" r={r} fill="none" stroke={C.borderLight} strokeWidth="8"/>
          <circle cx="40" cy="40" r={r} fill="none" stroke={color||C.accent} strokeWidth="8" strokeDasharray={`${filled} ${c}`} strokeLinecap="round" style={{transition:"stroke-dasharray .6s ease"}}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
          <span style={{fontSize:18}}>{icon||"🎯"}</span>
          <span style={{fontSize:10,fontWeight:700,color:color||C.accent}}>{Math.round(pct)}%</span>
        </div>
      </div>
      <div style={{textAlign:"center",maxWidth:80}}>
        <div style={{fontSize:11,fontWeight:700,color:C.text,lineHeight:1.2}}>{label}</div>
        <div style={{fontSize:10,color:C.textLight,marginTop:1}}>{fmt(saved)}/{fmt(target)}</div>
      </div>
    </div>
  );
}
