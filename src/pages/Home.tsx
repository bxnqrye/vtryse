import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Lenis from 'lenis'
import type { ReactNode } from 'react'

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
function Wave({ text, start = 0 }: { text: string; start?: number }) {
  let index = start
  return (
    <span className="block" aria-label={text}>
      {text.split(' ').map((word, wi) => (
        <span key={wi} aria-hidden="true">
          <span className="inline-block whitespace-nowrap">
            {word.split('').map((ch, ci) => (
              <span
                key={ci}
                className="wave-char"
                style={{ animationDelay: `${index++ * 0.08 - 10}s` }}
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

function Home() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [filled, setFilled] = useState(1)
  const [active, setActive] = useState<string | null>(null)

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
      className="home-page font-hand relative min-h-dvh overflow-x-hidden bg-(--h-bg) text-(--h-text)"
    >
      {/* Pink glow that follows the scroll */}
      <div className="home-glow fixed inset-0 pointer-events-none z-0" />

      {/* Top-right: scroll progress + auth buttons */}
      <div className="fixed top-3 right-3 sm:top-6 sm:right-8 z-50 flex flex-col items-center gap-0.5 sm:gap-1">
        <span className="text-[clamp(0.9rem,2.4vw,1.25rem)] tracking-widest">Trace It</span>
        <div className="flex gap-[2px] sm:gap-[3px] mb-1 sm:mb-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className={`w-1 h-2 sm:w-1.5 sm:h-3 rounded-[2px] bg-(--h-text) transition-opacity ${i < filled ? '' : 'opacity-30'}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-1 sm:gap-2 rounded-xl sm:rounded-2xl bg-(--h-pill) backdrop-blur-md px-1.5 py-1.5 sm:px-3 sm:py-3">
          <Link
            to="/login"
            className="px-2 py-1 sm:px-4 sm:py-1.5 text-[clamp(0.95rem,2.4vw,1.25rem)] tracking-wider hover:text-(--h-pink) transition-colors"
          >
            Log In
          </Link>
          <Link
            to="/signup"
            className="px-2 py-1 sm:px-4 sm:py-1.5 rounded-lg bg-(--h-btn) text-white text-[clamp(0.95rem,2.4vw,1.25rem)] tracking-wider hover:shadow-[0_0_24px_var(--h-glow)] transition-shadow"
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
          <h1 className="relative font-display font-bold tracking-tight text-[clamp(3rem,13vw,7rem)] leading-none text-(--h-pink) [text-shadow:0_0_30px_var(--h-glow)]">
            vtryse
          </h1>
          <p className="relative mt-3 text-[clamp(1.05rem,2.8vw,1.6rem)] font-bold leading-snug max-w-[90vw]">
            <Wave text="Track your progress. Document your journey." />
            <Wave text="See how far you've come." start={43} />
          </p>
        </section>

        {/* 2. About */}
        <section className="flex justify-center px-[6vw] py-[clamp(4rem,14vw,9rem)]">
          <Reveal>
            <p className="max-w-4xl text-center text-[clamp(1.25rem,3.4vw,2rem)] font-bold leading-relaxed">
              A personal progress and journal tracker designed to help you organize your goals,
              document your journey, and keep track of how far you've come.
            </p>
          </Reveal>
        </section>

        {/* 3. Features */}
        <section className="flex flex-col items-center px-[6vw] py-[clamp(3rem,10vw,6rem)]">
          <Reveal>
            <h2 className="text-[clamp(1.5rem,4vw,2rem)] font-bold tracking-wider mb-[clamp(1.5rem,4vw,2.5rem)]">
              FEATURES
            </h2>
          </Reveal>
          <div className="w-full max-w-6xl flex flex-wrap justify-center [--fg:clamp(1rem,2.5vw,2rem)] gap-x-(--fg) gap-y-[clamp(1.5rem,3vw,2.5rem)]">
            {FEATURES.map((f, i) => {
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
                    className="flex flex-col items-center gap-[clamp(0.5rem,1.5vw,1rem)] w-full focus:outline-none"
                  >
                    <div
                      className={`aspect-square w-full rounded-[clamp(1rem,3vw,1.5rem)] border bg-(--h-card) transition-all duration-300 ${
                        on
                          ? 'scale-105 sm:scale-110 border-(--h-pink) shadow-[0_0_45px_var(--h-glow)]'
                          : 'border-(--h-card-border)'
                      }`}
                    />
                    <span
                      className={`text-[clamp(1rem,2vw,1.5rem)] font-bold leading-tight transition-all duration-300 ${
                        on ? 'scale-105 sm:scale-110 text-(--h-pink) [text-shadow:0_0_14px_var(--h-glow)]' : ''
                      }`}
                    >
                      {f.name}
                    </span>
                  </button>
                </Reveal>
              )
            })}
          </div>
        </section>

        {/* 4. Footer */}
        <section className="flex flex-col items-center px-[5vw] pt-[clamp(3rem,8vw,5rem)] pb-[clamp(1.5rem,4vw,2.5rem)] text-center">
          <Reveal className="flex flex-col items-center">
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
