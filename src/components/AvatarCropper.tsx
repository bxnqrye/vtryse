import { useRef, useState } from 'react'
import Modal from './Modal'
import { onEnter } from '../utils/keys'

const VIEW = 280 // on-screen circle size (px)
const OUT = 512 // saved image size (px)

interface Props {
  src: string
  onCancel: () => void
  onSave: (blob: Blob) => void
}

// Mount with key={src} so state resets for each new photo.
function AvatarCropper({ src, onCancel, onSave }: Props) {
  const imgRef = useRef<HTMLImageElement>(null)
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const [nat, setNat] = useState({ w: 0, h: 0 })
  const [zoom, setZoom] = useState(1)
  const [off, setOff] = useState({ x: 0, y: 0 })

  const scale = nat.w ? (VIEW / Math.min(nat.w, nat.h)) * zoom : 1
  const w = nat.w * scale
  const h = nat.h * scale
  const maxX = Math.max(0, (w - VIEW) / 2)
  const maxY = Math.max(0, (h - VIEW) / 2)
  const clamp = (v: number, max: number) => Math.min(Math.max(v, -max), max)
  const o = { x: clamp(off.x, maxX), y: clamp(off.y, maxY) }

  const save = () => {
    const img = imgRef.current
    if (!img || !nat.w) return
    const canvas = document.createElement('canvas')
    canvas.width = OUT
    canvas.height = OUT
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const r = OUT / VIEW
    ctx.drawImage(img, (VIEW / 2 - w / 2 + o.x) * r, (VIEW / 2 - h / 2 + o.y) * r, w * r, h * r)
    canvas.toBlob((b) => b && onSave(b), 'image/jpeg', 0.9)
  }

  return (
    <Modal open onClose={onCancel}>
      <div className="flex flex-col items-center gap-4" onKeyDown={onEnter(save)}>
        <div className="text-center">
          <p className="text-lg font-semibold">Adjust your photo</p>
          <p className="text-xs opacity-70">Drag to move · slider to zoom</p>
        </div>

        <div
          className="relative overflow-hidden rounded-full border-2 border-(--h-pink) shadow-[0_0_30px_var(--h-glow)] cursor-grab active:cursor-grabbing select-none bg-black/20"
          style={{ width: VIEW, height: VIEW, touchAction: 'none' }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            drag.current = { x: e.clientX, y: e.clientY, ox: o.x, oy: o.y }
          }}
          onPointerMove={(e) => {
            const d = drag.current
            if (!d) return
            setOff({ x: d.ox + e.clientX - d.x, y: d.oy + e.clientY - d.y })
          }}
          onPointerUp={() => {
            drag.current = null
          }}
        >
          <img
            ref={imgRef}
            src={src}
            alt=""
            draggable={false}
            onLoad={(e) =>
              setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
            }
            style={{
              position: 'absolute',
              maxWidth: 'none',
              pointerEvents: 'none',
              left: VIEW / 2 - w / 2 + o.x,
              top: VIEW / 2 - h / 2 + o.y,
              width: nat.w ? w : undefined,
              height: nat.h ? h : undefined,
            }}
          />
        </div>

        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full accent-(--h-pink)"
        />

        <div className="flex gap-2 self-end">
          <button onClick={onCancel} className="btn btn-ghost btn-sm">
            Cancel
          </button>
          <button onClick={save} className="btn btn-primary btn-sm">
            Save photo
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default AvatarCropper
