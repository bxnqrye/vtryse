import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Lenis from 'lenis'
import { supabase } from '../supabaseClient'
import FeatureVisual from '../components/FeatureVisual'
import type { FeatureKind } from '../components/FeatureVisual'
import '../features.css'
import type { ReactNode } from 'react'

const FEATURES: { name: string; desc: string; kind: FeatureKind }[] = [
  { name: 'Personal Dashboard', kind: 'dashboard', desc: 'View your activities, progress, and overall statistics in one place.' },
  { name: 'Task Tracker', kind: 'tasks', desc: 'Manage ongoing, completed, and cancelled tasks.' },
  { name: 'Personal Journal', kind: 'journal', desc: 'Record thoughts, experiences, and daily reflections.' },
  { name: 'Goal Planner', kind: 'goals', desc: 'Set future goals, track milestones, and see the days remaining until important events.' },
  { name: 'Personal Calendar', kind: 'calendar', desc: 'Organize activities, deadlines, and upcoming events.' },
  { name: 'Shared Dashboard', kind: 'shared', desc: 'Connect with others through invite codes, view their progress and activities, and leave comments.' },
  { name: 'Shared Location', kind: 'location', desc: 'Share real-time location with other users.' },
  { name: 'Spotify Integration', kind: 'music', desc: 'Display your currently playing or recently played Spotify tracks through Last.fm.' },
]

const LEGAL_LINKS = [
  { label: 'Terms & Conditions', href: '#' },
  { label: 'Privacy', href: '#' },
  { label: 'Contact Support', href: 'mailto:you@example.com' },
]
const SOCIALS = [{ url: 'https://github.com/bxnqrye', label: 'GitHub' }]
const YEAR = new Date().getFullYear()

function iconFor(url: string) {
  let host: string
  try {
    host = new URL(url).hostname
  } catch {
    host = ''
  }
  if (host.includes('github')) return { id: 'github-icon', invert: true }
  if (host.includes('x.com') || host.includes('twitter')) return { id: 'x-icon', invert: true }
  if (host.includes('discord')) return { id: 'discord-icon', invert: true }
  if (host.includes('bsky') || host.includes('bluesky')) return { id: 'bluesky-icon', invert: true }
  return { id: 'social-icon', invert: false }
}

// Fades + slides children in the first time they scroll into view.
function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          obs.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
    >
      {children}
    </div>
  )
}

// Gentle per-letter wave. Words stay together so text still wraps on small screens.
// `start` = number of letters (spaces excluded) in the text before this one, so the wave continues.
function Wave({ text, start = 0 }: { text: string; start?: number }) {
  const words = text.split(' ')
  const offsets = words.map(
    (_, i) => start + words.slice(0, i).reduce((n, w) => n + w.length, 0)
  )

  return (
    <span className="block" aria-label={text}>
      {words.map((word, wi) => (
        <span key={wi} aria-hidden="true">
          <span className="inline-block whitespace-nowrap">
            {word.split('').map((ch, ci) => (
              <span
                key={ci}
                className="wave-char"
                style={{ animationDelay: `${(offsets[wi] + ci) * 0.08 - 10}s` }}
              >
                {ch}
              </span>
            ))}
          </span>{' '}
        </span>
      ))}
    </span>
  )
}

// "Don't miss out." -> fades -> "Keep in touch." -> fades -> "Use VTRyse." (stays)
function Showcase() {
  const ref = useRef<HTMLDivElement>(null)
  const [started, setStarted] = useState(false)
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true)
          obs.disconnect()
        }
      },
      { threshold: 0.5 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!started) return
    const timers: ReturnType<typeof setTimeout>[] = []
    const show = (i: number) => {
      setIdx(i)
      setVisible(true)
      if (i < 2) {
        timers.push(setTimeout(() => setVisible(false), 2200)) // hold, then fade out
        timers.push(setTimeout(() => show(i + 1), 3000)) // next phrase
      }
    }
    timers.push(setTimeout(() => show(0), 100))
    return () => timers.forEach(clearTimeout)
  }, [started])

  return (
    <div ref={ref} className="flex min-h-[55vh] items-center justify-center px-[6vw] text-center">
      <p
        className={`text-[clamp(2.2rem,8vw,5rem)] font-bold leading-tight transition-all duration-400 ease-out ${
          visible ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-md scale-95'
        }`}
      >
        {idx === 0 && <>Don't miss out.</>}
        {idx === 1 && <>Keep in touch.</>}
        {idx === 2 && (
          <>
            Use{' '}
            <span className="text-(--h-pink) [text-shadow:0_0_36px_var(--h-glow)]">VTRyze</span>
          </>
        )}
      </p>
    </div>
  )
}

