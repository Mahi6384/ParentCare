// Generates solid-saffron PWA icons using only Node.js built-ins (no deps).
// Run: node apps/web/scripts/gen-icons.mjs
import { writeFileSync, mkdirSync } from 'fs'
import { deflateSync } from 'zlib'

// CRC32 lookup table (PNG chunk integrity)
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let crc = 0xffffffff
  for (const b of buf) crc = crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function u32(n) {
  const b = Buffer.alloc(4)
  b.writeUInt32BE(n)
  return b
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const crc = u32(crc32(Buffer.concat([t, data])))
  return Buffer.concat([u32(data.length), t, data, crc])
}

// Builds a solid-color PNG. Each scanline has a leading 0x00 filter byte (None).
function solidPNG(w, h, r, g, b) {
  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = pngChunk('IHDR', Buffer.concat([u32(w), u32(h), Buffer.from([8, 2, 0, 0, 0])]))

  // Build one scanline and repeat it h times
  const scanline = Buffer.alloc(1 + w * 3) // filter byte + RGB pixels
  for (let x = 0; x < w; x++) {
    scanline[1 + x * 3] = r
    scanline[2 + x * 3] = g
    scanline[3 + x * 3] = b
  }
  const raw  = Buffer.concat(Array.from({ length: h }, () => scanline))
  const idat = pngChunk('IDAT', deflateSync(raw))
  const iend = pngChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([sig, ihdr, idat, iend])
}

// Saffron: #f97316 → R:249 G:115 B:22
const [R, G, B] = [249, 115, 22]

mkdirSync('apps/web/public/icons', { recursive: true })
writeFileSync('apps/web/public/icons/icon-192x192.png', solidPNG(192, 192, R, G, B))
writeFileSync('apps/web/public/icons/icon-512x512.png', solidPNG(512, 512, R, G, B))
console.log('✓ icons/icon-192x192.png')
console.log('✓ icons/icon-512x512.png')
