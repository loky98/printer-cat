import type { Fonts } from '../hooks/useFonts'
import type { BarcodeFormat, Block, ImageBlock } from '../render/blocks'
import { DITHER_LABELS, type DitherMethod } from '../render/dither'
import { fileToDataUrl } from '../render/image'
import { ALIGN_OPTIONS, Check, Field, Range, Select } from './fields'

interface Props<B extends Block> {
  block: B
  onChange: (patch: Partial<B>) => void
  fonts: Fonts
}

export function BlockForm({ block, onChange, fonts }: Props<Block>) {
  switch (block.kind) {
    case 'text': {
      const set = onChange as Props<typeof block>['onChange']
      return (
        <div className="grid">
          <Field label="Texto">
            <textarea rows={3} value={block.text} onChange={(e) => set({ text: e.target.value })} />
          </Field>
          <Select label="Fuente" value={block.font} options={fonts.all.map((f) => [f, f])} onChange={(font) => set({ font })} />
          <Range label="Tamaño" value={block.size} min={10} max={120} suffix=" px" onChange={(size) => set({ size })} />
          <Range label="Interlineado" value={block.lineHeight} min={0.8} max={2.5} step={0.1} onChange={(lineHeight) => set({ lineHeight })} />
          <Select label="Alineación" value={block.align} options={ALIGN_OPTIONS} onChange={(align) => set({ align })} />
          <div className="row">
            <Check label="Negrita" value={block.bold} onChange={(bold) => set({ bold })} />
            <Check label="Cursiva" value={block.italic} onChange={(italic) => set({ italic })} />
            <Check label="Invertido" value={block.invert} onChange={(invert) => set({ invert })} />
          </div>
        </div>
      )
    }
    case 'image':
      return <ImageForm block={block} onChange={onChange as Props<ImageBlock>['onChange']} />
    case 'qr': {
      const set = onChange as Props<typeof block>['onChange']
      return (
        <div className="grid">
          <Field label="Contenido (texto o enlace)">
            <textarea rows={2} value={block.text} onChange={(e) => set({ text: e.target.value })} />
          </Field>
          <Range label="Tamaño" value={block.sizePct} min={20} max={100} suffix=" %" onChange={(sizePct) => set({ sizePct })} />
          <Select label="Alineación" value={block.align} options={ALIGN_OPTIONS} onChange={(align) => set({ align })} />
        </div>
      )
    }
    case 'barcode': {
      const set = onChange as Props<typeof block>['onChange']
      const formats: BarcodeFormat[] = ['CODE128', 'CODE39', 'EAN13', 'EAN8', 'UPC', 'ITF14']
      return (
        <div className="grid">
          <Field label="Valor">
            <input value={block.value} onChange={(e) => set({ value: e.target.value })} />
          </Field>
          <Select label="Formato" value={block.format} options={formats.map((f) => [f, f])} onChange={(format) => set({ format })} />
          <Range label="Altura" value={block.height} min={30} max={200} suffix=" px" onChange={(height) => set({ height })} />
          <Select label="Alineación" value={block.align} options={ALIGN_OPTIONS} onChange={(align) => set({ align })} />
          <Check label="Mostrar número" value={block.showText} onChange={(showText) => set({ showText })} />
        </div>
      )
    }
    case 'separator': {
      const set = onChange as Props<typeof block>['onChange']
      return (
        <div className="grid">
          <Select
            label="Estilo"
            value={block.style}
            options={[
              ['solid', 'Continuo'],
              ['dashed', 'Guiones'],
              ['dotted', 'Puntos'],
            ]}
            onChange={(style) => set({ style })}
          />
          <Range label="Grosor" value={block.thickness} min={1} max={12} suffix=" px" onChange={(thickness) => set({ thickness })} />
        </div>
      )
    }
    case 'space': {
      const set = onChange as Props<typeof block>['onChange']
      return <Range label="Alto" value={block.height} min={4} max={200} suffix=" px" onChange={(height) => set({ height })} />
    }
  }
}

function ImageForm({ block, onChange }: { block: ImageBlock; onChange: (p: Partial<ImageBlock>) => void }) {
  const load = async (file?: File | null) => {
    if (file) onChange({ src: await fileToDataUrl(file), name: file.name })
  }
  return (
    <div className="grid">
      <div className="row">
        <label className="btn">
          Elegir archivo
          <input hidden type="file" accept="image/*" onChange={(e) => load(e.target.files?.[0])} />
        </label>
        <label className="btn">
          Cámara
          <input hidden type="file" accept="image/*" capture="environment" onChange={(e) => load(e.target.files?.[0])} />
        </label>
        <span className="muted">{block.name || 'También puedes pegar una imagen (Ctrl+V)'}</span>
      </div>
      <Select
        label="Tramado"
        value={block.dither}
        options={Object.entries(DITHER_LABELS) as [DitherMethod, string][]}
        onChange={(dither) => onChange({ dither })}
      />
      <Range label="Ancho" value={block.widthPct} min={10} max={100} suffix=" %" onChange={(widthPct) => onChange({ widthPct })} />
      <Range label="Brillo" value={block.brightness} min={-100} max={100} onChange={(brightness) => onChange({ brightness })} />
      <Range label="Contraste" value={block.contrast} min={-100} max={100} onChange={(contrast) => onChange({ contrast })} />
      <Range label="Gamma" value={block.gamma} min={0.2} max={3} step={0.1} onChange={(gamma) => onChange({ gamma })} />
      <Range label="Umbral" value={block.threshold} min={1} max={254} onChange={(threshold) => onChange({ threshold })} />
      <Select
        label="Rotación"
        value={block.rotate}
        options={[
          [0, '0°'],
          [90, '90°'],
          [180, '180°'],
          [270, '270°'],
        ]}
        onChange={(rotate) => onChange({ rotate })}
      />
      <Select label="Alineación" value={block.align} options={ALIGN_OPTIONS} onChange={(align) => onChange({ align })} />
      <Check label="Invertir colores" value={block.invert} onChange={(invert) => onChange({ invert })} />
    </div>
  )
}
