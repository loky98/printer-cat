import { useEffect, useRef, useState } from 'react'
import type { MonoBitmap } from '../ble/types'
import type { Block } from '../render/blocks'
import { canvasToMono, compose, monoToCanvas } from '../render/compose'

interface Props {
  blocks: Block[]
  width: number
  fontVersion: number
  onBitmap: (bmp: MonoBitmap) => void
}

/** Muestra exactamente los puntos que se enviarán a la impresora (8 puntos = 1 mm a 203 dpi). */
export function Preview({ blocks, width, fontVersion, onBitmap }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    let cancelled = false
    const t = setTimeout(async () => {
      const canvas = await compose(blocks, width)
      if (cancelled || !ref.current) return
      const bmp = canvasToMono(canvas)
      monoToCanvas(bmp, ref.current)
      setHeight(bmp.height)
      onBitmap(bmp)
    }, 150)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [blocks, width, fontVersion, onBitmap])

  return (
    <div className="preview">
      <div className="paper">
        <canvas ref={ref} />
      </div>
      <p className="muted">
        {width} × {height} puntos · ≈ {(height / 8).toFixed(0)} mm de papel
      </p>
    </div>
  )
}
