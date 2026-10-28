import { useEffect, useState } from 'react'

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Sin espacio o almacenamiento bloqueado: la app sigue funcionando sin guardar.
  }
}

export function useLocalState<T>(key: string, initial: () => T) {
  const [value, setValue] = useState<T>(initial)
  useEffect(() => writeLocal(key, value), [key, value])
  return [value, setValue] as const
}

// IndexedDB mínima para guardar archivos de fuentes (pueden pesar varios MB).
const DB = 'printer-cat'
const STORE = 'fonts'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'name' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export interface StoredFont {
  name: string
  data: ArrayBuffer
}

export async function idbAll(): Promise<StoredFont[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result as StoredFont[])
    req.onerror = () => reject(req.error)
  })
}

export async function idbPut(font: StoredFont): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(font)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function idbDelete(name: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(name)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
