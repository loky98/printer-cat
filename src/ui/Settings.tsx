import { useState, type Dispatch, type SetStateAction } from 'react'
import type { Fonts } from '../hooks/useFonts'
import { SUGGESTED_GOOGLE_FONTS } from '../render/fonts'
import { DEFAULT_SETTINGS, type Settings } from '../settings'
import { Check, Field, Range, Select } from './fields'

interface Props {
  settings: Settings
  setSettings: Dispatch<SetStateAction<Settings>>
  fonts: Fonts
}

export function SettingsPanel({ settings, setSettings, fonts }: Props) {
  const set = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }))
  const [google, setGoogle] = useState('')
  const [fontMsg, setFontMsg] = useState('')

  const run = async (task: () => Promise<void>, ok: string) => {
    try {
      setFontMsg('Cargando…')
      await task()
      setFontMsg(ok)
    } catch (e) {
      setFontMsg((e as Error).message)
    }
  }

  return (
    <div className="diag">
      <section className="card">
        <h3>Impresión</h3>
        <div className="grid">
          <Select
            label="Ancho del papel"
            value={settings.widthPx}
            options={[
              [384, '58 mm · 384 puntos (cat printers)'],
              [576, '80 mm · 576 puntos'],
            ]}
            onChange={(widthPx) => set({ widthPx })}
          />
          <Select
            label="Protocolo"
            value={settings.profile}
            options={[
              ['auto', 'Automático'],
              ['classic', 'Cat printer clásica (0x51 0x78)'],
              ['sc03h', 'iPrint SC03h'],
              ['mxw01', 'MXW01 (experimental)'],
              ['escpos', 'ESC/POS'],
            ]}
            onChange={(profile) => set({ profile })}
          />
          <Range label="Oscuridad (energía)" value={settings.energy} min={0} max={100} suffix=" %" onChange={(energy) => set({ energy })} />
          <Range label="Velocidad" value={settings.speed} min={1} max={64} onChange={(speed) => set({ speed })} />
          <Range label="Avance al terminar" value={settings.feedLines} min={0} max={300} suffix=" líneas" onChange={(feedLines) => set({ feedLines })} />
          <Select
            label="Orden de bits"
            value={settings.bitOrder}
            options={[
              ['lsb', 'LSB primero (GB01/GB02/MX…)'],
              ['msb', 'MSB primero (si la imagen sale en espejo cada 8 px)'],
            ]}
            onChange={(bitOrder) => set({ bitOrder })}
          />
          <Check label="Compresión RLE (más rápida, no todos los modelos la aceptan)" value={settings.compress} onChange={(compress) => set({ compress })} />
        </div>
      </section>

      <section className="card">
        <h3>Bluetooth</h3>
        <div className="grid">
          <Range label="Bytes por escritura" value={settings.chunkSize} min={20} max={240} onChange={(chunkSize) => set({ chunkSize })} />
          <Range label="Pausa entre escrituras" value={settings.delayMs} min={0} max={50} suffix=" ms" onChange={(delayMs) => set({ delayMs })} />
          <p className="muted">Si la impresión sale cortada o con rayas, baja los bytes por escritura o sube la pausa.</p>
          <button onClick={() => setSettings(DEFAULT_SETTINGS)}>Restaurar valores por defecto</button>
        </div>
      </section>

      <section className="card">
        <h3>Fuentes</h3>
        <div className="grid">
          <Field label="Agregar desde Google Fonts">
            <div className="row">
              <input list="gf-suggest" value={google} onChange={(e) => setGoogle(e.target.value)} placeholder="p. ej. Pacifico" />
              <datalist id="gf-suggest">
                {SUGGESTED_GOOGLE_FONTS.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
              <button onClick={() => run(() => fonts.addGoogle(google), `Fuente "${google}" lista`)}>Agregar</button>
            </div>
          </Field>
          <Field label="Subir archivo de fuente (.ttf, .otf, .woff, .woff2)">
            <input
              type="file"
              accept=".ttf,.otf,.woff,.woff2"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) run(() => fonts.addFile(f), `Fuente "${f.name}" guardada`)
              }}
            />
          </Field>
          {fontMsg && <p className="muted">{fontMsg}</p>}
          <ul className="font-list">
            {[...fonts.googleFonts, ...fonts.userFonts].map((f) => (
              <li key={f}>
                <span style={{ fontFamily: `"${f}"`, fontSize: 20 }}>{f}</span>
                <button className="icon danger" onClick={() => fonts.remove(f)}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
