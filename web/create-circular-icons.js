const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

async function createCircularIcon(inputPath, outputPath) {
  // Load the image
  const image = await loadImage(inputPath);

  // Create canvas
  const size = 60;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Draw white circle with shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(30, 30, 28, 0, Math.PI * 2);
  ctx.fill();

  // Reset shadow
  ctx.shadowColor = 'transparent';

  // Clip to circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(30, 30, 26, 0, Math.PI * 2);
  ctx.clip();

  // Draw image
  ctx.drawImage(image, 4, 4, 52, 52);
  ctx.restore();

  // Save
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Created ${outputPath}`);
}

async function main() {
  const avatarsDir = path.join(__dirname, 'public', 'avatars');

  for (let i = 1; i <= 12; i++) {
    const input = path.join(avatarsDir, `odyssey-${i}.png`);
    const output = path.join(avatarsDir, `odyssey-${i}-circle.png`);
    await createCircularIcon(input, output);
  }

  console.log('All circular icons created!');
}

main().catch(console.error);
