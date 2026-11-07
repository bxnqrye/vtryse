import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return <p className="p-6">Loading...</p>
  }

  if (!session) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
