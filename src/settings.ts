import type { LinkConfig } from './ble/link'
import type { PrintOptions, ProfileId } from './ble/types'

export interface Settings extends PrintOptions, LinkConfig {
  /** Ancho del cabezal en puntos: 384 para papel de 58 mm (203 dpi), 576 para 80 mm. */
  widthPx: number
  /** Protocolo forzado o detección automática. */
  profile: 'auto' | ProfileId
}

export const DEFAULT_SETTINGS: Settings = {
  widthPx: 384,
  profile: 'auto',
  energy: 40,
  speed: 32,
  feedLines: 80,
  bitOrder: 'lsb',
  compress: false,
  chunkSize: 120,
  delayMs: 8,
}
