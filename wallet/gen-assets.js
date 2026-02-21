const fs = require('fs');
const zlib = require('zlib');

function createPNG(w, h, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(17);
  ihdrData.write('IHDR', 0);
  ihdrData.writeUInt32BE(w, 4);
  ihdrData.writeUInt32BE(h, 8);
  ihdrData[12] = 8;  // bit depth
  ihdrData[13] = 2;  // color type (RGB)
  ihdrData[14] = 0;  // compression
  ihdrData[15] = 0;  // filter
  ihdrData[16] = 0;  // interlace

  const ihdrLen = Buffer.alloc(4);
  ihdrLen.writeUInt32BE(13, 0);

  const ihdrCrc = Buffer.alloc(4);
  ihdrCrc.writeUInt32BE(zlib.crc32(ihdrData) >>> 0, 0);

  // Image data
  const raw = [];
  for (let y = 0; y < h; y++) {
    raw.push(0); // filter byte
    for (let x = 0; x < w; x++) {
      raw.push(r, g, b);
    }
  }
  const compressed = zlib.deflateSync(Buffer.from(raw));

  // IDAT chunk
  const idatType = Buffer.from('IDAT');
  const idatLen = Buffer.alloc(4);
  idatLen.writeUInt32BE(compressed.length, 0);
  const idatCrc = Buffer.alloc(4);
  idatCrc.writeUInt32BE(zlib.crc32(compressed, zlib.crc32(idatType)) >>> 0, 0);

  // IEND chunk
  const iendType = Buffer.from('IEND');
  const iendLen = Buffer.alloc(4);
  iendLen.writeUInt32BE(0, 0);
  const iendCrc = Buffer.alloc(4);
  iendCrc.writeUInt32BE(zlib.crc32(iendType) >>> 0, 0);

  return Buffer.concat([
    sig,
    ihdrLen, ihdrData, ihdrCrc,
    idatLen, idatType, compressed, idatCrc,
    iendLen, iendType, iendCrc
  ]);
}

// Dark blue theme color: #1a1a2e = rgb(26, 26, 46)
fs.writeFileSync('assets/icon.png', createPNG(1024, 1024, 26, 26, 46));
fs.writeFileSync('assets/adaptive-icon.png', createPNG(1024, 1024, 26, 26, 46));
fs.writeFileSync('assets/favicon.png', createPNG(48, 48, 26, 26, 46));
fs.writeFileSync('assets/splash-icon.png', createPNG(200, 200, 26, 26, 46));

console.log('Created all asset PNGs successfully!');
