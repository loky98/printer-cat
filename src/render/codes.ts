import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'
import type { BarcodeBlock, QrBlock, SeparatorBlock } from './blocks'
import { makeCanvas, placeOnRow } from './canvas'
import { renderText } from './text'

export async function renderQr(b: QrBlock, width: number): Promise<HTMLCanvasElement | null> {
  if (!b.text) return null
  const c = document.createElement('canvas')
  await QRCode.toCanvas(c, b.text, {
    width: Math.round((width * b.sizePct) / 100),
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' },
  })
  return placeOnRow(c, width, b.align)
}

export async function renderBarcode(b: BarcodeBlock, width: number): Promise<HTMLCanvasElement | null> {
  if (!b.value) return null
  const draw = (barWidth: number) => {
    const c = document.createElement('canvas')
    JsBarcode(c, b.value, { format: b.format, width: barWidth, height: b.height, displayValue: b.showText, margin: 4, fontSize: 20 })
    return c
  }
  try {
    let c = draw(2)
    if (c.width > width) c = draw(1)
    return placeOnRow(c, width, b.align)
  } catch {
    return renderText(
      { kind: 'text', id: b.id, text: `Código ${b.format} inválido: ${b.value}`, font: 'sans-serif', size: 18, bold: false, italic: true, align: 'center', lineHeight: 1.2, invert: false },
      width,
    )
  }
}

export function renderSeparator(b: SeparatorBlock, width: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(width, b.thickness + 12)
  ctx.strokeStyle = '#000'
  ctx.lineWidth = b.thickness
  if (b.style === 'dashed') ctx.setLineDash([12, 8])
  if (b.style === 'dotted') ctx.setLineDash([b.thickness, b.thickness * 2])
  ctx.beginPath()
  ctx.moveTo(0, c.height / 2)
  ctx.lineTo(width, c.height / 2)
  ctx.stroke()
  return c
}
