/**
 * Pure Node.js PNG icon generator for BiteBuddy PWA icons
 * Generates valid icon-192.png, icon-512.png, and apple-touch-icon.png
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 implementation for PNG chunks
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const crcValue = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crcValue, 0);

  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

function generatePngBuffer(size, r = 22, g = 163, b = 74) {
  const width = size;
  const height = size;

  // Header: 8 bytes
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8 bit depth
  ihdrData.writeUInt8(6, 9); // RGBA color type
  ihdrData.writeUInt8(0, 10); // Compression
  ihdrData.writeUInt8(0, 11); // Filter
  ihdrData.writeUInt8(0, 12); // Interlace
  const ihdrChunk = createPngChunk('IHDR', ihdrData);

  // Scanline data: (1 filter byte + width * 4 bytes RGBA) * height
  const scanlines = [];
  const radius = size * 0.22;
  const center = size / 2;

  for (let y = 0; y < height; y++) {
    const line = Buffer.alloc(1 + width * 4);
    line[0] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const idx = 1 + x * 4;

      // Rounded squircle background
      const dx = Math.max(Math.abs(x - center) - (center - radius), 0);
      const dy = Math.max(Math.abs(y - center) - (center - radius), 0);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > radius) {
        // Transparent
        line[idx] = 0;
        line[idx + 1] = 0;
        line[idx + 2] = 0;
        line[idx + 3] = 0;
      } else {
        // Inner icon design: Bento Box geometry
        const relX = x / size;
        const relY = y / size;

        // Outer bento white box: 0.2 to 0.8 in X, 0.25 to 0.75 in Y
        const inBento = relX >= 0.2 && relX <= 0.8 && relY >= 0.25 && relY <= 0.75;
        const inVeg = relX >= 0.26 && relX <= 0.48 && relY >= 0.32 && relY <= 0.48;
        const inNonVeg = relX >= 0.52 && relX <= 0.74 && relY >= 0.32 && relY <= 0.48;
        const inRice = relX >= 0.26 && relX <= 0.74 && relY >= 0.54 && relY <= 0.68;

        if (inVeg) {
          // Vibrant Green 🥦
          line[idx] = 22;
          line[idx + 1] = 163;
          line[idx + 2] = 74;
          line[idx + 3] = 255;
        } else if (inNonVeg) {
          // Warm Terracotta / Red 🍗
          line[idx] = 220;
          line[idx + 1] = 38;
          line[idx + 2] = 38;
          line[idx + 3] = 255;
        } else if (inRice) {
          // Warm Golden Yellow 🍚
          line[idx] = 245;
          line[idx + 1] = 158;
          line[idx + 2] = 11;
          line[idx + 3] = 255;
        } else if (inBento) {
          // Crisp White Bento Container
          line[idx] = 255;
          line[idx + 1] = 255;
          line[idx + 2] = 255;
          line[idx + 3] = 255;
        } else {
          // Rich Emerald Background
          line[idx] = r;
          line[idx + 1] = g;
          line[idx + 2] = b;
          line[idx + 3] = 255;
        }
      }
    }
    scanlines.push(line);
  }

  const rawData = Buffer.concat(scanlines);
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createPngChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createPngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate 192x192 PNG
const png192 = generatePngBuffer(192);
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), png192);
console.log('✓ Generated public/icons/icon-192.png');

// Generate 512x512 PNG
const png512 = generatePngBuffer(512);
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), png512);
console.log('✓ Generated public/icons/icon-512.png');

// Generate apple-touch-icon.png
const pngApple = generatePngBuffer(180);
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), pngApple);
console.log('✓ Generated public/icons/apple-touch-icon.png');

// Copy favicon into public/
const publicDir = path.join(__dirname, '..', 'public');
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), png192);
console.log('✓ Generated public/favicon.ico');
