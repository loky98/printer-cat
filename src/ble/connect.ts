import type { ProfileId } from './types'

const uuid16 = (short: string) => `0000${short}-0000-1000-8000-00805f9b34fb`

/**
 * Web Bluetooth solo deja leer los servicios declarados al pedir el dispositivo,
 * así que listamos todos los que usan las impresoras térmicas BLE conocidas.
 */
export const OPTIONAL_SERVICES: BluetoothServiceUUID[] = [
  uuid16('ae30'), // cat printers (GB0x, MX0x, YT01, MXW01…)
  uuid16('ae3a'),
  uuid16('ae00'),
  uuid16('18f0'), // impresoras ESC/POS BLE genéricas
  uuid16('ff00'),
  uuid16('ffe0'),
  uuid16('fee7'),
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC "transparent UART"
  uuid16('180a'), // información del dispositivo
  uuid16('180f'), // batería
]

export interface CharInfo {
  uuid: string
  props: string[]
  char: BluetoothRemoteGATTCharacteristic
}

export interface ServiceInfo {
  uuid: string
  chars: CharInfo[]
}

export const shortUuid = (u: string) => (/^0000([0-9a-f]{4})-0000-1000-8000-00805f9b34fb$/i.exec(u)?.[1] ?? u).toLowerCase()

function propsOf(p: BluetoothCharacteristicProperties): string[] {
  const out: string[] = []
  if (p.read) out.push('read')
  if (p.write) out.push('write')
  if (p.writeWithoutResponse) out.push('writeNoResp')
  if (p.notify) out.push('notify')
  if (p.indicate) out.push('indicate')
  return out
}

export async function discover(server: BluetoothRemoteGATTServer): Promise<ServiceInfo[]> {
  const services = await server.getPrimaryServices()
  const out: ServiceInfo[] = []
  for (const s of services) {
    const chars = await s.getCharacteristics().catch(() => [] as BluetoothRemoteGATTCharacteristic[])
    out.push({ uuid: s.uuid, chars: chars.map((c) => ({ uuid: c.uuid, props: propsOf(c.properties), char: c })) })
  }
  return out
}

export interface Detection {
  profile: ProfileId
  tx: BluetoothRemoteGATTCharacteristic
  notifiers: BluetoothRemoteGATTCharacteristic[]
  dataTx: BluetoothRemoteGATTCharacteristic | null
  reason: string
}

export const writable = (c: CharInfo) => c.props.includes('write') || c.props.includes('writeNoResp')
const notifiable = (c: CharInfo) => c.props.includes('notify') || c.props.includes('indicate')

/** Elige protocolo y características según el nombre del equipo y los servicios encontrados. */
export function detect(name: string, services: ServiceInfo[]): Detection | null {
  const notifiers = services.flatMap((s) => s.chars.filter(notifiable).map((c) => c.char))
  // La SC03h expone ae3a (con ae3b, que no responde) antes que ae30: se prefiere el servicio que tenga ae01.
  const catServices = services.filter((s) => ['ae30', 'ae3a', 'ae00'].includes(shortUuid(s.uuid)))
  const cat = catServices.find((s) => s.chars.some((c) => shortUuid(c.uuid) === 'ae01')) ?? catServices[0]
  if (cat) {
    const find = (id: string) => cat.chars.find((c) => shortUuid(c.uuid) === id)
    const tx = find('ae01') ?? cat.chars.find(writable)
    if (tx) {
      const profile: ProfileId = /^MXW/i.test(name) ? 'mxw01' : /^SC03/i.test(name) ? 'sc03h' : 'classic'
      const why = { mxw01: ' y nombre MXW*', sc03h: ' y nombre SC03*', classic: ' → protocolo clásico 0x51 0x78', escpos: '' }
      return {
        profile,
        tx: tx.char,
        notifiers,
        dataTx: find('ae03')?.char ?? null,
        reason: `Servicio ${shortUuid(cat.uuid)} encontrado${why[profile]}`,
      }
    }
  }
  for (const s of services) {
    if (['180a', '180f'].includes(shortUuid(s.uuid))) continue
    const tx = s.chars.find(writable)
    if (tx) {
      return {
        profile: 'escpos',
        tx: tx.char,
        notifiers,
        dataTx: null,
        reason: `Sin servicio de cat printer; se usa ESC/POS sobre ${shortUuid(s.uuid)}/${shortUuid(tx.uuid)}`,
      }
    }
  }
  return null
}
