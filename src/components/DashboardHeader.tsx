import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { COUNTRIES } from '../utils/countries'
import { formatInTimezone } from '../utils/timezone'

interface MemberInfo {
  name: string
  country: string | null
  timezone: string
  weather: string | null
  temp: number | null
}

function weatherCodeToText(code: number) {
  if (code === 0) return 'Clear'
  if ([1, 2, 3].includes(code)) return 'Partly cloudy'
  if ([45, 48].includes(code)) return 'Foggy'
  if ([51, 53, 55, 61, 63, 65].includes(code)) return 'Rainy'
  if ([71, 73, 75].includes(code)) return 'Snowy'
  if ([95, 96, 99].includes(code)) return 'Stormy'
  return 'Clear'
}

function DashboardHeader() {
  const [members, setMembers] = useState<MemberInfo[]>([])
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const loadMembers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('name, country, timezone, share_location')

      if (!data) return

      const visible = data.filter((p) => p.share_location !== false && p.country)

      const withWeather = await Promise.all(
        visible.map(async (p) => {
          const countryInfo = COUNTRIES.find((c) => c.name === p.country)
          let weather: string | null = null
          let temp: number | null = null

          if (countryInfo) {
            try {
              const res = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${countryInfo.lat}&longitude=${countryInfo.lon}&current_weather=true`
              )
              const json = await res.json()
              temp = json?.current_weather?.temperature ?? null
              weather = weatherCodeToText(json?.current_weather?.weathercode)
            } catch {}
          }

          return {
            name: p.name || 'Someone',
            country: p.country,
            timezone: p.timezone || 'UTC',
            weather,
            temp,
          }
        })
      )

      setMembers(withWeather)
    }

    loadMembers()
  }, [now])

  if (members.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {members.map((m, i) => {
        const { time } = formatInTimezone(now, m.timezone)
        return (
          <div
            key={i}
            className="glass-soft !rounded-full px-3.5 py-1.5 text-xs flex items-center gap-1.5"
          >
            <span className="font-semibold">{m.country}</span>
            <span className="t-muted">·</span>
            <span>{time}</span>
            {m.weather && (
              <>
                <span className="t-muted">·</span>
                <span>{m.weather}{m.temp !== null ? ` ${Math.round(m.temp)}°C` : ''}</span>
              </>
            )}
            <span className="t-muted">({m.name})</span>
          </div>
        )
      })}
    </div>
  )
}

export default DashboardHeader
