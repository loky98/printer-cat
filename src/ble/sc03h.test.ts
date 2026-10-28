import { describe, expect, it } from 'vitest'
import { crc8 } from './crc8'
import { bursts, buildSc03hJob, sc03hFeed } from './profiles/sc03h'
import { toHex } from '../util/hex'

const opts = { energy: 27, speed: 32, feedLines: 250, bitOrder: 'lsb' as const, compress: false }

describe('SC03h', () => {
  it('coincide con los vectores CRC documentados', () => {
    expect(crc8([0x70, 0x44])).toBe(0x79)
    expect(crc8([0x23])).toBe(0xe9)
  })
  it('nunca envía 0xA6, que cuelga la impresora', () => {
    const job = buildSc03hJob({ width: 384, height: 450, pixels: new Uint8Array(384 * 450) }, opts)
    expect(job.some((p) => p[2] === 0xa6)).toBe(false)
  })
  it('reenvía la velocidad cada 200 filas', () => {
    const job = buildSc03hJob({ width: 384, height: 450, pixels: new Uint8Array(384 * 450) }, opts)
    expect(job.filter((p) => p[2] === 0xbd)).toHaveLength(3)
    expect(job.filter((p) => p[2] === 0xa2)).toHaveLength(450)
  })
  it('manda la energía en little-endian', () => {
    const job = buildSc03hJob({ width: 384, height: 1, pixels: new Uint8Array(384) }, { ...opts, energy: 100 })
    expect(toHex(job.find((p) => p[2] === 0xaf)!)).toBe(`51 78 af 00 02 00 ff ff ${crc8([0xff, 0xff]).toString(16)} ff`)
  })
  it('parte el avance de papel en pasos de 100', () => {
    expect(sc03hFeed(250).map((p) => p[6] | (p[7] << 8))).toEqual([100, 100, 50])
  })
  it('agrupa en ráfagas sin partir paquetes', () => {
    const packets = Array.from({ length: 100 }, () => new Uint8Array(56))
    const groups = bursts(packets, 4096)
    expect(groups.every((g) => g.length * 56 <= 4096)).toBe(true)
    expect(groups.flat()).toHaveLength(100)
  })
})
