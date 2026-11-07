import { useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function useTheme() {
  useEffect(() => {
    const applyTheme = (theme: string) => {
      const isDark =
        theme === 'dark' ||
        (theme === 'system' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches)

      document.documentElement.classList.toggle('dark', isDark)
      localStorage.setItem('vtryse-theme', theme)
    }

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        applyTheme('dark')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('theme')
        .eq('id', user.id)
        .maybeSingle()

      applyTheme(data?.theme || localStorage.getItem('vtryse-theme') || 'dark')
    }

    init()

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') setTimeout(init, 0)
    })

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = () => init()
    mediaQuery.addEventListener('change', listener)

    return () => {
      sub.subscription.unsubscribe()
      mediaQuery.removeEventListener('change', listener)
    }
  }, [])
}