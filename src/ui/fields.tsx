import type { ReactNode } from 'react'
import type { Align } from '../render/blocks'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export function Range(props: { label: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (v: number) => void }) {
  return (
    <Field label={`${props.label}: ${props.value}${props.suffix ?? ''}`}>
      <input type="range" min={props.min} max={props.max} step={props.step ?? 1} value={props.value} onChange={(e) => props.onChange(Number(e.target.value))} />
    </Field>
  )
}

export function Check({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="check">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

export function Select<T extends string | number>(props: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <Field label={props.label}>
      <select
        value={String(props.value)}
        onChange={(e) => props.onChange(props.options.find(([v]) => String(v) === e.target.value)![0])}
      >
        {props.options.map(([v, l]) => (
          <option key={String(v)} value={String(v)}>
            {l}
          </option>
        ))}
      </select>
    </Field>
  )
}

export const ALIGN_OPTIONS: [Align, string][] = [
  ['left', 'Izquierda'],
  ['center', 'Centro'],
  ['right', 'Derecha'],
]
