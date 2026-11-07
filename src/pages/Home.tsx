import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const FEATURES = [
  { name: 'Dashboard' },
  { name: 'Journal' },
  { name: 'Calendar' },
  { name: 'Task Tracker' },
  { name: 'Goal Planner' },
  { name: 'Shared Dashboard' },
  { name: 'Spotify Activity' },
]

const LEGAL_LINKS = [
  { label: 'Terms & Conditions', href: '#' },
  { label: 'Privacy', href: '#' },
  { label: 'Policy Help', href: '#' },
  { label: 'Contact', href: 'mailto:you@example.com' },
]
const SOCIALS = [{ url: 'https://github.com/bxnqrye', label: 'GitHub' }]

function iconFor(url: string) {
  let host = ''
  try { host = new URL(url).hostname } catch {}
  if (host.includes('github')) return { id: 'github-icon', invert: true }
  if (host.includes('x.com') || host.includes('twitter')) return { id: 'x-icon', invert: true }
  if (host.includes('discord')) return { id: 'discord-icon', invert: true }
  if (host.includes('bsky') || host.includes('bluesky')) return { id: 'bluesky-icon', invert: true }
  return { id: 'social-icon', invert: false }
}

function Home() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [filled, setFilled] = useState(1)
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      rootRef.current?.style.setProperty('--sp', String(p))
      setFilled(Math.max(1, Math.round(p * 12)))
    }
    onScroll()
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
      className="home-page font-hand relative min-h-screen bg-(--h-bg) text-(--h-text)"
    >
      {/* Pink glow that follows the scroll */}
      <div className="home-glow fixed inset-0 pointer-events-none z-0" />

      {/* Top-right: scroll progress + auth buttons */}
      <div className="fixed top-5 right-5 md:top-8 md:right-10 z-50 flex flex-col items-center gap-1">
        <span className="text-xl tracking-widest">Trace It</span>
        <div className="flex gap-[3px] mb-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-3 rounded-[2px] bg-(--h-text) transition-opacity ${i < filled ? '' : 'opacity-30'}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-(--h-pill) backdrop-blur-md px-3 py-3">
          <Link to="/login" className="px-4 py-1.5 text-xl tracking-wider hover:text-(--h-pink) transition-colors">
            Log In
          </Link>
          <Link
            to="/signup"
            className="px-4 py-1.5 rounded-lg bg-(--h-btn) text-white text-xl tracking-wider hover:shadow-[0_0_24px_var(--h-glow)] transition-shadow"
          >
            Sign Up
          </Link>
        </div>
      </div>

      <div className="relative z-10">
        {/* 1. Hero */}
        <section className="relative min-h-screen flex flex-col items-center justify-center px-4 text-center">
          <div className="absolute inset-0 bg-linear-to-b from-(--h-hero) to-transparent pointer-events-none" />
          <img
            src="/VTryse_logo.png"
            alt="vtryse logo"
            className="relative w-38 h-38 md:w-50 md:h-45"
          />
          <h1 className="relative font-display font-bold tracking-tight text-6xl md:text-8xl text-(--h-pink) [text-shadow:0_0_30px_var(--h-glow)]">
            vtryse
          </h1>
          <p className="relative mt-2 text-xl md:text-2xl font-bold leading-snug">
            Track your progress. Document your journey.
            <br />
            See how far you've come.
          </p>
        </section>

        {/* 2. About */}
        <section className="min-h-screen flex items-center justify-center px-6">
          <p className="max-w-4xl text-center text-2xl md:text-3xl font-bold leading-relaxed">
            A personal progress and journal tracker designed to help you organize your goals,
            document your journey, and keep track of how far you've come.
          </p>
        </section>

        {/* 3. Features */}
        <section className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
          <h2 className="text-3xl font-bold tracking-wider mb-10">FEATURES</h2>
          <div className="w-full max-w-6xl flex flex-wrap justify-center gap-x-8 gap-y-10">
            {FEATURES.map((f) => {
              const on = active === f.name
              return (
                <button
                  key={f.name}
                  onClick={() => setActive(on ? null : f.name)}
                  className={`relative flex flex-col items-center gap-4 w-[calc((100%-2rem)/2)] sm:w-[calc((100%-4rem)/3)] lg:w-[calc((100%-8rem)/5)] focus:outline-none ${on ? 'z-10' : ''}`}
                >
                  <div
                    className={`aspect-square w-full rounded-3xl border bg-(--h-card) transition-all duration-300 ${
                      on
                        ? 'scale-110 border-(--h-pink) shadow-[0_0_45px_var(--h-glow)]'
                        : 'border-(--h-card-border)'
                    }`}
                  />
                  <span
                    className={`text-2xl font-bold leading-tight transition-all duration-300 ${
                      on ? 'scale-110 text-(--h-pink) [text-shadow:0_0_14px_var(--h-glow)]' : ''
                    }`}
                  >
                    {f.name}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* 4. Footer */}
        <section className="min-h-screen flex flex-col items-center justify-end px-6 pb-14 text-center">
          <nav className="flex flex-wrap justify-center items-center gap-x-5 gap-y-2 text-xl tracking-widest">
            {LEGAL_LINKS.map((l, i) => (
              <span key={l.label} className="flex items-center gap-5">
                <a href={l.href} className="hover:text-(--h-pink) hover:[text-shadow:0_0_14px_var(--h-glow)] transition">
                  {l.label}
                </a>
                {i < LEGAL_LINKS.length - 1 && <span className="opacity-60">·</span>}
              </span>
            ))}
          </nav>
          <div className="flex flex-wrap justify-center gap-6 mt-4">
            {SOCIALS.map((s) => {
              const icon = iconFor(s.url)
              return (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xl tracking-widest hover:text-(--h-pink) hover:[text-shadow:0_0_14px_var(--h-glow)] transition"
                >
                  <svg className={`size-6 ${icon.invert ? 'dark:invert' : ''}`}>
                    <use href={`/icons.svg#${icon.id}`} />
                  </svg>
                  {s.label}
                </a>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}

export default Home
