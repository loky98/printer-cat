export interface LinkConfig {
  /** Bytes máximos por escritura BLE. Si la impresora pierde datos, bájalo (p. ej. 20). */
  chunkSize: number
  /** Pausa entre escrituras en milisegundos. */
  delayMs: number
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

/** Envoltura sobre las características GATT de la impresora: escritura en trozos, notificaciones y control de flujo. */
export class BleLink {
  /** La impresora clásica pide pausar cuando su búfer se llena. */
  paused = false
  private listeners = new Set<(data: Uint8Array, uuid: string) => void>()

  constructor(
    readonly device: BluetoothDevice,
    /** Canal de escritura; la sonda lo cambia si otra característica es la que responde. */
    public tx: BluetoothRemoteGATTCharacteristic,
    /** Todas las características con notify/indicate: algunos modelos (SC03h) ignoran las escrituras si no se suscriben todas. */
    readonly notifiers: BluetoothRemoteGATTCharacteristic[],
    readonly dataTx: BluetoothRemoteGATTCharacteristic | null,
    public cfg: LinkConfig,
  ) {}

  /** Activa notificaciones; devuelve los UUID que fallaron. */
  async start(): Promise<string[]> {
    const failed: string[] = []
    for (const c of this.notifiers) {
      c.addEventListener('characteristicvaluechanged', this.handle)
      await c.startNotifications().catch(() => failed.push(c.uuid))
    }
    return failed
  }

  private handle = (e: Event) => {
    const c = e.target as BluetoothRemoteGATTCharacteristic
    const v = c.value
    if (!v) return
    const data = new Uint8Array(v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength))
    this.listeners.forEach((l) => l(data, c.uuid))
  }

  onNotify(cb: (data: Uint8Array, uuid: string) => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  /** Espera una notificación que cumpla `pred`; devuelve null si se agota el tiempo. */
  waitFor(pred: (d: Uint8Array) => boolean, timeoutMs: number): Promise<Uint8Array | null> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        off()
        resolve(null)
      }, timeoutMs)
      const off = this.onNotify((d) => {
        if (!pred(d)) return
        clearTimeout(timer)
        off()
        resolve(d)
      })
    })
  }

  private async whilePaused() {
    const until = Date.now() + 15000
    while (this.paused && Date.now() < until) await sleep(20)
    this.paused = false
  }

  async writeRaw(bytes: Uint8Array, char = this.tx) {
    if (char.properties.writeWithoutResponse) await char.writeValueWithoutResponse(bytes)
    else await char.writeValueWithResponse(bytes)
  }

  /** Envía paquetes agrupándolos en escrituras de hasta `chunkSize` bytes. */
  async send(packets: Uint8Array[], opts: { char?: BluetoothRemoteGATTCharacteristic; onProgress?: (p: number) => void } = {}) {
    const char = opts.char ?? this.tx
    const max = Math.max(8, this.cfg.chunkSize)
    const flush = async (bytes: Uint8Array) => {
      for (let i = 0; i < bytes.length; i += max) {
        await this.whilePaused()
        await this.writeRaw(bytes.subarray(i, i + max), char)
        if (this.cfg.delayMs > 0) await sleep(this.cfg.delayMs)
      }
    }
    let pending: Uint8Array[] = []
    let size = 0
    for (let i = 0; i < packets.length; i++) {
      const p = packets[i]
      if (size > 0 && size + p.length > max) {
        await flush(concat(pending))
        pending = []
        size = 0
      }
      pending.push(p)
      size += p.length
      opts.onProgress?.((i + 1) / packets.length)
    }
    if (size > 0) await flush(concat(pending))
  }

  disconnect() {
    this.notifiers.forEach((c) => c.removeEventListener('characteristicvaluechanged', this.handle))
    this.device.gatt?.disconnect()
  }
}
