import type { DitherMethod } from './dither'

export type Align = 'left' | 'center' | 'right'

export interface TextBlock {
  kind: 'text'
  id: string
  text: string
  font: string
  size: number
  bold: boolean
  italic: boolean
  align: Align
  lineHeight: number
  invert: boolean
}

export interface ImageBlock {
  kind: 'image'
  id: string
  src: string
  name: string
  widthPct: number
  align: Align
  rotate: 0 | 90 | 180 | 270
  brightness: number
  contrast: number
  gamma: number
  dither: DitherMethod
  threshold: number
  invert: boolean
}

export interface QrBlock {
  kind: 'qr'
  id: string
  text: string
  sizePct: number
  align: Align
}

export type BarcodeFormat = 'CODE128' | 'CODE39' | 'EAN13' | 'EAN8' | 'UPC' | 'ITF14'

export interface BarcodeBlock {
  kind: 'barcode'
  id: string
  value: string
  format: BarcodeFormat
  height: number
  showText: boolean
  align: Align
}

export interface SeparatorBlock {
  kind: 'separator'
  id: string
  style: 'solid' | 'dashed' | 'dotted'
  thickness: number
}

export interface SpaceBlock {
  kind: 'space'
  id: string
  height: number
}

export type Block = TextBlock | ImageBlock | QrBlock | BarcodeBlock | SeparatorBlock | SpaceBlock
export type BlockKind = Block['kind']

export const BLOCK_LABELS: Record<BlockKind, string> = {
  text: 'Texto',
  image: 'Imagen',
  qr: 'Código QR',
  barcode: 'Código de barras',
  separator: 'Separador',
  space: 'Espacio',
}

const uid = () => Math.random().toString(36).slice(2, 10)

export function newBlock(kind: BlockKind): Block {
  const id = uid()
  switch (kind) {
    case 'text':
      return { kind, id, text: 'Escribe aquí', font: 'sans-serif', size: 28, bold: false, italic: false, align: 'left', lineHeight: 1.2, invert: false }
    case 'image':
      return { kind, id, src: '', name: '', widthPct: 100, align: 'center', rotate: 0, brightness: 0, contrast: 0, gamma: 1, dither: 'floyd', threshold: 128, invert: false }
    case 'qr':
      return { kind, id, text: 'https://example.com', sizePct: 60, align: 'center' }
    case 'barcode':
      return { kind, id, value: '123456789012', format: 'CODE128', height: 80, showText: true, align: 'center' }
    case 'separator':
      return { kind, id, style: 'dashed', thickness: 2 }
    case 'space':
      return { kind, id, height: 24 }
  }
}

export const DEFAULT_BLOCKS: Block[] = [
  { ...(newBlock('text') as TextBlock), text: 'Printer Cat', size: 48, bold: true, align: 'center' },
  newBlock('separator'),
  { ...(newBlock('text') as TextBlock), text: 'Hola desde mi impresora térmica. Agrega textos, imágenes, códigos QR y de barras.' },
]
