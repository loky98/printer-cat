import { describe, expect, it } from 'vitest'
import { dither, toGray } from './dither'
import { packRow, rleRow } from './pack'
import { wrapText } from './wrap'

const bmpFrom = (row: number[]) => ({ width: row.length, height: 1, pixels: Uint8Array.from(row) })

describe('packRow', () => {
  const row = [1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0]
  it('LSB: el primer punto es el bit 0', () => {
    expect(Array.from(packRow(bmpFrom(row), 0, 'lsb'))).toEqual([0x81, 0x03])
  })
  it('MSB: el primer punto es el bit 7', () => {
    expect(Array.from(packRow(bmpFrom(row), 0, 'msb'))).toEqual([0x81, 0xc0])
  })
})

describe('rleRow', () => {
  it('codifica rachas de color', () => {
    expect(Array.from(rleRow(bmpFrom([1, 1, 1, 0, 0]), 0))).toEqual([0x83, 0x02])
  })
  it('parte rachas mayores a 127', () => {
    expect(Array.from(rleRow(bmpFrom(new Array(200).fill(0)), 0))).toEqual([127, 73])
  })
})

describe('dither', () => {
  it('umbral separa negro y blanco', () => {
    expect(Array.from(dither(Float32Array.from([0, 100, 200, 255]), 4, 1, 'threshold'))).toEqual([1, 1, 0, 0])
  })
  it('Floyd–Steinberg conserva el tono medio (≈50 % negro)', () => {
    const w = 64
    const bits = dither(new Float32Array(w * w).fill(127.5), w, w, 'floyd')
    const ratio = bits.reduce((n, b) => n + b, 0) / bits.length
    expect(ratio).toBeGreaterThan(0.45)
    expect(ratio).toBeLessThan(0.55)
  })
  it('toGray compone la transparencia sobre blanco', () => {
    expect(Array.from(toGray([0, 0, 0, 0, 0, 0, 0, 255], 2, 1))).toEqual([255, 0])
  })
})

describe('wrapText', () => {
  const measure = (s: string) => s.length * 10
  it('respeta el ancho y los saltos de línea', () => {
    expect(wrapText('hola mundo feliz\nadiós', 100, measure)).toEqual(['hola mundo', 'feliz', 'adiós'])
  })
  it('corta palabras más largas que la línea', () => {
    expect(wrapText('abcdefghijkl', 50, measure)).toEqual(['abcde', 'fghij', 'kl'])
  })
})
