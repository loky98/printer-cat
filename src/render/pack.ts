import type { BitOrder, MonoBitmap } from '../ble/types'

/** Convierte una fila de píxeles en bytes de 8 puntos. `lsb`: el bit 0 es el punto más a la izquierda. */
export function packRow(bmp: MonoBitmap, y: number, order: BitOrder): Uint8Array {
  const out = new Uint8Array(Math.ceil(bmp.width / 8))
  const base = y * bmp.width
  for (let x = 0; x < bmp.width; x++) {
    if (!bmp.pixels[base + x]) continue
    const bit = order === 'lsb' ? x & 7 : 7 - (x & 7)
    out[x >> 3] |= 1 << bit
  }
  return out
}

/** Compresión por rachas del comando 0xBF: cada byte = color (bit 7) + longitud (1–127). */
export function rleRow(bmp: MonoBitmap, y: number): Uint8Array {
  const out: number[] = []
  const base = y * bmp.width
  let x = 0
  while (x < bmp.width) {
    const color = bmp.pixels[base + x] ? 1 : 0
    let n = 0
    while (x < bmp.width && (bmp.pixels[base + x] ? 1 : 0) === color && n < 127) {
      n++
      x++
    }
    out.push((color << 7) | n)
  }
  return Uint8Array.from(out)
}

export function blankBitmap(width: number, height: number): MonoBitmap {
  return { width, height, pixels: new Uint8Array(width * height) }
}
