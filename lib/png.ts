// Minimal PNG reader for 8-bit truecolour tiles (colour types 2 and 6), enough
// to read one pixel of a classified map tile server-side. Not a general
// decoder: palette, greyscale, 16-bit and interlaced images are rejected.

import { inflateSync } from 'node:zlib'

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

export interface DecodedPng {
  width: number
  height: number
  /** RGBA, 4 bytes per pixel (colour type 2 gets alpha 255) */
  pixel(x: number, y: number): [number, number, number, number]
}

export function decodePng(buf: Buffer): DecodedPng {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(SIGNATURE)) throw new Error('not a PNG')

  let width = 0, height = 0, colourType = -1
  const idat: Buffer[] = []
  for (let i = 8; i + 8 <= buf.length;) {
    const len = buf.readUInt32BE(i)
    const type = buf.toString('latin1', i + 4, i + 8)
    const data = buf.subarray(i + 8, i + 8 + len)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      const bitDepth = data[8]
      colourType = data[9]
      const interlace = data[12]
      if (bitDepth !== 8 || (colourType !== 2 && colourType !== 6) || interlace !== 0) {
        throw new Error(`unsupported PNG (depth ${bitDepth}, type ${colourType}, interlace ${interlace})`)
      }
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'IEND') {
      break
    }
    i += 12 + len
  }
  if (!width || !height) throw new Error('PNG without IHDR')

  const bpp = colourType === 6 ? 4 : 3
  const stride = width * bpp
  const raw = inflateSync(Buffer.concat(idat))
  if (raw.length < height * (stride + 1)) throw new Error('truncated PNG')

  // Undo the per-row filters (PNG spec §9)
  const out = Buffer.alloc(height * stride)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const src = y * (stride + 1) + 1
    const row = y * stride
    const prev = row - stride
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[row + x - bpp] : 0
      const b = y > 0 ? out[prev + x] : 0
      const c = x >= bpp && y > 0 ? out[prev + x - bpp] : 0
      let pred = 0
      if (filter === 1) pred = a
      else if (filter === 2) pred = b
      else if (filter === 3) pred = (a + b) >> 1
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
        pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      } else if (filter !== 0) throw new Error(`bad PNG filter ${filter}`)
      out[row + x] = (raw[src + x] + pred) & 0xff
    }
  }

  return {
    width,
    height,
    pixel(x, y) {
      const o = y * stride + x * bpp
      return [out[o], out[o + 1], out[o + 2], bpp === 4 ? out[o + 3] : 255]
    },
  }
}
