import { useState } from 'react'
import { supabase } from './supabase'

const FEATURES = [
  { icon: "📅", label: "Suivi des congés en temps réel" },
  { icon: "✅", label: "Workflow de validation automatisé" },
  { icon: "📊", label: "Tableaux de bord par rôle" },
  { icon: "🏢", label: "Gestion multi-sociétés" },
]
const SHAPES = [
  { size:80,  top:"8%",  left:"5%",  color:"rgba(255,107,107,0.15)", delay:"0s",   dur:"6s" },
  { size:50,  top:"15%", left:"85%", color:"rgba(6,214,160,0.2)",    delay:"1s",   dur:"8s" },
  { size:120, top:"55%", left:"3%",  color:"rgba(124,58,237,0.12)",  delay:"0.5s", dur:"7s" },
  { size:40,  top:"70%", left:"80%", color:"rgba(255,142,83,0.2)",   delay:"2s",   dur:"5s" },
  { size:65,  top:"35%", left:"50%", color:"rgba(236,72,153,0.1)",   delay:"1.5s", dur:"9s" },
]

const inp = (focused, hasError) => ({
  width:"100%", boxSizing:"border-box",
  padding:"12px 14px 12px 40px", fontSize:14,
  border:`1.5px solid ${hasError?"#FF6B6B":focused?"#7C3AED":"#e5e7eb"}`,
  borderRadius:10, outline:"none",
  boxShadow:hasError?"0 0 0 3px rgba(255,107,107,0.1)":focused?"0 0 0 3px rgba(124,58,237,0.1)":"none",
  transition:"all 0.15s", fontFamily:"'Plus Jakarta Sans',sans-serif",
})
const lbl = { fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:6,letterSpacing:"0.02em" }
const btn = (disabled) => ({
  width:"100%", padding:"13px", fontSize:15, fontWeight:700, color:"white",
  background:disabled?"#d1d5db":"linear-gradient(135deg,#FF6B6B 0%,#FF8E53 50%,#FFC85A 100%)",
  border:"none", borderRadius:10, cursor:disabled?"not-allowed":"pointer",
  boxShadow:disabled?"none":"0 4px 20px rgba(255,107,107,0.35)",
  fontFamily:"'Plus Jakarta Sans',sans-serif", letterSpacing:"0.02em", transition:"all 0.3s",
})

