import { useState, useEffect } from 'react'
import { supabase, supabaseConfigured } from './lib/supabase'
import Auth from './components/Auth'
import KanbanBoard from './components/KanbanBoard'

function SetupBanner() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{
        background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,0.09)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.12)', padding: '32px 36px', maxWidth: 480, lineHeight: 1.7
      }}>
        <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Techno Beat <span style={{ color: '#2C5F8A' }}>CRM</span></div>
        <p style={{ color: '#6B6860', marginBottom: 16 }}>
          The app needs Supabase credentials to run. Follow these steps:
        </p>
        <ol style={{ paddingLeft: 20, color: '#1A1917', fontSize: 13 }}>
          <li>Create a project at <strong>supabase.com</strong></li>
          <li>Copy <code>supabase/schema.sql</code> into the Supabase SQL editor and run it</li>
          <li>Copy <code>.env.example</code> → <code>.env</code> and fill in your project URL and anon key</li>
          <li>Run <code>npm run dev</code></li>
          <li>Create user accounts in Supabase → Authentication → Users</li>
        </ol>
        <p style={{ color: '#A09D97', fontSize: 12, marginTop: 16 }}>
          For production, add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> as GitHub Secrets or Vercel environment variables.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabaseConfigured) { setLoading(false); return }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!supabaseConfigured) return <SetupBanner />
  if (loading) return null

  return session ? <KanbanBoard session={session} /> : <Auth />
}
