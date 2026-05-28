import React, { useState } from "react";
import { Plus, Search, X, Trash2, Target } from "lucide-react";
import { C, MF } from "../theme.js";
import { Modal, FI } from "../components/ui.jsx";
import { EmojiPicker } from "../components/EmojiPicker.jsx";

export default function CategoriesView({categories,setCategories,expenses,setExpenses,showToast}){
  const[showAdd,setShowAdd]=useState(false);
  const[customEmoji,setCustomEmoji]=useState("");
  const[form,setForm]=useState({name:"",icon:""});
  const[editCat,setEditCat]=useState(null);
  const[editForm,setEditForm]=useState({});
  const[editCustomEmoji,setEditCustomEmoji]=useState("");
  const[searchCat,setSearchCat]=useState("");
  const DEFAULT_IDS=["groceries","fast_food","restaurants","coffee","rent_mort","utilities","gas","rideshare","car_pay","grooming","clothing","health_med","gym","phone","subscriptions","entertainment","dining_out","travel","pets","shopping","misc"];
  function add(){
    if(!form.name.trim())return;
    const icon=customEmoji.trim()||form.icon||"📦";
    const id="cat_"+Date.now();
    setCategories(p=>[...p,{id,name:form.name.trim(),icon}]);
    showToast&&showToast("✓ Category added — "+form.name.trim());
    setForm({name:"",icon:""});setCustomEmoji("");setShowAdd(false);
  }
  const filtered=categories.filter(c=>!searchCat||c.name.toLowerCase().includes(searchCat.toLowerCase()));
  const groups=[
    {label:"Food & Dining",ids:["groceries","fast_food","restaurants","coffee","dining_out"]},
    {label:"Home & Transport",ids:["rent_mort","utilities","gas","rideshare","car_pay"]},
    {label:"Personal Care",ids:["grooming","clothing","health_med","gym"]},
    {label:"Bills & Subs",ids:["phone","subscriptions"]},
    {label:"Lifestyle",ids:["entertainment","travel","pets","shopping","misc"]},
  ];
  const customCats=categories.filter(c=>!DEFAULT_IDS.includes(c.id));
  return(
    <div className="fu fv-view-root">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div>
          <div className="fv-page-title" style={{fontSize:18}}>Categories</div>
          <div style={{fontSize:13,color:C.textLight}}>{categories.length} categories · {customCats.length} custom</div>
        </div>
        <button onClick={()=>setShowAdd(true)} style={{background:C.accent,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}><Plus size={13}/>Add</button>
      </div>
      {/* Search */}
      <div style={{position:"relative",marginBottom:14}}>
        <Search size={14} color={C.textLight} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)"}}/>
        <input value={searchCat} onChange={e=>setSearchCat(e.target.value)} placeholder="Search categories..." style={{width:"100%",background:C.surface,border:`1.5px solid ${searchCat?C.accent:C.border}`,borderRadius:10,padding:"8px 12px 8px 30px",fontSize:13,color:C.text,outline:"none",boxSizing:"border-box"}}/>
        {searchCat&&<button onClick={()=>setSearchCat("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:C.textLight}}><X size={13}/></button>}
      </div>
      {/* Custom categories first */}
      {customCats.length>0&&!searchCat&&(
        <div style={{marginBottom:18}}>
          <div style={{fontSize:11,fontWeight:700,color:C.accent,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>My Custom Categories</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {customCats.map(cat=>(
              <div key={cat.id} style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"11px 14px",display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:38,height:38,borderRadius:10,background:"rgba(99,102,241,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{cat.icon}</div>
                <div style={{flex:1,fontSize:14,fontWeight:600,color:C.text}}>{cat.name}</div>
                <button onClick={()=>{setEditCat(cat);setEditForm({name:cat.name,icon:cat.icon||""});setEditCustomEmoji("");}} style={{background:"none",border:"none",cursor:"pointer",color:C.accent,fontSize:12,fontWeight:600,padding:"4px 6px"}}>Edit</button>
                <button onClick={()=>{const name=cat.name;setCategories(p=>p.filter(c=>c.id!==cat.id));setExpenses&&setExpenses(p=>p.map(e=>e.category===name?{...e,category:"Misc"}:e));showToast&&showToast("Category removed — expenses moved to Misc","error");}} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,display:"flex",padding:"4px 3px"}}><Trash2 size={13}/></button>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Default categories grouped */}
      {!searchCat?groups.map(g=>{
        const groupCats=categories.filter(c=>g.ids.includes(c.id));
        if(!groupCats.length)return null;
        return(
          <div key={g.label} style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:C.textLight,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>{g.label}</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {groupCats.map(cat=>(
                <div key={cat.id} style={{background:C.surface,borderRadius:12,boxShadow:"0 1px 3px rgba(10,22,40,.05)",padding:"11px 14px",display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:38,height:38,borderRadius:10,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{cat.icon}</div>
                  <div style={{flex:1,fontSize:14,fontWeight:500,color:C.text}}>{cat.name}</div>
                  <span style={{fontSize:10,color:C.textFaint,fontWeight:500}}>Default</span>
                </div>
              ))}
            </div>
          </div>
        );
      }):(
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {filtered.map(cat=>(
            <div key={cat.id} style={{background:C.surface,borderRadius:12,padding:"11px 14px",display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:38,height:38,borderRadius:10,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{cat.icon}</div>
              <div style={{flex:1,fontSize:14,fontWeight:500,color:C.text}}>{cat.name}</div>
              {!DEFAULT_IDS.includes(cat.id)&&<><button onClick={()=>{setEditCat(cat);setEditForm({name:cat.name,icon:cat.icon||""});setEditCustomEmoji("");}} style={{background:"none",border:"none",cursor:"pointer",color:C.accent,fontSize:12,fontWeight:600}}>Edit</button><button onClick={()=>{const name=cat.name;setCategories(p=>p.filter(c=>c.id!==cat.id));setExpenses&&setExpenses(p=>p.map(e=>e.category===name?{...e,category:"Misc"}:e));showToast&&showToast("Removed — expenses moved to Misc","error");}} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,display:"flex"}}><Trash2 size={13}/></button></>}
            </div>
          ))}
          {filtered.length===0&&<div style={{textAlign:"center",padding:30,color:C.textLight,fontSize:13}}>No categories match "{searchCat}"</div>}
        </div>
      )}
      {/* Tip */}
      <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"11px 14px",marginTop:8,fontSize:12,color:C.accent,lineHeight:1.5}}>
        💡 <strong>Tip:</strong> Add custom categories for anything specific — "Date Night", "Kids", "Side Hustle". The AI logger and envelopes will automatically use your categories.
      </div>
      {/* Edit modal */}
      {editCat&&<Modal title="Edit Category" icon={Target} onClose={()=>setEditCat(null)} onSubmit={()=>{const oldName=editCat.name;const newName=editForm.name||editCat.name;const icon=editCustomEmoji.trim()||editForm.icon||editCat.icon;setCategories(p=>p.map(c=>c.id===editCat.id?{...c,name:newName,icon}:c));if(newName!==oldName&&setExpenses)setExpenses(p=>p.map(e=>e.category===oldName?{...e,category:newName}:e));showToast&&showToast("✓ Category updated");setEditCat(null);}} submitLabel="Save">
        <EmojiPicker value={editForm.icon} onChange={v=>setEditForm(p=>({...p,icon:v}))} customVal={editCustomEmoji} onCustomChange={setEditCustomEmoji}/>
        <FI label="Category Name" value={editForm.name||""} onChange={e=>setEditForm(p=>({...p,name:e.target.value}))}/>
      </Modal>}
      {/* Add modal */}
      {showAdd&&<Modal title="New Category" icon={Target} onClose={()=>{setShowAdd(false);setForm({name:"",icon:""});setCustomEmoji("");}} onSubmit={add} submitLabel="Add Category">
        <EmojiPicker value={form.icon} onChange={v=>setForm(p=>({...p,icon:v}))} customVal={customEmoji} onCustomChange={setCustomEmoji}/>
        <FI label="Category Name" placeholder="e.g. Date Night, Kids, Side Hustle..." value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} autoFocus/>
      </Modal>}
    </div>
  );
}
