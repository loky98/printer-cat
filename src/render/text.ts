import type { TextBlock } from './blocks'
import { makeCanvas } from './canvas'
import { wrapText } from './wrap'

const GENERIC = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui'])

export function cssFont(b: Pick<TextBlock, 'font' | 'size' | 'bold' | 'italic'>): string {
  const family = GENERIC.has(b.font) ? b.font : `"${b.font}", sans-serif`
  return `${b.italic ? 'italic ' : ''}${b.bold ? 'bold ' : ''}${b.size}px ${family}`
}

const PAD = 4

/** Las impresoras no traen fuentes: el texto se dibuja en un canvas y luego se convierte en puntos. */
export async function renderText(b: TextBlock, width: number): Promise<HTMLCanvasElement> {
  const font = cssFont(b)
  await document.fonts.load(font, b.text || 'A').catch(() => undefined)
  const [, measureCtx] = makeCanvas(1, 1)
  measureCtx.font = font
  const lines = wrapText(b.text, width - PAD * 2, (s) => measureCtx.measureText(s).width)
  const lh = Math.round(b.size * b.lineHeight)
  const [c, ctx] = makeCanvas(width, lines.length * lh + PAD * 2, b.invert ? '#000' : '#fff')
  ctx.fillStyle = b.invert ? '#fff' : '#000'
  ctx.font = font
  ctx.textBaseline = 'middle'
  ctx.textAlign = b.align
  const x = b.align === 'left' ? PAD : b.align === 'right' ? width - PAD : width / 2
  lines.forEach((line, i) => ctx.fillText(line, x, PAD + i * lh + lh / 2))
  return c
}
