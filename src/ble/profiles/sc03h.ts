import { sleep } from '../link'
import type { MonoBitmap, PrintOptions } from '../types'
import { packRow } from '../../render/pack'
import { attachFlowControl, classicPacket, CMD, le16 } from './classic'
import type { PrinterProfile } from '.'

// iPrint SC03h: mismo marco 51 78 … CRC8 FF que la clásica, con estas diferencias (según
// mini-print-studio, taskprinter y rbaron/catprinter#90, probados en hardware):
// - NO acepta el comando 0xA6 (lattice): la impresora se cuelga y deja de responder.
// - Energía en little-endian, modo imagen 0xBE 00, velocidad 10 reenviada cada 200 filas.
// - Avance de papel con 0xA1 en pasos de máximo 100 puntos.
// - Envío en ráfagas de ~4 KB con pausa de 600 ms, y mantener la conexión ~3 s al final.
const SPEED = 10
const SPEED_EVERY = 200
const MAX_FEED_STEP = 100
const BURST_BYTES = 4096
const BURST_PAUSE_MS = 600

export function sc03hFeed(lines: number): Uint8Array[] {
  const out: Uint8Array[] = []
  for (let left = Math.max(0, Math.round(lines)); left > 0; left -= MAX_FEED_STEP) {
    out.push(classicPacket(CMD.feed, le16(Math.min(MAX_FEED_STEP, left))))
  }
  return out
}

export function buildSc03hJob(bmp: MonoBitmap, opts: PrintOptions): Uint8Array[] {
  const energy = Math.round((Math.min(100, Math.max(0, opts.energy)) / 100) * 0xffff)
  const packets = [
    classicPacket(CMD.getState, [0x00]),
    classicPacket(CMD.quality, [0x33]),
    classicPacket(CMD.energy, le16(energy)),
    classicPacket(CMD.applyEnergy, [0x00]),
    classicPacket(CMD.speed, [SPEED]),
    classicPacket(CMD.updateDevice, [0x00]),
  ]
  for (let y = 0; y < bmp.height; y++) {
    if (y > 0 && y % SPEED_EVERY === 0) packets.push(classicPacket(CMD.speed, [SPEED]))
    packets.push(classicPacket(CMD.bitmapRow, packRow(bmp, y, opts.bitOrder)))
  }
  packets.push(...sc03hFeed(opts.feedLines), classicPacket(CMD.getState, [0x00]))
  return packets
}

/** Agrupa paquetes completos en ráfagas de hasta `max` bytes. */
export function bursts(packets: Uint8Array[], max = BURST_BYTES): Uint8Array[][] {
  const out: Uint8Array[][] = [[]]
  let size = 0
  for (const p of packets) {
    if (size > 0 && size + p.length > max) {
      out.push([])
      size = 0
    }
    out[out.length - 1].push(p)
    size += p.length
  }
  return out
}

export const sc03hProfile: PrinterProfile = {
  id: 'sc03h',
  name: 'iPrint SC03h (0x51 0x78 sin lattice)',
  async print(link, bmp, opts, onProgress) {
    const off = attachFlowControl(link)
    try {
      const groups = bursts(buildSc03hJob(bmp, opts))
      for (let i = 0; i < groups.length; i++) {
        await link.send(groups[i], { onProgress: (p) => onProgress?.((i + p) / groups.length) })
        if (i < groups.length - 1) await sleep(BURST_PAUSE_MS)
      }
      // La SC03h no avisa al terminar: esperamos la respuesta al último pedido de estado o 3 s.
      await link.waitFor(() => true, 3000)
    } finally {
      off()
    }
  },
  async feed(link, lines) {
    await link.send(sc03hFeed(lines))
  },
  async requestStatus(link) {
    await link.send([classicPacket(CMD.getState, [0x00])])
  },
}
