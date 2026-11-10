import type { CSSProperties } from 'react'

export type FeatureKind =
  | 'dashboard' | 'tasks' | 'journal' | 'goals' | 'calendar' | 'shared' | 'location' | 'music'

const v = (vars: Record<string, string | number>) => vars as CSSProperties

function Visual({ kind }: { kind: FeatureKind }) {
  switch (kind) {
    case 'dashboard':
      return (
        <div className="fx-dash">
          {[60, 88, 45, 72].map((h, i) => (
            <i key={i} style={v({ '--h': `${h}%`, '--i': i })} />
          ))}
          <b />
        </div>
      )
    case 'tasks':
      return (
        <div className="fx-tasks">
          {['-1.4s', '0.6s', '1.8s'].map((d, i) => (
            <div key={i}>
              <span style={v({ '--d': d })} />
              <em style={v({ '--d': d })} />
            </div>
          ))}
        </div>
      )
    case 'journal':
      return (
        <div className="fx-journal">
          {[92, 70, 84, 48].map((w, i) => (
            <i key={i} style={v({ '--w': `${w}%`, '--d': `${i * 0.5}s` })} />
          ))}
        </div>
      )
    case 'goals':
      return (
        <div className="fx-goal">
          <span className="flag">🎯</span>
          <div className="track"><div className="fill" /></div>
        </div>
      )
    case 'calendar':
      return (
        <div className="fx-cal">
          {Array.from({ length: 28 }).map((_, i) => (
            <i key={i} style={v({ '--i': i })} />
          ))}
        </div>
      )
    case 'shared':
      return (
        <div className="fx-share">
          <span className="av" />
          <span className="together-link" style={v({ '--link-icon': '"♥"' })} />
          <span className="av" />
        </div>
      )
    case 'location':
      return (
        <div className="fx-loc">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            <line x1="26" y1="68" x2="74" y2="30" />
          </svg>
          <div className="loc-pulse" style={{ left: '26%', top: '68%' }}>
            <span className="loc-ring" /><span className="loc-ring loc-ring2" /><span className="loc-dot" />
          </div>
          <div className="loc-pulse" style={{ left: '74%', top: '30%' }}>
            <span className="loc-ring" /><span className="loc-ring loc-ring2" /><span className="loc-dot" />
          </div>
        </div>
      )
    case 'music':
      return (
        <div className="fx-music">
          <div className="disc" />
          <div className="bars">
            {[100, 60, 85, 45, 75].map((h, i) => (
              <i key={i} style={v({ '--h': `${h}%`, '--i': i })} />
            ))}
          </div>
        </div>
      )
  }
}

export default function FeatureVisual({ kind, on }: { kind: FeatureKind; on: boolean }) {
  return (
    <div className={`fx ${on ? 'fx-on' : ''}`}>
      <div className="fx-box">
        <Visual kind={kind} />
      </div>
    </div>
  )
}
