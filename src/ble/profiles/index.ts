import type { BleLink } from '../link'
import type { MonoBitmap, PrintOptions, ProfileId } from '../types'
import { classicProfile } from './classic'
import { escposProfile } from './escpos'
import { mxw01Profile } from './mxw01'
import { sc03hProfile } from './sc03h'

export interface PrinterProfile {
  id: ProfileId
  name: string
  print(link: BleLink, bmp: MonoBitmap, opts: PrintOptions, onProgress?: (p: number) => void): Promise<void>
  feed(link: BleLink, lines: number): Promise<void>
  requestStatus?(link: BleLink): Promise<void>
}

export const PROFILES: Record<ProfileId, PrinterProfile> = {
  classic: classicProfile,
  sc03h: sc03hProfile,
  mxw01: mxw01Profile,
  escpos: escposProfile,
}
