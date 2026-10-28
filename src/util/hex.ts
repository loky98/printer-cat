export const toHex = (d: ArrayLike<number>) =>
  Array.from(d, (b) => b.toString(16).padStart(2, '0')).join(' ')

/** Acepta "51 78 a3", "5178a3" o "0x51,0x78". Lanza error si hay caracteres no hexadecimales. */
export function parseHex(s: string): Uint8Array {
  const clean = s.replace(/0x/gi, '').replace(/[\s,;:-]/g, '')
  if (!/^[0-9a-f]*$/i.test(clean) || clean.length % 2) throw new Error('Hexadecimal inválido')
  return Uint8Array.from(clean.match(/../g) ?? [], (h) => parseInt(h, 16))
}
