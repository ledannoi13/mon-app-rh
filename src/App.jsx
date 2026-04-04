import { useState, useEffect, useMemo, useCallback } from 'react'
import { joursOuvrables, feriesDansPeriode } from './joursFeries'
import { useAuth, useSocietes, useSalaries, useConges } from './hooks/useAppData'
import { supabase } from './supabase'
import LoginPage from './LoginPage'

/* ─── CONSTANTES ─── */
const TYPES   = ["Congés payés","RTT","Congé maladie","Congé sans solde"]
const STATUTS = ["En attente","Validé Manager","Validé RH","Approuvé","Refusé"]
const ROLES   = ["Super Admin","Manager","RH","Employé"]
const TC = {
  "Congés payés":    { bg:"#3B8BD4", light:"#E6F1FB" },
  "RTT":             { bg:"#1D9E75", light:"#E1F5EE" },
  "Congé maladie":   { bg:"#D85A30", light:"#FAECE7" },
  "Congé sans solde":{ bg:"#888780", light:"#F1EFE8" },
}
const SC = {
  "En attente":     { bg:"#FAC775", text:"#633806" },
  "Validé Manager": { bg:"#B5D4F4", text:"#042C53" },
  "Validé RH":      { bg:"#C0DD97", text:"#173404" },
  "Approuvé":       { bg:"#5DCAA5", text:"#04342C" },
  "Refusé":         { bg:"#F09595", text:"#501313" },
}
const NEXT = {
  "En attente":    ["Validé Manager","Refusé"],
  "Validé Manager":["Validé RH","Refusé"],
  "Validé RH":     ["Approuvé","Refusé"],
  "Approuvé":[], "Refusé":[],
}
const RC = {
  "Super Admin":{ bg:"#EEEDFE", text:"#3C3489", border:"#AFA9EC" },
  "Manager":    { bg:"#E6F1FB", text:"#0C447C", border:"#85B7EB" },
  "RH":         { bg:"#E1F5EE", text:"#085041", border:"#5DCAA5" },
  "Employé":    { bg:"#F1EFE8", text:"#444441", border:"#B4B2A9" },
}

/* ─── HELPERS ─── */
const diffDays = (a,b) => Math.round((new Date(b)-new Date(a))/(1000*60*60*24))
const fmtDate  = d => new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"})
const fmtShort = d => new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"short"})
const fmtTs    = d => new Date(d).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})
const initials = n => (n||"?").split(" ").map(x=>x[0]).join("").toUpperCase().slice(0,2)
const today    = new Date()
const isActiveNow = c => { const d=new Date(c.debut),f=new Date(c.fin); return d<=today&&f>=today&&c.statut==="Approuvé" }
const isThisWeek  = c => {
  const d=new Date(c.debut),f=new Date(c.fin)
  const ws=new Date(today); ws.setDate(today.getDate()-today.getDay()+1)
  const we=new Date(ws); we.setDate(ws.getDate()+6)
  return d<=we&&f>=ws&&["Approuvé","Validé RH","Validé Manager"].includes(c.statut)
}
const getSalId  = c => c.salarie_id || c.salarie
const getSalObj = (c, salaries) => salaries.find(s => s.id === getSalId(c))
const getSocId  = sal => sal?.societe_id || sal?.societeId
const getSocNom = (id, societes) => societes.find(s=>s.id===id)?.nom || "—"
const getLogColor = action => {
  if (!action) return { bg:"#F1EFE8", text:"#444441", icon:"📝" }
  if (action.includes("déconnexion")) return { bg:"#F1EFE8", text:"#444441", icon:"🚪" }
  if (action.includes("connexion"))   return { bg:"#E6F1FB", text:"#0C447C", icon:"🔐" }
  if (action.includes("refus"))       return { bg:"#FCEBEB", text:"#501313", icon:"❌" }
  if (action.includes("validé")||action.includes("approuvé")) return { bg:"#E1F5EE", text:"#085041", icon:"✅" }
  if (action.includes("congé"))       return { bg:"#EAF3DE", text:"#173404", icon:"📅" }
  if (action.includes("supprim"))     return { bg:"#FAECE7", text:"#4A1B0C", icon:"🗑" }
  if (action.includes("salarié"))     return { bg:"#EEEDFE", text:"#26215C", icon:"👤" }
  if (action.includes("société"))     return { bg:"#FAEEDA", text:"#412402", icon:"🏢" }
  if (action.includes("utilisateur")||action.includes("rôle")) return { bg:"#FBEAF0", text:"#4B1528", icon:"⚙️" }
  return { bg:"#F1EFE8", text:"#444441", icon:"📝" }
}

