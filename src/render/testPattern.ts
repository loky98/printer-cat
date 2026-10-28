import type { MonoBitmap } from '../ble/types'
import { compose, canvasToMono } from './compose'
import { dither } from './dither'
import { newBlock, type TextBlock } from './blocks'

/** Patrón para validar la conexión: título, franjas de 8 px, ajedrez y degradado tramado. */
export async function testPattern(width: number): Promise<MonoBitmap> {
  const header = await compose(
    [
      { ...(newBlock('text') as TextBlock), text: 'Printer Cat OK', size: 40, bold: true, align: 'center' },
      { ...(newBlock('text') as TextBlock), text: `Ancho ${width} px · ${new Date().toLocaleString()}`, size: 18, align: 'center' },
    ],
    width,
  )
  const top = canvasToMono(header)
  const stripesH = 32
  const checkerH = 32
  const gradH = 48
  const height = top.height + stripesH + checkerH + gradH
  const pixels = new Uint8Array(width * height)
  pixels.set(top.pixels)
  let y0 = top.height
  for (let y = 0; y < stripesH; y++) for (let x = 0; x < width; x++) pixels[(y0 + y) * width + x] = (x >> 3) & 1
  y0 += stripesH
  for (let y = 0; y < checkerH; y++) for (let x = 0; x < width; x++) pixels[(y0 + y) * width + x] = ((x >> 3) + (y >> 3)) & 1
  y0 += checkerH
  const gray = new Float32Array(width * gradH)
  for (let y = 0; y < gradH; y++) for (let x = 0; x < width; x++) gray[y * width + x] = (x / (width - 1)) * 255
  pixels.set(dither(gray, width, gradH, 'floyd'), y0 * width)
  return { width, height, pixels }
}
