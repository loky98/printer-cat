import { packRow } from '../../render/pack'
import type { PrinterProfile } from '.'

// Respaldo para impresoras térmicas BLE que hablan ESC/POS: imagen raster con GS v 0.
const BAND = 128

export const escposProfile: PrinterProfile = {
  id: 'escpos',
  name: 'ESC/POS (GS v 0)',
  async print(link, bmp, opts, onProgress) {
    const rowBytes = Math.ceil(bmp.width / 8)
    const packets: Uint8Array[] = [Uint8Array.from([0x1b, 0x40])]
    for (let y0 = 0; y0 < bmp.height; y0 += BAND) {
      const h = Math.min(BAND, bmp.height - y0)
      packets.push(Uint8Array.from([0x1d, 0x76, 0x30, 0x00, rowBytes & 0xff, rowBytes >> 8, h & 0xff, h >> 8]))
      // ESC/POS siempre usa el bit más significativo para el punto de la izquierda.
      for (let y = y0; y < y0 + h; y++) packets.push(packRow(bmp, y, 'msb'))
    }
    packets.push(Uint8Array.from([0x1b, 0x64, Math.min(255, Math.round(opts.feedLines / 8))]))
    await link.send(packets, { onProgress })
  },
  async feed(link, lines) {
    await link.send([Uint8Array.from([0x1b, 0x64, Math.min(255, Math.round(lines / 8))])])
  },
}
