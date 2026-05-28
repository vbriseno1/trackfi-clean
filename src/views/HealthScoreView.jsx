import React from "react";
import { C, MF } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";
import { BarProg } from "../components/ui.jsx";
import { totalCheckingBalance, totalSavingsBalance } from "../lib/cashAccounts.js";
import { sumDebtsPrincipalAndAccrued } from "../lib/debtLogic.js";
import { legacyCreditCardOwed } from "../lib/creditCardTotals.js";
import { dueIn } from "../lib/dateHelpers.js";

export default function HealthScoreView({income,expenses,debts,accounts,bills,tradingAccount,onNavigate}){
  const ti=(parseFloat(income.primary||0)*(income.payFrequency==="Weekly"?(52/12):income.payFrequency==="Twice Monthly"?2:income.payFrequency==="Monthly"?1:(26/12)))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const _hsAllMs=new Set(expenses.map(e=>e.date?.slice(0,7)).filter(Boolean));
  const te=_hsAllMs.size>0?expenses.reduce((s,e)=>s+(parseFloat(e.amount)||0),0)/Math.max(1,_hsAllMs.size):0;
  const td=sumDebtsPrincipalAndAccrued(debts)+legacyCreditCardOwed(accounts,debts);
  const ta=(totalCheckingBalance(accounts))+(totalSavingsBalance(accounts))+(parseFloat(accounts.cushion||0))+(parseFloat(accounts.investments||0))+(parseFloat(accounts.k401||0))+(parseFloat(accounts.roth_ira||0))+(parseFloat(accounts.brokerage||0))+(parseFloat(accounts.crypto||0))+(parseFloat(accounts.hsa||0))+(parseFloat(accounts.property||0))+(parseFloat(accounts.vehicles||0))+(parseFloat(tradingAccount?.balance||0));
  const liquid=(totalSavingsBalance(accounts))+(parseFloat(accounts.cushion||0));
  const _hsNow=new Date();const _hsMs=_hsNow.getFullYear()+"-"+String(_hsNow.getMonth()+1).padStart(2,"0");
  const moExpActual=expenses.filter(e=>e.date?.startsWith(_hsMs)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const _uniqueMonths=new Set(expenses.map(e=>e.date?.slice(0,7)).filter(Boolean)).size;
  const moExp=moExpActual>0?moExpActual:(te>0?te/Math.max(1,_uniqueMonths):1);
  const sr=ti>0?Math.max(0,(ti-moExp)/ti*100):0;
  const dti=ti>0?(debts.reduce((s,d)=>s+(parseFloat(d.minPayment)||0),0)/ti*100):0;
  const ef=liquid/Math.max(1,moExp);
  const unpaidBills=bills.filter(b=>!b.paid&&dueIn(b.dueDate)<0).length;
  const pillars=[
    {id:'savings',label:'Savings Rate',score:sr>=20?100:sr>=15?85:sr>=10?70:sr>=5?50:sr>0?30:0,val:sr.toFixed(1)+'%',target:'20%+ ideal',tip:sr<10?'Aim to save 10-20% of income each month':'Great savings discipline!',nav:'cashflow'},
    {id:'emergency',label:'Emergency Fund',score:ef>=6?100:ef>=3?80:ef>=1?55:ef>0?30:0,val:ef.toFixed(1)+'mo',target:'3-6 months',tip:ef<3?'Build to 3 months of expenses in savings/cushion':'Solid emergency cushion!',nav:'accounts'},
    {id:'debt',label:'Debt Load',score:td===0?100:dti<15?85:dti<25?65:dti<35?45:25,val:dti.toFixed(1)+'% DTI',target:'Under 25%',tip:dti>35?'High DTI — focus extra payments on highest-rate debt':td===0?'Debt free!':'On track — keep minimums and pay extra when possible',nav:'debt'},
    {id:'bills',label:'Bill Health',score:unpaidBills===0?100:unpaidBills<=1?60:20,val:unpaidBills+' overdue',target:'0 overdue',tip:unpaidBills>0?`${unpaidBills} overdue bill${unpaidBills!==1?'s':''} — pay immediately to avoid late fees`:'All bills current!',nav:'bills'},
    {id:'networth',label:'Net Worth',score:ta>td*2?100:ta>td?75:ta>0?50:ta===0?25:10,val:fmt(ta-td),target:'Assets > Debts',tip:ta>td?'Assets exceed debts — building wealth':'Focus on reducing debt and growing assets',nav:'networthtrend'},
  ];
  const overall=Math.round(pillars.reduce((s,p)=>s+p.score,0)/pillars.length/10);
  const gr=s=>s>=9?'A+':s>=8?'A':s>=7?'B':s>=6?'C':s>=5?'D':'F';
  const gc=s=>s>=8?C.green:s>=6?C.accent:s>=4?C.amber:C.red;
  const circ=2*Math.PI*38;
  const dash=circ*(overall/10);
  return(
    <div className="fu">
      <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.3,marginBottom:16}}>Financial Health</div>
      {/* score gauge */}
      <div style={{background:C.navy,borderRadius:18,padding:'24px',marginBottom:16,display:'flex',alignItems:'center',gap:20}}>
        <div style={{position:'relative',width:100,height:100,flexShrink:0}}>
          <svg viewBox="0 0 100 100" style={{transform:'rotate(-90deg)'}}>
            <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="10"/>
            <circle cx="50" cy="50" r="38" fill="none" stroke={gc(overall)} strokeWidth="10" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
          </svg>
          <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
            <div style={{fontFamily:MF,fontWeight:900,fontSize:28,color:'#fff',lineHeight:1}}>{gr(overall)}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.5)'}}>{overall}/10</div>
          </div>
        </div>
        <div style={{flex:1}}>
          <div style={{fontFamily:MF,fontWeight:800,fontSize:22,color:'#fff',marginBottom:4}}>
            {overall>=8?'Excellent 🏆':overall>=6?'Good 👍':overall>=4?'Fair ⚠️':'Needs Work 🔴'}
          </div>
          <div style={{fontSize:13,color:'rgba(255,255,255,.6)',lineHeight:1.5}}>
            {overall>=8?'Your finances are in great shape. Keep it up.':overall>=6?'Solid foundation — a few areas to improve.':overall>=4?'Some important areas need attention.':'Take action on the items below to improve your score.'}
          </div>
          <div style={{marginTop:10,display:'flex',gap:6,flexWrap:'wrap'}}>
            {pillars.map(p=><div key={p.id} style={{width:14,height:14,borderRadius:'50%',background:p.score>=80?C.green:p.score>=55?C.amber:C.red}}/>)}
          </div>
        </div>
      </div>
      {/* pillar cards */}
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {pillars.map(p=>{const col=p.score>=80?C.green:p.score>=55?C.amber:C.red;const bg=p.score>=80?C.greenBg:p.score>=55?C.amberBg:C.redBg;return(
          <div key={p.id} onClick={()=>onNavigate&&onNavigate(p.nav)} style={{background:C.surface,borderRadius:14,padding:'14px 16px',boxShadow:'0 1px 4px rgba(10,22,40,.06)',cursor:'pointer'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <div style={{fontSize:14,fontWeight:700,color:C.text}}>{p.label}</div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:col}}>{p.val}</div>
                <div style={{background:bg,color:col,fontWeight:700,fontSize:11,borderRadius:99,padding:'2px 8px'}}>{p.score>=80?'Good':p.score>=55?'Fair':'Low'}</div>
              </div>
            </div>
            <div style={{height:5,background:C.borderLight,borderRadius:99,overflow:'hidden',marginBottom:7}}>
              <div style={{height:'100%',width:p.score+'%',background:col,borderRadius:99,transition:'width .5s'}}/>
            </div>
            <div style={{fontSize:12,color:C.textMid,lineHeight:1.4}}>{p.tip}</div>
            <div style={{fontSize:11,color:C.textLight,marginTop:4}}>Target: {p.target} · tap to view →</div>
          </div>
        );})}
      </div>

      {/* Actionable next steps */}
      {(()=>{
        const nextSteps=pillars
          .filter(p=>p.score<80)
          .sort((a,b)=>a.score-b.score)
          .slice(0,3)
          .map(p=>({
            pillar:p.label,
            action:p.id==="savings"?"Set up auto-transfer on payday — even $50 helps":
                   p.id==="emergency"?"Move "+fmt(Math.max(0,(ti/12*3)-(totalSavingsBalance(accounts)+parseFloat(accounts.cushion||0))))+" to savings to reach 3-month goal":
                   p.id==="debt"?"Add "+fmt(50)+" extra to highest-rate debt — saves hundreds in interest":
                   p.id==="bills"?"Pay overdue bills immediately to stop late fees compounding":
                   "Review and grow your asset accounts",
            impact:p.id==="savings"?"+15-20 pts":p.id==="emergency"?"+20 pts":p.id==="debt"?"+10 pts":"+25 pts",
            color:p.score<40?C.red:C.amber,
          }));
        if(!nextSteps.length)return(
          <div style={{background:C.greenBg,border:`1px solid ${C.greenMid}`,borderRadius:16,padding:18,textAlign:"center"}}>
            <div style={{fontSize:24,marginBottom:8}}>🏆</div>
            <div style={{fontFamily:MF,fontWeight:700,fontSize:15,color:C.green}}>Excellent financial health!</div>
            <div style={{fontSize:13,color:C.green,opacity:.8,marginTop:4}}>All pillars are strong. Keep it up.</div>
          </div>
        );
        return(
          <div style={{background:C.surface,borderRadius:18,padding:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)"}}>
            <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>Your Next Steps</div>
            {nextSteps.map((step,i)=>(
              <div key={i} style={{display:"flex",gap:12,padding:"12px 0",borderBottom:i<nextSteps.length-1?`1px solid ${C.border}`:"none"}}>
                <div style={{width:32,height:32,borderRadius:8,background:step.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:MF,fontWeight:800,fontSize:13,color:step.color,flexShrink:0}}>{i+1}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700,color:step.color,textTransform:"uppercase",letterSpacing:.4,marginBottom:3}}>{step.pillar}</div>
                  <div style={{fontSize:13,color:C.text,lineHeight:1.5}}>{step.action}</div>
                </div>
                <div style={{background:C.greenBg,border:`1px solid ${C.greenMid}`,borderRadius:99,padding:"3px 8px",fontSize:11,fontWeight:700,color:C.green,flexShrink:0,alignSelf:"flex-start"}}>{step.impact}</div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
