import type { ImageBlock } from './blocks'
import { makeCanvas, placeOnRow } from './canvas'
import { dither, toGray } from './dither'

const cache = new Map<string, Promise<HTMLImageElement>>()

export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = cache.get(src)
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('No se pudo cargar la imagen'))
      img.src = src
    })
    cache.set(src, p)
  }
  return p
}

/** Lee un archivo como data URL reducido a un tamaño razonable para guardarlo localmente. */
export async function fileToDataUrl(file: Blob, maxSide = 1200): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const [c, ctx] = makeCanvas(img.naturalWidth * scale, img.naturalHeight * scale)
    ctx.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/png')
  } finally {
    cache.delete(url)
    URL.revokeObjectURL(url)
  }
}

/** Escala, rota, ajusta tono y aplica tramado para que la imagen quede en blanco y negro puro. */
export async function renderImage(b: ImageBlock, width: number): Promise<HTMLCanvasElement | null> {
  if (!b.src) return null
  const img = await loadImage(b.src)
  const sideways = b.rotate === 90 || b.rotate === 270
  const srcW = sideways ? img.naturalHeight : img.naturalWidth
  const srcH = sideways ? img.naturalWidth : img.naturalHeight
  const w = Math.max(8, Math.round((width * b.widthPct) / 100))
  const h = Math.max(1, Math.round((srcH * w) / srcW))
  const [c, ctx] = makeCanvas(w, h)
  ctx.imageSmoothingQuality = 'high'
  ctx.translate(w / 2, h / 2)
  ctx.rotate((b.rotate * Math.PI) / 180)
  const dw = sideways ? h : w
  const dh = sideways ? w : h
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh)
  ctx.setTransform(1, 0, 0, 1, 0, 0)

  const data = ctx.getImageData(0, 0, w, h)
  const gray = toGray(data.data, w, h, { brightness: b.brightness, contrast: b.contrast, gamma: b.gamma })
  if (b.invert) for (let i = 0; i < gray.length; i++) gray[i] = 255 - gray[i]
  const bits = dither(gray, w, h, b.dither, b.threshold)
  for (let i = 0; i < bits.length; i++) {
    const v = bits[i] ? 0 : 255
    data.data[i * 4] = data.data[i * 4 + 1] = data.data[i * 4 + 2] = v
    data.data[i * 4 + 3] = 255
  }
  ctx.putImageData(data, 0, 0)
  return placeOnRow(c, width, b.align)
}
