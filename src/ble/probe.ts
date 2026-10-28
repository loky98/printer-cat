import { shortUuid, writable, type ServiceInfo } from './connect'
import type { BleLink } from './link'
import { classicPacket, CMD, le16 } from './profiles/classic'
import { toHex } from '../util/hex'

export interface ProbeStep {
  label: string
  packet: Uint8Array
  /** Lo que el usuario debe mirar en la impresora durante este paso. */
  observe?: string
}

// Ningún paso usa 0xA6: cuelga a la SC03h.
export const PROBE_STEPS: ProbeStep[] = [
  { label: 'Estado (A3)', packet: classicPacket(CMD.getState, [0x00]) },
  { label: 'Información del equipo (A8)', packet: classicPacket(CMD.getInfo, [0x00]) },
  { label: 'Batería (BA)', packet: classicPacket(0xba, [0x00]) },
  { label: 'Avanzar 50 puntos (A1)', packet: classicPacket(CMD.feed, le16(50)), observe: 'el papel debe avanzar ~6 mm' },
]

const REPLY_MS = 1500

async function ask(link: BleLink, char: BluetoothRemoteGATTCharacteristic, packet: Uint8Array): Promise<string> {
  const replies: string[] = []
  const off = link.onNotify((d, uuid) => replies.push(`${shortUuid(uuid)}: ${toHex(d)}`))
  try {
    await link.writeRaw(packet, char)
  } catch (e) {
    off()
    return `error al escribir (${(e as Error).message})`
  }
  await new Promise((r) => setTimeout(r, REPLY_MS))
  off()
  return replies.length ? replies.join(' | ') : 'sin respuesta'
}

/**
 * 1) Envía "estado" a cada característica escribible para ver cuál contesta.
 * 2) Con la que contestó (o la detectada) recorre los pasos y anota cada respuesta.
 */
export async function runProbe(link: BleLink, services: ServiceInfo[], log: (msg: string) => void): Promise<string[]> {
  const report: string[] = []
  const add = (line: string) => {
    report.push(line)
    log(line)
  }
  const candidates = services
    .filter((s) => !['180a', '180f'].includes(shortUuid(s.uuid)))
    .flatMap((s) => s.chars.filter(writable).map((c) => ({ service: s.uuid, ...c })))
    .sort((a, b) => (a.char === link.tx ? -1 : b.char === link.tx ? 1 : 0))

  add(`Notificaciones activas en: ${link.notifiers.map((c) => shortUuid(c.uuid)).join(', ') || 'ninguna'}`)
  add('— Paso 1: ¿qué característica responde al pedido de estado?')
  let answering: BluetoothRemoteGATTCharacteristic | null = null
  for (const c of candidates) {
    const res = await ask(link, c.char, PROBE_STEPS[0].packet)
    add(`  ${shortUuid(c.service)}/${shortUuid(c.uuid)} [${c.props.join(',')}] → ${res}`)
    if (!answering && !res.startsWith('sin') && !res.startsWith('error')) answering = c.char
  }

  if (answering && answering !== link.tx) {
    add(`  ⚠ Se usaba ${shortUuid(link.tx.uuid)} pero responde ${shortUuid(answering.uuid)}: desde ahora se imprime por ${shortUuid(answering.uuid)}`)
    link.tx = answering
  }
  const target = link.tx
  add(`— Paso 2: comandos por ${shortUuid(target.uuid)}${answering ? '' : ' (ninguna respondió; se usa la detectada)'}`)
  for (const step of PROBE_STEPS) {
    const res = await ask(link, target, step.packet)
    add(`  ${step.label} ⇢ ${toHex(step.packet)} → ${res}${step.observe ? ` · Observa: ${step.observe}` : ''}`)
  }
  return report
}
