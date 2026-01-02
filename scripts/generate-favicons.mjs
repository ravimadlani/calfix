import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

async function generateFavicons() {
  const svgBuffer = readFileSync(join(publicDir, 'favicon.svg'));

  // Generate 32x32 PNG for favicon.ico
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(join(publicDir, 'favicon-32.png'));

  // Generate 180x180 for apple-touch-icon
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(join(publicDir, 'apple-touch-icon.png'));

  // Create ICO file (modern browsers accept PNG with .ico extension)
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(join(publicDir, 'favicon.ico'));

  console.log('Favicons generated successfully!');
  console.log('- favicon.ico (32x32)');
  console.log('- apple-touch-icon.png (180x180)');
}

generateFavicons().catch(console.error);
