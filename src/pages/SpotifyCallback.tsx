import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { completeSpotifyLogin } from '../utils/spotify'

function SpotifyCallback() {
  const navigate = useNavigate()
  const ran = useRef(false)
  const [failed, setFailed] = useState(false)

  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const state = params.get('state')
  const denied = params.get('error')
  const invalid = Boolean(denied) || !code || !state

  useEffect(() => {
    if (invalid || ran.current || !code || !state) return
    ran.current = true // React StrictMode runs effects twice in dev; a code can only be used once
    completeSpotifyLogin(code, state)
      .then(() => navigate('/dashboard', { replace: true }))
      .catch(() => setFailed(true))
  }, [invalid, code, state, navigate])

  const hasError = invalid || failed

  return (
    <div className="p-6 text-center">
      <p className="text-lg">
        {hasError ? 'Could not connect to Spotify.' : 'Connecting to Spotify…'}
      </p>
      {hasError && (
        <Link to="/dashboard" className="btn btn-primary mt-4 inline-flex">
          Back to dashboard
        </Link>
      )}
    </div>
  )
}

export default SpotifyCallback
