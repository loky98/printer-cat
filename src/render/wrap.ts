/** Parte el texto en líneas que caben en `maxWidth`, respetando saltos de línea y cortando palabras demasiado largas. */
export function wrapText(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/(\s+)/).filter((w) => w.length > 0)
    let line = ''
    for (const word of words) {
      const candidate = line + word
      if (measure(candidate.trimEnd()) <= maxWidth) {
        line = candidate
        continue
      }
      if (line.trim()) lines.push(line.trimEnd())
      line = /^\s+$/.test(word) ? '' : word
      // Palabra más ancha que la línea: se corta por caracteres.
      while (measure(line) > maxWidth && line.length > 1) {
        let cut = line.length - 1
        while (cut > 1 && measure(line.slice(0, cut)) > maxWidth) cut--
        lines.push(line.slice(0, cut))
        line = line.slice(cut)
      }
    }
    lines.push(line.trimEnd())
  }
  return lines
}
