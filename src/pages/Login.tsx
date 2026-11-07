import { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const inputClass =
  'w-full bg-(--h-card) border border-(--h-card-border) p-2.5 rounded-xl text-lg text-(--h-text) placeholder:text-(--h-text)/50 focus:outline-none focus:border-(--h-pink) focus:shadow-[0_0_18px_var(--h-glow)] transition'

function Login() {
  const location = useLocation()
  const isSignup = location.pathname === '/signup'

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('type') === 'signup') {
      setErrorMsg('Email confirmed! You can now log in.')
    }
  }, [])

  const handleSignUp = async () => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          username,
        },
      },
    })

    if (error) {
      setErrorMsg(error.message)
      return
    }

    setErrorMsg('Check your email to confirm sign up!')
  }

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setErrorMsg(error.message)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div
      className="home-page font-hand relative min-h-screen flex items-center justify-center bg-(--h-bg) text-(--h-text) px-4 overflow-hidden"
      style={{ '--sp': 0.5 } as React.CSSProperties}
    >
      <div className="home-glow absolute inset-0 pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-(--h-hero) to-transparent pointer-events-none" />

      <div className="relative w-full max-w-sm p-8 bg-(--h-card) backdrop-blur-xl border border-(--h-card-border) rounded-3xl shadow-[0_0_60px_var(--h-glow)]">
        <Link
          to="/"
          className="font-cherry block text-center font-display text-5xl mb-2 text-(--h-pink) [text-shadow:0_0_24px_var(--h-glow)]"
        >
          vtryse
        </Link>

        <h2 className="text-2xl font-bold mb-4 text-center">
          {isSignup ? 'Create your account' : 'Hello again : )'}
        </h2>

        <div className="flex flex-col gap-3">
          {isSignup && (
            <>
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={inputClass}
              />
            </>
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        <button
          onClick={isSignup ? handleSignUp : handleLogin}
          className="w-full mt-5 bg-(--h-btn) text-white px-4 py-2 rounded-xl text-xl font-bold tracking-wider hover:shadow-[0_0_28px_var(--h-glow)] transition-shadow"
        >
          {isSignup ? 'Sign Up' : 'Log In'}
        </button>

        {errorMsg && <p className="mt-3 text-base text-center text-(--h-pink)">{errorMsg}</p>}

        <p className="mt-5 text-lg text-center opacity-80">
          {isSignup ? (
            <>
              Already have an account?{' '}
              <Link to="/login" className="text-(--h-pink) font-bold hover:underline">
                Log in
              </Link>
            </>
          ) : (
            <>
              Don't have an account yet?{' '}
              <Link to="/signup" className="text-(--h-pink) font-bold hover:underline">
                Sign up
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  )
}

export default Login
