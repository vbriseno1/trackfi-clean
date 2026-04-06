import React, { useState } from "react";
import { FileText, X } from "lucide-react";
import { C, MF } from "../lib/uiTokens.js";
import { fmt } from "../lib/moneyFormat.js";

export default 
function BankImportModal({categories,expenses,setExpenses,household,showToast,onClose}){
  const[step,setStep]=useState("paste");// paste | preview | done
  const[rawText,setRawText]=useState("");
  const[parsed,setParsed]=useState([]);
  const[editCats,setEditCats]=useState({});
  const[editOwner,setEditOwner]=useState({});
  const[importing,setImporting]=useState(false);
  const[error,setError]=useState("");
  const[skipped,setSkipped]=useState({});

  const BANK_FORMATS=[
    // Chase: Date,Description,Amount (negative=debit)
    {name:"Chase",detect:h=>h.includes("Transaction Date")||h.includes("Post Date"),
     date:r=>r[0]||r[1],desc:r=>r[2],amt:r=>-parseFloat((r[3]||r[4]||"0").replace(/[^0-9.-]/g,""))},
    // BofA: Date,Description,Amount (negative=debit)
    {name:"Bank of America",detect:h=>h.toLowerCase().includes("posted date")||h.toLowerCase().includes("payee"),
     date:r=>r[0],desc:r=>r[2]||r[1],amt:r=>parseFloat((r[4]||r[3]||"0").replace(/[^0-9.-]/g,""))},
    // Wells Fargo: Date,Amount,*,*,Description
    {name:"Wells Fargo",detect:h=>/amount/i.test(h)&&!/transaction date/i.test(h),
     date:r=>r[0],desc:r=>r[4],amt:r=>parseFloat((r[1]||"0").replace(/[^0-9.-]/g,""))},
    // Capital One: Transaction Date,Post Date,Description,Category,Debit,Credit
    {name:"Capital One",detect:h=>h.toLowerCase().includes("transaction date")&&h.toLowerCase().includes("debit"),
     date:r=>r[0],desc:r=>r[2],amt:r=>{const d=parseFloat((r[4]||"").replace(/[^0-9.-]/g,""));const c=parseFloat((r[5]||"").replace(/[^0-9.-]/g,""));return d>0?d:-c;}},
    // Citi: Status,Date,Description,Debit,Credit
    {name:"Citi",detect:h=>h.toLowerCase().includes("status")&&h.toLowerCase().includes("debit")&&h.toLowerCase().includes("credit"),
     date:r=>r[1],desc:r=>r[2],amt:r=>{const d=parseFloat((r[3]||"").replace(/[^0-9.-]/g,""));const c=parseFloat((r[4]||"").replace(/[^0-9.-]/g,""));return d>0?d:-c;}},
    // Generic: first col=date, second=desc, third=amount
    {name:"Generic",detect:()=>true,
     date:r=>r[0],desc:r=>r[1],amt:r=>Math.abs(parseFloat((r[2]||r[3]||"0").replace(/[^0-9.-]/g,"")))}
  ];

  // Auto-categorize by merchant name
  const MC=window._merchantCats||{};
  const CAT_RULES=[
    {r:/grocery|groceries|publix|kroger|safeway|trader joe|whole foods|aldi|costco|walmart|wegmans|sprouts/i,c:"Groceries"},
    {r:/mcdonald|burger king|wendy|chick-fil|taco bell|subway|chipotle|popeyes|kfc|domino|sonic|five guys|sonic|whataburger/i,c:"Fast Food"},
    {r:/restaurant|doordash|grubhub|ubereats|postmates|dine|sushi|bistro|steakhouse|grill/i,c:"Restaurants"},
    {r:/starbucks|dunkin|coffee|latte|espresso|dutch bros|caribou|peet/i,c:"Coffee"},
    {r:/shell|bp|chevron|exxon|mobil|speedway|wawa|sheetz|pilot|loves|quiktrip|fuel|gas\s/i,c:"Gas"},
    {r:/uber|lyft|taxi|cab\b/i,c:"Rideshare"},
    {r:/netflix|hulu|spotify|apple music|disney|hbo|paramount|peacock|youtube premium|crunchyroll|adobe|dropbox|icloud/i,c:"Subscriptions"},
    {r:/cvs|walgreens|rite aid|pharmacy|medical|doctor|hospital|dental|dentist|urgent care|copay/i,c:"Health / Medical"},
    {r:/planet fitness|la fitness|anytime fitness|equinox|ymca|crossfit|orangetheory|peloton|gym/i,c:"Gym / Fitness"},
    {r:/barber|salon|great clips|supercuts|hair|nails|manicure|spa|massage|ulta|sephora|wax/i,c:"Grooming / Haircuts"},
    {r:/nike|adidas|h&m|zara|gap|old navy|nordstrom|target|forever 21|shein|clothing|clothes|shoes/i,c:"Clothing"},
    {r:/amazon|target|walmart|best buy|home depot|lowes|ikea|tj maxx|marshalls|ross|kohls/i,c:"Shopping"},
    {r:/petco|petsmart|vet|veterinary|pet food|chewy/i,c:"Pets"},
    {r:/movie|amc|regal|theater|concert|ticketmaster|steam|playstation|xbox|nintendo|bowling/i,c:"Entertainment"},
    {r:/hotel|airbnb|vrbo|flight|airline|southwest|delta|united|frontier|spirit|booking|expedia|vacation/i,c:"Travel"},
    {r:/rent|mortgage|landlord|lease|apartment/i,c:"Rent / Mortgage"},
    {r:/electric|utility|water|internet|cable|xfinity|comcast|att|verizon|t-mobile|phone/i,c:"Utilities"},
    {r:/bar|nightclub|happy hour|brunch|dining out/i,c:"Dining Out"},
  ];

  function autoCategory(desc){
    if(!desc)return "Misc";
    const dl=desc.toLowerCase().trim();
    if(MC[dl])return MC[dl];
    for(const {r,c} of CAT_RULES){if(r.test(dl))return c;}
    return "Misc";
  }

  function parseCSV(text){
    // Split into lines, handle quoted fields
    const lines=text.trim().split(/\r?\n/).filter(l=>l.trim());
    if(lines.length<2)return[];
    const parseRow=line=>{
      const cols=[];let cur="";let inQ=false;
      for(let i=0;i<line.length;i++){
        const ch=line[i];
        if(ch==='"'){inQ=!inQ;}
        else if(ch===","&&!inQ){cols.push(cur.trim().replace(/^"|"$/g,""));cur="";}
        else{cur+=ch;}
      }
      cols.push(cur.trim().replace(/^"|"$/g,""));
      return cols;
    };
    const header=lines[0].toLowerCase();
    const fmt=BANK_FORMATS.find(f=>f.detect(header))||BANK_FORMATS[BANK_FORMATS.length-1];
    const rows=[];
    for(let i=1;i<lines.length;i++){
      const r=parseRow(lines[i]);
      if(r.length<2)continue;
      const rawDate=fmt.date(r)||"";
      const desc=(fmt.desc(r)||"").trim();
      const rawAmt=fmt.amt(r);
      if(!desc||isNaN(rawAmt)||rawAmt<=0)continue;
      // Normalize date to YYYY-MM-DD
      let date="";
      const dm=rawDate.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if(dm){
        const yr=dm[3].length===2?"20"+dm[3]:dm[3];
        date=`${yr}-${dm[1].padStart(2,"0")}-${dm[2].padStart(2,"0")}`;
      }else if(/\d{4}-\d{2}-\d{2}/.test(rawDate)){date=rawDate.slice(0,10);}
      if(!date)continue;
      rows.push({id:`imp_${Date.now()}_${i}`,name:desc,amount:rawAmt.toFixed(2),date,category:autoCategory(desc),notes:"Imported",owner:"me",paidFrom:"none"});
    }
    return rows;
  }

  function handleParse(){
    setError("");
    if(!rawText.trim()){setError("Paste your bank CSV data above.");return;}
    const rows=parseCSV(rawText);
    if(!rows.length){setError("Couldn't read this format. Make sure you're pasting CSV text exported from your bank's website.");return;}
    // Deduplicate against existing expenses
    const existing=new Set(expenses.map(e=>e.date+"_"+e.name+"_"+e.amount));
    const deduped=rows.filter(r=>!existing.has(r.date+"_"+r.name+"_"+r.amount));
    setParsed(deduped);
    setEditCats(Object.fromEntries(deduped.map(r=>[r.id,r.category])));
    setEditOwner(Object.fromEntries(deduped.map(r=>[r.id,"me"])));
    setSkipped({});
    setStep("preview");
  }

  function handleFile(file){
    const reader=new FileReader();
    reader.onload=e=>{setRawText(e.target.result);};
    reader.readAsText(file);
  }

  function doImport(){
    setImporting(true);
    const toAdd=parsed
      .filter(r=>!skipped[r.id])
      .map(r=>({...r,category:editCats[r.id]||r.category,owner:editOwner[r.id]||"me",notes:"Imported"}));
    setExpenses(p=>[...p,...toAdd]);
    const skippedCount=Object.values(skipped).filter(Boolean).length;
    showToast(`✅ Imported ${toAdd.length} transactions${skippedCount?` · ${skippedCount} skipped`:""}`);
    setStep("done");
    setImporting(false);
  }

  const totalAmt=parsed.filter(r=>!skipped[r.id]).reduce((s,r)=>s+(parseFloat(r.amount)||0),0);
  const catNames=categories.map(c=>c.name);

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(10,22,40,.55)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.surface,borderRadius:"24px 24px 0 0",width:"100%",maxWidth:560,maxHeight:"92vh",overflowY:"auto",padding:"0 0 40px",animation:"slideUp .26s cubic-bezier(.22,1,.36,1)",boxShadow:"0 -4px 60px rgba(10,22,40,.22)"}}>
        <div style={{width:40,height:4,background:C.border,borderRadius:99,margin:"14px auto 4px"}}/>
        <div style={{padding:"16px 24px 20px",borderBottom:`1px solid ${C.borderLight}`,marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{background:C.greenBg,borderRadius:12,padding:"9px 10px",display:"flex"}}><FileText size={20} color={C.green}/></div>
            <div>
              <div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text,letterSpacing:-.3}}>Bank Import</div>
              <div style={{fontSize:12,color:C.textLight,marginTop:1}}>Paste CSV from your bank's website</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:C.surfaceAlt,border:"none",cursor:"pointer",color:C.textMid,padding:"7px 8px",borderRadius:10,display:"flex"}}><X size={15}/></button>
        </div>

        <div style={{padding:"0 24px"}}>

          {step==="paste"&&<>
            <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"12px 14px",marginBottom:16,fontSize:13,color:C.accent,lineHeight:1.6}}>
              <strong>How to get your CSV:</strong>
              <div style={{marginTop:6,display:"flex",flexDirection:"column",gap:3}}>
                {[["Chase","Accounts → Download account activity → CSV"],["Bank of America","Transactions → Download → Microsoft Excel"],["Wells Fargo","Account Activity → Download → CSV"],["Capital One","Transactions → Download → CSV"],["Other bank","Look for 'Download', 'Export', or 'Statement' → choose CSV"]].map(([bank,steps])=>(
                  <div key={bank} style={{fontSize:12}}><strong style={{color:C.accent}}>{bank}:</strong> {steps}</div>
                ))}
              </div>
            </div>

            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Option 1 — Upload CSV file</div>
              <label style={{display:"flex",alignItems:"center",gap:10,background:C.surfaceAlt,border:`1.5px dashed ${C.border}`,borderRadius:12,padding:"14px 16px",cursor:"pointer"}}>
                <FileText size={20} color={C.textLight}/>
                <div>
                  <div style={{fontSize:14,fontWeight:600,color:C.text}}>Choose file</div>
                  <div style={{fontSize:12,color:C.textLight}}>Select the .csv file from your bank</div>
                </div>
                <input type="file" accept=".csv,.txt" style={{display:"none"}} onChange={e=>e.target.files[0]&&handleFile(e.target.files[0])}/>
              </label>
            </div>

            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Option 2 — Paste CSV text</div>
              <textarea
                value={rawText} onChange={e=>setRawText(e.target.value)}
                placeholder={"Date,Description,Amount\n01/15/2025,STARBUCKS #1234,-4.75\n01/14/2025,PUBLIX SUPERMARKET,-89.23\n..."}
                style={{width:"100%",height:140,background:C.surfaceAlt,border:`1.5px solid ${rawText?C.accent:C.border}`,borderRadius:12,padding:"12px 14px",fontSize:12,fontFamily:"'SF Mono',monospace",color:C.text,outline:"none",resize:"none",boxSizing:"border-box",lineHeight:1.5}}
              />
            </div>

            {error&&<div style={{background:C.redBg,border:`1px solid ${C.redMid}`,borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:13,color:C.red}}>{error}</div>}

            <button onClick={handleParse} disabled={!rawText.trim()} style={{width:"100%",background:rawText.trim()?C.green:C.border,border:"none",borderRadius:14,padding:"15px 0",color:rawText.trim()?"#fff":C.textFaint,fontWeight:800,fontSize:16,cursor:rawText.trim()?"pointer":"default",fontFamily:MF}}>
              Parse Transactions →
            </button>
          </>}

          {step==="preview"&&<>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div>
                <div style={{fontFamily:MF,fontWeight:700,fontSize:16,color:C.text}}>{parsed.filter(r=>!skipped[r.id]).length} transactions ready</div>
                <div style={{fontSize:12,color:C.textLight}}>Total: {fmt(totalAmt)} · tap rows to adjust</div>
              </div>
              <button onClick={()=>{setStep("paste");setParsed([]);}} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12,color:C.textMid,fontWeight:600}}>← Back</button>
            </div>

            <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:10,padding:"9px 14px",marginBottom:12,fontSize:12,color:C.accent}}>
              ✅ Auto-categorized by merchant. Tap any category pill to change it. Toggle 🚫 to skip a row.
            </div>

            <div style={{marginBottom:16,maxHeight:380,overflowY:"auto",borderRadius:12,border:`1px solid ${C.border}`}}>
              {parsed.map((r,i)=>{
                const isSkipped=skipped[r.id];
                return(
                  <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderBottom:i<parsed.length-1?`1px solid ${C.border}`:"none",background:isSkipped?"#f8f9fc":C.surface,opacity:isSkipped?.4:1}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</div>
                      <div style={{fontSize:11,color:C.textLight,marginTop:2}}>{r.date}</div>
                      <div style={{marginTop:4,display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
                        <select value={editCats[r.id]||r.category} onChange={e=>{setEditCats(p=>({...p,[r.id]:e.target.value}));}} disabled={isSkipped}
                          style={{fontSize:10,fontWeight:700,background:C.accentBg,color:C.accent,border:`1px solid ${C.accentMid}`,borderRadius:99,padding:"2px 8px",cursor:"pointer",outline:"none",appearance:"none"}}>
                          {catNames.map(c=><option key={c} value={c}>{c}</option>)}
                        </select>
                        {household?.enabled&&household?.members?.length>1&&(
                          <select value={editOwner[r.id]||"me"} onChange={e=>setEditOwner(p=>({...p,[r.id]:e.target.value}))} disabled={isSkipped}
                            style={{fontSize:10,fontWeight:700,background:C.surfaceAlt,color:C.textMid,border:`1px solid ${C.border}`,borderRadius:99,padding:"2px 8px",cursor:"pointer",outline:"none",appearance:"none"}}>
                            {[{id:"me",name:"Me"},...household.members.filter(m=>m.id!=="me"),{id:"shared",name:"Shared"}].map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                        )}
                      </div>
                    </div>
                    <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:isSkipped?C.textFaint:C.red,flexShrink:0}}>-{fmt(r.amount)}</div>
                    <button onClick={()=>setSkipped(p=>({...p,[r.id]:!p[r.id]}))}
                      title={isSkipped?"Include":"Skip"}
                      style={{background:"none",border:"none",cursor:"pointer",color:isSkipped?C.green:C.textFaint,padding:"4px",fontSize:16,flexShrink:0}}>
                      {isSkipped?"✓":"🚫"}
                    </button>
                  </div>
                );
              })}
            </div>

            <button onClick={doImport} disabled={importing||parsed.filter(r=>!skipped[r.id]).length===0}
              style={{width:"100%",background:C.green,border:"none",borderRadius:14,padding:"15px 0",color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",fontFamily:MF}}>
              Import {parsed.filter(r=>!skipped[r.id]).length} Transactions
            </button>
          </>}

          {step==="done"&&(
            <div style={{textAlign:"center",padding:"40px 20px"}}>
              <div style={{fontSize:48,marginBottom:12}}>✅</div>
              <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,marginBottom:8}}>Import Complete!</div>
              <div style={{fontSize:14,color:C.textLight,marginBottom:24}}>Your transactions are now in Trackfi.</div>
              <button onClick={onClose} style={{background:C.accent,border:"none",borderRadius:14,padding:"14px 32px",color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",fontFamily:MF}}>Done</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
