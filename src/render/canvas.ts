import type { Align } from './blocks'

export function makeCanvas(w: number, h: number, bg = '#fff'): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, c.width, c.height)
  return [c, ctx]
}

/** Coloca `src` dentro de una franja del ancho del papel según la alineación. */
export function placeOnRow(src: HTMLCanvasElement, width: number, align: Align): HTMLCanvasElement {
  if (src.width > width) {
    const scale = width / src.width
    const [c, ctx] = makeCanvas(width, src.height * scale)
    ctx.drawImage(src, 0, 0, c.width, c.height)
    return c
  }
  const [c, ctx] = makeCanvas(width, src.height)
  const x = align === 'left' ? 0 : align === 'right' ? width - src.width : Math.round((width - src.width) / 2)
  ctx.drawImage(src, x, 0)
  return c
}
