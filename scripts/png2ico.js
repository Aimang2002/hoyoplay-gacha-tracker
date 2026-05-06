const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

function readPngDimensions(buffer) {
  if (buffer[0] !== 0x89 || buffer[1] !== 0x50) return null
  const width = buffer.readUInt32BE(16)
  const height = buffer.readUInt32BE(20)
  return { width, height }
}

function createIcoFromPng(pngBuffer) {
  const dim = readPngDimensions(pngBuffer)
  if (!dim) throw new Error('Invalid PNG file')

  const sizes = [16, 32, 48, 256]
  const entries = []

  for (const size of sizes) {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0)
    entry.writeUInt8(size >= 256 ? 0 : size, 1)
    entry.writeUInt8(0, 2)
    entry.writeUInt8(0, 3)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(pngBuffer.length, 8)
    entries.push(entry)
  }

  const headerSize = 6
  const dirSize = entries.length * 16
  let dataOffset = headerSize + dirSize

  for (const entry of entries) {
    entry.writeUInt32LE(dataOffset, 12)
    dataOffset += pngBuffer.length
  }

  const header = Buffer.alloc(headerSize)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(entries.length, 4)

  const parts = [header, ...entries]
  for (let i = 0; i < entries.length; i++) {
    parts.push(pngBuffer)
  }

  return Buffer.concat(parts)
}

const pngPath = path.join(__dirname, '..', 'build', 'icon.png')
const icoPath = path.join(__dirname, '..', 'build', 'icon.ico')

const pngBuffer = fs.readFileSync(pngPath)
const dim = readPngDimensions(pngBuffer)
console.log(`Source PNG: ${dim.width}x${dim.height}`)

const ico = createIcoFromPng(pngBuffer)
fs.writeFileSync(icoPath, ico)
console.log('Generated icon.ico (PNG-embedded, Vista+ compatible)')