function LeftPanel() {
  return (
    <div style={{flex:1,background:"linear-gradient(135deg,#1e1b4b 0%,#312e81 45%,#1e3a5f 100%)",display:"flex",flexDirection:"column",justifyContent:"center",padding:"60px 48px",position:"relative",overflow:"hidden",minHeight:"100vh"}}>
      {SHAPES.map((s,i)=><div key={i} style={{position:"absolute",width:s.size,height:s.size,borderRadius:"50%",background:s.color,top:s.top,left:s.left,animation:`float ${s.dur} ease-in-out infinite`,animationDelay:s.delay}}/>)}
      <div style={{width:56,height:56,background:"linear-gradient(135deg,#FF6B6B,#FF8E53)",borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,marginBottom:40,boxShadow:"0 8px 24px rgba(255,107,107,0.4)"}}>🏢</div>
      <div style={{fontSize:42,fontFamily:"'Syne',sans-serif",fontWeight:800,color:"white",lineHeight:1.15,marginBottom:16}}>
        Suivi des<br/>
        <span style={{background:"linear-gradient(135deg,#FF6B6B,#FF8E53,#FFC85A)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>congés</span>
      </div>
      <p style={{fontSize:15,color:"rgba(255,255,255,0.6)",marginBottom:48,lineHeight:1.6,maxWidth:320}}>Application interne de gestion des absences — multi-sociétés, multi-rôles.</p>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {FEATURES.map((f,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:12,animation:"slide-up 0.4s ease forwards",animationDelay:`${i*0.1}s`,opacity:0}}>
            <div style={{width:36,height:36,borderRadius:10,background:"rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{f.icon}</div>
            <span style={{fontSize:14,color:"rgba(255,255,255,0.75)",fontWeight:500}}>{f.label}</span>
          </div>
        ))}
      </div>
      <div style={{position:"absolute",bottom:-80,left:-80,width:300,height:300,borderRadius:"50%",border:"40px solid rgba(255,255,255,0.04)"}}/>
    </div>
  )
}

export default function LoginPage({ onLogin }) {
  const [mode,    setMode]    = useState(() => window.location.hash.includes('type=recovery') ? 'reset' : 'login')
  const [email,   setEmail]   = useState('')
  const [pwd,     setPwd]     = useState('')
  const [newPwd,  setNewPwd]  = useState('')
  const [confPwd, setConfPwd] = useState('')
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(null)

  const reset = () => { setError(''); setSuccess('') }

  async function handleLogin(e) {
    e.preventDefault(); reset(); setLoading(true)
    try { await onLogin(email, pwd) }
    catch { setError('Email ou mot de passe incorrect') }
    setLoading(false)
  }

  async function handleForgot(e) {
    e.preventDefault()
    if (!email.trim()) { setError('Entrez votre email'); return }
    reset(); setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    })
    if (err) setError(err.message)
    else setSuccess(`Lien envoyé à ${email} — vérifiez votre boîte mail.`)
    setLoading(false)
  }

  async function handleReset(e) {
    e.preventDefault()
    if (newPwd.length < 6) { setError('6 caractères minimum'); return }
    if (newPwd !== confPwd) { setError('Les mots de passe ne correspondent pas'); return }
    reset(); setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password: newPwd })
    if (err) setError(err.message)
    else {
      setSuccess('Mot de passe mis à jour ! Redirection...')
      setTimeout(() => { setMode('login'); reset(); setNewPwd(''); setConfPwd(''); window.location.hash = '' }, 2500)
    }
    setLoading(false)
  }

  const pwdStrength = () => {
    if (!newPwd) return { level: 0, label: '', color: '#e5e7eb' }
    if (newPwd.length < 4) return { level: 1, label: 'Trop court', color: '#FF6B6B' }
    if (newPwd.length < 6) return { level: 2, label: 'Faible', color: '#FF8E53' }
    if (newPwd.length >= 8 && /[A-Z]/.test(newPwd) && /[0-9]/.test(newPwd)) return { level: 4, label: 'Fort ✓', color: '#06D6A0' }
    return { level: 3, label: 'Moyen', color: '#FFC85A' }
  }
  const str = pwdStrength()

  const ErrorBox = ({ msg }) => msg ? (
    <div style={{fontSize:13,color:"#FF6B6B",background:"#fff5f5",border:"1px solid rgba(255,107,107,0.2)",borderRadius:8,padding:"8px 12px",marginBottom:16,display:"flex",alignItems:"center",gap:6}}>⚠️ {msg}</div>
  ) : null

  const SuccessBox = ({ msg }) => msg ? (
    <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:12,padding:20,textAlign:"center",marginBottom:16}}>
      <div style={{fontSize:28,marginBottom:6}}>📬</div>
      <div style={{fontSize:14,color:"#166534",fontWeight:500,lineHeight:1.6}}>{msg}</div>
    </div>
  ) : null

  return (
    <div style={{minHeight:"100vh",display:"flex",fontFamily:"'Plus Jakarta Sans',sans-serif",background:"#f8f7ff"}}>
      <LeftPanel/>

      <div style={{width:460,flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"48px 40px",background:"white"}}>
        <div style={{width:"100%",maxWidth:360}}>

          {/* ── CONNEXION ── */}
          {mode==="login"&&<>
            <div style={{marginBottom:36,textAlign:"center"}}>
              <div style={{fontSize:26,fontFamily:"'Syne',sans-serif",fontWeight:800,color:"#1a1523",marginBottom:8}}>Bon retour 👋</div>
              <div style={{fontSize:14,color:"#9ca3af"}}>Connectez-vous à votre espace</div>
            </div>
            <form onSubmit={handleLogin}>
              <div style={{marginBottom:16}}>
                <label style={lbl}>ADRESSE EMAIL</label>
                <div style={{position:"relative"}}>
                  <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:16,pointerEvents:"none"}}>✉️</span>
                  <input type="email" value={email} onChange={e=>{setEmail(e.target.value);reset()}} onFocus={()=>setFocused("email")} onBlur={()=>setFocused(null)} placeholder="votre@email.com" required autoFocus style={inp(focused==="email",false)}/>
                </div>
              </div>
              <div style={{marginBottom:8}}>
                <label style={lbl}>MOT DE PASSE</label>
                <div style={{position:"relative"}}>
                  <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:16,pointerEvents:"none"}}>🔒</span>
                  <input type="password" value={pwd} onChange={e=>{setPwd(e.target.value);reset()}} onFocus={()=>setFocused("pwd")} onBlur={()=>setFocused(null)} placeholder="••••••••" required style={inp(focused==="pwd",!!error)}/>
                </div>
              </div>
              <div style={{textAlign:"right",marginBottom:20}}>
                <button type="button" onClick={()=>{setMode("forgot");reset()}} style={{fontSize:12,color:"#7C3AED",background:"none",border:"none",cursor:"pointer",fontWeight:600,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                  Mot de passe oublié ?
                </button>
              </div>
              <ErrorBox msg={error}/>
              <button type="submit" disabled={loading} style={btn(loading)}>{loading?"⏳ Connexion...":"Se connecter →"}</button>
            </form>
            <div style={{marginTop:32,paddingTop:24,borderTop:"1px solid #f3f4f6",textAlign:"center",fontSize:12,color:"#9ca3af",lineHeight:1.6}}>
              Accès restreint aux collaborateurs.<br/>Contactez votre administrateur pour obtenir vos accès.
            </div>
          </>}

          {/* ── MOT DE PASSE OUBLIÉ ── */}
          {mode==="forgot"&&<>
            <div style={{marginBottom:32,textAlign:"center"}}>
              <div style={{fontSize:40,marginBottom:12}}>🔑</div>
              <div style={{fontSize:22,fontFamily:"'Syne',sans-serif",fontWeight:800,color:"#1a1523",marginBottom:8}}>Mot de passe oublié</div>
              <div style={{fontSize:14,color:"#9ca3af",lineHeight:1.6}}>Entrez votre email et nous vous enverrons un lien de réinitialisation.</div>
            </div>
            <SuccessBox msg={success}/>
            {!success&&<form onSubmit={handleForgot}>
              <div style={{marginBottom:20}}>
                <label style={lbl}>ADRESSE EMAIL</label>
                <div style={{position:"relative"}}>
                  <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:16,pointerEvents:"none"}}>✉️</span>
                  <input type="email" value={email} onChange={e=>{setEmail(e.target.value);reset()}} onFocus={()=>setFocused("email")} onBlur={()=>setFocused(null)} placeholder="votre@email.com" required autoFocus style={inp(focused==="email",!!error)}/>
                </div>
              </div>
              <ErrorBox msg={error}/>
              <button type="submit" disabled={loading} style={btn(loading)}>{loading?"⏳ Envoi...":"Envoyer le lien →"}</button>
            </form>}
            <div style={{textAlign:"center",marginTop:24}}>
              <button onClick={()=>{setMode("login");reset()}} style={{fontSize:13,color:"#7C3AED",background:"none",border:"none",cursor:"pointer",fontWeight:600,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>← Retour à la connexion</button>
            </div>
          </>}

          {/* ── RÉINITIALISATION ── */}
          {mode==="reset"&&<>
            <div style={{marginBottom:32,textAlign:"center"}}>
              <div style={{fontSize:40,marginBottom:12}}>🔐</div>
              <div style={{fontSize:22,fontFamily:"'Syne',sans-serif",fontWeight:800,color:"#1a1523",marginBottom:8}}>Nouveau mot de passe</div>
              <div style={{fontSize:14,color:"#9ca3af"}}>Choisissez un mot de passe sécurisé.</div>
            </div>
            <SuccessBox msg={success}/>
            {!success&&<form onSubmit={handleReset}>
              <div style={{marginBottom:16}}>
                <label style={lbl}>NOUVEAU MOT DE PASSE</label>
                <div style={{position:"relative"}}>
                  <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:16,pointerEvents:"none"}}>🔒</span>
                  <input type="password" value={newPwd} onChange={e=>{setNewPwd(e.target.value);reset()}} onFocus={()=>setFocused("new")} onBlur={()=>setFocused(null)} placeholder="6 caractères minimum" required autoFocus style={inp(focused==="new",!!error)}/>
                </div>
                {newPwd&&<>
                  <div style={{display:"flex",gap:4,marginTop:8}}>
                    {[1,2,3,4].map(i=><div key={i} style={{flex:1,height:4,borderRadius:2,background:i<=str.level?str.color:"#e5e7eb",transition:"background 0.3s"}}/>)}
                  </div>
                  <div style={{fontSize:11,color:str.color,marginTop:4,fontWeight:500}}>{str.label}</div>
                </>}
              </div>
              <div style={{marginBottom:20}}>
                <label style={lbl}>CONFIRMER LE MOT DE PASSE</label>
                <div style={{position:"relative"}}>
                  <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:16,pointerEvents:"none"}}>✅</span>
                  <input type="password" value={confPwd} onChange={e=>{setConfPwd(e.target.value);reset()}} onFocus={()=>setFocused("conf")} onBlur={()=>setFocused(null)} placeholder="Répétez le mot de passe" required style={inp(focused==="conf",!!error&&confPwd.length>0&&newPwd!==confPwd)}/>
                </div>
                {confPwd&&newPwd!==confPwd&&<div style={{fontSize:11,color:"#FF6B6B",marginTop:4}}>Les mots de passe ne correspondent pas</div>}
                {confPwd&&newPwd===confPwd&&<div style={{fontSize:11,color:"#06D6A0",marginTop:4}}>✓ Les mots de passe correspondent</div>}
              </div>
              <ErrorBox msg={error}/>
              <button type="submit" disabled={loading} style={btn(loading)}>{loading?"⏳ Mise à jour...":"Mettre à jour →"}</button>
            </form>}
          </>}

        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Syne:wght@700;800&display=swap');
        @keyframes float { 0%,100%{transform:translateY(0) rotate(0deg)} 33%{transform:translateY(-12px) rotate(3deg)} 66%{transform:translateY(-6px) rotate(-2deg)} }
        @keyframes slide-up { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}