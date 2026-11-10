import type { RepeatConfig } from './RepeatPopover'
import Modal from './Modal'

const WEEKDAYS = [
  { key: 'sun', label: 'S' }, { key: 'mon', label: 'M' }, { key: 'tue', label: 'T' },
  { key: 'wed', label: 'W' }, { key: 'thu', label: 'T' }, { key: 'fri', label: 'F' },
  { key: 'sat', label: 'S' },
]

interface Props {
  open: boolean
  config: RepeatConfig
  onChange: (config: RepeatConfig) => void
  onClose: () => void
}

function RepeatModal({ open, config, onChange, onClose }: Props) {
  const toggleDay = (day: string) => {
    const days = config.days.includes(day)
      ? config.days.filter((d) => d !== day)
      : [...config.days, day]
    onChange({ ...config, days })
  }

  return (
    <Modal open={open} onClose={onClose} z="z-[120]">
      <p className="text-sm font-semibold mb-4">Repeat</p>

      <select
        value={config.type}
        onChange={(e) => onChange({ ...config, type: e.target.value as RepeatConfig['type'] })}
        className="glass-input mb-3"
      >
        <option value="none">Does not repeat</option>
        <option value="daily">Every day</option>
        <option value="weekly">Every week</option>
        <option value="monthly">Every month</option>
        <option value="yearly">Every year</option>
        <option value="custom">Custom...</option>
      </select>

      {config.type === 'custom' && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs t-muted">Every</span>
            <input
              type="number"
              min={1}
              value={config.interval}
              onChange={(e) => onChange({ ...config, interval: Number(e.target.value) })}
              className="glass-input !w-16"
            />
            <select
              value={config.unit}
              onChange={(e) => onChange({ ...config, unit: e.target.value as RepeatConfig['unit'] })}
              className="glass-input flex-1"
            >
              <option value="day">Day(s)</option>
              <option value="week">Week(s)</option>
              <option value="month">Month(s)</option>
              <option value="year">Year(s)</option>
            </select>
          </div>

          {config.unit === 'week' && (
            <div className="mb-3">
              <p className="text-xs t-muted mb-1.5">Repeat on</p>
              <div className="flex gap-1.5">
                {WEEKDAYS.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => toggleDay(d.key)}
                    className={`w-8 h-8 rounded-full text-[11px] font-medium transition-colors border ${
                      config.days.includes(d.key)
                        ? 'bg-(--g-accent) text-white border-white/20'
                        : 'glass-soft t-muted hover:bg-(--g-hover)'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {config.type !== 'none' && (
        <div className="border-t g-divider pt-3 mb-4">
          <p className="text-xs t-muted mb-2">Ends</p>
          <div className="flex flex-col gap-2.5">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="radio"
                checked={config.ends === 'never'}
                onChange={() => onChange({ ...config, ends: 'never' })}
              />
              Never
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="radio"
                checked={config.ends === 'on'}
                onChange={() => onChange({ ...config, ends: 'on' })}
              />
              On
              <input
                type="date"
                value={config.endDate}
                onChange={(e) => onChange({ ...config, ends: 'on', endDate: e.target.value })}
                disabled={config.ends !== 'on'}
                className="glass-input !w-auto !py-1"
              />
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="radio"
                checked={config.ends === 'after'}
                onChange={() => onChange({ ...config, ends: 'after' })}
              />
              After
              <input
                type="number"
                min={1}
                value={config.occurrences}
                onChange={(e) =>
                  onChange({ ...config, ends: 'after', occurrences: Number(e.target.value) })
                }
                disabled={config.ends !== 'after'}
                className="glass-input !w-16 !py-1"
              />
              occurrences
            </label>
          </div>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="btn btn-ghost btn-sm">
          Cancel
        </button>
        <button onClick={onClose} className="btn btn-primary btn-sm">
          Done
        </button>
      </div>
    </Modal>
  )
}

export default RepeatModal
