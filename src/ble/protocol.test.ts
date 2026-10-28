import { describe, expect, it } from 'vitest'
import { crc8 } from './crc8'
import { buildClassicJob, classicPacket } from './profiles/classic'
import { mxwPacket } from './profiles/mxw01'
import { parseHex, toHex } from '../util/hex'

describe('crc8', () => {
  it('coincide con el vector estándar CRC-8/SMBUS', () => {
    expect(crc8(new TextEncoder().encode('123456789'))).toBe(0xf4)
  })
})

describe('paquetes del protocolo clásico', () => {
  it('arma el pedido de estado', () => {
    expect(toHex(classicPacket(0xa3, [0x00]))).toBe('51 78 a3 00 01 00 00 00 ff')
  })
  it('arma el comando de calidad conocido', () => {
    expect(toHex(classicPacket(0xa4, [0x33]))).toBe('51 78 a4 00 01 00 33 99 ff')
  })
  it('incluye una fila por cada línea de la imagen', () => {
    const bmp = { width: 384, height: 5, pixels: new Uint8Array(384 * 5) }
    const job = buildClassicJob(bmp, { energy: 50, speed: 32, feedLines: 10, bitOrder: 'lsb', compress: false })
    const rows = job.filter((p) => p[2] === 0xa2)
    expect(rows).toHaveLength(5)
    expect(rows[0]).toHaveLength(48 + 8)
  })
  it('usa la fila comprimida cuando es más corta', () => {
    const bmp = { width: 384, height: 1, pixels: new Uint8Array(384) }
    const job = buildClassicJob(bmp, { energy: 50, speed: 32, feedLines: 10, bitOrder: 'lsb', compress: true })
    expect(job.some((p) => p[2] === 0xbf)).toBe(true)
  })
})

describe('MXW01', () => {
  it('usa el prefijo 22 21', () => {
    expect(toHex(mxwPacket(0xa1, [0x00]))).toBe('22 21 a1 00 01 00 00 00 ff')
  })
})

describe('hex', () => {
  it('acepta varios formatos', () => {
    expect(Array.from(parseHex('0x51, 0x78 a3'))).toEqual([0x51, 0x78, 0xa3])
    expect(() => parseHex('zz')).toThrow()
  })
})
