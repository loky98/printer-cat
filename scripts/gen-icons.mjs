// Genera los íconos PNG de la PWA (mismo diseño que public/icons/icon.svg) sin dependencias externas.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const BG = [0x1f, 0x29, 0x37]
const CAT = [0xf5, 0x9e, 0x0b]
const PAPER = [0xf9, 0xfa, 0xfb]

function crc32(buf) {
  let c = ~0
  for (const b of buf) {
    c ^= b
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

function inTriangle(px, py, [ax, ay], [bx, by], [cx, cy]) {
  const s = (x1, y1, x2, y2, x3, y3) => (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3)
  const d1 = s(px, py, ax, ay, bx, by)
  const d2 = s(px, py, bx, by, cx, cy)
  const d3 = s(px, py, cx, cy, ax, ay)
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))
}

// Devuelve el color en coordenadas del lienzo 64x64 del SVG.
function colorAt(x, y) {
  const inRect = (rx, ry, w, h) => x >= rx && x < rx + w && y >= ry && y < ry + h
  if (inRect(22, 44, 20, 2) || inRect(22, 49, 14, 2)) return BG
  if (inRect(18, 38, 28, 18)) return PAPER
  if ((x - 25) ** 2 + (y - 31) ** 2 < 6.25 || (x - 39) ** 2 + (y - 31) ** 2 < 6.25) return BG
  if (inRect(12, 22, 40, 24)) return CAT
  if (inTriangle(x, y, [14, 26], [20, 12], [27, 22]) || inTriangle(x, y, [50, 26], [44, 12], [37, 22])) return CAT
  return BG
}

function png(size) {
  const rows = []
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3)
    for (let x = 0; x < size; x++) {
      const c = colorAt(((x + 0.5) / size) * 64, ((y + 0.5) / size) * 64)
      row.set(c, 1 + x * 3)
    }
    rows.push(row)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // profundidad de bits
  ihdr[9] = 2 // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('public/icons', { recursive: true })
for (const size of [192, 512]) writeFileSync(`public/icons/icon-${size}.png`, png(size))
console.log('Íconos generados en public/icons')
