const fs = require('fs');
const { PNG } = require('pngjs');

const [, , inputPath, outputPath = inputPath, mode] = process.argv;

if (!inputPath) {
  throw new Error('Uso: node scripts/normalize-generated-png.js <entrada> [salida]');
}

const image = PNG.sync.read(fs.readFileSync(inputPath));

if (mode === '--clear-neutral-border') {
  const { width, height, data } = image;
  const visited = new Uint8Array(width * height);
  const queue = [];
  const isNeutralBackdrop = index => {
    const offset = index * 4;
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    return data[offset + 3] > 0
      && Math.min(red, green, blue) >= 195
      && Math.max(red, green, blue) - Math.min(red, green, blue) <= 20;
  };
  const enqueue = index => {
    if (index < 0 || index >= visited.length || visited[index] || !isNeutralBackdrop(index)) return;
    visited[index] = 1;
    queue.push(index);
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue(((height - 1) * width) + x);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(y * width);
    enqueue((y * width) + width - 1);
  }

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor];
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) enqueue(index - 1);
    if (x < width - 1) enqueue(index + 1);
    if (y > 0) enqueue(index - width);
    if (y < height - 1) enqueue(index + width);
  }

  visited.forEach((removed, index) => {
    if (removed) data[(index * 4) + 3] = 0;
  });
}

fs.writeFileSync(outputPath, PNG.sync.write(image, { colorType: 6 }));
