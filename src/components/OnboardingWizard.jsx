/**
 * First-run onboarding wizard. Collects:
 *   1. Name + profession + role (used to personalize copy and pre-select categories)
 *   2. Use case (personal/couple/roommates/family) → toggles Household Mode for >1 person
 *   3. Take-home per paycheck + frequency + other income (annual estimate previewed)
 *   4. Starting account balances (checking required for safe-to-spend; rest optional)
 *
 * `onComplete(data)` receives the full draft including `isTrader` (derived from
 * trading income > 0) so the parent can enable trading-specific UI. The wizard
 * never persists anything itself — the parent is responsible for writing the
 * collected draft into the app's user_data.
 */
import React, { useState } from "react";
import { C, MF } from "../theme.js";
import { PROFESSIONS, getProfession, getProfSub } from "../lib/professions.js";
import { fmt } from "../lib/moneyFormat.js";

export default function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [d, setD] = useState(() => {
    const pn = localStorage.getItem("fv_pending_name") || "";
    return {
      name: pn,
      appName: "Trackfi",
      profCategory: "healthcare",
      profSub: "nurse_rn",
      useCase: "personal",
      income: { primary: "", other: "", trading: "", rental: "", dividends: "", freelance: "" },
      accounts: { checking: "", savings: "", cushion: "", investments: "" },
    };
  });
  const sel = getProfession(d.profCategory);
  const firstName = (d.name || "").split(" ")[0].replace(/[^a-zA-Z]/g, "") || "";

  const STEPS = [
    { title: null, body: (
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",padding:"8px 0 16px"}}>
        <div style={{fontFamily:MF,fontSize:"clamp(26px, 9vw, 42px)",fontWeight:900,color:C.navy,letterSpacing:-2,marginBottom:8}}>💰 Trackfi</div>
        <div style={{fontSize:16,color:C.textMid,lineHeight:1.65,marginBottom:20,maxWidth:400,padding:"0 4px"}}>The finance app that actually works for your life — not just for spreadsheet people.</div>
        <div className="onb-feature-grid" style={{marginBottom:20}}>
          {[["💸","Track every dollar","Know where it all goes"],["📅","Never miss a bill","Due dates + auto-pay tracking"],["💳","Crush debt faster","Avalanche & snowball plans"],["🎯","Build real savings","Goals with projected dates"],["📈","Log your trades","P&L, win rate, equity curve"],["🏆","Your health score","A–F grade on 5 pillars"]].map(([ic,t,s])=>(
            <div key={t} style={{background:C.surfaceAlt,borderRadius:14,padding:"12px 10px",textAlign:"left"}}>
              <div style={{fontSize:20,marginBottom:6}}>{ic}</div>
              <div style={{fontSize:13,fontWeight:700,color:C.text,lineHeight:1.3}}>{t}</div>
              <div style={{fontSize:11,color:C.textLight,marginTop:3,lineHeight:1.4}}>{s}</div>
            </div>
          ))}
        </div>
        <div style={{fontSize:11,color:C.textFaint}}>Your data stays on your device — sync to cloud anytime</div>
      </div>
    ), btnLabel: "Get Started →", canSkip: false },

    { title: "A little about you", body: (
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Your Name</div>
          <input autoFocus placeholder="Your name" value={d.name||""} onChange={e=>setD(p=>({...p,name:e.target.value}))}
            style={{width:"100%",background:C.surfaceAlt,border:`1.5px solid ${d.name?C.accent:C.border}`,borderRadius:12,padding:"12px 14px",fontSize:16,color:C.text,outline:"none",boxSizing:"border-box",transition:"border-color .15s"}}/>
          {firstName&&<div style={{marginTop:8,fontSize:13,color:C.accent,fontWeight:600}}>👋 Nice to meet you, {firstName}!</div>}
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>What do you do?</div>
          <div className="onb-prof-pick">
            {PROFESSIONS.map(p=>(
              <button key={p.id} onClick={()=>setD(x=>({...x,profCategory:p.id,profSub:p.subs[0].id}))}
                style={{display:"flex",alignItems:"center",gap:7,padding:"8px 14px",borderRadius:99,border:`1.5px solid ${d.profCategory===p.id?C.accent:C.border}`,background:d.profCategory===p.id?C.accentBg:"#fff",cursor:"pointer",transition:"all .15s"}}>
                <span style={{fontSize:16}}>{p.icon}</span>
                <span style={{fontSize:13,fontWeight:d.profCategory===p.id?700:500,color:d.profCategory===p.id?C.accent:C.text}}>{p.label}</span>
              </button>
            ))}
          </div>
          {sel.subs.length>1&&(
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Your Role — {sel.label}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {sel.subs.map(s=>(
                  <button key={s.id} onClick={()=>setD(x=>({...x,profSub:s.id}))}
                    style={{padding:"6px 12px",borderRadius:8,border:`1.5px solid ${d.profSub===s.id?C.accent:C.border}`,background:d.profSub===s.id?C.accentBg:"#fff",fontSize:12,fontWeight:d.profSub===s.id?700:400,color:d.profSub===s.id?C.accent:C.textMid,cursor:"pointer",transition:"all .12s"}}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    ), btnLabel: "Continue →", canSkip: false },

    { title: "How will you use it?", body: (
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{fontSize:13,color:C.textLight,lineHeight:1.6,marginBottom:4}}>This helps us personalize your experience and set up the right defaults.</div>
        {[
          {id:"personal",icon:"🧑",title:"Just me",desc:"Track my own spending, bills, and goals"},
          {id:"couple",icon:"💑",title:"Couple / Partner",desc:"Share expenses with a partner — split bills, track together"},
          {id:"roommates",icon:"🏠",title:"Roommates",desc:"Split household costs with one or more housemates"},
          {id:"family",icon:"👨‍👩‍👧",title:"Family",desc:"Manage the whole household — kids, shared accounts"},
        ].map(opt=>(
          <button key={opt.id} onClick={()=>setD(p=>({...p,useCase:opt.id}))}
            style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderRadius:16,
              border:`2px solid ${d.useCase===opt.id?C.accent:C.border}`,
              background:d.useCase===opt.id?C.accentBg:"#fff",cursor:"pointer",textAlign:"left",
              transition:"all .15s"}}>
            <span style={{fontSize:28,flexShrink:0}}>{opt.icon}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:700,color:d.useCase===opt.id?C.accent:C.text,marginBottom:2}}>{opt.title}</div>
              <div style={{fontSize:12,color:C.textLight,lineHeight:1.4}}>{opt.desc}</div>
            </div>
            {d.useCase===opt.id&&<div style={{width:20,height:20,borderRadius:"50%",background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:11,color:"#fff",fontWeight:800}}>✓</span></div>}
          </button>
        ))}
        {(d.useCase==="couple"||d.useCase==="roommates"||d.useCase==="family")&&(
          <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:14,padding:"12px 14px",fontSize:13,color:C.accent,lineHeight:1.5}}>
            ✓ We'll enable <strong>Household Mode</strong> for you — you can add members and tag shared expenses after setup.
          </div>
        )}
      </div>
    ), btnLabel: "Continue →", canSkip: false },

    { title: firstName ? "What do you bring home, " + firstName + "?" : "Your take-home income", body: (
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{fontSize:13,color:C.textLight,lineHeight:1.6,marginBottom:10}}>Enter your take-home <strong>per paycheck</strong> — we calculate the rest.</div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>How often do you get paid?</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {["Weekly","Biweekly","Twice Monthly","Monthly"].map(f=>(
              <button key={f} onClick={()=>setD(p=>({...p,income:{...(p.income||{}),payFrequency:f}}))}
                style={{padding:"7px 14px",borderRadius:99,border:`1.5px solid ${(d.income?.payFrequency||"Biweekly")===f?C.accent:C.border}`,background:(d.income?.payFrequency||"Biweekly")===f?C.accentBg:"#fff",fontSize:13,fontWeight:(d.income?.payFrequency||"Biweekly")===f?700:500,color:(d.income?.payFrequency||"Biweekly")===f?C.accent:C.textMid,cursor:"pointer"}}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>{getProfession(d.profCategory).icon} Take-Home Per Paycheck</div>
          <input type="number" placeholder="e.g. 2,250" value={d.income?.primary||""}
            onChange={e=>setD(p=>({...p,income:{...(p.income||{}),primary:e.target.value}}))}
            style={{width:"100%",background:C.surfaceAlt,border:`1.5px solid ${parseFloat(d.income?.primary||0)>0?C.accent:C.border}`,borderRadius:12,padding:"12px 14px",fontSize:22,fontFamily:MF,fontWeight:700,color:C.text,outline:"none",boxSizing:"border-box"}}/>
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Other Income (side jobs, rental, etc)</div>
          <input type="number" placeholder="0" value={d.income?.other||""}
            onChange={e=>setD(p=>({...p,income:{...(p.income||{}),other:e.target.value}}))}
            style={{width:"100%",background:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"11px 14px",fontSize:16,color:C.text,outline:"none",boxSizing:"border-box"}}/>
        </div>
        {parseFloat(d.income?.primary||0)>0&&(
          <div style={{background:C.greenBg,border:`1px solid ${C.greenMid}`,borderRadius:12,padding:"12px 14px"}}>
            <div style={{fontSize:12,color:C.green,fontWeight:600,marginBottom:2}}>Estimated annual ({d.income?.payFrequency||"Biweekly"} pay)</div>
            <div style={{fontFamily:MF,fontWeight:800,fontSize:20,color:C.green}}>${Math.round((parseFloat(d.income?.primary||0)*(d.income?.payFrequency==="Weekly"?52:d.income?.payFrequency==="Twice Monthly"?24:d.income?.payFrequency==="Monthly"?12:26))+(parseFloat(d.income?.other||0)*12)).toLocaleString()}</div>
          </div>
        )}
      </div>
    ), btnLabel: "Continue →", canSkip: true },

    { title: "One last thing 🏦", body: (
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {d.name&&<div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"12px 14px",marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:600,color:C.accent,marginBottom:4}}>Welcome, {d.name.split(" ")[0]}! Here's what we've set up:</div>
          <div style={{display:"flex",flexDirection:"column",gap:3}}>
            <div style={{fontSize:12,color:C.textMid}}>✓ Profile — {getProfession(d.profCategory).icon} {getProfSub(d.profCategory,d.profSub).label}</div>
            {parseFloat(d.income?.primary||0)>0&&<div style={{fontSize:12,color:C.textMid}}>✓ Take-home — {fmt(parseFloat(d.income.primary))} / {(d.income?.payFrequency||"biweekly").toLowerCase()} paycheck</div>}
          </div>
        </div>}
        <div style={{fontSize:13,color:C.textLight,lineHeight:1.6,marginBottom:12}}>Last step — add your account balances to unlock net worth tracking and safe-to-spend. Totally optional, you can skip and add later.</div>
        <div style={{fontSize:13,color:C.accent,fontWeight:600,marginBottom:8}}>Core accounts (powers Safe-to-Spend)</div>
        {[{k:"checking",l:"Checking",ic:"🏦",ph:"2500",req:true},{k:"savings",l:"Savings",ic:"💰",ph:"5000",req:false},{k:"cushion",l:"Emergency Fund",ic:"🛡️",ph:"1000",req:false}].map(a=>(
          <div key={a.k} style={{display:"flex",alignItems:"center",gap:12,background:C.surfaceAlt,borderRadius:12,padding:"11px 14px"}}>
            <span style={{fontSize:20,flexShrink:0}}>{a.ic}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:C.text}}>{a.l}</div>
              {a.req&&<div style={{fontSize:10,color:C.accent,fontWeight:600}}>Used for safe-to-spend</div>}
            </div>
            <input type="number" placeholder={a.ph} value={d.accounts?.[a.k]||""}
              onChange={e=>setD(p=>({...p,accounts:{...(p.accounts||{}),[a.k]:e.target.value}}))}
              style={{width:110,background:"#fff",border:`1.5px solid ${parseFloat(d.accounts?.[a.k]||0)>0?C.accent:C.border}`,borderRadius:10,padding:"8px 10px",fontSize:15,fontFamily:MF,fontWeight:700,color:C.text,outline:"none",textAlign:"right"}}/>
          </div>
        ))}
        <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"10px 14px",fontSize:12,color:C.accent,display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontSize:16}}>💡</span>
          <span>You can add 401k, Roth IRA, brokerage, and crypto in <strong>Accounts & Income</strong> after setup.</span>
        </div>
        {(parseFloat(d.accounts?.checking||0)+parseFloat(d.accounts?.savings||0)+parseFloat(d.accounts?.cushion||0))>0&&(
          <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"10px 14px",fontSize:13,color:C.accent,fontWeight:600}}>
            💰 Liquid total: ${(parseFloat(d.accounts?.checking||0)+parseFloat(d.accounts?.savings||0)+parseFloat(d.accounts?.cushion||0)).toLocaleString()}
          </div>
        )}
      </div>
    ), btnLabel: "Launch Trackfi 🚀", canSkip: true },
  ];

  const cur = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fv-auth-shell" style={{minHeight:"100dvh",padding:"max(12px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left))"}}>
      <div style={{background:C.surface,borderRadius:24,width:"100%",maxWidth:500,boxShadow:"0 20px 60px rgba(0,0,0,.25)",overflow:"hidden",maxHeight:"min(90dvh, calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 20px))",display:"flex",flexDirection:"column"}}>
        {step>0&&<div style={{height:4,background:C.borderLight,flexShrink:0}}><div style={{height:"100%",width:`${(step/(STEPS.length-1))*100}%`,background:C.accent,transition:"width .4s",borderRadius:99}}/></div>}
        <div style={{padding:"22px clamp(14px, 4vw, 24px) 28px",overflowY:"auto",WebkitOverflowScrolling:"touch",flex:1,minHeight:0}}>
          {step>0&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            <button onClick={()=>setStep(s=>s-1)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"5px 12px",fontSize:12,color:C.textMid,cursor:"pointer"}}>← Back</button>
            <span style={{fontSize:12,color:C.textLight,fontWeight:600}}>Step {step} of {STEPS.length-1}</span>
          </div>}
          {cur.title&&<div className="fv-page-title" style={{marginBottom:18}}>{cur.title}</div>}
          {cur.body}
          <button type="button" className="fv-btn-primary ba" onClick={()=>{if(isLast){onComplete({...d,isTrader:parseFloat(d.income?.trading||0)>0});}else{setStep(s=>s+1);}}}
            style={{justifyContent:"center",marginTop:20,fontFamily:MF}}>
            {cur.btnLabel?.replace(/ 🚀$/, "") || "Continue"}
          </button>
          {cur.canSkip&&!isLast&&<button onClick={()=>setStep(s=>s+1)} style={{width:"100%",marginTop:10,background:"none",border:"none",color:C.textLight,fontSize:13,cursor:"pointer",padding:"4px 0"}}>Skip for now →</button>}
          {cur.canSkip&&isLast&&<button onClick={()=>onComplete({...d,isTrader:false})} style={{width:"100%",marginTop:10,background:"none",border:"none",color:C.textLight,fontSize:13,cursor:"pointer",padding:"4px 0"}}>Skip for now →</button>}
        </div>
      </div>
    </div>
  );
}