function Home() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [filled, setFilled] = useState(1)
  const [active, setActive] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  // Keep the toggle in sync if the theme is changed elsewhere (e.g. useTheme loading your saved theme)
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    )
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  const setTheme = async (mode: 'light' | 'dark') => {
    document.documentElement.classList.toggle('dark', mode === 'dark')
    localStorage.setItem('vtryse-theme', mode)
    setIsDark(mode === 'dark')
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('profiles').update({ theme: mode }).eq('id', user.id)
  }

  // Smooth wheel / touch scrolling
  useEffect(() => {
    const lenis = new Lenis()
    let id = requestAnimationFrame(function raf(t) {
      lenis.raf(t)
      id = requestAnimationFrame(raf)
    })
    return () => {
      cancelAnimationFrame(id)
      lenis.destroy()
    }
  }, [])

  // Scroll progress -> glow position + "Trace It" bar
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      rootRef.current?.style.setProperty('--sp', String(p))
      setFilled(Math.max(1, Math.round(p * 12)))
    }
    const first = requestAnimationFrame(onScroll)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(first)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const card = (f: (typeof FEATURES)[number], i: number) => {
    const on = active === f.name
    return (
      <Reveal
        key={f.name}
        delay={(i % 5) * 80}
        className="relative hover:z-10 focus-within:z-10 w-[calc((100%-var(--fg))/2-1px)] sm:w-[calc((100%-2*var(--fg))/3-1px)] lg:w-[calc((100%-4*var(--fg))/5-1px)]"
      >
        <button
          onMouseEnter={() => setActive(f.name)}
          onMouseLeave={() => setActive(null)}
          onFocus={() => setActive(f.name)}
          onBlur={() => setActive(null)}
          onClick={() => setActive(on ? null : f.name)}
          className="flex flex-col items-center gap-[clamp(0.5rem,1.2vw,0.9rem)] w-full focus:outline-none"
        >
          <div
            className={`relative aspect-square w-full overflow-hidden rounded-[clamp(1rem,2.4vw,1.75rem)] border bg-(--h-card) transition-all duration-300 ${
              on
                ? 'scale-105 border-(--h-pink) shadow-[0_0_50px_var(--h-glow)]'
                : 'border-(--h-card-border)'
            }`}
          >
            <FeatureVisual kind={f.kind} on={on} />
          </div>
          <span
            className={`text-[clamp(1rem,1.7vw,1.4rem)] font-bold leading-tight transition-all duration-300 ${
              on ? 'text-(--h-pink) [text-shadow:0_0_14px_var(--h-glow)]' : ''
            }`}
          >
            {f.name}
          </span>
          <span className="text-[clamp(0.8rem,1.15vw,1rem)] leading-snug opacity-65 px-1">{f.desc}</span>
        </button>
      </Reveal>
    )
  }

  return (
    <div
      ref={rootRef}
      className="home-page font-hand relative min-h-dvh overflow-x-clip bg-(--h-bg) text-(--h-text)"
    >
      {/* Pink glow that follows the scroll */}
      <div className="home-glow fixed inset-0 pointer-events-none z-0" />

      {/* Top-left: light / dark toggle */}
      <div className="fixed top-3 left-3 sm:top-6 sm:left-8 z-50 flex items-center gap-1 rounded-xl sm:rounded-2xl bg-(--h-pill) backdrop-blur-md p-1 sm:p-1.5">
        <button
          onClick={() => setTheme('light')}
          aria-pressed={!isDark}
          className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[clamp(0.95rem,2.4vw,1.25rem)] tracking-wider transition ${
            !isDark ? 'bg-(--h-btn) text-white shadow-[0_0_18px_var(--h-glow)]' : 'hover:text-(--h-pink)'
          }`}
        >
          ☀ Light
        </button>
        <button
          onClick={() => setTheme('dark')}
          aria-pressed={isDark}
          className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[clamp(0.95rem,2.4vw,1.25rem)] tracking-wider transition ${
            isDark ? 'bg-(--h-btn) text-white shadow-[0_0_18px_var(--h-glow)]' : 'hover:text-(--h-pink)'
          }`}
        >
          ☾ Dark
        </button>
      </div>

      {/* Top-right: scroll progress + auth buttons */}
      <div className="fixed top-3 right-3 sm:top-6 sm:right-8 z-50 flex flex-col items-center gap-0.5 sm:gap-0">
        <span className="text-[16px] tracking-widest">Trace It</span>
        <div className="flex gap-[2px] sm:gap-[3px] mb-1 sm:mb-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className={`w-1 h-2 sm:w-1.5 sm:h-3 rounded-[2px] bg-(--h-text) transition-opacity ${i < filled ? '' : 'opacity-30'}`}
            />
          ))}
        </div>
        <div className="font-fuzzy flex items-center gap-1 sm:gap-2 rounded-xl bg-(--h-pill) backdrop-blur-md px-1 py-1 sm:px-2 sm:py-2">
          <Link
            to="/login"
            className="px-2 py-0.5 sm:px-3 sm:py-1 text-[clamp(0.8rem,2vw,1rem)] tracking-wider hover:text-(--h-pink) transition-colors"
          >
            Log In
          </Link>
          <Link
            to="/signup"
            className="px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg bg-(--h-btn) text-white text-[clamp(0.8rem,2vw,1rem)] tracking-wider hover:shadow-[0_0_24px_var(--h-glow)] transition-shadow"
          >
            Sign Up
          </Link>
        </div>
      </div>

      <div className="relative z-10">
        {/* 1. Hero */}
        <section className="relative min-h-dvh flex flex-col items-center justify-center px-[5vw] pt-28 pb-10 sm:pt-10 text-center">
          <div className="absolute inset-0 bg-linear-to-b from-(--h-hero) to-transparent pointer-events-none" />
          <img
            src="/VTryse_logo.png"
            alt="vtryse logo"
            className="logo-spin relative w-[clamp(7rem,24vw,12.5rem)] h-auto"
          />
          <h1 className="font-gaegu relative font-display tracking-tight text-[70px] leading-none text-(--h-pink) [text-shadow:0_0_30px_var(--h-glow)]">
            VTRyze
          </h1>
          <p className="font-fuzzy relative mt-5 opacity-70 text-lg leading-snug max-w-[90vw]">
            <Wave text="Track your progress. Document your journey." />
            <Wave text="See how far you've come." start={38} />
          </p>
        </section>

        {/* 2. Features: 5 on top, 3 below */}
        <section className="flex flex-col items-center px-[4vw] py-[clamp(3rem,10vw,6rem)]">
          <Reveal>
            <h2 className="text-(--h-pink) text-[clamp(1.5rem,4vw,2rem)] font-bold tracking-wider mb-[clamp(1.5rem,4vw,2.5rem)]">
              <Wave text="FEATURES" />
            </h2>
          </Reveal>
          <div className="w-full max-w-[88rem] flex flex-col gap-y-[clamp(1.5rem,3vw,2.5rem)] [--fg:clamp(1rem,2vw,1.75rem)]">
            <div className="flex flex-wrap justify-center gap-x-(--fg) gap-y-[clamp(1.5rem,3vw,2.5rem)]">
              {FEATURES.slice(0, 5).map((f, i) => card(f, i))}
            </div>
            <div className="flex flex-wrap justify-center gap-x-(--fg) gap-y-[clamp(1.5rem,3vw,2.5rem)]">
              {FEATURES.slice(5).map((f, i) => card(f, i))}
            </div>
          </div>
        </section>

        {/* 3. Showcase */}
        <Showcase />

        {/* 4. Footer */}
        <section className="flex flex-col items-center px-[5vw] pt-[clamp(3rem,8vw,5rem)] pb-[clamp(1.5rem,4vw,2.5rem)] text-center">
          <Reveal className="flex flex-col items-center">
            <p className="mb-3 text-[clamp(0.85rem,1.8vw,1.05rem)] tracking-wide opacity-70">
              © {YEAR} VTRyze. All rights reserved.
            </p>
            <nav className="flex flex-wrap justify-center items-center gap-x-3 sm:gap-x-5 gap-y-2 text-[clamp(0.95rem,2.2vw,1.25rem)] tracking-wide sm:tracking-widest">
              {LEGAL_LINKS.map((l, i) => (
                <span key={l.label} className="flex items-center gap-3 sm:gap-5">
                  <a href={l.href} className="hover:text-(--h-pink) hover:[text-shadow:0_0_14px_var(--h-glow)] transition">
                    {l.label}
                  </a>
                  {i < LEGAL_LINKS.length - 1 && <span className="opacity-60">·</span>}
                </span>
              ))}
            </nav>
            <div className="flex flex-wrap justify-center gap-6 mt-3 sm:mt-4">
              {SOCIALS.map((s) => {
                const icon = iconFor(s.url)
                return (
                  <a
                    key={s.url}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[clamp(0.95rem,2.2vw,1.25rem)] tracking-wide sm:tracking-widest hover:text-(--h-pink) hover:[text-shadow:0_0_14px_var(--h-glow)] transition"
                  >
                    <svg className={`size-[clamp(1.25rem,2.5vw,1.5rem)] ${icon.invert ? 'dark:invert' : ''}`}>
                      <use href={`/icons.svg#${icon.id}`} />
                    </svg>
                    {s.label}
                  </a>
                )
              })}
            </div>
          </Reveal>
        </section>
      </div>
    </div>
  )
}

export default Home
