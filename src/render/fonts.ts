import { idbAll, idbDelete, idbPut } from '../util/storage'

export const SYSTEM_FONTS = [
  'sans-serif',
  'serif',
  'monospace',
  'Arial',
  'Verdana',
  'Tahoma',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Impact',
  'Comic Sans MS',
]

export const SUGGESTED_GOOGLE_FONTS = ['Roboto', 'Inter', 'Pacifico', 'Lobster', 'Press Start 2P', 'VT323', 'Bebas Neue', 'Caveat']

/** Inserta la hoja de estilos de Google Fonts y espera a que la fuente esté disponible. */
export async function loadGoogleFont(family: string): Promise<void> {
  const id = `gf-${family.replace(/\s+/g, '-')}`
  if (!document.getElementById(id)) {
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:ital,wght@0,400;0,700;1,400&display=swap`
    document.head.appendChild(link)
    await new Promise((resolve) => {
      link.onload = resolve
      link.onerror = resolve
    })
  }
  const loaded = await document.fonts.load(`16px "${family}"`)
  if (loaded.length === 0) throw new Error(`Google Fonts no tiene la fuente "${family}"`)
}

async function registerFont(name: string, data: ArrayBuffer) {
  const face = new FontFace(name, data)
  await face.load()
  document.fonts.add(face)
}

/** Registra un archivo .ttf/.otf/.woff/.woff2 del usuario y lo guarda para la próxima vez. */
export async function addUserFont(file: File): Promise<string> {
  const name = file.name.replace(/\.(ttf|otf|woff2?)$/i, '')
  const data = await file.arrayBuffer()
  await registerFont(name, data.slice(0))
  await idbPut({ name, data })
  return name
}

export async function loadStoredFonts(): Promise<string[]> {
  const fonts = await idbAll().catch(() => [])
  const names: string[] = []
  for (const f of fonts) {
    try {
      await registerFont(f.name, f.data)
      names.push(f.name)
    } catch {
      // Archivo dañado: se ignora.
    }
  }
  return names
}

export const removeUserFont = (name: string) => idbDelete(name)
