/**
 * Sign-in / sign-up screen shown when the user is unauthenticated and Supabase is
 * configured. Falls back gracefully when Supabase env vars are missing (renders
 * a warning banner and still allows "Try without account" → local-only mode).
 *
 * Implementation notes:
 * - Tracks failed-login attempts and applies a client-side cooldown (3rd attempt:
 *   10s, 5th+: 30s) on top of Supabase's server-side limiting.
 * - "Forgot password" sends `/auth/v1/recover` with a redirect back to the app.
 * - "Resend confirmation" hits `/auth/v1/resend` for users stuck after sign-up.
 * - The pending name is stashed in localStorage as `fv_pending_name` so onboarding
 *   can greet the user even before their profile syncs.
 */
import React, { useEffect, useRef, useState } from "react";
import { Mail, Wallet, Sparkles } from "lucide-react";
import { C, MF } from "../theme.js";
import { CSS } from "../styles.js";
import { signIn, signUp, supaFetch, isSupabaseConfigured } from "../lib/supabase.js";

export default function AuthScreen({ onAuth, onSkip }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef(null);

  function startCooldown(secs) {
    setCooldown(secs);
    clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(
      () => setCooldown((c) => { if (c <= 1) { clearInterval(cooldownRef.current); return 0; } return c - 1; }),
      1000
    );
  }
  useEffect(() => () => clearInterval(cooldownRef.current), []);

  const passStrength = pass.length === 0 ? 0 : pass.length < 6 ? 1 : pass.length < 10 && !/[^a-zA-Z0-9]/.test(pass) ? 2 : 3;
  const strengthLabel = ["", "Weak", "Fair", "Strong"];
  const strengthColor = ["", C.red, C.amber, C.green];

  async function resendConfirmation() {
    if (!isSupabaseConfigured()) { setErr("Can't resend — Supabase is not configured."); return; }
    const r = await supaFetch("/auth/v1/resend", {
      method: "POST",
      body: JSON.stringify({ type: "signup", email: email.trim() }),
      timeoutMs: 20000,
    });
    if (r.error) { setErr(r.error.message || "Couldn't resend — try signing up again."); return; }
    setErr("Confirmation email resent — check your inbox.");
  }

  async function sendPasswordReset() {
    if (!email.trim()) { setErr("Enter your email first."); return; }
    if (!isSupabaseConfigured()) { setErr("Account features require Supabase — use offline mode instead."); return; }
    const redirectTo = window.location.origin + window.location.pathname;
    const r = await supaFetch("/auth/v1/recover", {
      method: "POST",
      body: JSON.stringify({ email: email.trim(), options: { emailRedirectTo: redirectTo } }),
      timeoutMs: 20000,
    });
    if (r.error) { setErr(r.error.message || "Couldn't send reset link — check your email and try again."); return; }
    setErr("✓ Reset link sent to " + email + " — check your inbox.");
  }

  async function submit() {
    if (cooldown > 0) return;
    if (!email.trim() || !pass.trim()) { setErr("Please fill in all fields."); return; }
    if (mode === "signup" && pass.length < 6) { setErr("Password must be at least 6 characters."); return; }
    setLoading(true);
    setErr("");
    try {
      if (mode === "login") {
        const r = await signIn(email.trim(), pass);
        if (r.error === "network" || r.message?.includes("Failed to fetch") || r.message?.includes("NetworkError")) {
          setErr("Can't reach server — tap 'Try without account' to use offline.");
          setLoading(false);
          return;
        }
        if (r.error_description || r.msg || r.error) {
          const msg = (r.error_description || r.msg || r.error || "").toLowerCase();
          if (msg.includes("invalid") || msg.includes("credentials") || msg.includes("password")) {
            const next = failCount + 1;
            setFailCount(next);
            const wait = next >= 5 ? 30 : next >= 3 ? 10 : 0;
            if (wait > 0) startCooldown(wait);
            setErr("Wrong password." + (wait > 0 ? ` Wait ${wait}s before trying again.` : " Try again or use 'Forgot password' below."));
          } else if (msg.includes("confirm") || msg.includes("email")) {
            setErr("Please confirm your email first — check your inbox.");
          } else if (msg.includes("not found") || msg.includes("user")) {
            setErr("No account found for that email. Sign up or continue without account.");
          } else {
            setErr("Sign in failed. Check your email and password.");
          }
          setLoading(false);
          return;
        }
        setFailCount(0);
        if (!r.access_token) { setErr("Sign in failed — try again."); setLoading(false); return; }
        onAuth(r);
      } else {
        const r = await signUp(email.trim(), pass);
        if (r.access_token) {
          if (name.trim()) try { localStorage.setItem("fv_pending_name", name.trim()); } catch {}
          onAuth(r);
          return;
        }
        if (r.error === "network" || r.message?.includes("Failed to fetch")) {
          setErr("Can't reach server — tap 'Try without account' to use offline.");
          setLoading(false);
          return;
        }
        if (r.error_description || r.msg || r.error) {
          const msg = (r.error_description || r.msg || r.error || "").toLowerCase();
          if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
            setErr("");
            setMode("login");
            setTimeout(() => setErr("Account found — enter your password to sign in."), 100);
          } else {
            setErr(r.error_description || r.msg || "Sign up failed. Try again.");
          }
          setLoading(false);
          return;
        }
        if (name.trim()) try { localStorage.setItem("fv_pending_name", name.trim()); } catch {}
        setConfirmed(true);
      }
    } catch (e) {
      setErr("Network error — check connection and try again.");
    }
    setLoading(false);
  }

  if (confirmed) return (
    <div className="fv-auth-shell">
      <style>{CSS}</style>
      {!isSupabaseConfigured()&&(
        <div role="alert" style={{position:"fixed",top:0,left:0,right:0,zIndex:50,background:"#fef3c7",borderBottom:"1px solid #f59e0b",color:"#92400e",fontSize:12,fontWeight:600,textAlign:"center",padding:"10px 14px",lineHeight:1.4}}>
          Supabase isn’t configured in this build — use <strong>Try without account</strong> for local-only mode, or set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and rebuild.
        </div>
      )}
      <div style={{background:"#fff",borderRadius:28,width:"100%",maxWidth:400,padding:"40px 32px",textAlign:"center",boxShadow:"0 32px 80px rgba(0,0,0,.35)"}}>
        <div style={{width:80,height:80,borderRadius:"50%",background:C.accentBg,border:`1px solid ${C.accentMid}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px"}}><Mail size={36} color={C.accent} strokeWidth={1.75}/></div>
        <div style={{fontFamily:MF,fontSize:24,fontWeight:900,color:C.navy,marginBottom:8,letterSpacing:-.5}}>Check your inbox</div>
        <div style={{fontSize:14,color:C.textLight,marginBottom:6,lineHeight:1.6}}>Confirmation link sent to</div>
        <div style={{fontWeight:800,color:C.accent,fontSize:16,marginBottom:20,background:C.accentBg,padding:"8px 16px",borderRadius:10,display:"inline-block"}}>{email}</div>
        <div style={{background:C.accentBg,border:`1.5px solid ${C.accentMid}`,borderRadius:14,padding:"14px 18px",fontSize:13,color:C.accent,marginBottom:24,lineHeight:1.6,textAlign:"left"}}>
          <div style={{fontWeight:700,marginBottom:4}}>What to do:</div>
          <div>1. Open the email from Trackfi</div>
          <div>2. Click "Confirm your email"</div>
          <div>3. Come back here and sign in</div>
        </div>
        <button type="button" className="fv-btn-primary ba" onClick={()=>{setConfirmed(false);setMode("login");setPass("");setErr("");}} style={{justifyContent:"center",marginBottom:12,fontFamily:MF}}>I confirmed — sign in</button>
        <button onClick={resendConfirmation} style={{width:"100%",padding:"12px",borderRadius:14,border:`1.5px solid ${C.accentMid}`,background:C.accentBg,color:C.accent,fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:12}}>
          ↻ Resend confirmation email
        </button>
        <button onClick={()=>setConfirmed(false)} style={{width:"100%",padding:"12px",borderRadius:14,border:`1.5px solid ${C.border}`,background:"transparent",color:C.textLight,fontWeight:600,fontSize:14,cursor:"pointer",marginBottom:12}}>← Back</button>
        {onSkip&&<button onClick={onSkip} style={{background:"none",border:"none",color:C.textFaint,fontSize:12,cursor:"pointer",fontWeight:500}}>Try without account →</button>}
      </div>
    </div>
  );

  return (
    <div className="fv-auth-shell fv-auth-shell-col">
      <style>{CSS}</style>
      {!isSupabaseConfigured()&&(
        <div role="alert" style={{position:"fixed",top:0,left:0,right:0,zIndex:50,background:"#fef3c7",borderBottom:"1px solid #f59e0b",color:"#92400e",fontSize:12,fontWeight:600,textAlign:"center",padding:"10px 14px",lineHeight:1.4}}>
          Cloud login isn’t available in this build (missing Supabase env). Use <strong>Try without account</strong> below, or configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
        </div>
      )}
      <div style={{position:"absolute",top:-80,right:-80,width:300,height:300,borderRadius:"50%",background:"rgba(99,102,241,.12)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:-60,left:-60,width:240,height:240,borderRadius:"50%",background:"rgba(13,148,136,.1)",pointerEvents:"none"}}/>
      <div style={{textAlign:"center",marginBottom:28,zIndex:1}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:8}}>
          <div className="fv-auth-logo"><Wallet size={24} strokeWidth={2}/></div>
          <div style={{fontFamily:MF,fontSize:34,fontWeight:900,color:"#fff",letterSpacing:-1}}>Trackfi</div>
        </div>
        <div style={{fontSize:15,color:"rgba(255,255,255,.6)",fontWeight:500,letterSpacing:.2}}>Your money, finally making sense</div>
      </div>
      {mode==="signup"&&<div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap",justifyContent:"center",zIndex:1}}>
        {["Live spending insights","Smart safe-to-spend","Goals & debt payoff"].map(f=>(
          <div key={f} style={{background:"rgba(255,255,255,.1)",borderRadius:99,padding:"5px 12px",fontSize:11,color:"rgba(255,255,255,.8)",fontWeight:600,backdropFilter:"blur(8px)"}}>{f}</div>
        ))}
      </div>}
      <div style={{background:"rgba(255,255,255,.97)",backdropFilter:"blur(20px)",borderRadius:24,width:"100%",maxWidth:400,padding:"28px 28px 24px",boxShadow:"0 32px 80px rgba(0,0,0,.3)",zIndex:1}}>
        <div style={{display:"flex",background:"#f0f2f8",borderRadius:12,padding:3,marginBottom:22}}>
          {[["login","Sign In"],["signup","Create Account"]].map(([m,l])=>(
            <button key={m} onClick={()=>{setMode(m);setErr("");setPass("");setName("");}} style={{flex:1,padding:"9px 0",borderRadius:10,border:"none",background:mode===m?"#fff":"transparent",color:mode===m?C.accent:C.textMid,fontWeight:mode===m?800:600,fontSize:13,cursor:"pointer",boxShadow:mode===m?"0 2px 8px rgba(0,0,0,.08)":"none",transition:"all .15s"}}>{l}</button>
          ))}
        </div>
        {mode==="signup"&&<div style={{marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>First Name</div>
          <input type="text" value={name} onChange={e=>{setName(e.target.value);setErr("");}} placeholder="What should we call you?" style={{width:"100%",background:"#f8f9fc",border:`1.5px solid ${C.border}`,borderRadius:12,padding:"12px 14px",fontSize:15,color:C.text,outline:"none",boxSizing:"border-box"}} autoCapitalize="words" autoComplete="given-name"/>
        </div>}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Email</div>
          <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setErr("");}} placeholder="you@email.com" style={{width:"100%",background:"#f8f9fc",border:`1.5px solid ${err&&err.toLowerCase().includes("email")?C.red:C.border}`,borderRadius:12,padding:"12px 14px",fontSize:15,color:C.text,outline:"none",boxSizing:"border-box"}} autoCapitalize="none" autoComplete="email" onKeyDown={e=>e.key==="Enter"&&document.getElementById("pw-inp")?.focus()}/>
        </div>
        <div style={{marginBottom:err?8:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5}}>Password</div>
            {mode==="login"&&<button onClick={sendPasswordReset} style={{background:"none",border:"none",color:C.accent,fontSize:12,fontWeight:600,cursor:"pointer"}}>Forgot?</button>}
          </div>
          <div style={{position:"relative"}}>
            <input id="pw-inp" type={showPass?"text":"password"} value={pass} onChange={e=>{setPass(e.target.value);setErr("");}} placeholder={mode==="login"?"Your password":"Min. 6 characters"} style={{width:"100%",background:"#f8f9fc",border:`1.5px solid ${err&&(err.toLowerCase().includes("password")||err.toLowerCase().includes("6 char"))?C.red:C.border}`,borderRadius:12,padding:"12px 44px 12px 14px",fontSize:15,color:C.text,outline:"none",boxSizing:"border-box"}} onKeyDown={e=>e.key==="Enter"&&!loading&&submit()}/>
            <button onClick={()=>setShowPass(p=>!p)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:C.textLight,fontSize:12,fontWeight:600,padding:4}}>{showPass?"Hide":"Show"}</button>
          </div>
          {mode==="signup"&&pass.length>0&&<div style={{marginTop:6}}>
            <div style={{display:"flex",gap:3,marginBottom:3}}>
              {[1,2,3].map(n=><div key={n} style={{flex:1,height:3,borderRadius:99,background:n<=passStrength?strengthColor[passStrength]:C.borderLight,transition:"background .2s"}}/>)}
            </div>
            <div style={{fontSize:11,color:strengthColor[passStrength],fontWeight:600}}>{strengthLabel[passStrength]}</div>
          </div>}
        </div>
        {err&&<div style={{background:err.includes("found")||err.includes("sent")?C.accentBg:C.redBg,border:`1px solid ${err.includes("found")||err.includes("sent")?C.accentMid:C.redMid}`,borderRadius:10,padding:"10px 14px",fontSize:13,color:err.includes("found")||err.includes("sent")?C.accent:C.red,marginBottom:14,lineHeight:1.5}}>{err}</div>}
        <button type="button" className="fv-btn-primary ba" onClick={submit} disabled={loading||cooldown>0||!email.trim()||!pass.trim()} style={{justifyContent:"center",marginBottom:14,fontFamily:MF}}>{loading?"Just a sec...":cooldown>0?`Wait ${cooldown}s...`:(mode==="login"?"Sign in":"Create account")}</button>
        {(onTryDemo||onSkip)&&<div style={{borderTop:`1px solid ${C.border}`,paddingTop:16,textAlign:"center"}}>
          {onTryDemo&&<button type="button" className="ba" onClick={onTryDemo} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"10px 14px",fontSize:13,fontWeight:700,color:C.accent,cursor:"pointer",marginBottom:12}}>
            <Sparkles size={16} strokeWidth={2}/>
            Explore sample data
          </button>}
          {onSkip&&<>
            <button type="button" className="ba" onClick={onSkip} style={{background:"none",border:"none",color:C.textLight,fontSize:13,fontWeight:600,cursor:"pointer",padding:"6px 0"}}>Try without account</button>
            <div style={{fontSize:11,color:C.textFaint,marginTop:4}}>Data stays on your device</div>
          </>}
        </div>}
      </div>
    </div>
  );
}
