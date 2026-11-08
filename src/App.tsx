import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import SpotifyCallback from './pages/SpotifyCallback'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'
import { useTheme } from './hooks/useTheme'

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const showSidebar = !['/', '/login', '/signup'].includes(location.pathname)

  // Pink glow drifts with the scroll (same as the homepage)
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      rootRef.current?.style.setProperty('--sp', String(p))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <div
      ref={rootRef}
      className={
        showSidebar
          ? 'app-shell home-page font-hand relative min-h-screen'
          : 'min-h-screen bg-void text-text-primary'
      }
    >
      {showSidebar && <div className="home-glow fixed inset-0 pointer-events-none z-0" />}
      {showSidebar && (
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      )}
      <main
        className={
          showSidebar
            ? `relative z-10 ${collapsed ? 'md:ml-14' : 'md:ml-60'} pt-18 md:pt-0 transition-[margin] duration-200`
            : ''
        }
      >
        {children}
      </main>
    </div>
  )
}

function App() {
  useTheme()

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/spotify-callback"
            element={
              <ProtectedRoute>
                <SpotifyCallback />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
