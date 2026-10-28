import { useCallback, useRef, useState } from 'react'
import type { MonoBitmap } from './ble/types'
import { bluetoothSupport, usePrinter } from './hooks/usePrinter'
import { useFonts } from './hooks/useFonts'
import { DEFAULT_BLOCKS, type Block } from './render/blocks'
import { DEFAULT_SETTINGS, type Settings } from './settings'
import { Diagnostics } from './ui/Diagnostics'
import { Editor } from './ui/Editor'
import { Preview } from './ui/Preview'
import { SettingsPanel } from './ui/Settings'
import { readLocal, useLocalState } from './util/storage'

type Tab = 'editor' | 'diag' | 'settings'

const STATUS_LABEL = { idle: 'Desconectada', connecting: 'Conectando…', connected: 'Conectada', printing: 'Imprimiendo…' }

export default function App() {
  const [settings, setSettings] = useLocalState<Settings>('pc.settings', () => ({ ...DEFAULT_SETTINGS, ...readLocal('pc.settings', {}) }))
  const [blocks, setBlocks] = useLocalState<Block[]>('pc.blocks', () => readLocal('pc.blocks', DEFAULT_BLOCKS))
  const [tab, setTab] = useState<Tab>('editor')
  const fonts = useFonts()
  const printer = usePrinter(settings)
  const bitmap = useRef<MonoBitmap | null>(null)
  const onBitmap = useCallback((b: MonoBitmap) => (bitmap.current = b), [])
  const { state } = printer
  const unsupported = bluetoothSupport()

  return (
    <div className="app">
      <header className="top">
        <h1>
          <img src="./icons/icon.svg" alt="" width={28} height={28} /> Printer Cat
        </h1>
        <div className="row">
          <span className={`status ${state.status}`}>
            {STATUS_LABEL[state.status]}
            {state.deviceName ? ` · ${state.deviceName}` : ''}
          </span>
          {state.status === 'idle' || state.status === 'connecting' ? (
            <button className="primary" onClick={printer.connect} disabled={state.status === 'connecting'}>
              Conectar
            </button>
          ) : (
            <button onClick={printer.disconnect}>Desconectar</button>
          )}
        </div>
      </header>

      {unsupported && <div className="banner">{unsupported}</div>}
      {state.error && <div className="banner error">{state.error}</div>}
      {state.status === 'printing' && (
        <div className="progress">
          <div style={{ width: `${Math.round(state.progress * 100)}%` }} />
        </div>
      )}

      <nav className="tabs">
        {(
          [
            ['editor', 'Diseñar'],
            ['diag', 'Diagnóstico'],
            ['settings', 'Ajustes'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>

      <main>
        {tab === 'editor' && (
          <div className="workspace">
            <Editor blocks={blocks} setBlocks={setBlocks} fonts={fonts} />
            <aside className="side">
              <Preview blocks={blocks} width={settings.widthPx} fontVersion={fonts.version} onBitmap={onBitmap} />
              <div className="print-bar">
                <button
                  className="primary big"
                  disabled={state.status !== 'connected'}
                  onClick={() => bitmap.current && printer.print(bitmap.current)}
                >
                  Imprimir
                </button>
                <button disabled={state.status !== 'connected'} onClick={() => printer.feed(80)}>
                  Avanzar papel
                </button>
              </div>
            </aside>
          </div>
        )}
        {tab === 'diag' && <Diagnostics printer={printer} width={settings.widthPx} />}
        {tab === 'settings' && <SettingsPanel settings={settings} setSettings={setSettings} fonts={fonts} />}
      </main>
    </div>
  )
}
