import { useState } from 'react'

export default function LoginPage({ onLogin }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await onLogin(email, password)
    } catch (err) {
      setError('Email ou mot de passe incorrect')
    }
    setLoading(false)
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'32px 16px',fontFamily:'system-ui,sans-serif'}}>
      <div style={{marginBottom:28,textAlign:'center'}}>
        <div style={{width:48,height:48,borderRadius:12,background:'#3B8BD4',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',fontSize:22}}>🏢</div>
        <div style={{fontSize:22,fontWeight:500}}>Suivi des congés</div>
        <div style={{fontSize:13,color:'#888',marginTop:4}}>Application interne</div>
      </div>

      <form onSubmit={handleSubmit} style={{width:'100%',maxWidth:340,background:'#fff',border:'0.5px solid #e5e5e5',borderRadius:12,padding:24}}>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:12,color:'#888',display:'block',marginBottom:5}}>Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
            placeholder="votre@email.com" required autoFocus
            style={{width:'100%',fontSize:14,padding:'8px 10px',border:'0.5px solid #ddd',borderRadius:6,boxSizing:'border-box'}}/>
        </div>
        <div style={{marginBottom:error?10:18}}>
          <label style={{fontSize:12,color:'#888',display:'block',marginBottom:5}}>Mot de passe</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
            placeholder="••••••••" required
            style={{width:'100%',fontSize:14,padding:'8px 10px',border:'0.5px solid #ddd',borderRadius:6,boxSizing:'border-box'}}/>
        </div>
        {error&&<div style={{fontSize:12,color:'#E24B4A',marginBottom:12}}>{error}</div>}
        <button type="submit" disabled={loading} style={{width:'100%',fontSize:14,padding:10,borderRadius:8,background:loading?'#ccc':'#111',color:'#fff',border:'none',fontWeight:500,cursor:loading?'not-allowed':'pointer'}}>
          {loading?'Connexion...':'Se connecter'}
        </button>
        <div style={{fontSize:11,color:'#ccc',marginTop:14,textAlign:'center'}}>
          Contactez votre administrateur pour obtenir vos accès.
        </div>
      </form>
    </div>
  )
}