import { useCallback, useEffect, useRef, useState } from 'react'
import { detect, discover, OPTIONAL_SERVICES, shortUuid, type Detection, type ServiceInfo } from '../ble/connect'
import { BleLink } from '../ble/link'
import { describeReply } from '../ble/decode'
import { runProbe } from '../ble/probe'
import { PROFILES } from '../ble/profiles'
import type { MonoBitmap, ProfileId } from '../ble/types'
import type { Settings } from '../settings'
import { toHex } from '../util/hex'

export type PrinterStatus = 'idle' | 'connecting' | 'connected' | 'printing'

export interface PrinterState {
  status: PrinterStatus
  deviceName?: string
  detection?: Omit<Detection, 'tx' | 'notifiers' | 'dataTx'> & { tx: string; notify: string[]; dataTx?: string }
  services: ServiceInfo[]
  log: string[]
  progress: number
  error?: string
}

/**
 * Navegadores integrados en otras apps (Electron, visores de editores, apps de chat) exponen
 * `navigator.bluetooth` pero no muestran el selector de dispositivos, así que la lista nunca aparece.
 */
export const isEmbeddedBrowser = () => /Electron|Claude\/|wv\)|; wv|FBAN|FBAV|Instagram/i.test(navigator.userAgent)

export const bluetoothSupport = (): string | null => {
  if (!window.isSecureContext) return 'Web Bluetooth necesita HTTPS o localhost. Abre la app con una dirección segura.'
  if (!('bluetooth' in navigator)) return 'Este navegador no soporta Web Bluetooth. Usa Chrome o Edge en Windows/Android.'
  if (isEmbeddedBrowser())
    return `Estás en un navegador integrado que no muestra el selector de Bluetooth. Abre ${location.href} directamente en Chrome o Edge.`
  return null
}