/* ─── UI COMPONENTS ─── */
function Avatar({ nom, size=30, colorIdx=0 }) {
  const colors=["#3B8BD4","#1D9E75","#D85A30","#888780","#534AB7","#BA7517"]
  const bg=colors[(colorIdx||0)%colors.length]
  return <div style={{width:size,height:size,borderRadius:"50%",background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.35,fontWeight:500,color:"#fff",flexShrink:0}}>{initials(nom)}</div>
}
function Badge({ statut }) {
  const s=SC[statut]||{bg:"#eee",text:"#888"}
  return <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:s.bg,color:s.text,fontWeight:500,whiteSpace:"nowrap"}}>{statut}</span>
}
function TypeBadge({ type }) {
  const t=TC[type]||{bg:"#888",light:"#eee"}
  return <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:t.light,color:t.bg,whiteSpace:"nowrap"}}>{type}</span>
}
function RoleBadge({ role }) {
  const rc=RC[role]||RC["Employé"]
  return <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:rc.bg,color:rc.text,border:`0.5px solid ${rc.border}`,fontWeight:500,whiteSpace:"nowrap"}}>{role}</span>
}
function Card({ children, style={} }) {
  return <div style={{background:"#fff",border:"0.5px solid #e8e8e8",borderRadius:12,padding:"16px 18px",...style}}>{children}</div>
}
function SectionTitle({ children }) {
  return <div style={{fontSize:11,fontWeight:500,color:"#aaa",letterSpacing:".06em",textTransform:"uppercase",marginBottom:10}}>{children}</div>
}
function StatBox({ label, value, color, sub }) {
  return (
    <div style={{background:"#f9f9f9",borderRadius:10,padding:"12px 14px",border:"0.5px solid #f0f0f0"}}>
      <div style={{fontSize:11,color:"#aaa",marginBottom:4}}>{label}</div>
      <div style={{fontSize:24,fontWeight:500,color:color||"#111",lineHeight:1}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:"#bbb",marginTop:4}}>{sub}</div>}
    </div>
  )
}
function ProgressBar({ value, max, color="#3B8BD4" }) {
  const pct=Math.min(100,Math.round((value/Math.max(max,1))*100))
  return <div style={{height:6,background:"#f0f0f0",borderRadius:3,overflow:"hidden",marginTop:4}}><div style={{height:"100%",width:pct+"%",background:color,borderRadius:3}}/></div>
}
function Modal({ title, children, onClose }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
      <div style={{background:"#fff",borderRadius:12,border:"0.5px solid #e5e5e5",padding:24,minWidth:340,maxWidth:520,width:"92%",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <span style={{fontSize:15,fontWeight:500}}>{title}</span>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#888",lineHeight:1}}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ─── HOOKS SUPPLÉMENTAIRES ─── */
function useProfiles() {
  const [profiles,setProfiles]=useState([])
  const [loading,setLoading]=useState(true)
  async function load(){
    setLoading(true)
    const{data}=await supabase.from('profiles').select('*').order('nom')
    setProfiles(data||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[])
  async function updateProfile(id,fields){await supabase.from('profiles').update(fields).eq('id',id);load()}
  async function deleteProfile(id){await supabase.from('profiles').delete().eq('id',id);load()}
  return{profiles,loading,updateProfile,deleteProfile,reloadProfiles:load}
}

function useLogs() {
  const [logs,setLogs]=useState([])
  const [loading,setLoading]=useState(true)
  async function load(){
    setLoading(true)
    const{data}=await supabase.from('logs').select('*').order('created_at',{ascending:false}).limit(200)
    setLogs(data||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[])
  async function addLog(user_id,user_nom,user_role,action,details=""){
    try{await supabase.from('logs').insert({user_id,user_nom,user_role,action,details});load()}catch(e){console.warn("Log non enregistré:",e.message)}
  }
  async function clearLogs(){await supabase.from('logs').delete().neq('id','00000000-0000-0000-0000-000000000000');load()}
  return{logs,loading,addLog,clearLogs,reloadLogs:load}
}

/* ─── CONGÉ ROW ─── */
function CongeRow({c,salaries,societes,onAction,actionsAllowed=[]}){
  const [open,setOpen]=useState(false)
  const sal=getSalObj(c,salaries)
  return(
    <div style={{borderBottom:"0.5px solid #f5f5f5"}}>
      <div onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",cursor:"pointer",flexWrap:"wrap"}}>
        <Avatar nom={sal?.nom||"?"} size={28}/>
        <div style={{flex:1,minWidth:80}}>
          <div style={{fontSize:13,fontWeight:500}}>{sal?.nom||"—"}</div>
          <div style={{fontSize:11,color:"#aaa"}}>{fmtShort(c.debut)} → {fmtShort(c.fin)} · {diffDays(c.debut,c.fin)+1}j</div>
        </div>
        <TypeBadge type={c.type}/><Badge statut={c.statut}/>
      </div>
      {open&&actionsAllowed.length>0&&(
        <div style={{paddingBottom:10,paddingLeft:38,display:"flex",gap:6,flexWrap:"wrap"}}>
          {c.commentaire&&<div style={{fontSize:12,color:"#888",width:"100%",marginBottom:6,fontStyle:"italic"}}>"{c.commentaire}"</div>}
          {actionsAllowed.map(ns=><button key={ns} onClick={()=>onAction(c.id,ns)} style={{fontSize:12,padding:"4px 12px",borderRadius:6,background:SC[ns].bg,color:SC[ns].text,border:"none",cursor:"pointer"}}>→ {ns}</button>)}
        </div>
      )}
    </div>
  )
}

/* ═══ ESPACE SALARIÉ COMPLET ═══ */
function DashboardEmploye({profile,conges,salaries,societes,onNewRequest,soumettre,role}){
  const mesConges=conges.filter(c=>getSalId(c)===profile.salarie_id)
  const enCours=mesConges.filter(c=>isActiveNow(c))
  const enAttente=mesConges.filter(c=>["En attente","Validé Manager","Validé RH"].includes(c.statut))
  const prochains=mesConges.filter(c=>new Date(c.debut)>today&&c.statut==="Approuvé").sort((a,b)=>new Date(a.debut)-new Date(b.debut))

  // Soldes réels
  const [solde,setSolde]=useState(null)
  useEffect(()=>{
    if(!profile.salarie_id)return
    supabase.from('soldes').select('*').eq('salarie_id',profile.salarie_id).single()
      .then(({data})=>setSolde(data))
  },[profile.salarie_id])

  // Formulaire
  const [showForm,setShowForm]=useState(false)
  const [form,setForm]=useState({type:"Congés payés",debut:"",fin:"",commentaire:""})
  const [formMsg,setFormMsg]=useState(null)
  const [submitLoading,setSubmitLoading]=useState(false)

  // Calendrier
  const [calMonth,setCalMonth]=useState(today.getMonth())
  const [calYear,setCalYear]=useState(today.getFullYear())
  const monthNames=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"]
  const calTotalDays=new Date(calYear,calMonth+1,0).getDate()
  const congesDuMois=mesConges.filter(c=>{
    const d=new Date(c.debut),f=new Date(c.fin)
    return d<=new Date(calYear,calMonth,calTotalDays,23,59)&&f>=new Date(calYear,calMonth,1)
  })
  const isCurrentMonth=calMonth===today.getMonth()&&calYear===today.getFullYear()
  const COL_W=28,ROW_H=40,LABEL_W=100
  const annee=new Date().getFullYear()

  // Vérifie le solde
  function checkSolde(){
    if(!form.debut||!form.fin||!solde)return null
    const jours=joursOuvrables(form.debut,form.fin)
    if(jours<=0)return null
    if(form.type==="Congés payés"){
      const cpN1Restant=Math.max(solde.cp_n1_acquis-solde.cp_n1_pris,0)
      const cpNRestant=Math.max(solde.cp_n_acquis-solde.cp_n_pris,0)
      const totalCp=cpN1Restant+cpNRestant
      if(jours>totalCp){
        const manque=jours-totalCp
        const rttRestant=Math.max(solde.rtt_acquis-solde.rtt_pris,0)
        return{type:"warning",jours,manque,text:`⚠️ Solde insuffisant — ${jours}j demandés mais ${totalCp}j CP disponibles (${cpN1Restant}j N-1 + ${cpNRestant}j N). Il manque ${manque}j.`,
          suggestions:[rttRestant>=manque&&{label:`Utiliser ${manque}j RTT à la place`,type:"RTT"},{label:`Prendre ${manque}j sans solde`,type:"Congé sans solde"}].filter(Boolean)}
      }
    }
    if(form.type==="RTT"){
      const rttRestant=Math.max(solde.rtt_acquis-solde.rtt_pris,0)
      if(jours>rttRestant){
        const manque=jours-rttRestant
        return{type:"warning",jours,manque,text:`⚠️ Solde RTT insuffisant — ${jours}j demandés mais ${rttRestant}j disponibles. Il manque ${manque}j.`,
          suggestions:[{label:`Prendre ${manque}j sans solde`,type:"Congé sans solde"}]}
      }
    }
    return{type:"ok",jours,text:`✓ ${jours}j ouvrables demandés`}
  }
  const soldeCheck=checkSolde()

  async function handleSubmit(e){
    e.preventDefault()
    if(!form.debut||!form.fin||new Date(form.fin)<new Date(form.debut)){setFormMsg({text:"Dates invalides",type:"error"});return}
    setSubmitLoading(true)
    let statutInitial="En attente"
    if(role==="Manager")statutInitial="Validé Manager"
    if(role==="RH")statutInitial="Validé RH"
    if(role==="Super Admin")statutInitial="Approuvé"
    await soumettre({salarie_id:profile.salarie_id,type:form.type,debut:form.debut,fin:form.fin,commentaire:form.commentaire,statut:statutInitial})
    const{data}=await supabase.from('soldes').select('*').eq('salarie_id',profile.salarie_id).single()
    setSolde(data)
    setForm({type:"Congés payés",debut:"",fin:"",commentaire:""})
    setFormMsg({text:"✓ Demande soumise avec succès !",type:"success"})
    setShowForm(false)
    setTimeout(()=>setFormMsg(null),3000)
    setSubmitLoading(false)
  }

  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>

      {formMsg&&<div style={{padding:"10px 16px",borderRadius:8,fontSize:13,fontWeight:500,
        background:formMsg.type==="error"?"#FCEBEB":formMsg.type==="success"?"#E1F5EE":"#FAEEDA",
        color:formMsg.type==="error"?"#501313":formMsg.type==="success"?"#085041":"#633806"}}>{formMsg.text}</div>}

      {/* Bandeau bienvenue */}
      <div style={{background:"linear-gradient(135deg,#1e1b4b,#312e81)",borderRadius:16,padding:"20px 24px",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",width:120,height:120,borderRadius:"50%",background:"rgba(255,255,255,0.06)",top:-30,right:40}}/>
        <div style={{width:48,height:48,borderRadius:"50%",background:"linear-gradient(135deg,#FF6B6B,#FF8E53)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(profile.nom)}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:18,fontWeight:700,color:"white",fontFamily:"'Syne',sans-serif"}}>Bonjour, {profile.nom.split(" ")[0]} 👋</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.6)",marginTop:2}}>
            {enCours.length>0?`🌴 En congé — retour le ${fmtDate(enCours[0].fin)}`:prochains.length>0?`⏳ Prochain : ${fmtShort(prochains[0].debut)} → ${fmtShort(prochains[0].fin)}`:"Aucun congé approuvé à venir"}
          </div>
        </div>
        <button onClick={()=>setShowForm(f=>!f)} style={{fontSize:13,padding:"10px 20px",borderRadius:99,background:"linear-gradient(135deg,#FF6B6B,#FF8E53)",color:"white",border:"none",cursor:"pointer",fontWeight:700,boxShadow:"0 4px 12px rgba(255,107,107,0.4)",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
          {showForm?"✕ Fermer":"+ Nouvelle demande"}
        </button>
      </div>

      {/* Formulaire */}
      {showForm&&(
        <div style={{background:"#fff",border:"1px solid #e8e8e8",borderRadius:16,padding:"20px 24px"}}>
          <div style={{fontSize:15,fontWeight:600,marginBottom:16}}>Nouvelle demande de congé</div>
          <form onSubmit={handleSubmit}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div style={{gridColumn:"1/-1"}}>
                <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:6}}>TYPE DE CONGÉ</label>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {TYPES.map(t=>(
                    <button type="button" key={t} onClick={()=>{setForm(f=>({...f,type:t}));setFormMsg(null)}}
                      style={{fontSize:12,padding:"6px 14px",borderRadius:99,border:`1.5px solid ${form.type===t?TC[t].bg:"#e5e7eb"}`,
                        background:form.type===t?TC[t].light:"white",color:form.type===t?TC[t].bg:"#888",
                        cursor:"pointer",fontWeight:form.type===t?600:400}}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:4}}>DATE DE DÉBUT</label>
                <input type="date" value={form.debut} onChange={e=>{setForm(f=>({...f,debut:e.target.value}));setFormMsg(null)}} required
                  style={{width:"100%",fontSize:13,padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,boxSizing:"border-box"}}/>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:4}}>DATE DE FIN</label>
                <input type="date" value={form.fin} onChange={e=>{setForm(f=>({...f,fin:e.target.value}));setFormMsg(null)}} required
                  style={{width:"100%",fontSize:13,padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,boxSizing:"border-box"}}/>
              </div>
              <div style={{gridColumn:"1/-1"}}>
                <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:4}}>COMMENTAIRE (optionnel)</label>
                <textarea value={form.commentaire} onChange={e=>setForm(f=>({...f,commentaire:e.target.value}))} rows={2}
                  style={{width:"100%",fontSize:13,padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,boxSizing:"border-box",resize:"vertical"}}/>
              </div>
            </div>

            {/* Indicateur solde */}
            {soldeCheck&&(
              <div style={{padding:"10px 14px",borderRadius:10,marginBottom:12,
                background:soldeCheck.type==="ok"?"#E1F5EE":"#FAEEDA",
                border:`0.5px solid ${soldeCheck.type==="ok"?"#5DCAA5":"#FAC775"}`}}>
                <div style={{fontSize:13,fontWeight:500,color:soldeCheck.type==="ok"?"#085041":"#633806",marginBottom:soldeCheck.suggestions?.length?8:0}}>
                  {soldeCheck.text}
                </div>
                {soldeCheck.suggestions?.length>0&&(
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:6,alignItems:"center"}}>
                    <span style={{fontSize:11,color:"#888"}}>Suggestion :</span>
                    {soldeCheck.suggestions.map(s=>(
                      <button type="button" key={s.label} onClick={()=>setForm(f=>({...f,type:s.type}))}
                        style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:"white",
                          border:`0.5px solid ${TC[s.type]?.bg||"#888"}`,color:TC[s.type]?.bg||"#888",cursor:"pointer",fontWeight:500}}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{display:"flex",gap:8}}>
              <button type="submit" disabled={submitLoading}
                style={{flex:1,fontSize:13,padding:"10px",borderRadius:10,
                  background:submitLoading?"#d1d5db":"linear-gradient(135deg,#7C3AED,#EC4899)",
                  color:"white",border:"none",cursor:submitLoading?"not-allowed":"pointer",
                  fontWeight:600,boxShadow:submitLoading?"none":"0 4px 12px rgba(124,58,237,0.3)"}}>
                {submitLoading?"⏳ Envoi...":"Soumettre la demande"}
              </button>
              <button type="button" onClick={()=>{setShowForm(false);setFormMsg(null)}}
                style={{fontSize:13,padding:"10px 16px",borderRadius:10,cursor:"pointer",border:"1px solid #e5e7eb"}}>
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Soldes */}
      <Card>
        <SectionTitle>Mes soldes</SectionTitle>
        {!solde?(
          <div style={{textAlign:"center",padding:"20px 0",color:"#bbb",fontSize:13}}>Chargement...</div>
        ):(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            {[
              {label:`CP ${annee} (N)`,acquis:solde.cp_n_acquis,pris:solde.cp_n_pris,color:"#3B8BD4",bg:"#E6F1FB"},
              {label:`CP ${annee-1} (N-1)`,acquis:solde.cp_n1_acquis,pris:solde.cp_n1_pris,color:"#D85A30",bg:"#FAECE7",
               alerte:solde.cp_n1_acquis-solde.cp_n1_pris>0&&new Date().getMonth()>=4},
              {label:"RTT",acquis:solde.rtt_acquis,pris:solde.rtt_pris,color:"#1D9E75",bg:"#E1F5EE"},
            ].map(({label,acquis,pris,color,bg,alerte})=>{
              const restant=Math.max(acquis-pris,0)
              const pct=acquis>0?Math.min(Math.round((pris/acquis)*100),100):0
              return(
                <div key={label} style={{padding:"14px 16px",borderRadius:12,background:bg,border:`0.5px solid ${color}33`,position:"relative"}}>
                  {alerte&&<div style={{position:"absolute",top:8,right:8,fontSize:10,padding:"1px 6px",borderRadius:20,background:"#FCEBEB",color:"#501313"}}>⚠ expire 31/05</div>}
                  <div style={{fontSize:11,color:"#888",marginBottom:4,fontWeight:500}}>{label}</div>
                  <div style={{fontSize:32,fontWeight:700,color,lineHeight:1,marginBottom:4}}>{restant}j</div>
                  <div style={{fontSize:11,color:"#aaa",marginBottom:8}}>restants</div>
                  <div style={{height:5,background:"rgba(0,0,0,0.08)",borderRadius:3,overflow:"hidden",marginBottom:8}}>
                    <div style={{height:"100%",width:pct+"%",background:color,borderRadius:3}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#aaa"}}>
                    <span>{acquis}j acquis</span><span>{pris}j pris</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Calendrier personnel */}
      <Card>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <SectionTitle>Mon calendrier</SectionTitle>
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
            <button onClick={()=>{if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1)}else setCalMonth(m=>m-1)}}
              style={{width:28,height:28,borderRadius:6,border:"0.5px solid #ddd",background:"#fff",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
            <span style={{fontSize:13,fontWeight:500,minWidth:120,textAlign:"center"}}>{monthNames[calMonth]} {calYear}</span>
            <button onClick={()=>{if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1)}else setCalMonth(m=>m+1)}}
              style={{width:28,height:28,borderRadius:6,border:"0.5px solid #ddd",background:"#fff",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
            {!isCurrentMonth&&<button onClick={()=>{setCalMonth(today.getMonth());setCalYear(today.getFullYear())}}
              style={{fontSize:11,color:"#7C3AED",background:"none",border:"none",cursor:"pointer"}}>← Auj.</button>}
          </div>
        </div>
        {congesDuMois.length===0?(
          <div style={{textAlign:"center",padding:"24px 0",color:"#bbb",fontSize:13}}>Aucun congé en {monthNames[calMonth]} {calYear}</div>
        ):(
          <div style={{overflowX:"auto"}}>
            <div style={{minWidth:LABEL_W+calTotalDays*COL_W}}>
              <div style={{display:"flex",marginBottom:4,paddingLeft:LABEL_W}}>
                {Array.from({length:calTotalDays},(_,i)=>{
                  const d=new Date(calYear,calMonth,i+1)
                  const isWE=d.getDay()===0||d.getDay()===6
                  const isToday2=today.toDateString()===d.toDateString()
                  const dayNames=["D","L","M","M","J","V","S"]
                  return(
                    <div key={i} style={{width:COL_W,flexShrink:0,textAlign:"center",background:isToday2?"#7C3AED":isWE?"#f5f5f5":"transparent",borderRadius:isToday2?4:2,padding:"1px 0"}}>
                      <div style={{fontSize:9,color:isToday2?"#fff":isWE?"#ccc":"#ccc"}}>{dayNames[d.getDay()]}</div>
                      <div style={{fontSize:11,fontWeight:isToday2?700:400,color:isToday2?"#fff":isWE?"#ccc":"#999"}}>{i+1}</div>
                    </div>
                  )
                })}
              </div>
              {TYPES.filter(t=>congesDuMois.some(c=>c.type===t)).map(t=>{
                const cType=congesDuMois.filter(c=>c.type===t)
                return(
                  <div key={t} style={{display:"flex",alignItems:"center",minHeight:ROW_H,marginBottom:4}}>
                    <div style={{width:LABEL_W,flexShrink:0,fontSize:10,color:TC[t].bg,fontWeight:600,paddingRight:8,textAlign:"right"}}>{t.split(" ")[0]}</div>
                    <div style={{flex:1,position:"relative",height:ROW_H,background:"#fafafa",borderRadius:8}}>
                      {cType.map(c=>{
                        const ms=new Date(calYear,calMonth,1),me=new Date(calYear,calMonth,calTotalDays,23,59)
                        const d=new Date(c.debut),f=new Date(c.fin)
                        const s2=d<ms?ms:d,e2=f>me?me:f
                        const sd=s2.getDate()-1,dur=Math.round((e2-s2)/(1000*60*60*24))+1
                        const isApprouve=c.statut==="Approuvé"
                        return(
                          <div key={c.id} title={`${fmtDate(c.debut)} → ${fmtDate(c.fin)} · ${joursOuvrables(c.debut,c.fin)}j ouvrables · ${c.statut}`}
                            style={{position:"absolute",left:sd*COL_W+2,top:6,height:ROW_H-12,
                              width:Math.max(dur*COL_W-4,COL_W-4),background:TC[t].bg,borderRadius:6,
                              opacity:isApprouve?1:0.55,display:"flex",alignItems:"center",overflow:"hidden",
                              border:isApprouve?"none":`1.5px dashed ${TC[t].bg}`,boxSizing:"border-box"}}>
                            {dur*COL_W>50&&<span style={{fontSize:10,color:"#fff",padding:"0 6px",fontWeight:500}}>{isApprouve?"✓":c.statut.split(" ")[0]}</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Card>

      {/* En cours de traitement */}
      {enAttente.length>0&&<Card>
        <SectionTitle>En cours de traitement</SectionTitle>
        {enAttente.map(c=>{
          const step=["En attente","Validé Manager","Validé RH","Approuvé"].indexOf(c.statut)
          return(<div key={c.id} style={{padding:"12px 0",borderBottom:"0.5px solid #f5f5f5"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,flexWrap:"wrap",gap:6}}>
              <div><TypeBadge type={c.type}/><span style={{fontSize:12,color:"#888",marginLeft:8}}>{fmtShort(c.debut)} → {fmtShort(c.fin)} · {joursOuvrables(c.debut,c.fin)}j ouvrables</span></div>
              <Badge statut={c.statut}/>
            </div>
            <div style={{display:"flex",alignItems:"center"}}>
              {["Soumis","Manager","RH","Approuvé"].map((lbl,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",flex:i<3?1:0}}>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                    <div style={{width:20,height:20,borderRadius:"50%",background:i<=step?"linear-gradient(135deg,#7C3AED,#EC4899)":"#e8e8e8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:i<=step?"#fff":"#bbb",fontWeight:500}}>{i<step?"✓":i+1}</div>
                    <div style={{fontSize:9,color:i<=step?"#7C3AED":"#bbb",whiteSpace:"nowrap"}}>{lbl}</div>
                  </div>
                  {i<3&&<div style={{flex:1,height:2,background:i<step?"linear-gradient(135deg,#7C3AED,#EC4899)":"#e8e8e8",marginBottom:14,minWidth:10}}/>}
                </div>
              ))}
            </div>
          </div>)
        })}
      </Card>}

      {/* Historique */}
      <Card>
        <SectionTitle>Historique de mes congés</SectionTitle>
        {mesConges.length===0&&<div style={{textAlign:"center",padding:"20px 0",color:"#bbb",fontSize:13}}>Aucune demande</div>}
        {mesConges.slice().sort((a,b)=>new Date(b.debut)-new Date(a.debut)).map(c=>(
          <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"0.5px solid #f5f5f5",flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:120}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <TypeBadge type={c.type}/>
                <span style={{fontSize:12,color:"#666"}}>{fmtDate(c.debut)} → {fmtDate(c.fin)}</span>
              </div>
              <div style={{fontSize:11,color:"#aaa",marginTop:3}}>{joursOuvrables(c.debut,c.fin)}j ouvrables · {diffDays(c.debut,c.fin)+1}j calendrier</div>
              {c.commentaire&&<div style={{fontSize:11,color:"#bbb",fontStyle:"italic",marginTop:2}}>"{c.commentaire}"</div>}
            </div>
            <Badge statut={c.statut}/>
          </div>
        ))}
      </Card>
    </div>
  )
}

/* ═══ DASHBOARD MANAGER ═══ */
function DashboardManager({profile,conges,salaries,societes,changerStatut}){
  const monEquipe=salaries.filter(s=>getSocId(s)===profile.societe_id)
  const congesEquipe=conges.filter(c=>monEquipe.some(s=>s.id===getSalId(c)))
  const aValider=congesEquipe.filter(c=>c.statut==="En attente")
  const enCours=congesEquipe.filter(c=>isActiveNow(c))
  const cetteSemaine=congesEquipe.filter(c=>isThisWeek(c))
  const cemois=congesEquipe.filter(c=>{const d=new Date(c.debut);return d.getMonth()===today.getMonth()&&d.getFullYear()===today.getFullYear()})
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{background:"#E6F1FB",border:"0.5px solid #B5D4F4",borderRadius:12,padding:"18px 20px",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
        <Avatar nom={profile.nom} size={44} colorIdx={0}/>
        <div><div style={{fontSize:16,fontWeight:500}}>Tableau de bord Manager</div><div style={{fontSize:13,color:"#888",marginTop:2}}>{getSocNom(profile.societe_id,societes)} · {monEquipe.length} membres</div></div>
        {aValider.length>0&&<div style={{marginLeft:"auto",background:"#E24B4A",color:"#fff",borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:500}}>{aValider.length} à valider</div>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        <StatBox label="À valider" value={aValider.length} color="#D85A30" sub="en attente"/>
        <StatBox label="Absents" value={enCours.length} color="#3B8BD4" sub="maintenant"/>
        <StatBox label="Cette semaine" value={cetteSemaine.length} color="#1D9E75" sub="planifiés"/>
        <StatBox label="Ce mois" value={cemois.length} color="#888780" sub="total"/>
      </div>
      <Card>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}><SectionTitle>À valider</SectionTitle>{aValider.length===0&&<span style={{fontSize:11,color:"#1D9E75"}}>✓ Tout est traité</span>}</div>
        {aValider.length===0&&<div style={{textAlign:"center",padding:"16px 0",color:"#bbb",fontSize:13}}>Aucune demande en attente</div>}
        {aValider.map(c=><CongeRow key={c.id} c={c} salaries={salaries} societes={societes} onAction={changerStatut} actionsAllowed={NEXT["En attente"]}/>)}
      </Card>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Card>
          <SectionTitle>Absents aujourd'hui</SectionTitle>
          {enCours.length===0&&<div style={{fontSize:13,color:"#bbb",padding:"12px 0",textAlign:"center"}}>Toute l'équipe est présente</div>}
          {enCours.map(c=>{const sal=getSalObj(c,salaries);return(<div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"0.5px solid #f5f5f5"}}><Avatar nom={sal?.nom||"?"} size={28}/><div style={{flex:1}}><div style={{fontSize:13,fontWeight:500}}>{sal?.nom}</div><div style={{fontSize:11,color:"#aaa"}}>Retour le {fmtDate(c.fin)}</div></div><TypeBadge type={c.type}/></div>)})}
        </Card>
        <Card>
          <SectionTitle>Cette semaine</SectionTitle>
          {cetteSemaine.length===0&&<div style={{fontSize:13,color:"#bbb",padding:"12px 0",textAlign:"center"}}>Aucun congé planifié</div>}
          {cetteSemaine.map(c=>{const sal=getSalObj(c,salaries);return(<div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"0.5px solid #f5f5f5"}}><Avatar nom={sal?.nom||"?"} size={28}/><div style={{flex:1}}><div style={{fontSize:13,fontWeight:500}}>{sal?.nom}</div><div style={{fontSize:11,color:"#aaa"}}>{fmtShort(c.debut)} → {fmtShort(c.fin)}</div></div><Badge statut={c.statut}/></div>)})}
        </Card>
      </div>
      <Card>
        <SectionTitle>Toutes les demandes</SectionTitle>
        {congesEquipe.slice().sort((a,b)=>new Date(b.debut)-new Date(a.debut)).map(c=><CongeRow key={c.id} c={c} salaries={salaries} societes={societes} onAction={changerStatut} actionsAllowed={c.statut==="En attente"?NEXT["En attente"]:[]}/>)}
      </Card>
    </div>
  )
}

/* ═══ DASHBOARD RH ═══ */
function DashboardRH({profile,conges,salaries,societes,changerStatut}){
  const aValider=conges.filter(c=>c.statut==="Validé Manager")
  const enAttente=conges.filter(c=>c.statut==="En attente")
  const approuves=conges.filter(c=>c.statut==="Approuvé")
  const refuses=conges.filter(c=>c.statut==="Refusé")
  const enCours=conges.filter(c=>isActiveNow(c))
  const managerIds=salaries.filter(s=>s.poste==="Manager").map(s=>s.id)
  const congesManagers=conges.filter(c=>managerIds.includes(getSalId(c)))
  const statsSoc=societes.map(soc=>{
    const salsSoc=salaries.filter(s=>getSocId(s)===soc.id)
    const cSoc=conges.filter(c=>salsSoc.some(s=>s.id===getSalId(c)))
    return{...soc,total:cSoc.length,enAttente:cSoc.filter(c=>c.statut==="En attente").length,aValiderRH:cSoc.filter(c=>c.statut==="Validé Manager").length,approuves:cSoc.filter(c=>c.statut==="Approuvé").length,nbSal:salsSoc.length}
  }).filter(s=>s.total>0||s.nbSal>0)
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{background:"#E1F5EE",border:"0.5px solid #5DCAA5",borderRadius:12,padding:"18px 20px",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
        <Avatar nom={profile.nom} size={44} colorIdx={1}/>
        <div><div style={{fontSize:16,fontWeight:500}}>Tableau de bord RH</div><div style={{fontSize:13,color:"#888",marginTop:2}}>Vue globale · {societes.length} sociétés · {salaries.length} salariés</div></div>
        {aValider.length>0&&<div style={{marginLeft:"auto",background:"#0F6E56",color:"#fff",borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:500}}>{aValider.length} à valider RH</div>}
      </div>
      <Card>
        <SectionTitle>Pipeline global</SectionTitle>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:4}}>
          {[{label:"En attente",count:enAttente.length,bg:"#FAC775",tc:"#633806"},{label:"Chez Manager",count:conges.filter(c=>c.statut==="Validé Manager").length,bg:"#B5D4F4",tc:"#042C53"},{label:"Chez RH",count:conges.filter(c=>c.statut==="Validé RH").length,bg:"#C0DD97",tc:"#173404"},{label:"Approuvés",count:approuves.length,bg:"#5DCAA5",tc:"#04342C"},{label:"Refusés",count:refuses.length,bg:"#F09595",tc:"#501313"}].map((s,i)=>(
            <div key={i} style={{background:s.bg,borderRadius:8,padding:"12px 8px",textAlign:"center"}}><div style={{fontSize:26,fontWeight:500,color:s.tc,lineHeight:1}}>{s.count}</div><div style={{fontSize:10,color:s.tc,marginTop:4,opacity:.85}}>{s.label}</div></div>
          ))}
        </div>
      </Card>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        <StatBox label="Absents" value={enCours.length} color="#D85A30" sub="aujourd'hui"/>
        <StatBox label="Total demandes" value={conges.length} color="#3B8BD4"/>
        <StatBox label="Taux approbation" value={conges.length?Math.round(approuves.length/conges.length*100)+"%":"—"} color="#1D9E75"/>
        <StatBox label="Congés managers" value={congesManagers.filter(c=>["En attente","Validé Manager","Validé RH"].includes(c.statut)).length} color="#888780" sub="en cours"/>
      </div>
      <Card>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}><SectionTitle>À valider par RH</SectionTitle>{aValider.length===0&&<span style={{fontSize:11,color:"#1D9E75"}}>✓ Tout est traité</span>}</div>
        {aValider.length===0&&<div style={{textAlign:"center",padding:"16px 0",color:"#bbb",fontSize:13}}>Aucune demande en attente</div>}
        {aValider.map(c=>{const sal=getSalObj(c,salaries);return(<div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"0.5px solid #f5f5f5",flexWrap:"wrap"}}><Avatar nom={sal?.nom||"?"} size={28}/><div style={{flex:1,minWidth:80}}><div style={{fontSize:13,fontWeight:500}}>{sal?.nom}</div><div style={{fontSize:11,color:"#aaa"}}>{getSocNom(getSocId(sal),societes)} · {fmtShort(c.debut)} → {fmtShort(c.fin)}</div></div><TypeBadge type={c.type}/><div style={{display:"flex",gap:6}}>{NEXT["Validé Manager"].map(ns=><button key={ns} onClick={()=>changerStatut(c.id,ns)} style={{fontSize:12,padding:"4px 12px",borderRadius:6,background:SC[ns].bg,color:SC[ns].text,border:"none",cursor:"pointer"}}>→ {ns}</button>)}</div></div>)})}
      </Card>
      <Card>
        <SectionTitle>Vue par société</SectionTitle>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:10}}>
          {statsSoc.map(soc=>(
            <div key={soc.id} style={{border:"0.5px solid #e8e8e8",borderRadius:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:500,marginBottom:6}}>{soc.nom}</div>
              <div style={{fontSize:11,color:"#aaa",marginBottom:8}}>{soc.nbSal} salarié(s)</div>
              {[{label:"En attente",v:soc.enAttente,bg:"#FAC775",tc:"#633806"},{label:"À valider RH",v:soc.aValiderRH,bg:"#B5D4F4",tc:"#042C53"},{label:"Approuvés",v:soc.approuves,bg:"#5DCAA5",tc:"#04342C"}].map(r=>r.v>0?(<div key={r.label} style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,color:"#888"}}>{r.label}</span><span style={{fontSize:11,fontWeight:500,padding:"1px 8px",borderRadius:20,background:r.bg,color:r.tc}}>{r.v}</span></div>):null)}
              {soc.enAttente===0&&soc.aValiderRH===0&&<div style={{fontSize:11,color:"#bbb",fontStyle:"italic"}}>À jour</div>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

/* ═══ DASHBOARD SUPER ADMIN ═══ */
function DashboardSuperAdmin({profile,conges,salaries,societes,changerStatut,profiles,logs}){
  const aValider=conges.filter(c=>["En attente","Validé Manager","Validé RH"].includes(c.statut))
  const enCours=conges.filter(c=>isActiveNow(c))
  const approuves=conges.filter(c=>c.statut==="Approuvé")
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{background:"#EEEDFE",border:"0.5px solid #AFA9EC",borderRadius:12,padding:"18px 20px",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
        <Avatar nom={profile.nom} size={44} colorIdx={4}/>
        <div><div style={{fontSize:16,fontWeight:500}}>Tableau de bord Super Admin</div><div style={{fontSize:13,color:"#888",marginTop:2}}>Contrôle total · {societes.length} sociétés · {salaries.length} salariés · {profiles.length} utilisateurs</div></div>
        {aValider.length>0&&<div style={{marginLeft:"auto",background:"#3C3489",color:"#fff",borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:500}}>{aValider.length} en attente</div>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        <StatBox label="Utilisateurs" value={profiles.length} color="#3C3489" sub="comptes actifs"/>
        <StatBox label="Absents" value={enCours.length} color="#D85A30" sub="maintenant"/>
        <StatBox label="En attente" value={aValider.length} color="#BA7517" sub="à traiter"/>
        <StatBox label="Taux approbation" value={conges.length?Math.round(approuves.length/conges.length*100)+"%":"—"} color="#1D9E75"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Card>
          <SectionTitle>Répartition des utilisateurs</SectionTitle>
          {ROLES.map(role=>{
            const count=profiles.filter(p=>p.role===role).length
            const rc2=RC[role]
            return(<div key={role} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"0.5px solid #f5f5f5"}}><RoleBadge role={role}/><div style={{flex:1}}><ProgressBar value={count} max={profiles.length||1} color={rc2.text}/></div><span style={{fontSize:13,fontWeight:500,color:rc2.text,minWidth:20,textAlign:"right"}}>{count}</span></div>)
          })}
        </Card>
        <Card>
          <SectionTitle>Pipeline de validation</SectionTitle>
          {[{label:"En attente",count:conges.filter(c=>c.statut==="En attente").length,bg:"#FAC775",tc:"#633806"},{label:"Validé Manager",count:conges.filter(c=>c.statut==="Validé Manager").length,bg:"#B5D4F4",tc:"#042C53"},{label:"Validé RH",count:conges.filter(c=>c.statut==="Validé RH").length,bg:"#C0DD97",tc:"#173404"},{label:"Approuvés",count:approuves.length,bg:"#5DCAA5",tc:"#04342C"},{label:"Refusés",count:conges.filter(c=>c.statut==="Refusé").length,bg:"#F09595",tc:"#501313"}].map((s,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:"0.5px solid #f5f5f5"}}><span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:s.bg,color:s.tc,minWidth:100,textAlign:"center"}}>{s.label}</span><div style={{flex:1}}><ProgressBar value={s.count} max={conges.length||1} color={s.tc}/></div><span style={{fontSize:13,fontWeight:500,minWidth:20,textAlign:"right"}}>{s.count}</span></div>
          ))}
        </Card>
      </div>
      <Card>
        <SectionTitle>Activité récente</SectionTitle>
        {logs.length===0&&<div style={{textAlign:"center",padding:"16px 0",color:"#bbb",fontSize:13}}>Aucune activité enregistrée</div>}
        {logs.slice(0,6).map(log=>{
          const lc=getLogColor(log.action)
          return(<div key={log.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"0.5px solid #f5f5f5",flexWrap:"wrap"}}><span style={{fontSize:16}}>{lc.icon}</span><div style={{flex:1}}><div style={{fontSize:13}}>{log.action}</div>{log.user_nom&&<div style={{fontSize:11,color:"#aaa"}}>{log.user_nom} · {fmtTs(log.created_at)}</div>}</div></div>)
        })}
      </Card>
    </div>
  )
}

/* ═══ PANEL UTILISATEURS ═══ */
// Remplace toute la fonction PanelUtilisateurs dans App.jsx par ce code
// ─────────────────────────────────────────────────────────────────────

function PanelUtilisateurs({profiles,salaries,societes,loading,updateProfile,deleteProfile,logAction,currentUser}){
  const [editModal,setEditModal]=useState(null)
  const [editForm,setEditForm]=useState({role:"",societe_id:"",salarie_id:"",nom:""})
  const [confirmDel,setConfirmDel]=useState(null)
  const [search,setSearch]=useState("")
  const [createModal,setCreateModal]=useState(false)
  const [createForm,setCreateForm]=useState({nom:"",email:"",password:"",role:"Employé",societe_id:"",salarie_id:""})
  const [createLoading,setCreateLoading]=useState(false)
  const [createError,setCreateError]=useState("")
  const [createSuccess,setCreateSuccess]=useState("")

  const filtered=profiles.filter(p=>p.nom?.toLowerCase().includes(search.toLowerCase())||p.role?.toLowerCase().includes(search.toLowerCase()))

  function openEdit(p){setEditModal(p);setEditForm({role:p.role,societe_id:p.societe_id||"",salarie_id:p.salarie_id||"",nom:p.nom})}

  async function saveEdit(){
    const fields={role:editForm.role,nom:editForm.nom}
    if(editForm.role==="Manager")fields.societe_id=editForm.societe_id||null
    if(editForm.role==="Employé")fields.salarie_id=editForm.salarie_id||null
    if(editForm.role==="RH"||editForm.role==="Super Admin"){fields.societe_id=null;fields.salarie_id=null}
    await updateProfile(editModal.id,fields)
    await logAction(`Modification utilisateur : ${editModal.nom} → rôle ${editForm.role}`)
    setEditModal(null)
  }

  async function doDelete(p){
    await deleteProfile(p.id)
    await logAction(`Suppression profil : ${p.nom} (${p.role})`)
    setConfirmDel(null)
  }

  async function handleCreate(){
    setCreateError(""); setCreateLoading(true); setCreateSuccess("")
    const{nom,email,password,role,societe_id}=createForm
    if(!nom.trim()||!email.trim()||password.length<6){
      setCreateError("Nom, email et mot de passe (6 caractères min) sont obligatoires.")
      setCreateLoading(false); return
    }
    try{
      const{createClient}=await import('@supabase/supabase-js')
      const tmpClient=createClient(
        import.meta.env.VITE_SUPABASE_URL||supabase.supabaseUrl,
        import.meta.env.VITE_SUPABASE_ANON_KEY||supabase.supabaseKey,
        {auth:{storage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},persistSession:false,autoRefreshToken:false}}
      )
      const{data,error}=await tmpClient.auth.signUp({email:email.trim(),password})
      if(error)throw error
      if(!data?.user)throw new Error("Utilisateur non créé")

      // Crée automatiquement un salarié pour tous les rôles sauf si déjà lié
      let salarie_id=createForm.salarie_id||null
      if(!salarie_id&&(role==="Manager"||role==="RH"||role==="Super Admin"||role==="Employé")){
        const socId=societe_id||null
        const{data:salData,error:salErr}=await supabase
          .from('salaries')
          .insert({nom:nom.trim(),email:email.trim(),societe_id:socId})
          .select()
          .single()
        if(salErr)throw salErr
        salarie_id=salData.id
      }

    // Crée le profil avec le salarié lié
    const profileData={id:data.user.id,nom:nom.trim(),role,salarie_id}
    if(role==="Manager")profileData.societe_id=societe_id||null
    const{error:profErr}=await supabase.from('profiles').insert(profileData)
    if(profErr)throw profErr

    await logAction(`Création utilisateur : ${nom} (${role})`,email)
    setCreateSuccess(`✓ Compte créé ! ${nom} peut se connecter avec ${email}`)
    setCreateForm({nom:"",email:"",password:"",role:"Employé",societe_id:"",salarie_id:""})
}catch(e){
    setCreateError(e.message||"Erreur lors de la création")
    // Nettoie le salarié créé si le profil a échoué
    if(salarie_id){
      await supabase.from('salaries').delete().eq('id',salarie_id)
    }
  }
  setCreateLoading(false)
}

  return(
    <div>
      {/* Modal création */}
      {createModal&&(
        <Modal title="Créer un nouvel utilisateur" onClose={()=>{setCreateModal(false);setCreateError("");setCreateSuccess("")}}>
          <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
            <div>
              <label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>Nom complet *</label>
              <input value={createForm.nom} onChange={e=>setCreateForm(f=>({...f,nom:e.target.value}))} placeholder="Prénom Nom" autoFocus style={{width:"100%",fontSize:13,padding:"7px 10px",border:"0.5px solid #ddd",borderRadius:6,boxSizing:"border-box"}}/>
            </div>
            <div>
              <label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>Email *</label>
              <input value={createForm.email} onChange={e=>setCreateForm(f=>({...f,email:e.target.value}))} placeholder="prenom@societe.fr" type="email" style={{width:"100%",fontSize:13,padding:"7px 10px",border:"0.5px solid #ddd",borderRadius:6,boxSizing:"border-box"}}/>
            </div>
            <div>
              <label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>Mot de passe * (6 caractères min)</label>
              <input value={createForm.password} onChange={e=>setCreateForm(f=>({...f,password:e.target.value}))} placeholder="••••••••" type="password" style={{width:"100%",fontSize:13,padding:"7px 10px",border:"0.5px solid #ddd",borderRadius:6,boxSizing:"border-box"}}/>
            </div>
            <div>
              <label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>Rôle *</label>
              <select value={createForm.role} onChange={e=>setCreateForm(f=>({...f,role:e.target.value,societe_id:"",salarie_id:""}))} style={{width:"100%",fontSize:13,padding:"7px 10px",border:"0.5px solid #ddd",borderRadius:6}}>
                {ROLES.map(r=><option key={r}>{r}</option>)}
              </select>
            </div>
            {(createForm.role==="Manager"||createForm.role==="RH"||createForm.role==="Employé")&&(
              <div>
                <label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>Société</label>
                <select value={createForm.societe_id} onChange={e=>setCreateForm(f=>({...f,societe_id:e.target.value}))} style={{width:"100%",fontSize:13,padding:"7px 10px",border:"0.5px solid #ddd",borderRadius:6}}>
                  <option value="">Sélectionner...</option>
                  {societes.map(s=><option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
              </div>
            )}
            {createForm.role==="Employé"&&(
              <div>
                <label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>Salarié lié</label>
                <select value={createForm.salarie_id} onChange={e=>setCreateForm(f=>({...f,salarie_id:e.target.value}))} style={{width:"100%",fontSize:13,padding:"7px 10px",border:"0.5px solid #ddd",borderRadius:6}}>
                  <option value="">Sélectionner...</option>
                  {salaries.map(s=><option key={s.id} value={s.id}>{s.nom} — {getSocNom(getSocId(s),societes)}</option>)}
                </select>
              </div>
            )}
          </div>
          {createError&&<div style={{fontSize:12,color:"#E24B4A",marginBottom:10,padding:"8px 12px",background:"#FCEBEB",borderRadius:6}}>{createError}</div>}
          {createSuccess&&<div style={{fontSize:12,color:"#085041",marginBottom:10,padding:"8px 12px",background:"#E1F5EE",borderRadius:6}}>{createSuccess}</div>}
          <div style={{display:"flex",gap:8}}>
            <button onClick={handleCreate} disabled={createLoading} style={{flex:1,fontSize:13,padding:8,borderRadius:8,background:createLoading?"#ccc":"#3C3489",color:"#fff",border:"none",cursor:createLoading?"not-allowed":"pointer",fontWeight:500}}>
              {createLoading?"Création en cours...":"Créer le compte"}
            </button>
            <button onClick={()=>{setCreateModal(false);setCreateError("");setCreateSuccess("")}} style={{fontSize:13,padding:"8px 16px",borderRadius:8,cursor:"pointer"}}>Fermer</button>
          </div>
        </Modal>
      )}

      {/* Modal modification */}
      {editModal&&(
        <Modal title="Modifier l'utilisateur" onClose={()=>setEditModal(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
            <div>
              <label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>Nom</label>
              <input value={editForm.nom} onChange={e=>setEditForm(f=>({...f,nom:e.target.value}))} style={{width:"100%",fontSize:13,padding:"7px 10px",border:"0.5px solid #ddd",borderRadius:6,boxSizing:"border-box"}}/>
            </div>
            <div>
              <label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>Rôle *</label>
              <select value={editForm.role} onChange={e=>setEditForm(f=>({...f,role:e.target.value,societe_id:"",salarie_id:""}))} style={{width:"100%",fontSize:13,padding:"7px 10px",border:"0.5px solid #ddd",borderRadius:6}}>
                {ROLES.map(r=><option key={r}>{r}</option>)}
              </select>
            </div>
            {editForm.role==="Manager"&&(
              <div>
                <label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>Société</label>
                <select value={editForm.societe_id} onChange={e=>setEditForm(f=>({...f,societe_id:e.target.value}))} style={{width:"100%",fontSize:13,padding:"7px 10px",border:"0.5px solid #ddd",borderRadius:6}}>
                  <option value="">Sélectionner...</option>
                  {societes.map(s=><option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
              </div>
            )}
            {editForm.role==="Employé"&&(
              <div>
                <label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>Salarié lié</label>
                <select value={editForm.salarie_id} onChange={e=>setEditForm(f=>({...f,salarie_id:e.target.value}))} style={{width:"100%",fontSize:13,padding:"7px 10px",border:"0.5px solid #ddd",borderRadius:6}}>
                  <option value="">Sélectionner...</option>
                  {salaries.map(s=><option key={s.id} value={s.id}>{s.nom} — {getSocNom(getSocId(s),societes)}</option>)}
                </select>
              </div>
            )}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={saveEdit} style={{flex:1,fontSize:13,padding:8,borderRadius:8,background:"#EEEDFE",color:"#3C3489",border:"0.5px solid #AFA9EC",cursor:"pointer"}}>Enregistrer</button>
            <button onClick={()=>setEditModal(null)} style={{fontSize:13,padding:"8px 16px",borderRadius:8,cursor:"pointer"}}>Annuler</button>
          </div>
        </Modal>
      )}

      {/* Modal suppression */}
      {confirmDel&&(
        <Modal title="Supprimer le profil" onClose={()=>setConfirmDel(null)}>
          <p style={{fontSize:13,color:"#666",marginBottom:16}}>Supprimer le profil de <strong>{confirmDel.nom}</strong> ? Le compte Supabase Auth restera actif — seul le profil (rôle, accès) sera supprimé.</p>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>doDelete(confirmDel)} style={{flex:1,fontSize:13,padding:8,borderRadius:8,background:"#FCEBEB",color:"#501313",border:"0.5px solid #F7C1C1",cursor:"pointer"}}>Supprimer le profil</button>
            <button onClick={()=>setConfirmDel(null)} style={{fontSize:13,padding:"8px 16px",borderRadius:8,cursor:"pointer"}}>Annuler</button>
          </div>
        </Modal>
      )}

      {/* Header avec bouton créer */}
      <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..." style={{flex:1,fontSize:13,padding:"7px 10px",border:"0.5px solid #ddd",borderRadius:6}}/>
        <span style={{fontSize:12,color:"#888"}}>{filtered.length} utilisateur(s)</span>
        <button onClick={()=>{setCreateModal(true);setCreateError("");setCreateSuccess("")}} style={{fontSize:13,padding:"6px 16px",borderRadius:8,background:"#3C3489",color:"#fff",border:"none",cursor:"pointer",fontWeight:500,whiteSpace:"nowrap"}}>
          + Nouvel utilisateur
        </button>
      </div>

      {loading&&<div style={{textAlign:"center",padding:"30px 0",color:"#aaa"}}>Chargement...</div>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtered.map(p=>{
          const rc2=RC[p.role]||RC["Employé"]
          const isSelf=p.id===currentUser?.id
          const salLie=salaries.find(s=>s.id===p.salarie_id)
          return(
            <div key={p.id} style={{background:"#fff",border:"0.5px solid #e8e8e8",borderRadius:12,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
              <div style={{width:40,height:40,borderRadius:"50%",background:rc2.bg,border:`0.5px solid ${rc2.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:500,color:rc2.text,flexShrink:0}}>{initials(p.nom)}</div>
              <div style={{flex:1,minWidth:120}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <div style={{fontSize:14,fontWeight:500}}>{p.nom}</div>
                  {isSelf&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:20,background:"#EAF3DE",color:"#173404",border:"0.5px solid #C0DD97"}}>vous</span>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4,flexWrap:"wrap"}}>
                  <RoleBadge role={p.role}/>
                  {p.societe_id&&<span style={{fontSize:11,color:"#888"}}>· {getSocNom(p.societe_id,societes)}</span>}
                  {salLie&&<span style={{fontSize:11,color:"#888"}}>· {salLie.nom}</span>}
                </div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>openEdit(p)} style={{fontSize:12,padding:"5px 12px",borderRadius:8,border:"0.5px solid #ddd",cursor:"pointer"}}>Modifier</button>
                {!isSelf&&<button onClick={()=>setConfirmDel(p)} style={{fontSize:12,padding:"5px 10px",borderRadius:8,background:"#FCEBEB",color:"#501313",border:"0.5px solid #F7C1C1",cursor:"pointer"}}>×</button>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══ GANTT VIEW ═══ */
function GanttView({congesVisibles,salaries,societes,canAll}){
  const [gMonth,setGMonth]=useState(today.getMonth())
  const [gYear,setGYear]=useState(today.getFullYear())
  const monthNames=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"]
  const gTotalDays=new Date(gYear,gMonth+1,0).getDate()
  const gCongesGantt=congesVisibles.filter(c=>{
    const d=new Date(c.debut),f=new Date(c.fin)
    return d<=new Date(gYear,gMonth,gTotalDays,23,59)&&f>=new Date(gYear,gMonth,1)
  })
  const gSalGantt=[...new Set(gCongesGantt.map(c=>getSalId(c)))].map(id=>salaries.find(s=>s.id===id)).filter(Boolean)
  const COL_W=26,ROW_H=36,LABEL_W=150
  function prevMonth(){if(gMonth===0){setGMonth(11);setGYear(y=>y-1)}else setGMonth(m=>m-1)}
  function nextMonth(){if(gMonth===11){setGMonth(0);setGYear(y=>y+1)}else setGMonth(m=>m+1)}
  const isCurrentMonth=gMonth===today.getMonth()&&gYear===today.getFullYear()
  return(
    <div>
      {/* Navigation mois */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <button onClick={prevMonth} style={{width:34,height:34,borderRadius:8,border:"0.5px solid #ddd",background:"#fff",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
        <div style={{flex:1,textAlign:"center"}}>
          <div style={{fontSize:15,fontWeight:500}}>{monthNames[gMonth]} {gYear}</div>
          {!isCurrentMonth&&<button onClick={()=>{setGMonth(today.getMonth());setGYear(today.getFullYear())}} style={{fontSize:11,color:"#3B8BD4",background:"none",border:"none",cursor:"pointer",padding:0,marginTop:2}}>← Aujourd'hui</button>}
        </div>
        <button onClick={nextMonth} style={{width:34,height:34,borderRadius:8,border:"0.5px solid #ddd",background:"#fff",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
      </div>

      {/* Légendes */}
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:8}}>
        {TYPES.map(t=><span key={t} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#888"}}><span style={{width:10,height:10,borderRadius:2,background:TC[t].bg,display:"inline-block"}}></span>{t}</span>)}
        <span style={{fontSize:11,color:"#ccc",marginLeft:8}}>Plein = Approuvé · Hachuré = En attente</span>
      </div>

      {/* Grille */}
      <div style={{overflowX:"auto",border:"0.5px solid #e8e8e8",borderRadius:12,background:"#fff"}}>
        <div style={{minWidth:LABEL_W+gTotalDays*COL_W}}>

          {/* En-tête jours */}
          <div style={{display:"flex",borderBottom:"0.5px solid #e8e8e8",padding:"8px 12px 6px",background:"#fff",position:"sticky",top:0,zIndex:2}}>
            <div style={{width:LABEL_W,flexShrink:0,fontSize:11,color:"#aaa",fontWeight:500}}>Salarié</div>
            <div style={{display:"flex"}}>
              {Array.from({length:gTotalDays},(_,i)=>{
                const d=new Date(gYear,gMonth,i+1)
                const isWE=d.getDay()===0||d.getDay()===6
                const isToday=today.toDateString()===d.toDateString()
                const dayNames=["D","L","M","M","J","V","S"]
                return(
                  <div key={i} style={{width:COL_W,flexShrink:0,textAlign:"center",background:isToday?"#3B8BD4":isWE?"#f5f5f5":"transparent",borderRadius:isToday?4:2,padding:"1px 0"}}>
                    <div style={{fontSize:9,color:isToday?"#fff":isWE?"#ccc":"#ccc"}}>{dayNames[d.getDay()]}</div>
                    <div style={{fontSize:11,fontWeight:isToday?600:400,color:isToday?"#fff":isWE?"#ccc":"#999"}}>{i+1}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Aucun résultat */}
          {gSalGantt.length===0&&(
            <div style={{textAlign:"center",padding:"40px 0",color:"#bbb",fontSize:13}}>
              Aucun congé en {monthNames[gMonth]} {gYear}
            </div>
          )}

          {/* Lignes groupées par société */}
          {canAll
            ?[...new Set(gSalGantt.map(s=>getSocId(s)))].map(socId=>{
              const salsDeSoc=gSalGantt.filter(s=>getSocId(s)===socId)
              if(!salsDeSoc.length)return null
              return(
                <div key={socId}>
                  <div style={{fontSize:10,fontWeight:500,color:"#bbb",padding:"6px 12px 2px",background:"#fafafa",borderTop:"0.5px solid #f0f0f0",letterSpacing:".06em",textTransform:"uppercase"}}>
                    {getSocNom(socId,societes)}
                  </div>
                  {salsDeSoc.map((sal,idx)=>renderRow(sal,idx,gCongesGantt,gYear,gMonth,gTotalDays,COL_W,ROW_H,LABEL_W))}
                </div>
              )
            })
            :gSalGantt.map((sal,idx)=>renderRow(sal,idx,gCongesGantt,gYear,gMonth,gTotalDays,COL_W,ROW_H,LABEL_W))
          }
        </div>
      </div>

      {/* Stats du mois */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:10,marginTop:14}}>
        {TYPES.map(t=>(
          <div key={t} style={{background:"#fff",border:"0.5px solid #e8e8e8",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:10,height:10,borderRadius:2,background:TC[t].bg,flexShrink:0}}></div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11,color:"#aaa",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t}</div>
              <div style={{fontSize:20,fontWeight:500,color:TC[t].bg}}>{gCongesGantt.filter(c=>c.type===t).length}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function renderRow(sal,idx,gCongesGantt,gYear,gMonth,gTotalDays,COL_W,ROW_H,LABEL_W){
  const cSal=gCongesGantt.filter(c=>getSalId(c)===sal.id)
  return(
    <div key={sal.id} style={{display:"flex",alignItems:"center",minHeight:ROW_H,borderBottom:"0.5px solid #f5f5f5",background:idx%2===0?"transparent":"#fafafa"}}>
      <div style={{width:LABEL_W,flexShrink:0,fontSize:12,padding:"0 12px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:"#333",fontWeight:500}}>
        {sal.nom}
      </div>
      <div style={{flex:1,position:"relative",height:ROW_H}}>
        {Array.from({length:gTotalDays},(_,i)=>{
          const d=new Date(gYear,gMonth,i+1)
          const isWE=d.getDay()===0||d.getDay()===6
          const isToday=today.toDateString()===d.toDateString()
          return <div key={i} style={{position:"absolute",left:i*COL_W,top:0,width:COL_W,height:ROW_H,background:isToday?"rgba(59,139,212,0.07)":isWE?"rgba(0,0,0,0.025)":"transparent"}}/>
        })}
        {cSal.map(c=>{
          const ms=new Date(gYear,gMonth,1),me=new Date(gYear,gMonth,gTotalDays,23,59)
          const d=new Date(c.debut),f=new Date(c.fin)
          const s2=d<ms?ms:d,e2=f>me?me:f
          const sd=s2.getDate()-1,dur=Math.round((e2-s2)/(1000*60*60*24))+1
          const t=TC[c.type],isApprouve=c.statut==="Approuvé"
          return(
            <div key={c.id}
              title={`${sal.nom} — ${c.type}\n${fmtDate(c.debut)} → ${fmtDate(c.fin)} (${diffDays(c.debut,c.fin)+1}j)\nStatut : ${c.statut}`}
              style={{position:"absolute",left:sd*COL_W+2,top:6,height:ROW_H-12,width:Math.max(dur*COL_W-4,COL_W-4),background:t.bg,borderRadius:6,opacity:isApprouve?1:0.55,display:"flex",alignItems:"center",overflow:"hidden",border:isApprouve?"none":`1.5px dashed ${t.bg}`,boxSizing:"border-box"}}>
              {dur*COL_W>44&&<span style={{fontSize:10,color:"#fff",padding:"0 6px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",fontWeight:500}}>{c.type.split(" ")[0]}{!isApprouve&&` (${c.statut.split(" ")[0]})`}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
/* ═══ HOOK SOLDES ═══ */
function useSoldes() {
  const [soldes, setSoldes] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('soldes')
      .select('*, salaries(id, nom, societe_id, societes(nom))')
      .order('created_at')
    setSoldes(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function updateSolde(id, fields) {
    await supabase.from('soldes').update(fields).eq('id', id)
    load()
  }

  async function rechargerUn(salarie_id) {
    const { data } = await supabase.rpc('recharger_solde_salarie', { p_salarie_id: salarie_id })
    load()
    return data
  }

  async function rechargerTous() {
    const { data } = await supabase.rpc('recharger_tous_les_soldes')
    load()
    return data
  }

  async function basculerAnnee(type) {
    const { data } = await supabase.rpc('basculer_annee', { p_type: type })
    load()
    return data
  }

  return { soldes, loading, updateSolde, rechargerUn, rechargerTous, basculerAnnee, reloadSoldes: load }
}

/* ═══ PANEL SOLDES ═══ */
function PanelSoldes({ salaries, societes }) {
  const { soldes, loading, updateSolde, rechargerUn, rechargerTous, basculerAnnee } = useSoldes()
  const [editModal, setEditModal] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('success')
  const [filtSoc, setFiltSoc] = useState('Toutes')
  const [confirmBascule, setConfirmBascule] = useState(false)
  const [rechargeLoading, setRechargeLoading] = useState(false)

  const today = new Date()
  const moisActuel = today.getMonth() + 1
  const anneeActuelle = today.getFullYear()
  const moisNoms = ["","Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"]

  function showMsg(text, type = 'success') {
    setMsg(text); setMsgType(type)
    setTimeout(() => setMsg(''), 3000)
  }

  // Filtre par société
  const soldesFiltres = soldes.filter(s => {
    if (filtSoc === 'Toutes') return true
    return s.salaries?.societe_id === filtSoc
  })

  // Alerte : salariés non rechargés ce mois
  const nonRecharges = soldes.filter(s =>
    s.derniere_recharge_mois !== moisActuel ||
    s.derniere_recharge_annee !== anneeActuelle
  )

  function openEdit(s) {
    setEditModal(s)
    setEditForm({
      cp_n_acquis:  s.cp_n_acquis,
      cp_n_pris:    s.cp_n_pris,
      cp_n1_acquis: s.cp_n1_acquis,
      cp_n1_pris:   s.cp_n1_pris,
      rtt_acquis:   s.rtt_acquis,
      rtt_pris:     s.rtt_pris,
      cp_annuel:    s.cp_annuel,
      rtt_annuel:   s.rtt_annuel,
    })
  }

  async function saveEdit() {
    await updateSolde(editModal.id, editForm)
    setEditModal(null)
    showMsg('Solde mis à jour ✓')
  }

  async function handleRechargerUn(salarie_id, nom) {
    const result = await rechargerUn(salarie_id)
    if (result?.success) showMsg(`✓ ${nom} rechargé — +${result.recharge_cp}j CP, +${result.recharge_rtt}j RTT`)
    else showMsg(result?.message || 'Erreur', 'error')
  }

  async function handleRechargerTous() {
    setRechargeLoading(true)
    const result = await rechargerTous()
    setRechargeLoading(false)
    if (result?.success) showMsg(`✓ ${result.message}`)
    else showMsg('Erreur lors de la recharge', 'error')
  }

  async function handleBascule(){
    const result = await basculerAnnee(confirmBascule)
    setConfirmBascule(false)
    if(result?.success) showMsg(`✓ ${result.message}`)
    else showMsg(result?.message||'Erreur','error')
  }

  const SoldeBar = ({ label, acquis, pris, color }) => {
    const restant = Math.max(acquis - pris, 0)
    const pct = acquis > 0 ? Math.min(Math.round((pris / acquis) * 100), 100) : 0
    return (
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
          <span style={{ color: '#888', fontWeight: 500 }}>{label}</span>
          <span style={{ color: '#aaa' }}>
            <span style={{ color, fontWeight: 600 }}>{restant}j</span> restants
            <span style={{ color: '#ccc' }}> / {acquis}j acquis / {pris}j pris</span>
          </span>
        </div>
        <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 3, transition: 'width .3s' }} />
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Modal modification solde */}
      {editModal && (
        <Modal title={`Modifier les soldes — ${editModal.salaries?.nom}`} onClose={() => setEditModal(null)}>
          <div style={{ marginBottom: 14, padding: '10px 14px', background: '#EEEDFE', borderRadius: 8, fontSize: 12, color: '#3C3489' }}>
            <strong>Configuration recharge mensuelle</strong><br/>
            CP annuel ÷ 12 = recharge mensuelle CP<br/>
            RTT annuel ÷ 12 = recharge mensuelle RTT
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {/* Config annuelle */}
            <div style={{ gridColumn: '1/-1', fontWeight: 500, fontSize: 12, color: '#7C3AED', borderBottom: '0.5px solid #e5e5e5', paddingBottom: 6, marginBottom: 4 }}>
              Configuration annuelle
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 3 }}>CP acquis/an</label>
              <input type="number" value={editForm.cp_annuel} onChange={e => setEditForm(f => ({ ...f, cp_annuel: parseFloat(e.target.value) }))}
                style={{ width: '100%', fontSize: 13, padding: '6px 10px', border: '0.5px solid #ddd', borderRadius: 6, boxSizing: 'border-box' }} />
              <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>→ +{(editForm.cp_annuel / 12).toFixed(2)}j/mois</div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 3 }}>RTT acquis/an</label>
              <input type="number" value={editForm.rtt_annuel} onChange={e => setEditForm(f => ({ ...f, rtt_annuel: parseFloat(e.target.value) }))}
                style={{ width: '100%', fontSize: 13, padding: '6px 10px', border: '0.5px solid #ddd', borderRadius: 6, boxSizing: 'border-box' }} />
              <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>→ +{(editForm.rtt_annuel / 12).toFixed(2)}j/mois</div>
            </div>

            {/* Soldes CP N */}
            <div style={{ gridColumn: '1/-1', fontWeight: 500, fontSize: 12, color: '#3B8BD4', borderBottom: '0.5px solid #e5e5e5', paddingBottom: 6, marginBottom: 4, marginTop: 8 }}>
              CP Année N (année en cours)
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 3 }}>Acquis</label>
              <input type="number" value={editForm.cp_n_acquis} onChange={e => setEditForm(f => ({ ...f, cp_n_acquis: parseFloat(e.target.value) }))}
                style={{ width: '100%', fontSize: 13, padding: '6px 10px', border: '0.5px solid #ddd', borderRadius: 6, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 3 }}>Pris</label>
              <input type="number" value={editForm.cp_n_pris} onChange={e => setEditForm(f => ({ ...f, cp_n_pris: parseFloat(e.target.value) }))}
                style={{ width: '100%', fontSize: 13, padding: '6px 10px', border: '0.5px solid #ddd', borderRadius: 6, boxSizing: 'border-box' }} />
            </div>

            {/* Soldes CP N-1 */}
            <div style={{ gridColumn: '1/-1', fontWeight: 500, fontSize: 12, color: '#D85A30', borderBottom: '0.5px solid #e5e5e5', paddingBottom: 6, marginBottom: 4, marginTop: 8 }}>
              CP Année N-1 (à solder avant 31/05)
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 3 }}>Acquis</label>
              <input type="number" value={editForm.cp_n1_acquis} onChange={e => setEditForm(f => ({ ...f, cp_n1_acquis: parseFloat(e.target.value) }))}
                style={{ width: '100%', fontSize: 13, padding: '6px 10px', border: '0.5px solid #ddd', borderRadius: 6, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 3 }}>Pris</label>
              <input type="number" value={editForm.cp_n1_pris} onChange={e => setEditForm(f => ({ ...f, cp_n1_pris: parseFloat(e.target.value) }))}
                style={{ width: '100%', fontSize: 13, padding: '6px 10px', border: '0.5px solid #ddd', borderRadius: 6, boxSizing: 'border-box' }} />
            </div>

            {/* Soldes RTT */}
            <div style={{ gridColumn: '1/-1', fontWeight: 500, fontSize: 12, color: '#1D9E75', borderBottom: '0.5px solid #e5e5e5', paddingBottom: 6, marginBottom: 4, marginTop: 8 }}>
              RTT
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 3 }}>Acquis</label>
              <input type="number" value={editForm.rtt_acquis} onChange={e => setEditForm(f => ({ ...f, rtt_acquis: parseFloat(e.target.value) }))}
                style={{ width: '100%', fontSize: 13, padding: '6px 10px', border: '0.5px solid #ddd', borderRadius: 6, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 3 }}>Pris</label>
              <input type="number" value={editForm.rtt_pris} onChange={e => setEditForm(f => ({ ...f, rtt_pris: parseFloat(e.target.value) }))}
                style={{ width: '100%', fontSize: 13, padding: '6px 10px', border: '0.5px solid #ddd', borderRadius: 6, boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveEdit} style={{ flex: 1, fontSize: 13, padding: 8, borderRadius: 8, background: 'linear-gradient(135deg,#7C3AED,#EC4899)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              Enregistrer
            </button>
            <button onClick={() => setEditModal(null)} style={{ fontSize: 13, padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>Annuler</button>
          </div>
        </Modal>
      )}

      {/* Modal confirmation bascule annuelle */}
      {confirmBascule&&(
        <Modal title={confirmBascule==='cp'?"Bascule CP — 1er juin":"Remise à zéro RTT — 1er janvier"} onClose={()=>setConfirmBascule(false)}>
          {confirmBascule==='cp'?(
            <div style={{fontSize:13,color:"#666",marginBottom:16,lineHeight:1.7}}>
              Cette action va :<br/>
              · Les CP N-1 non soldés sont <strong>perdus définitivement</strong><br/>
              · Les CP Année N deviennent les nouveaux N-1<br/>
              · CP Année N repart à 0<br/><br/>
              <span style={{color:"#D85A30",fontWeight:500}}>⚠ À faire uniquement le 1er juin</span>
            </div>
          ):(
            <div style={{fontSize:13,color:"#666",marginBottom:16,lineHeight:1.7}}>
              Cette action va :<br/>
              · Les RTT non pris sont <strong>perdus définitivement</strong><br/>
              · Le compteur RTT repart à 0 pour tous les salariés<br/><br/>
              <span style={{color:"#D85A30",fontWeight:500}}>⚠ À faire uniquement le 1er janvier</span>
            </div>
          )}
          <div style={{display:"flex",gap:8}}>
            <button onClick={handleBascule} style={{flex:1,fontSize:13,padding:8,borderRadius:8,background:"#FCEBEB",color:"#501313",border:"0.5px solid #F7C1C1",cursor:"pointer"}}>
              Confirmer
            </button>
            <button onClick={()=>setConfirmBascule(false)} style={{fontSize:13,padding:"8px 16px",borderRadius:8,cursor:"pointer"}}>Annuler</button>
          </div>
        </Modal>
      )}

      {/* Alerte recharge */}
      {nonRecharges.length > 0 && (
        <div style={{ background: '#FAEEDA', border: '0.5px solid #FAC775', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#633806' }}>
              {nonRecharges.length} salarié(s) non rechargé(s) en {moisNoms[moisActuel]} {anneeActuelle}
            </div>
            <div style={{ fontSize: 11, color: '#854F0B', marginTop: 2 }}>
              {nonRecharges.map(s => s.salaries?.nom).join(', ')}
            </div>
          </div>
          <button onClick={handleRechargerTous} disabled={rechargeLoading}
            style={{ fontSize: 13, padding: '8px 16px', borderRadius: 8, background: '#FF8E53', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {rechargeLoading ? '⏳ En cours...' : '⚡ Recharger tout'}
          </button>
        </div>
      )}

      {/* Message feedback */}
      {msg && (
        <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 14, fontSize: 13, fontWeight: 500, background: msgType === 'error' ? '#FCEBEB' : '#E1F5EE', color: msgType === 'error' ? '#501313' : '#085041' }}>
          {msg}
        </div>
      )}

      {/* Actions globales */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filtSoc} onChange={e => setFiltSoc(e.target.value)} style={{ fontSize: 13, padding: '6px 10px', border: '0.5px solid #ddd', borderRadius: 6 }}>
          <option value="Toutes">Toutes les sociétés</option>
          {societes.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
        </select>
        <span style={{ fontSize: 12, color: '#888' }}>{soldesFiltres.length} salarié(s)</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={handleRechargerTous} disabled={rechargeLoading}
            style={{ fontSize: 13, padding: '7px 14px', borderRadius: 8, background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 12px rgba(255,107,107,0.3)' }}>
            {rechargeLoading ? '⏳' : '⚡'} Recharger tout ({moisNoms[moisActuel]})
          </button>
         <button onClick={()=>setConfirmBascule('cp')}
            style={{fontSize:13,padding:"7px 14px",borderRadius:8,background:"#E6F1FB",color:"#0C447C",border:"0.5px solid #B5D4F4",cursor:"pointer",fontWeight:500}}>
            📅 Bascule CP (1er juin)
          </button>
          <button onClick={()=>setConfirmBascule('rtt')}
            style={{fontSize:13,padding:"7px 14px",borderRadius:8,background:"#E1F5EE",color:"#085041",border:"0.5px solid #5DCAA5",cursor:"pointer",fontWeight:500}}>
            📅 Bascule RTT (1er janv.)
          </button>
        </div>
      </div>

      {/* Liste des soldes */}
      {loading && <div style={{ textAlign: 'center', padding: '30px 0', color: '#aaa' }}>Chargement...</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {soldesFiltres.map(s => {
          const sal = s.salaries
          const estRecharge = s.derniere_recharge_mois === moisActuel && s.derniere_recharge_annee === anneeActuelle
          const cpN1Restant = Math.max(s.cp_n1_acquis - s.cp_n1_pris, 0)
          const alerteN1 = cpN1Restant > 0 && new Date().getMonth() >= 4 // Alerte si après mai et N-1 non soldé

          return (
            <div key={s.id} style={{ background: '#fff', border: `0.5px solid ${alerteN1 ? '#FAC775' : '#e8e8e8'}`, borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#7C3AED,#EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {initials(sal?.nom || '?')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{sal?.nom}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{sal?.societes?.nom}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {/* Config annuelle */}
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#EEEDFE', color: '#3C3489' }}>
                    {s.cp_annuel}j CP/an · {s.rtt_annuel}j RTT/an
                  </span>
                  {/* Statut recharge */}
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: estRecharge ? '#E1F5EE' : '#FAEEDA', color: estRecharge ? '#085041' : '#633806' }}>
                    {estRecharge ? `✓ Rechargé ${moisNoms[moisActuel]}` : `⚠ Non rechargé`}
                  </span>
                  {alerteN1 && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#FCEBEB', color: '#501313' }}>⚠ N-1 non soldé</span>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => handleRechargerUn(s.salarie_id, sal?.nom)}
                    style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, background: '#FF8E53', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                    ⚡ Recharger
                  </button>
                  <button onClick={() => openEdit(s)}
                    style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, border: '0.5px solid #ddd', cursor: 'pointer' }}>
                    ✎ Modifier
                  </button>
                </div>
              </div>

              {/* Barres de soldes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div>
                  <SoldeBar label={`CP Année ${anneeActuelle} (N)`} acquis={s.cp_n_acquis} pris={s.cp_n_pris} color="#3B8BD4"/>
                </div>
                <div>
                  <SoldeBar label={`CP Année ${anneeActuelle - 1} (N-1)`} acquis={s.cp_n1_acquis} pris={s.cp_n1_pris} color="#D85A30"/>
                </div>
                <div>
                  <SoldeBar label="RTT" acquis={s.rtt_acquis} pris={s.rtt_pris} color="#1D9E75"/>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
/* ═══ PANEL LOGS ═══ */
function PanelLogs({logs,loading,clearLogs}){
  const [filtreUser,setFiltreUser]=useState("Tous")
  const [filtreType,setFiltreType]=useState("Tous")
  const [confirmClear,setConfirmClear]=useState(false)
  const users=[...new Set(logs.map(l=>l.user_nom).filter(Boolean))]
  const filtered=logs.filter(l=>{
    if(filtreUser!=="Tous"&&l.user_nom!==filtreUser)return false
    if(filtreType!=="Tous"&&!l.action?.includes(filtreType))return false
    return true
  })
  return(
    <div>
      {confirmClear&&<Modal title="Vider les logs" onClose={()=>setConfirmClear(false)}>
        <p style={{fontSize:13,color:"#666",marginBottom:16}}>Supprimer définitivement tout l'historique ?</p>
        <div style={{display:"flex",gap:8}}><button onClick={async()=>{await clearLogs();setConfirmClear(false)}} style={{flex:1,fontSize:13,padding:8,borderRadius:8,background:"#FCEBEB",color:"#501313",border:"0.5px solid #F7C1C1",cursor:"pointer"}}>Vider l'historique</button><button onClick={()=>setConfirmClear(false)} style={{fontSize:13,padding:"8px 16px",borderRadius:8,cursor:"pointer"}}>Annuler</button></div>
      </Modal>}
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <select value={filtreUser} onChange={e=>setFiltreUser(e.target.value)} style={{fontSize:13,padding:"6px 10px",border:"0.5px solid #ddd",borderRadius:6}}>
          <option value="Tous">Tous les utilisateurs</option>
          {users.map(u=><option key={u}>{u}</option>)}
        </select>
        <select value={filtreType} onChange={e=>setFiltreType(e.target.value)} style={{fontSize:13,padding:"6px 10px",border:"0.5px solid #ddd",borderRadius:6}}>
          <option value="Tous">Toutes les actions</option>
          {["connexion","déconnexion","congé","validé","refus","supprim","salarié","société","utilisateur"].map(a=><option key={a}>{a}</option>)}
        </select>
        <span style={{fontSize:12,color:"#888",marginLeft:"auto"}}>{filtered.length} entrée(s)</span>
        <button onClick={()=>setConfirmClear(true)} style={{fontSize:12,padding:"5px 12px",borderRadius:8,background:"#FCEBEB",color:"#501313",border:"0.5px solid #F7C1C1",cursor:"pointer"}}>Vider les logs</button>
      </div>
      {loading&&<div style={{textAlign:"center",padding:"30px 0",color:"#aaa"}}>Chargement...</div>}
      {!loading&&filtered.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:"#bbb",fontSize:13}}>Aucun log enregistré</div>}
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {filtered.map(log=>{
          const lc=getLogColor(log.action||"")
          const rc2=RC[log.user_role]||RC["Employé"]
          return(<div key={log.id} style={{background:"#fff",border:"0.5px solid #e8e8e8",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
            <div style={{fontSize:18,flexShrink:0,marginTop:2}}>{lc.icon}</div>
            <div style={{flex:1,minWidth:120}}>
              <div style={{fontSize:13,fontWeight:500,color:"#111",marginBottom:3}}>{log.action}</div>
              {log.details&&<div style={{fontSize:12,color:"#888"}}>{log.details}</div>}
              <div style={{display:"flex",alignItems:"center",gap:8,marginTop:6,flexWrap:"wrap"}}>
                {log.user_nom&&<span style={{fontSize:11,padding:"1px 8px",borderRadius:20,background:rc2.bg,color:rc2.text,border:`0.5px solid ${rc2.border}`}}>{log.user_nom}</span>}
                <span style={{fontSize:11,color:"#bbb"}}>{fmtTs(log.created_at)}</span>
              </div>
            </div>
          </div>)
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   MAIN APP
═══════════════════════════════════════ */

function ModalChangerMotDePasse({ onClose }) {
  const [newPwd,  setNewPwd]  = useState('')
  const [confPwd, setConfPwd] = useState('')
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(null)

  const pwdStrength = () => {
    if (!newPwd) return { level:0, label:'', color:'#e5e7eb' }
    if (newPwd.length < 4) return { level:1, label:'Trop court', color:'#FF6B6B' }
    if (newPwd.length < 6) return { level:2, label:'Faible', color:'#FF8E53' }
    if (newPwd.length >= 8 && /[A-Z]/.test(newPwd) && /[0-9]/.test(newPwd)) return { level:4, label:'Fort ✓', color:'#06D6A0' }
    return { level:3, label:'Moyen', color:'#FFC85A' }
  }
  const str = pwdStrength()

  async function handleSubmit(e) {
    e.preventDefault(); setError('')
    if (newPwd.length < 6) { setError('6 caractères minimum'); return }
    if (newPwd !== confPwd) { setError('Les mots de passe ne correspondent pas'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password: newPwd })
    if (err) setError(err.message)
    else { setSuccess('Mot de passe mis à jour !'); setTimeout(()=>onClose(), 2000) }
    setLoading(false)
  }

  const inp = (foc, hasErr) => ({
    width:'100%', boxSizing:'border-box',
    padding:'10px 14px 10px 38px', fontSize:13,
    border:`1.5px solid ${hasErr?'#FF6B6B':foc?'#7C3AED':'#e5e7eb'}`,
    borderRadius:8, outline:'none',
    boxShadow:hasErr?'0 0 0 3px rgba(255,107,107,0.1)':foc?'0 0 0 3px rgba(124,58,237,0.1)':'none',
    transition:'all 0.15s', fontFamily:"'Plus Jakarta Sans',sans-serif",
  })

  return (
    <Modal title="Changer mon mot de passe" onClose={onClose}>
      {success?(
        <div style={{textAlign:'center',padding:'20px 0'}}>
          <div style={{fontSize:40,marginBottom:12}}>🎉</div>
          <div style={{fontSize:14,color:'#166534',fontWeight:500}}>{success}</div>
        </div>
      ):(
        <form onSubmit={handleSubmit}>
          <div style={{display:'flex',flexDirection:'column',gap:14,marginBottom:16}}>
            <div>
              <label style={{fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:5}}>NOUVEAU MOT DE PASSE</label>
              <div style={{position:'relative'}}>
                <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',fontSize:14,pointerEvents:'none'}}>🔒</span>
                <input type="password" value={newPwd} onChange={e=>{setNewPwd(e.target.value);setError('')}} onFocus={()=>setFocused('new')} onBlur={()=>setFocused(null)} placeholder="6 caractères minimum" required autoFocus style={inp(focused==='new',false)}/>
              </div>
              {newPwd&&<>
                <div style={{display:'flex',gap:3,marginTop:6}}>
                  {[1,2,3,4].map(i=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=str.level?str.color:'#e5e7eb',transition:'background 0.3s'}}/>)}
                </div>
                <div style={{fontSize:11,color:str.color,marginTop:3,fontWeight:500}}>{str.label}</div>
              </>}
            </div>
            <div>
              <label style={{fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:5}}>CONFIRMER</label>
              <div style={{position:'relative'}}>
                <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',fontSize:14,pointerEvents:'none'}}>✅</span>
                <input type="password" value={confPwd} onChange={e=>{setConfPwd(e.target.value);setError('')}} onFocus={()=>setFocused('conf')} onBlur={()=>setFocused(null)} placeholder="Répétez le mot de passe" required style={inp(focused==='conf',!!error&&confPwd.length>0&&newPwd!==confPwd)}/>
              </div>
              {confPwd&&newPwd!==confPwd&&<div style={{fontSize:11,color:'#FF6B6B',marginTop:3}}>Ne correspondent pas</div>}
              {confPwd&&newPwd===confPwd&&<div style={{fontSize:11,color:'#06D6A0',marginTop:3}}>✓ Correspondent</div>}
            </div>
          </div>
          {error&&<div style={{fontSize:12,color:'#FF6B6B',background:'#fff5f5',border:'1px solid rgba(255,107,107,0.2)',borderRadius:8,padding:'8px 12px',marginBottom:12}}>⚠️ {error}</div>}
          <div style={{display:'flex',gap:8}}>
            <button type="submit" disabled={loading} style={{flex:1,fontSize:13,padding:'9px',borderRadius:8,background:loading?'#d1d5db':'linear-gradient(135deg,#7C3AED,#EC4899)',color:'white',border:'none',cursor:loading?'not-allowed':'pointer',fontWeight:600,fontFamily:"'Plus Jakarta Sans',sans-serif",boxShadow:loading?'none':'0 4px 12px rgba(124,58,237,0.3)'}}>
              {loading?'⏳ Mise à jour...':'Mettre à jour'}
            </button>
            <button type="button" onClick={onClose} style={{fontSize:13,padding:'9px 16px',borderRadius:8,cursor:'pointer'}}>Annuler</button>
          </div>
        </form>
      )}
    </Modal>
  )
}
export default function App(){
  const{user,profile,loading:authLoading,login,logout,isRecovery,setIsRecovery}=useAuth()
  const{societes,createSociete,updateSociete,deleteSociete}=useSocietes()
  const{salaries,createSalarie,updateSalarie,deleteSalarie}=useSalaries()
  const{conges,loading:congesLoading,soumettre,changerStatut:changerStatutRaw,supprimer:supprimerRaw}=useConges()
  const{profiles,loading:profilesLoading,updateProfile,deleteProfile}=useProfiles()
  const{logs,loading:logsLoading,addLog,clearLogs}=useLogs()

  const[tab,setTab]=useState("dashboard")
  const[form,setForm]=useState({salarie_id:"",type:TYPES[0],debut:"",fin:"",commentaire:""})
  const[selId,setSelId]=useState(null)
  const[filtSoc,setFiltSoc]=useState("Toutes")
  const[filtStat,setFiltStat]=useState("Tous")
  const[filtType,setFiltType]=useState("Tous")
  const[showChangePwd,setShowChangePwd]=useState(false)
  const[socModal,setSocModal]=useState(null)
  const[socNom,setSocNom]=useState("")
  const[socConfirmDel,setSocConfirmDel]=useState(null)
  const[salModal,setSalModal]=useState(null)
  const[salForm,setSalForm]=useState({nom:"",poste:"",email:"",societe_id:""})
  const[salConfirmDel,setSalConfirmDel]=useState(null)

  useEffect(()=>{if(profile)setTab("dashboard")},[profile?.id])

  const role=profile?.role||""
  const isAdmin=role==="Super Admin"
  const isRH=role==="RH"
  const isMgr=role==="Manager"
  const isEmp=role==="Employé"
  const canAll=isAdmin||isRH
  const rc=RC[role]||RC["Employé"]

  const congesVisibles=useMemo(()=>{
    if(!profile)return[]
    return conges.filter(c=>{
      const sal=getSalObj(c,salaries)
      if(!sal)return false
      if(isEmp)return getSalId(c)===profile.salarie_id
      if(isMgr)return getSocId(sal)===profile.societe_id
      if(canAll){
        if(filtSoc!=="Toutes"&&getSocId(sal)!==filtSoc)return false
        if(filtStat!=="Tous"&&c.statut!==filtStat)return false
        if(filtType!=="Tous"&&c.type!==filtType)return false
      }
      return true
    })
  },[conges,salaries,filtSoc,filtStat,filtType,profile,isEmp,isMgr,canAll])

const pendingBadge=useMemo(()=>{
    if(!profile)return 0
    if(isMgr)return conges.filter(c=>getSocId(getSalObj(c,salaries))===profile.societe_id&&c.statut==="En attente").length
    if(isRH)return conges.filter(c=>c.statut==="Validé Manager").length
    if(isAdmin)return conges.filter(c=>["En attente","Validé Manager","Validé RH"].includes(c.statut)).length
    return 0
  },[conges,salaries,profile,isMgr,isRH,isAdmin])

  if(authLoading)return<div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",fontFamily:"system-ui,sans-serif"}}><div style={{fontSize:14,color:"#888"}}>Chargement...</div></div>
  if(isRecovery)return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f8f7ff"}}>
      <ModalChangerMotDePasse onClose={()=>setIsRecovery(false)}/>
    </div>
  )
  if(!user||!profile)return<LoginPage onLogin={async(email,pwd)=>{await login(email,pwd);await addLog(null,email,"—","connexion",`Connexion de ${email}`)}}/>

  const logAction=async(action,details="")=>{
    if(!user||!profile)return
    try{await addLog(user.id,profile.nom,profile.role,action,details)}catch(e){}
  }

 async function handleChangerStatut(id,statut){
  const c=conges.find(x=>x.id===id)
  const sal=c?getSalObj(c,salaries):null
  const profil=profiles.find(p=>p.salarie_id===getSalId(c))
  const roleOwner=profil?.role
  // Manager → saute directement à Validé RH
  if(statut==="Validé Manager"&&roleOwner==="Manager"){
    await changerStatutRaw(id,"Validé RH")
    await logAction("validé congé → Validé RH (manager)",sal?`${sal.nom} — ${c?.type}`:"")
    return
  }
  await changerStatutRaw(id,statut)
  const actionLabel=statut==="Refusé"?"refus congé":`validé congé → ${statut}`
  await logAction(actionLabel,sal?`${sal.nom} — ${c?.type}`:"")
}
  async function handleSupprimer(id){
    const c=conges.find(x=>x.id===id)
    const sal=c?getSalObj(c,salaries):null
    await supprimerRaw(id)
    await logAction("suppression congé",sal?`${sal.nom} — ${c?.type}`:"")
  }
 async function handleSoumettre(data){
  const sal=salaries.find(s=>s.id===data.salarie_id)
  // Statut initial selon le rôle du demandeur
  let statutInitial="En attente"
  if(role==="Manager")     statutInitial="Validé Manager"
  if(role==="RH")          statutInitial="Validé RH"
  if(role==="Super Admin") statutInitial="Approuvé"
  await soumettre({...data,statut:statutInitial})
  await logAction("nouvelle demande de congé",sal?`${sal.nom} — ${data.type} (${data.debut} → ${data.fin})`:"")
}
  async function handleLogout(){await logAction("déconnexion");logout()}

  async function saveSociete(){
    const nom=socNom.trim();if(!nom)return
    if(socModal==="create"){await createSociete(nom);await logAction("création société",nom)}
    else{await updateSociete(socModal.id,nom);await logAction("modification société",`→ ${nom}`)}
    setSocModal(null);setSocNom("")
  }
  async function doDeleteSociete(id){
    await logAction("suppression société",getSocNom(id,societes))
    await deleteSociete(id);setSocConfirmDel(null)
  }
  async function saveSalarie(){
    const nom=salForm.nom.trim();if(!nom||!salForm.societe_id)return
    if(salModal==="create"){await createSalarie(salForm);await logAction("création salarié",nom)}
    else{await updateSalarie(salModal.id,salForm);await logAction("modification salarié",nom)}
    setSalModal(null)
  }
  async function doDeleteSalarie(id){
    const sal=salaries.find(s=>s.id===id)
    await logAction("suppression salarié",sal?.nom)
    await deleteSalarie(id);setSalConfirmDel(null)
  }
  async function submitForm(e){
    e.preventDefault()
    const salarie_id=isEmp?profile.salarie_id:form.salarie_id
    if(!salarie_id||!form.debut||!form.fin||new Date(form.fin)<new Date(form.debut))return
    await handleSoumettre({salarie_id,type:form.type,debut:form.debut,fin:form.fin,commentaire:form.commentaire})
    setForm({salarie_id:"",type:TYPES[0],debut:"",fin:"",commentaire:""})
    setTab(isEmp?"dashboard":"liste")
  }

  const tabBtn=(key,label,badge=0)=>(
    <button onClick={()=>setTab(key)} style={{fontSize:13,padding:"8px 14px",background:"none",border:"none",borderBottom:tab===key?"2px solid #111":"2px solid transparent",color:tab===key?"#111":"#888",cursor:"pointer",fontWeight:tab===key?500:400,position:"relative",whiteSpace:"nowrap"}}>
      {label}{badge>0&&<span style={{position:"absolute",top:4,right:2,background:"#E24B4A",color:"#fff",borderRadius:10,fontSize:9,padding:"0 4px",lineHeight:"15px",fontWeight:600}}>{badge}</span>}
    </button>
  )

  const TABS=isEmp
    ?[["dashboard","Mon espace"],["form","+ Demande"]]
    :isMgr
    ?[["dashboard","Tableau de bord"],["mescongés","Mes congés"],["liste","Demandes",pendingBadge],["gantt","Gantt"]]
    :isRH
    ?[["dashboard","Tableau de bord"],["mescongés","Mes congés"],["liste","Demandes",pendingBadge],["gantt","Gantt"],["salaries","Salariés"],["soldes","Soldes"]]
    :[["dashboard","Tableau de bord"],["mescongés","Mes congés"],["liste","Demandes",pendingBadge],["gantt","Gantt"],["salaries","Salariés"],["soldes","Soldes"],["utilisateurs","Utilisateurs"],["logs","Historique"]]

  const ganttMonth=today.getMonth(),ganttYear=today.getFullYear()
  const totalDays=new Date(ganttYear,ganttMonth+1,0).getDate()
  const monthNames=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"]
  const congesGantt=congesVisibles.filter(c=>{const d=new Date(c.debut),f=new Date(c.fin);return d<=new Date(ganttYear,ganttMonth,totalDays,23,59)&&f>=new Date(ganttYear,ganttMonth,1)})
  const salGantt=[...new Set(congesGantt.map(c=>getSalId(c)))].map(id=>salaries.find(s=>s.id===id)).filter(Boolean)
  const COL_W=20,ROW_H=34,LABEL_W=140

  return(
    <div style={{fontFamily:"system-ui,sans-serif",color:"#111",padding:"12px 16px",maxWidth:980,margin:"0 auto"}}>

      {/* MODALS SOCIÉTÉ */}
      {(socModal==="create"||socModal?.id)&&<Modal title={socModal==="create"?"Nouvelle société":"Modifier"} onClose={()=>{setSocModal(null);setSocNom("")}}>
        <input value={socNom} onChange={e=>setSocNom(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveSociete()} placeholder="Nom de la société" autoFocus style={{width:"100%",fontSize:14,marginBottom:16,boxSizing:"border-box",padding:"8px 10px",border:"0.5px solid #ddd",borderRadius:6}}/>
        <div style={{display:"flex",gap:8}}><button onClick={saveSociete} style={{flex:1,fontSize:13,padding:8,borderRadius:8,background:"#E6F1FB",color:"#042C53",border:"0.5px solid #B5D4F4",cursor:"pointer"}}>{socModal==="create"?"Créer":"Enregistrer"}</button><button onClick={()=>{setSocModal(null);setSocNom("")}} style={{fontSize:13,padding:"8px 16px",borderRadius:8,cursor:"pointer"}}>Annuler</button></div>
      </Modal>}
      {socConfirmDel&&<Modal title="Supprimer la société" onClose={()=>setSocConfirmDel(null)}>
        <p style={{fontSize:13,color:"#666",marginBottom:16}}>Supprimer <strong>{getSocNom(socConfirmDel,societes)}</strong> supprimera aussi tous ses salariés et congés.</p>
        <div style={{display:"flex",gap:8}}><button onClick={()=>doDeleteSociete(socConfirmDel)} style={{flex:1,fontSize:13,padding:8,borderRadius:8,background:"#FCEBEB",color:"#501313",border:"0.5px solid #F7C1C1",cursor:"pointer"}}>Supprimer définitivement</button><button onClick={()=>setSocConfirmDel(null)} style={{fontSize:13,padding:"8px 16px",borderRadius:8,cursor:"pointer"}}>Annuler</button></div>
      </Modal>}

      {/* MODALS SALARIÉ */}
      {salModal&&<Modal title={salModal==="create"?"Nouveau salarié":"Modifier"} onClose={()=>setSalModal(null)}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          <div style={{gridColumn:"1/-1"}}><label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>Nom complet *</label><input value={salForm.nom} onChange={e=>setSalForm(f=>({...f,nom:e.target.value}))} placeholder="Prénom Nom" autoFocus style={{width:"100%",fontSize:13,boxSizing:"border-box",padding:"7px 10px",border:"0.5px solid #ddd",borderRadius:6}}/></div>
          <div><label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>Société *</label><select value={salForm.societe_id} onChange={e=>setSalForm(f=>({...f,societe_id:e.target.value}))} style={{width:"100%",fontSize:13,padding:"7px 10px",border:"0.5px solid #ddd",borderRadius:6}}><option value="">Sélectionner...</option>{societes.map(s=><option key={s.id} value={s.id}>{s.nom}</option>)}</select></div>
          <div><label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>Poste</label><input value={salForm.poste||""} onChange={e=>setSalForm(f=>({...f,poste:e.target.value}))} placeholder="Ex: Comptable" style={{width:"100%",fontSize:13,boxSizing:"border-box",padding:"7px 10px",border:"0.5px solid #ddd",borderRadius:6}}/></div>
          <div style={{gridColumn:"1/-1"}}><label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>Email</label><input value={salForm.email||""} onChange={e=>setSalForm(f=>({...f,email:e.target.value}))} type="email" style={{width:"100%",fontSize:13,boxSizing:"border-box",padding:"7px 10px",border:"0.5px solid #ddd",borderRadius:6}}/></div>
        </div>
        <div style={{display:"flex",gap:8}}><button onClick={saveSalarie} disabled={!salForm.nom?.trim()||!salForm.societe_id} style={{flex:1,fontSize:13,padding:8,borderRadius:8,background:"#E6F1FB",color:"#042C53",border:"0.5px solid #B5D4F4",cursor:"pointer",opacity:(!salForm.nom?.trim()||!salForm.societe_id)?0.5:1}}>{salModal==="create"?"Créer":"Enregistrer"}</button><button onClick={()=>setSalModal(null)} style={{fontSize:13,padding:"8px 16px",borderRadius:8,cursor:"pointer"}}>Annuler</button></div>
      </Modal>}
      {salConfirmDel&&<Modal title="Supprimer le salarié" onClose={()=>setSalConfirmDel(null)}>
        <p style={{fontSize:13,color:"#666",marginBottom:16}}>Supprimer <strong>{salConfirmDel.nom}</strong> supprimera aussi toutes ses demandes de congé.</p>
        <div style={{display:"flex",gap:8}}><button onClick={()=>doDeleteSalarie(salConfirmDel.id)} style={{flex:1,fontSize:13,padding:8,borderRadius:8,background:"#FCEBEB",color:"#501313",border:"0.5px solid #F7C1C1",cursor:"pointer"}}>Supprimer définitivement</button><button onClick={()=>setSalConfirmDel(null)} style={{fontSize:13,padding:"8px 16px",borderRadius:8,cursor:"pointer"}}>Annuler</button></div>
      </Modal>}

     {/* HEADER */}
     {showChangePwd&&<ModalChangerMotDePasse onClose={()=>setShowChangePwd(false)}/>}
      <div style={{background:"linear-gradient(135deg,#1e1b4b 0%,#312e81 45%,#1e3a5f 100%)",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8,boxShadow:"0 2px 20px rgba(0,0,0,0.15)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#FF6B6B,#FF8E53)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,boxShadow:"0 4px 12px rgba(255,107,107,0.4)"}}>🏢</div>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:"white",fontFamily:"'Syne',sans-serif",letterSpacing:"-0.02em"}}>Suivi des congés</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",fontWeight:500,letterSpacing:"0.06em",textTransform:"uppercase"}}>Application interne</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 12px",borderRadius:99,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)"}}>
            <div style={{width:26,height:26,borderRadius:"50%",background:`linear-gradient(135deg,${rc.border},${rc.text})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"white"}}>{initials(profile.nom)}</div>
            <span style={{fontSize:12,fontWeight:600,color:"white"}}>{profile.nom}</span>
            <span style={{fontSize:10,color:"rgba(255,255,255,0.5)"}}>· {role}</span>
          </div>
          <button onClick={()=>setTab("form")} style={{fontSize:13,padding:"7px 16px",borderRadius:99,background:"linear-gradient(135deg,#FF6B6B,#FF8E53)",color:"white",border:"none",cursor:"pointer",fontWeight:700,boxShadow:"0 4px 12px rgba(255,107,107,0.35)",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>+ Demande</button>
          <button onClick={()=>setShowChangePwd(true)} style={{fontSize:12,padding:"7px 14px",borderRadius:99,color:"rgba(255,255,255,0.7)",border:"1px solid rgba(255,255,255,0.2)",background:"transparent",cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>🔑 Mot de passe</button>
          <button onClick={handleLogout} style={{fontSize:12,padding:"7px 14px",borderRadius:99,color:"rgba(255,255,255,0.7)",border:"1px solid rgba(255,255,255,0.2)",background:"transparent",cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Déconnexion</button>
        </div>
      </div>
      {/* FILTRES */}
      {canAll&&tab!=="salaries"&&tab!=="dashboard"&&tab!=="utilisateurs"&&tab!=="logs"&&(
        <div style={{marginBottom:14,padding:"10px 12px",background:"#f9f9f9",borderRadius:8,border:"0.5px solid #e5e5e5"}}>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",paddingBottom:8,borderBottom:"0.5px solid #e5e5e5",marginBottom:8}}>
            {["Toutes",...societes.map(s=>s.id)].map(id=>{
              const label=id==="Toutes"?"Toutes":getSocNom(id,societes)
              return(<div key={id} style={{display:"flex",alignItems:"center"}}>
                <button onClick={()=>setFiltSoc(id)} style={{fontSize:12,padding:"4px 10px",borderRadius:id==="Toutes"?"20px":"20px 0 0 20px",border:"0.5px solid #ccc",borderRight:id==="Toutes"?"0.5px solid #ccc":"none",background:filtSoc===id?"#111":"#fff",color:filtSoc===id?"#fff":"#666",cursor:"pointer"}}>{label}</button>
                {id!=="Toutes"&&isAdmin&&<>
                  <button onClick={()=>{setSocModal(societes.find(s=>s.id===id));setSocNom(getSocNom(id,societes))}} style={{fontSize:11,padding:"4px 6px",border:"0.5px solid #ccc",borderRight:"none",background:filtSoc===id?"#111":"#fff",color:filtSoc===id?"#aaa":"#888",cursor:"pointer"}}>✎</button>
                  <button onClick={()=>setSocConfirmDel(id)} style={{fontSize:11,padding:"4px 6px",border:"0.5px solid #ccc",borderRadius:"0 20px 20px 0",background:filtSoc===id?"#111":"#fff",color:"#E24B4A",cursor:"pointer"}}>×</button>
                </>}
              </div>)
            })}
            {isAdmin&&<button onClick={()=>{setSocModal("create");setSocNom("")}} style={{fontSize:12,padding:"4px 12px",borderRadius:20,border:"0.5px dashed #ccc",background:"transparent",color:"#888",cursor:"pointer"}}>+ Ajouter</button>}
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            <select value={filtType} onChange={e=>setFiltType(e.target.value)} style={{fontSize:13,padding:"5px 8px",border:"0.5px solid #ddd",borderRadius:6}}><option>Tous</option>{TYPES.map(t=><option key={t}>{t}</option>)}</select>
            <select value={filtStat} onChange={e=>setFiltStat(e.target.value)} style={{fontSize:13,padding:"5px 8px",border:"0.5px solid #ddd",borderRadius:6}}><option>Tous</option>{STATUTS.map(s=><option key={s}>{s}</option>)}</select>
            <span style={{fontSize:12,color:"#888",marginLeft:"auto"}}>{congesVisibles.length} résultat(s)</span>
          </div>
        </div>
      )}

    {/* TABS */}
      <div style={{display:"flex",gap:4,padding:"8px 20px",background:"white",borderBottom:"1px solid rgba(124,58,237,0.1)",overflowX:"auto",boxShadow:"0 2px 10px rgba(0,0,0,0.05)"}}>
        {TABS.map(([key,label,badge])=>(
          <button key={key} onClick={()=>setTab(key)} style={{fontSize:13,padding:"7px 16px",borderRadius:99,border:"none",background:tab===key?"linear-gradient(135deg,#7C3AED,#EC4899)":"transparent",color:tab===key?"white":"#6b7280",cursor:"pointer",fontWeight:tab===key?700:500,position:"relative",whiteSpace:"nowrap",transition:"all 0.15s",fontFamily:"'Plus Jakarta Sans',sans-serif",boxShadow:tab===key?"0 4px 12px rgba(124,58,237,0.3)":"none"}}>
            {label}{badge>0&&<span style={{position:"absolute",top:2,right:2,background:"#FF6B6B",color:"white",borderRadius:99,fontSize:9,padding:"0 4px",lineHeight:"15px",fontWeight:700}}>{badge}</span>}
          </button>
        ))}
      </div>

      {/* DASHBOARD */}
      {tab==="dashboard"&&isEmp&&<DashboardEmploye profile={profile} conges={conges} salaries={salaries} onNewRequest={()=>setTab("form")} soumettre={soumettre} role={role}/>}
      {tab==="dashboard"&&isMgr&&<DashboardManager profile={profile} conges={conges} salaries={salaries} societes={societes} changerStatut={handleChangerStatut}/>}
      {tab==="dashboard"&&isRH&&<DashboardRH profile={profile} conges={conges} salaries={salaries} societes={societes} changerStatut={handleChangerStatut}/>}
      {tab==="dashboard"&&isAdmin&&<DashboardSuperAdmin profile={profile} conges={conges} salaries={salaries} societes={societes} changerStatut={handleChangerStatut} profiles={profiles} logs={logs}/>}
      
      {/* MES CONGÉS */}
      {tab==="mescongés"&&!isEmp&&<DashboardEmploye profile={profile} conges={conges} salaries={salaries} onNewRequest={()=>setTab("form")} soumettre={soumettre} role={role}/>}
     
      {/* FORM */}
      {tab==="form"&&<div style={{background:"#fff",border:"0.5px solid #e5e5e5",borderRadius:12,padding:20}}>
        <div style={{fontSize:15,fontWeight:500,marginBottom:14}}>Nouvelle demande de congé</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {!isEmp&&<div style={{gridColumn:"1/-1"}}>
            <label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>Salarié *</label>
            <select value={form.salarie_id} onChange={e=>setForm(f=>({...f,salarie_id:e.target.value}))} style={{width:"100%",fontSize:13,padding:"7px 10px",border:"0.5px solid #ddd",borderRadius:6}}>
              <option value="">Sélectionner...</option>
              {(isMgr?salaries.filter(s=>getSocId(s)===profile.societe_id):salaries).map(s=><option key={s.id} value={s.id}>{s.nom} — {getSocNom(getSocId(s),societes)}</option>)}
            </select>
          </div>}
          <div><label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>Type *</label><select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={{width:"100%",fontSize:13,padding:"7px 10px",border:"0.5px solid #ddd",borderRadius:6}}>{TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div><label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>Début *</label><input type="date" value={form.debut} onChange={e=>setForm(f=>({...f,debut:e.target.value}))} style={{width:"100%",fontSize:13,boxSizing:"border-box",padding:"7px 10px",border:"0.5px solid #ddd",borderRadius:6}}/></div>
            <div><label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>Fin *</label><input type="date" value={form.fin} onChange={e=>setForm(f=>({...f,fin:e.target.value}))} style={{width:"100%",fontSize:13,boxSizing:"border-box",padding:"7px 10px",border:"0.5px solid #ddd",borderRadius:6}}/></div>
          </div>
          <div style={{gridColumn:"1/-1"}}><label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>Commentaire</label><textarea value={form.commentaire} onChange={e=>setForm(f=>({...f,commentaire:e.target.value}))} rows={2} style={{width:"100%",fontSize:13,boxSizing:"border-box",padding:"7px 10px",border:"0.5px solid #ddd",borderRadius:6,resize:"vertical"}}/></div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:14}}>
          <button onClick={submitForm} style={{fontSize:13,padding:"7px 18px",borderRadius:8,background:"#EAF3DE",color:"#173404",border:"0.5px solid #C0DD97",cursor:"pointer"}}>Soumettre</button>
          <button onClick={()=>setTab(isEmp?"dashboard":"liste")} style={{fontSize:13,padding:"7px 18px",borderRadius:8,cursor:"pointer"}}>Annuler</button>
        </div>
      </div>}

      {/* LISTE */}
      {tab==="liste"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
        {congesLoading&&<div style={{textAlign:"center",padding:"30px 0",color:"#aaa"}}>Chargement...</div>}
        {!congesLoading&&congesVisibles.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:"#bbb"}}>Aucune demande</div>}
        {congesVisibles.slice().sort((a,b)=>new Date(b.debut)-new Date(a.debut)).map(c=>{
          const sal=getSalObj(c,salaries)
          const jours=diffDays(c.debut,c.fin)+1;const joursOuvr=joursOuvrables(c.debut,c.fin)
          const nexts=NEXT[c.statut]||[]
          const isSel=selId===c.id
          const canAct=(isMgr&&c.statut==="En attente")||(isRH&&c.statut==="Validé Manager")||isAdmin
          return(<div key={c.id} onClick={()=>setSelId(isSel?null:c.id)} style={{background:"#fff",border:`0.5px solid ${isSel?"#888":"#e5e5e5"}`,borderRadius:12,padding:"12px 16px",cursor:"pointer"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <Avatar nom={sal?.nom||"?"} size={30}/>
              <div style={{flex:1,minWidth:80}}><div style={{fontSize:14,fontWeight:500}}>{sal?.nom||"—"}</div><div style={{fontSize:11,color:"#aaa"}}>{getSocNom(getSocId(sal),societes)}</div></div>
              <TypeBadge type={c.type}/><Badge statut={c.statut}/>
              <div style={{fontSize:12,color:"#888",textAlign:"right",minWidth:110}}>{fmtDate(c.debut)} → {fmtDate(c.fin)}<div style={{fontSize:11}}><div style={{fontSize:12}}>{joursOuvr}j ouvrables <span style={{color:"#bbb"}}>/ {jours}j calendrier</span></div></div></div>
            </div>
            {isSel&&<div style={{marginTop:10,paddingTop:10,borderTop:"0.5px solid #f0f0f0"}} onClick={e=>e.stopPropagation()}>
              {c.commentaire&&<div style={{fontSize:12,color:"#888",marginBottom:8,fontStyle:"italic"}}>"{c.commentaire}"</div>}
              <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                {canAct&&nexts.map(ns=><button key={ns} onClick={()=>handleChangerStatut(c.id,ns)} style={{fontSize:12,padding:"4px 12px",borderRadius:6,background:SC[ns].bg,color:SC[ns].text,border:"none",cursor:"pointer"}}>→ {ns}</button>)}
                {(isAdmin||(isEmp&&getSalId(c)===profile.salarie_id&&c.statut==="En attente"))&&<button onClick={()=>handleSupprimer(c.id)} style={{fontSize:12,padding:"4px 12px",borderRadius:6,background:"#FCEBEB",color:"#501313",border:"0.5px solid #F7C1C1",cursor:"pointer",marginLeft:"auto"}}>Supprimer</button>}
              </div>
            </div>}
          </div>)
        })}
      </div>}

      {/* SALARIÉS */}
      {tab==="salaries"&&canAll&&<div>
        <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center"}}>
          <span style={{fontSize:12,color:"#888",marginLeft:"auto"}}>{salaries.length} salarié(s)</span>
          <button onClick={()=>{setSalModal("create");setSalForm({nom:"",poste:"",email:"",societe_id:""})}} style={{fontSize:13,padding:"6px 14px",borderRadius:8,background:"#E6F1FB",color:"#042C53",border:"0.5px solid #B5D4F4",cursor:"pointer"}}>+ Nouveau</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:10}}>
          {salaries.map(sal=>{
            const nb=conges.filter(c=>getSalId(c)===sal.id).length
            const colors=["#3B8BD4","#1D9E75","#D85A30","#888780"]
            const bg=colors[sal.id%4]||colors[0]
            return(<div key={sal.id} style={{background:"#fff",border:"0.5px solid #e5e5e5",borderRadius:12,padding:"14px 16px"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:500,color:"#fff",flexShrink:0}}>{initials(sal.nom)}</div>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{sal.nom}</div><div style={{fontSize:12,color:"#888"}}>{getSocNom(getSocId(sal),societes)}</div></div>
              </div>
              {sal.poste&&<div style={{fontSize:12,color:"#888",marginBottom:4}}>📋 {sal.poste}</div>}
              {sal.email&&<div style={{fontSize:12,color:"#888",marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>✉ {sal.email}</div>}
              <div style={{fontSize:12,color:"#bbb",marginBottom:12}}>{nb} demande(s)</div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>{setSalModal(sal);setSalForm({nom:sal.nom,poste:sal.poste||"",email:sal.email||"",societe_id:getSocId(sal)||""})}} style={{flex:1,fontSize:12,padding:"5px 0",borderRadius:8,border:"0.5px solid #ddd",cursor:"pointer"}}>Modifier</button>
                {isAdmin&&<button onClick={()=>setSalConfirmDel(sal)} style={{fontSize:12,padding:"5px 10px",borderRadius:8,background:"#FCEBEB",color:"#501313",border:"0.5px solid #F7C1C1",cursor:"pointer"}}>×</button>}
              </div>
            </div>)
          })}
        </div>
      </div>}

      {/* UTILISATEURS */}
      {tab==="utilisateurs"&&isAdmin&&<PanelUtilisateurs profiles={profiles} salaries={salaries} societes={societes} loading={profilesLoading} updateProfile={updateProfile} deleteProfile={deleteProfile} logAction={logAction} currentUser={user}/>}
      {/* SOLDES */}
      {tab==="soldes"&&(isAdmin||isRH)&&<PanelSoldes salaries={salaries} societes={societes}/>}
      {/* LOGS */}
      {tab==="logs"&&isAdmin&&<PanelLogs logs={logs} loading={logsLoading} clearLogs={clearLogs}/>}

   {/* GANTT */}
      {tab==="gantt"&&<GanttView congesVisibles={congesVisibles} salaries={salaries} societes={societes} canAll={canAll}/>}
      </div>
  )
}