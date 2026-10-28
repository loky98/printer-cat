import { useEffect, type Dispatch, type SetStateAction } from 'react'
import type { Fonts } from '../hooks/useFonts'
import { BLOCK_LABELS, newBlock, type Block, type BlockKind, type ImageBlock } from '../render/blocks'
import { fileToDataUrl } from '../render/image'
import { BlockForm } from './BlockForm'

interface Props {
  blocks: Block[]
  setBlocks: Dispatch<SetStateAction<Block[]>>
  fonts: Fonts
}

export function Editor({ blocks, setBlocks, fonts }: Props) {
  const update = (id: string, patch: Partial<Block>) =>
    setBlocks((list) => list.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)))
  const move = (i: number, d: number) =>
    setBlocks((list) => {
      const j = i + d
      if (j < 0 || j >= list.length) return list
      const copy = [...list]
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
      return copy
    })
  const remove = (id: string) => setBlocks((list) => list.filter((b) => b.id !== id))
  const add = (kind: BlockKind) => setBlocks((list) => [...list, newBlock(kind)])

  // Pegar una imagen del portapapeles la agrega como bloque nuevo.
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith('image/'))
      if (!file) return
      e.preventDefault()
      const src = await fileToDataUrl(file)
      setBlocks((list) => [...list, { ...(newBlock('image') as ImageBlock), src, name: 'Imagen pegada' }])
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [setBlocks])

  return (
    <div className="editor">
      {blocks.map((b, i) => (
        <section key={b.id} className="card">
          <header className="card-head">
            <strong>{BLOCK_LABELS[b.kind]}</strong>
            <div className="row">
              <button className="icon" title="Subir" onClick={() => move(i, -1)} disabled={i === 0}>
                ↑
              </button>
              <button className="icon" title="Bajar" onClick={() => move(i, 1)} disabled={i === blocks.length - 1}>
                ↓
              </button>
              <button className="icon danger" title="Eliminar" onClick={() => remove(b.id)}>
                ✕
              </button>
            </div>
          </header>
          <BlockForm block={b} onChange={(patch) => update(b.id, patch)} fonts={fonts} />
        </section>
      ))}
      <div className="add-row">
        {(Object.keys(BLOCK_LABELS) as BlockKind[]).map((k) => (
          <button key={k} onClick={() => add(k)}>
            + {BLOCK_LABELS[k]}
          </button>
        ))}
      </div>
    </div>
  )
}
