import { crc8 } from '../crc8'
import { blankBitmap, packRow } from '../../render/pack'
import type { PrinterProfile } from '.'

// Variante MXW01 (experimental): comandos 22 21 CMD 00 LEN_L LEN_H DATA CRC8 FF por AE01,
// filas de imagen por AE03 y aviso de fin (CMD 0xAA) por AE02.
export function mxwPacket(cmd: number, data: ArrayLike<number>): Uint8Array {
  const len = data.length
  const out = new Uint8Array(len + 8)
  out.set([0x22, 0x21, cmd, 0x00, len & 0xff, (len >> 8) & 0xff])
  out.set(data, 6)
  out[6 + len] = crc8(out.subarray(6, 6 + len))
  out[7 + len] = 0xff
  return out
}

const MIN_LINES = 90

export const mxw01Profile: PrinterProfile = {
  id: 'mxw01',
  name: 'MXW01 (experimental)',
  async print(link, bmp, opts, onProgress) {
    if (!link.dataTx) throw new Error('La impresora no expone la característica AE03 que usa MXW01')
    // Esta variante necesita un mínimo de líneas; se rellena con blanco.
    let src = bmp
    if (bmp.height < MIN_LINES) {
      src = blankBitmap(bmp.width, MIN_LINES)
      src.pixels.set(bmp.pixels)
    }
    const intensity = Math.round((opts.energy / 100) * 0xff)
    await link.send([mxwPacket(0xa2, [intensity]), mxwPacket(0xa1, [0x00])])
    await link.send([mxwPacket(0xa9, [src.height & 0xff, (src.height >> 8) & 0xff, 0x30, 0x00])])
    const rows = Array.from({ length: src.height }, (_, y) => packRow(src, y, opts.bitOrder))
    await link.send(rows, { char: link.dataTx, onProgress })
    const done = link.waitFor((d) => d[0] === 0x22 && d[1] === 0x21 && d[2] === 0xaa, 30000)
    await link.send([mxwPacket(0xad, [0x00])])
    await done
  },
  async feed(link, lines) {
    // MXW01 no tiene comando de avance documentado: se imprime una franja en blanco.
    await this.print(link, blankBitmap(384, lines), { energy: 0, speed: 0, feedLines: 0, bitOrder: 'lsb', compress: false })
  },
  async requestStatus(link) {
    await link.send([mxwPacket(0xa1, [0x00])])
  },
}
