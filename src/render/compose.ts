import type { MonoBitmap } from '../ble/types'
import type { Block } from './blocks'
import { makeCanvas } from './canvas'
import { renderBarcode, renderQr, renderSeparator } from './codes'
import { dither, toGray } from './dither'
import { renderImage } from './image'
import { renderText } from './text'

async function renderBlock(b: Block, width: number): Promise<HTMLCanvasElement | null> {
  switch (b.kind) {
    case 'text':
      return renderText(b, width)
    case 'image':
      return renderImage(b, width)
    case 'qr':
      return renderQr(b, width)
    case 'barcode':
      return renderBarcode(b, width)
    case 'separator':
      return renderSeparator(b, width)
    case 'space':
      return makeCanvas(width, b.height)[0]
  }
}

/** Dibuja todos los bloques uno debajo de otro en un lienzo del ancho del papel. */
export async function compose(blocks: Block[], width: number): Promise<HTMLCanvasElement> {
  const parts = (await Promise.all(blocks.map((b) => renderBlock(b, width).catch(() => null)))).filter(
    (c): c is HTMLCanvasElement => c !== null,
  )
  const [out, ctx] = makeCanvas(width, Math.max(1, parts.reduce((h, c) => h + c.height, 0)))
  let y = 0
  for (const p of parts) {
    ctx.drawImage(p, 0, y)
    y += p.height
  }
  return out
}

/** Convierte el lienzo en puntos: las imágenes ya vienen tramadas, el texto se binariza con umbral. */
export function canvasToMono(canvas: HTMLCanvasElement, threshold = 128): MonoBitmap {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const gray = toGray(data, canvas.width, canvas.height)
  return { width: canvas.width, height: canvas.height, pixels: dither(gray, canvas.width, canvas.height, 'threshold', threshold) }
}

export function monoToCanvas(bmp: MonoBitmap, canvas: HTMLCanvasElement) {
  canvas.width = bmp.width
  canvas.height = bmp.height
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(bmp.width, bmp.height)
  for (let i = 0; i < bmp.pixels.length; i++) {
    const v = bmp.pixels[i] ? 0 : 255
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v
    img.data[i * 4 + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
}
