import { useState } from 'react'

const FEATURES = [
  { icon: "📅", label: "Suivi des congés en temps réel" },
  { icon: "✅", label: "Workflow de validation automatisé" },
  { icon: "📊", label: "Tableaux de bord par rôle" },
  { icon: "🏢", label: "Gestion multi-sociétés" },
]

const SHAPES = [
  { size: 80,  top: "8%",  left: "5%",  color: "rgba(255,107,107,0.15)", delay: "0s",   dur: "6s"  },
  { size: 50,  top: "15%", left: "85%", color: "rgba(6,214,160,0.2)",    delay: "1s",   dur: "8s"  },
  { size: 120, top: "55%", left: "3%",  color: "rgba(124,58,237,0.12)",  delay: "0.5s", dur: "7s"  },
  { size: 40,  top: "70%", left: "80%", color: "rgba(255,142,83,0.2)",   delay: "2s",   dur: "5s"  },
  { size: 65,  top: "35%", left: "50%", color: "rgba(236,72,153,0.1)",   delay: "1.5s", dur: "9s"  },
]

export default function LoginPage({ onLogin }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [focused,  setFocused]  = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await onLogin(email, password)
    } catch {
      setError('Email ou mot de passe incorrect')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      background: '#f8f7ff',
    }}>

      {/* ── Panneau gauche — branding ── */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #1e3a5f 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 48px',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100vh',
      }}>
        {/* Formes flottantes */}
        {SHAPES.map((s,i) => (
          <div key={i} style={{
            position: 'absolute',
            width: s.size, height: s.size,
            borderRadius: '50%',
            background: s.color,
            top: s.top, left: s.left,
            animation: `float ${s.dur} ease-in-out infinite`,
            animationDelay: s.delay,
          }}/>
        ))}

        {/* Logo */}
        <div style={{
          width: 56, height: 56,
          background: 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
          borderRadius: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26,
          marginBottom: 40,
          boxShadow: '0 8px 24px rgba(255,107,107,0.4)',
        }}>🏢</div>

        {/* Titre */}
        <div style={{
          fontSize: 42,
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          color: 'white',
          lineHeight: 1.15,
          marginBottom: 16,
        }}>
          Suivi des<br/>
          <span style={{
            background: 'linear-gradient(135deg, #FF6B6B, #FF8E53, #FFC85A)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>congés</span>
        </div>

        <p style={{
          fontSize: 15,
          color: 'rgba(255,255,255,0.6)',
          marginBottom: 48,
          lineHeight: 1.6,
          maxWidth: 320,
        }}>
          Application interne de gestion des absences — multi-sociétés, multi-rôles.
        </p>

        {/* Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {FEATURES.map((f,i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              animation: 'slide-up 0.4s ease forwards',
              animationDelay: `${i * 0.1}s`,
              opacity: 0,
            }}>
              <div style={{
                width: 36, height: 36,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16,
                flexShrink: 0,
              }}>{f.icon}</div>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
                {f.label}
              </span>
            </div>
          ))}
        </div>

        {/* Déco bas gauche */}
        <div style={{
          position: 'absolute',
          bottom: -80, left: -80,
          width: 300, height: 300,
          borderRadius: '50%',
          border: '40px solid rgba(255,255,255,0.04)',
        }}/>
        <div style={{
          position: 'absolute',
          bottom: -40, left: -40,
          width: 180, height: 180,
          borderRadius: '50%',
          border: '30px solid rgba(255,107,107,0.08)',
        }}/>
      </div>

      {/* ── Panneau droit — formulaire ── */}
      <div style={{
        width: 460,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 40px',
        background: 'white',
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>

          {/* Header form */}
          <div style={{ marginBottom: 36, textAlign: 'center' }}>
            <div style={{
              fontSize: 26,
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              color: '#1a1523',
              marginBottom: 8,
            }}>Bon retour 👋</div>
            <div style={{ fontSize: 14, color: '#9ca3af' }}>
              Connectez-vous à votre espace
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#374151',
                display: 'block',
                marginBottom: 6,
                letterSpacing: '0.02em',
              }}>ADRESSE EMAIL</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 12, top: '50%',
                  transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none',
                }}>✉️</span>
                <input
                  type="email" value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  placeholder="votre@email.com"
                  required autoFocus
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '12px 14px 12px 40px',
                    fontSize: 14,
                    border: `1.5px solid ${focused==='email' ? '#7C3AED' : '#e5e7eb'}`,
                    borderRadius: 10,
                    outline: 'none',
                    boxShadow: focused==='email' ? '0 0 0 3px rgba(124,58,237,0.1)' : 'none',
                    transition: 'all 0.15s',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: error ? 12 : 24 }}>
              <label style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#374151',
                display: 'block',
                marginBottom: 6,
                letterSpacing: '0.02em',
              }}>MOT DE PASSE</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 12, top: '50%',
                  transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none',
                }}>🔒</span>
                <input
                  type="password" value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '12px 14px 12px 40px',
                    fontSize: 14,
                    border: `1.5px solid ${error ? '#FF6B6B' : focused==='password' ? '#7C3AED' : '#e5e7eb'}`,
                    borderRadius: 10,
                    outline: 'none',
                    boxShadow: focused==='password' ? '0 0 0 3px rgba(124,58,237,0.1)' : error ? '0 0 0 3px rgba(255,107,107,0.1)' : 'none',
                    transition: 'all 0.15s',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                />
              </div>
            </div>

            {/* Erreur */}
            {error && (
              <div style={{
                fontSize: 13, color: '#FF6B6B',
                background: '#fff5f5',
                border: '1px solid rgba(255,107,107,0.2)',
                borderRadius: 8,
                padding: '8px 12px',
                marginBottom: 16,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span>⚠️</span> {error}
              </div>
            )}

            {/* Bouton */}
            <button type="submit" disabled={loading} style={{
              width: '100%',
              padding: '13px',
              fontSize: 15,
              fontWeight: 700,
              color: 'white',
              background: loading
                ? '#d1d5db'
                : 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 50%, #FFC85A 100%)',
              backgroundSize: '200% auto',
              border: 'none',
              borderRadius: 10,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(255,107,107,0.35)',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              letterSpacing: '0.02em',
            }}>
              {loading ? '⏳ Connexion...' : 'Se connecter →'}
            </button>
          </form>

          {/* Footer */}
          <div style={{
            marginTop: 32,
            paddingTop: 24,
            borderTop: '1px solid #f3f4f6',
            textAlign: 'center',
            fontSize: 12,
            color: '#9ca3af',
            lineHeight: 1.6,
          }}>
            Accès restreint aux collaborateurs.<br/>
            Contactez votre administrateur pour obtenir vos accès.
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Syne:wght@700;800&display=swap');
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33%       { transform: translateY(-12px) rotate(3deg); }
          66%       { transform: translateY(-6px) rotate(-2deg); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
          .login-left { display: none !important; }
          .login-right { width: 100% !important; }
        }
      `}</style>
    </div>
  )
}