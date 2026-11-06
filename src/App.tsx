import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'
import { useTheme } from './hooks/useTheme'
import { useState } from 'react'

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const showSidebar = !['/', '/login', '/signup'].includes(location.pathname)

  return (
    <div
      className={
        showSidebar
          ? 'app-shell min-h-screen'
          : 'min-h-screen bg-void text-text-primary'
      }
    >
      {showSidebar && (
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      )}
      <main
        className={
          showSidebar
            ? `${collapsed ? 'md:ml-14' : 'md:ml-62'} pt-18 md:pt-0 transition-[margin] duration-200`
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
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App