// Interpreta notificaciones 51 78 CMD 01 LEN_L LEN_H PAYLOAD CRC FF para mostrarlas en el registro.
// Los bits de estado siguen a NaitLee/Cat-Printer; varían entre firmwares, así que se muestran como orientativos.
const STATE_FLAGS: [number, string][] = [
  [0x01, 'sin papel'],
  [0x02, 'tapa abierta'],
  [0x04, 'sobrecalentada'],
  [0x08, 'batería baja'],
]

export function describeReply(d: Uint8Array): string | null {
  if (d.length < 8 || d[0] !== 0x51 || d[1] !== 0x78) return null
  const len = d[4] | (d[5] << 8)
  const p = d.subarray(6, 6 + len)
  switch (d[2]) {
    case 0xa3: {
      const flags = STATE_FLAGS.filter(([bit]) => p[0] & bit).map(([, l]) => l)
      return `estado: ${flags.length ? flags.join(', ') : 'lista, sin errores'}`
    }
    case 0xa8: {
      const ascii = String.fromCharCode(...p).match(/[\x20-\x7e]{3,}/)?.[0]
      return ascii ? `firmware ${ascii}` : null
    }
    case 0xae:
      return p[0] === 0x10 ? 'pide pausar el envío' : 'permite seguir enviando'
    default:
      return null
  }
}
