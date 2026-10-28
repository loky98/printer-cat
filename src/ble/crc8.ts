// CRC-8 con polinomio 0x07 y valor inicial 0, el que usan las "cat printers" en cada paquete.
const TABLE = (() => {
  const t = new Uint8Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = c & 0x80 ? ((c << 1) ^ 0x07) & 0xff : (c << 1) & 0xff
    t[i] = c
  }
  return t
})()

export function crc8(data: ArrayLike<number>): number {
  let c = 0
  for (let i = 0; i < data.length; i++) c = TABLE[(c ^ data[i]) & 0xff]
  return c
}
