import { useCallback, useEffect, useState } from 'react'
import { addUserFont, loadGoogleFont, loadStoredFonts, removeUserFont, SYSTEM_FONTS } from '../render/fonts'
import { readLocal, writeLocal } from '../util/storage'

const GOOGLE_KEY = 'pc.googleFonts'

export function useFonts() {
  const [userFonts, setUserFonts] = useState<string[]>([])
  const [googleFonts, setGoogleFonts] = useState<string[]>(() => readLocal<string[]>(GOOGLE_KEY, []))
  // Cambia cada vez que una fuente termina de cargar, para que la vista previa se vuelva a dibujar.
  const [version, setVersion] = useState(0)

  useEffect(() => {
    loadStoredFonts().then((names) => {
      setUserFonts(names)
      setVersion((v) => v + 1)
    })
    Promise.all(readLocal<string[]>(GOOGLE_KEY, []).map((f) => loadGoogleFont(f).catch(() => undefined))).then(() =>
      setVersion((v) => v + 1),
    )
  }, [])

  useEffect(() => writeLocal(GOOGLE_KEY, googleFonts), [googleFonts])

  const addGoogle = useCallback(async (family: string) => {
    const name = family.trim()
    if (!name) return
    await loadGoogleFont(name)
    setGoogleFonts((list) => (list.includes(name) ? list : [...list, name]))
    setVersion((v) => v + 1)
  }, [])

  const addFile = useCallback(async (file: File) => {
    const name = await addUserFont(file)
    setUserFonts((list) => (list.includes(name) ? list : [...list, name]))
    setVersion((v) => v + 1)
  }, [])

  const remove = useCallback(async (name: string) => {
    setGoogleFonts((list) => list.filter((f) => f !== name))
    if (userFonts.includes(name)) {
      await removeUserFont(name)
      setUserFonts((list) => list.filter((f) => f !== name))
    }
  }, [userFonts])

  return { all: [...SYSTEM_FONTS, ...googleFonts, ...userFonts], userFonts, googleFonts, version, addGoogle, addFile, remove }
}

export type Fonts = ReturnType<typeof useFonts>
