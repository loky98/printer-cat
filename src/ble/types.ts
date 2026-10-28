/** Imagen de 1 bit: `pixels[y * width + x]` vale 1 para punto negro y 0 para blanco. */
export interface MonoBitmap {
  width: number
  height: number
  pixels: Uint8Array
}

export type BitOrder = 'lsb' | 'msb'

export type ProfileId = 'classic' | 'sc03h' | 'mxw01' | 'escpos'

export interface PrintOptions {
  /** Oscuridad/energía de 0 a 100. */
  energy: number
  /** Velocidad del motor (protocolo clásico). Menor = más lento y más oscuro. */
  speed: number
  /** Líneas de papel en blanco al terminar. */
  feedLines: number
  bitOrder: BitOrder
  /** Usa compresión RLE (comando 0xBF) cuando la fila sea más corta así. */
  compress: boolean
}
