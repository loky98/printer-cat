import { useState } from 'react'
import { shortUuid } from '../ble/connect'
import { classicPacket } from '../ble/profiles/classic'
import type { Printer } from '../hooks/usePrinter'
import { testPattern } from '../render/testPattern'
import { parseHex, toHex } from '../util/hex'

/** Herramientas para identificar el protocolo de un modelo nuevo (como la SC03h) y probar comandos sueltos. */
export function Diagnostics({ printer, width }: { printer: Printer; width: number }) {
  const { state } = printer
  const writable = state.services.flatMap((s) => s.chars).filter((c) => c.props.some((p) => p.startsWith('write')))
  const [charUuid, setCharUuid] = useState('')
  const [hex, setHex] = useState('')
  const [cmd, setCmd] = useState('a3')
  const [data, setData] = useState('00')
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)
  const busy = state.status !== 'connected'
  const target = charUuid || state.detection?.tx || writable[0]?.uuid || ''

  const send = () => {
    try {
      setErr('')
      printer.sendRaw(target, parseHex(hex))
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  const build = () => {
    try {
      setErr('')
      setHex(toHex(classicPacket(parseHex(cmd)[0], parseHex(data))))
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  return (
    <div className="diag">
      <section className="card">
        <h3>Conexión</h3>
        <p>
          Equipo: <strong>{state.deviceName ?? '—'}</strong>
        </p>
        {state.detection && (
          <p>
            Protocolo detectado: <strong>{state.detection.profile}</strong> · {state.detection.reason}
            <br />
            Escritura: <code>{shortUuid(state.detection.tx)}</code> · Notificación:{' '}
            <code>{state.detection.notify.map(shortUuid).join(', ') || '—'}</code>
            {state.detection.dataTx && (
              <>
                {' '}
                · Datos: <code>{shortUuid(state.detection.dataTx)}</code>
              </>
            )}
          </p>
        )}
        <div className="row">
          <button disabled={busy} onClick={async () => printer.print(await testPattern(width))}>
            Imprimir patrón de prueba
          </button>
          <button disabled={busy} onClick={() => printer.feed(80)}>
            Avanzar papel
          </button>
          <button disabled={busy} onClick={printer.requestStatus}>
            Pedir estado
          </button>
        </div>
      </section>

      <section className="card">
        <h3>Sonda de comunicación</h3>
        <p className="muted">
          Envía comandos uno por uno (estado, información, batería y un avance corto de papel), espera 1,5 s la respuesta de la
          impresora y anota qué característica contesta. Así se ve en qué punto falla la comunicación.
        </p>
        <div className="row">
          <button className="primary" disabled={busy} onClick={printer.probe}>
            Ejecutar sonda
          </button>
          <button onClick={() => navigator.clipboard.writeText(printer.report()).then(() => setCopied(true))}>
            {copied ? 'Reporte copiado ✓' : 'Copiar reporte completo'}
          </button>
        </div>
        {printer.probeReport.length > 0 && <pre className="log">{printer.probeReport.join('\n')}</pre>}
      </section>

      <section className="card">
        <h3>¿No aparece la impresora en la lista?</h3>
        <ol className="help">
          <li>
            Abre la app en <strong>Chrome o Edge</strong> directamente, no dentro de otra aplicación (editores, visores integrados o
            apps de chat no muestran el selector).
          </li>
          <li>
            Cierra la app oficial de la impresora en el celular y apágale el Bluetooth: la impresora solo acepta una conexión y deja de
            anunciarse mientras está conectada.
          </li>
          <li>
            No hace falta emparejarla en Windows. Si ya la emparejaste, quítala en <em>Configuración → Bluetooth y otros dispositivos</em> y
            reinicia la impresora.
          </li>
          <li>Espera 5–10 segundos con el selector abierto: puede aparecer como «SC03h», con otro nombre o como «Dispositivo desconocido».</li>
          <li>
            En Android, permite a Chrome <em>Dispositivos cercanos</em> y <em>Ubicación</em>, y activa la ubicación del teléfono.
          </li>
          <li>
            Para comprobar que Chrome ve la impresora, abre <code>chrome://bluetooth-internals/#devices</code> y pulsa «Start Scan».
          </li>
        </ol>
      </section>

      <section className="card">
        <h3>Servicios GATT</h3>
        {state.services.length === 0 && <p className="muted">Conecta la impresora para ver sus servicios y características.</p>}
        {state.services.map((s) => (
          <div key={s.uuid} className="service">
            <code>{s.uuid}</code>
            <ul>
              {s.chars.map((c) => (
                <li key={c.uuid}>
                  <code>{c.uuid}</code> <span className="muted">{c.props.join(', ')}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="card">
        <h3>Enviar bytes</h3>
        <div className="grid">
          <label className="field">
            <span>Característica</span>
            <select value={target} onChange={(e) => setCharUuid(e.target.value)}>
              {writable.map((c) => (
                <option key={c.uuid} value={c.uuid}>
                  {c.uuid}
                </option>
              ))}
            </select>
          </label>
          <div className="row">
            <label className="field">
              <span>Comando clásico (hex)</span>
              <input value={cmd} onChange={(e) => setCmd(e.target.value)} size={4} />
            </label>
            <label className="field">
              <span>Datos (hex)</span>
              <input value={data} onChange={(e) => setData(e.target.value)} />
            </label>
            <button onClick={build}>Armar paquete 51 78 + CRC</button>
          </div>
          <label className="field">
            <span>Bytes a enviar (hex)</span>
            <input value={hex} onChange={(e) => setHex(e.target.value)} placeholder="51 78 a3 00 01 00 00 00 ff" />
          </label>
          <button disabled={busy || !target || !hex} onClick={send}>
            Enviar
          </button>
          {err && <p className="error">{err}</p>}
        </div>
      </section>

      <section className="card">
        <header className="card-head">
          <h3>Registro</h3>
          <button className="icon" onClick={printer.clearLog}>
            Limpiar
          </button>
        </header>
        <pre className="log">{state.log.join('\n') || 'Sin eventos todavía.'}</pre>
      </section>
    </div>
  )
}