export function usePrinter(settings: Settings) {
  const [state, setState] = useState<PrinterState>({ status: 'idle', services: [], log: [], progress: 0 })
  const linkRef = useRef<BleLink | null>(null)
  const detectedRef = useRef<ProfileId>('classic')

  const log = useCallback((msg: string) => {
    const t = new Date().toLocaleTimeString()
    setState((s) => ({ ...s, log: [...s.log.slice(-299), `${t}  ${msg}`] }))
  }, [])

  useEffect(() => {
    if (linkRef.current) linkRef.current.cfg = { chunkSize: settings.chunkSize, delayMs: settings.delayMs }
  }, [settings.chunkSize, settings.delayMs])

  const fail = useCallback(
    (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e)
      log(`Error: ${msg}`)
      setState((s) => ({ ...s, status: linkRef.current ? 'connected' : 'idle', error: msg, progress: 0 }))
    },
    [log],
  )

  const connect = useCallback(async () => {
    const unsupported = bluetoothSupport()
    if (unsupported) return fail(new Error(unsupported))
    setState((s) => ({ ...s, status: 'connecting', error: undefined }))
    try {
      const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: OPTIONAL_SERVICES })
      const name = device.name ?? device.id
      log(`Dispositivo elegido: ${name}`)
      device.addEventListener('gattserverdisconnected', () => {
        linkRef.current = null
        log('Desconectado')
        setState((s) => ({ ...s, status: 'idle', progress: 0 }))
      })
      const server = await device.gatt!.connect()
      log('GATT conectado, leyendo servicios…')
      const services = await discover(server)
      services.forEach((s) => log(`Servicio ${s.uuid}: ${s.chars.map((c) => `${c.uuid.slice(4, 8)}[${c.props.join(',')}]`).join(' ')}`))
      const det = detect(device.name ?? '', services)
      if (!det) {
        setState((s) => ({ ...s, status: 'idle', services, deviceName: name }))
        device.gatt?.disconnect()
        throw new Error('No se encontró una característica de escritura conocida. Revisa la pestaña Diagnóstico.')
      }
      const link = new BleLink(device, det.tx, det.notifiers, det.dataTx, { chunkSize: settings.chunkSize, delayMs: settings.delayMs })
      const failed = await link.start()
      log(`Notificaciones activadas: ${det.notifiers.length - failed.length} de ${det.notifiers.length}`)
      failed.forEach((u) => log(`No se pudo suscribir a ${shortUuid(u)}`))
      link.onNotify((d, uuid) => {
        const meaning = describeReply(d)
        log(`⇠ ${shortUuid(uuid)}: ${toHex(d)}${meaning ? `  (${meaning})` : ''}`)
      })
      linkRef.current = link
      detectedRef.current = det.profile
      log(`Protocolo: ${PROFILES[det.profile].name} (${det.reason})`)
      setState((s) => ({
        ...s,
        status: 'connected',
        deviceName: name,
        services,
        detection: {
          profile: det.profile,
          reason: det.reason,
          tx: det.tx.uuid,
          notify: det.notifiers.map((c) => c.uuid),
          dataTx: det.dataTx?.uuid,
        },
      }))
    } catch (e) {
      // NotFoundError = el usuario cerró el selector sin elegir.
      if (e instanceof DOMException && e.name === 'NotFoundError') {
        log('Selector cerrado sin elegir equipo. Si la impresora no aparecía, revisa la guía en Diagnóstico.')
        setState((s) => ({ ...s, status: linkRef.current ? 'connected' : 'idle' }))
        return
      }
      fail(e)
    }
  }, [fail, log, settings.chunkSize, settings.delayMs])

  const disconnect = useCallback(() => linkRef.current?.disconnect(), [])

  const profile = () => PROFILES[settings.profile === 'auto' ? detectedRef.current : settings.profile]

  const withLink = async (task: (link: BleLink) => Promise<void>) => {
    const link = linkRef.current
    if (!link) return fail(new Error('Primero conecta la impresora'))
    setState((s) => ({ ...s, status: 'printing', progress: 0, error: undefined }))
    try {
      await task(link)
      setState((s) => ({ ...s, status: 'connected', progress: 0 }))
    } catch (e) {
      fail(e)
    }
  }

  const print = (bmp: MonoBitmap) =>
    withLink(async (link) => {
      const p = profile()
      log(`Imprimiendo ${bmp.width}×${bmp.height} px con ${p.name} por ${shortUuid(link.tx.uuid)}…`)
      const t0 = performance.now()
      await p.print(link, bmp, settings, (progress) => setState((s) => ({ ...s, progress })))
      log(`Enviado en ${((performance.now() - t0) / 1000).toFixed(1)} s`)
    })

  const feed = (lines = 80) =>
    withLink(async (link) => {
      log(`Avanzar ${lines} puntos por ${shortUuid(link.tx.uuid)}`)
      await profile().feed(link, lines)
    })

  const requestStatus = () => withLink(async (link) => profile().requestStatus?.(link))

  const sendRaw = (charUuid: string, bytes: Uint8Array) =>
    withLink(async (link) => {
      const char = state.services.flatMap((s) => s.chars).find((c) => c.uuid === charUuid)?.char
      if (!char) throw new Error('Característica no encontrada')
      log(`⇢ ${charUuid.slice(4, 8)}: ${toHex(bytes)}`)
      await link.send([bytes], { char })
    })

  const [probeReport, setProbeReport] = useState<string[]>([])

  const probe = () =>
    withLink(async (link) => {
      log('Iniciando sonda de comandos…')
      setProbeReport(await runProbe(link, state.services, log))
    })

  /** Texto con equipo, servicios, sonda y registro para copiar y compartir. */
  const report = () =>
    [
      `Equipo: ${state.deviceName ?? '—'} · Protocolo: ${state.detection?.profile ?? '—'} (${state.detection?.reason ?? ''})`,
      `Navegador: ${navigator.userAgent}`,
      '',
      'Servicios:',
      ...state.services.map((s) => `  ${s.uuid}: ${s.chars.map((c) => `${shortUuid(c.uuid)}[${c.props.join(',')}]`).join(' ')}`),
      '',
      'Sonda:',
      ...(probeReport.length ? probeReport : ['  (no ejecutada)']),
      '',
      'Registro:',
      ...state.log,
    ].join('\n')

  return {
    state,
    probeReport,
    connect,
    disconnect,
    print,
    feed,
    requestStatus,
    sendRaw,
    probe,
    report,
    clearLog: () => setState((s) => ({ ...s, log: [] })),
  }
}

export type Printer = ReturnType<typeof usePrinter>
