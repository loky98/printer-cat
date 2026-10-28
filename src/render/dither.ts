export type DitherMethod = 'threshold' | 'floyd' | 'atkinson' | 'bayer'

export const DITHER_LABELS: Record<DitherMethod, string> = {
  floyd: 'Floyd–Steinberg (fotos)',
  atkinson: 'Atkinson (alto contraste)',
  bayer: 'Bayer / ordenado (tramado)',
  threshold: 'Umbral (logos y texto)',
}

export interface ToneAdjust {
  /** -100 a 100 */
  brightness: number
  /** -100 a 100 */
  contrast: number
  /** 0.2 a 3; mayor que 1 aclara los medios tonos */
  gamma: number
}

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v)

/** RGBA → gris (0 = negro, 255 = blanco), compuesto sobre fondo blanco y con ajustes de tono. */
export function toGray(rgba: ArrayLike<number>, w: number, h: number, adj?: ToneAdjust): Float32Array {
  const out = new Float32Array(w * h)
  const c = (adj?.contrast ?? 0) * 2.55
  const factor = (259 * (c + 255)) / (255 * (259 - c))
  const b = (adj?.brightness ?? 0) * 2.55
  const invGamma = 1 / (adj?.gamma ?? 1)
  for (let i = 0; i < w * h; i++) {
    const a = rgba[i * 4 + 3] / 255
    let v = (0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]) * a + 255 * (1 - a)
    if (adj) {
      v = clamp(factor * (v + b - 128) + 128)
      if (invGamma !== 1) v = 255 * Math.pow(v / 255, invGamma)
    }
    out[i] = v
  }
  return out
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

/** Devuelve 1 por punto negro. `gray` se modifica en los métodos de difusión de error. */
export function dither(gray: Float32Array, w: number, h: number, method: DitherMethod, threshold = 128): Uint8Array {
  const out = new Uint8Array(w * h)
  if (method === 'threshold') {
    for (let i = 0; i < out.length; i++) out[i] = gray[i] < threshold ? 1 : 0
    return out
  }
  if (method === 'bayer') {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const t = ((BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16) * 255
        out[y * w + x] = gray[y * w + x] < t ? 1 : 0
      }
    return out
  }
  const spread = (x: number, y: number, err: number) => {
    if (x >= 0 && x < w && y < h) gray[y * w + x] += err
  }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const old = gray[i]
      const black = old < threshold
      out[i] = black ? 1 : 0
      const err = old - (black ? 0 : 255)
      if (method === 'floyd') {
        spread(x + 1, y, (err * 7) / 16)
        spread(x - 1, y + 1, (err * 3) / 16)
        spread(x, y + 1, (err * 5) / 16)
        spread(x + 1, y + 1, err / 16)
      } else {
        const e = err / 8
        spread(x + 1, y, e)
        spread(x + 2, y, e)
        spread(x - 1, y + 1, e)
        spread(x, y + 1, e)
        spread(x + 1, y + 1, e)
        spread(x, y + 2, e)
      }
    }
  return out
}
