import { crc8 } from '../crc8'
import type { BleLink } from '../link'
import type { MonoBitmap, PrintOptions } from '../types'
import { packRow, rleRow } from '../../render/pack'
import type { PrinterProfile } from '.'

// Protocolo de las cat printers GB01/GB02/GB03/MX05/MX06/MX10/YT01…
// Paquete: 51 78 CMD 00 LEN_L LEN_H DATA… CRC8(DATA) FF
export const CMD = {
  feed: 0xa1,
  bitmapRow: 0xa2,
  getState: 0xa3,
  quality: 0xa4,
  lattice: 0xa6,
  getInfo: 0xa8,
  updateDevice: 0xa9,
  flowControl: 0xae,
  energy: 0xaf,
  speed: 0xbd,
  applyEnergy: 0xbe,
  compressedRow: 0xbf,
} as const

const LATTICE_START = [0xaa, 0x55, 0x17, 0x38, 0x44, 0x5f, 0x5f, 0x5f, 0x44, 0x38, 0x2c]
const LATTICE_END = [0xaa, 0x55, 0x17, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x17]

export function classicPacket(cmd: number, data: ArrayLike<number> = [0]): Uint8Array {
  const len = data.length
  const out = new Uint8Array(len + 8)
  out.set([0x51, 0x78, cmd, 0x00, len & 0xff, (len >> 8) & 0xff])
  out.set(data, 6)
  out[6 + len] = crc8(out.subarray(6, 6 + len))
  out[7 + len] = 0xff
  return out
}

export const le16 = (n: number) => [n & 0xff, (n >> 8) & 0xff]

/** Construye todos los paquetes de un trabajo de impresión. */
export function buildClassicJob(bmp: MonoBitmap, opts: PrintOptions): Uint8Array[] {
  const energy = Math.round((Math.min(100, Math.max(0, opts.energy)) / 100) * 0xffff)
  const rowBytes = Math.ceil(bmp.width / 8)
  const packets = [
    classicPacket(CMD.getState, [0x00]),
    classicPacket(CMD.quality, [0x33]),
    classicPacket(CMD.speed, [opts.speed]),
    classicPacket(CMD.energy, le16(energy)),
    classicPacket(CMD.applyEnergy, [0x01]),
    classicPacket(CMD.updateDevice, [0x00]),
    classicPacket(CMD.lattice, LATTICE_START),
  ]
  for (let y = 0; y < bmp.height; y++) {
    const rle = opts.compress ? rleRow(bmp, y) : null
    packets.push(
      rle && rle.length < rowBytes
        ? classicPacket(CMD.compressedRow, rle)
        : classicPacket(CMD.bitmapRow, packRow(bmp, y, opts.bitOrder)),
    )
  }
  packets.push(
    classicPacket(CMD.lattice, LATTICE_END),
    classicPacket(CMD.speed, [0x08]),
    classicPacket(CMD.feed, le16(opts.feedLines)),
    classicPacket(CMD.getState, [0x00]),
  )
  return packets
}

/** Notificación 51 78 AE …: data[6] = 0x10 pide pausar, 0x00 reanudar. */
export function attachFlowControl(link: BleLink) {
  return link.onNotify((d) => {
    if (d[0] === 0x51 && d[1] === 0x78 && d[2] === CMD.flowControl) link.paused = d[6] === 0x10
  })
}

export const classicProfile: PrinterProfile = {
  id: 'classic',
  name: 'Cat printer clásica (0x51 0x78)',
  async print(link, bmp, opts, onProgress) {
    const off = attachFlowControl(link)
    try {
      await link.send(buildClassicJob(bmp, opts), { onProgress })
    } finally {
      off()
    }
  },
  async feed(link, lines) {
    await link.send([classicPacket(CMD.feed, le16(lines))])
  },
  async requestStatus(link) {
    await link.send([classicPacket(CMD.getState, [0x00])])
  },
}
