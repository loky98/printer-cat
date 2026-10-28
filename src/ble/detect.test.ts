import { describe, expect, it } from 'vitest'
import { detect, type ServiceInfo } from './connect'
import { describeReply } from './decode'
import { parseHex } from '../util/hex'

const svc = (short: string, chars: [string, string[]][]): ServiceInfo => ({
  uuid: `0000${short}-0000-1000-8000-00805f9b34fb`,
  chars: chars.map(([c, props]) => {
    const uuid = `0000${c}-0000-1000-8000-00805f9b34fb`
    return { uuid, props, char: { uuid } as BluetoothRemoteGATTCharacteristic }
  }),
})

// Servicios reales reportados por una SC03h-ECDB (ae3a aparece antes que ae30).
const SC03H = [
  svc('ae3a', [
    ['ae3b', ['writeNoResp']],
    ['ae3c', ['notify']],
  ]),
  svc('ae30', [
    ['ae01', ['writeNoResp']],
    ['ae02', ['notify']],
    ['ae03', ['writeNoResp']],
    ['ae04', ['notify']],
    ['ae05', ['indicate']],
    ['ae10', ['read', 'write']],
  ]),
]

describe('detect', () => {
  it('en la SC03h escribe por ae01 aunque ae3a aparezca primero', () => {
    const det = detect('SC03h-ECDB', SC03H)!
    expect(det.profile).toBe('sc03h')
    expect(det.tx.uuid).toContain('ae01')
    expect(det.notifiers).toHaveLength(4)
  })
})

describe('describeReply', () => {
  it('interpreta las respuestas reales de la SC03h', () => {
    expect(describeReply(parseHex('51 78 a3 01 03 00 00 12 28 a5 ff'))).toBe('estado: lista, sin errores')
    expect(describeReply(parseHex('51 78 a8 01 0a 00 81 00 03 33 2e 30 2e 34 35 00 e9 ff'))).toBe('firmware 3.0.45')
  })
})
