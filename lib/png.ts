// Minimal PNG reader, enough to read one pixel of a classified map tile
// server-side. Supports 8-bit truecolour (colour types 2 and 6) and indexed
// colour (type 3, 1/2/4/8-bit, with PLTE and optional tRNS) — ArcGIS serves
// a cache's tiles in either, depending on how many colours each tile holds.
// Greyscale, 16-bit and interlaced images are rejected, never guessed at.

import { inflateSync } from 'node:zlib'

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

export interface DecodedPng {
  width: number
  height: number
  /** RGBA (colour type 2 gets alpha 255; type 3 takes alpha from tRNS) */
  pixel(x: number, y: number): [number, number, number, number]
}

export function decodePng(buf: Buffer): DecodedPng {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(SIGNATURE)) throw new Error('not a PNG')

  let width = 0, height = 0, colourType = -1, bitDepth = 0
  let palette: Buffer | null = null
  let transparency: Buffer | null = null
  const idat: Buffer[] = []
  for (let i = 8; i + 8 <= buf.length;) {
    const len = buf.readUInt32BE(i)
    const type = buf.toString('latin1', i + 4, i + 8)
    const data = buf.subarray(i + 8, i + 8 + len)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colourType = data[9]
      const interlace = data[12]
      const supported =
        interlace === 0 &&
        (((colourType === 2 || colourType === 6) && bitDepth === 8) ||
          (colourType === 3 && [1, 2, 4, 8].includes(bitDepth)))
      if (!supported) throw new Error(`unsupported PNG (depth ${bitDepth}, type ${colourType}, interlace ${interlace})`)
    } else if (type === 'PLTE') {
      palette = data
    } else if (type === 'tRNS') {
      transparency = data
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'IEND') {
      break
    }
    i += 12 + len
  }
  if (!width || !height) throw new Error('PNG without IHDR')
  if (colourType === 3 && !palette) throw new Error('indexed PNG without PLTE')

  const channels = colourType === 6 ? 4 : colourType === 2 ? 3 : 1
  const bitsPerPixel = channels * bitDepth
  // Filters work on whole bytes: the distance back to the "previous pixel" is at least 1
  const bpp = Math.max(1, bitsPerPixel >> 3)
  const stride = Math.ceil((width * bitsPerPixel) / 8)
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
      if (colourType === 3) {
        // Sub-byte indices are packed most significant bits first
        const bit = x * bitDepth
        const byte = out[y * stride + (bit >> 3)]
        const index = (byte >> (8 - bitDepth - (bit & 7))) & ((1 << bitDepth) - 1)
        if (index * 3 + 2 >= palette!.length) throw new Error(`palette index ${index} out of range`)
        const alpha = transparency && index < transparency.length ? transparency[index] : 255
        return [palette![index * 3], palette![index * 3 + 1], palette![index * 3 + 2], alpha]
      }
      const o = y * stride + x * channels
      return [out[o], out[o + 1], out[o + 2], channels === 4 ? out[o + 3] : 255]
    },
  }
}
