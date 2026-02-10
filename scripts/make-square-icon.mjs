/**
 * Center-crops assets/icon.png to 1024×1024 so Expo's icon schema passes.
 * Run: node scripts/make-square-icon.mjs
 */
import { renameSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const inputPath = join(root, 'assets', 'icon.png');
const tempPath = join(root, 'assets', 'icon-square-temp.png');

const sharp = (await import('sharp')).default;
const image = sharp(inputPath);
const metadata = await image.metadata();
const { width = 0, height = 0 } = metadata;

const size = Math.min(width, height, 1024);
const left = Math.floor((width - size) / 2);
const top = Math.floor((height - size) / 2);

await image
  .extract({ left, top, width: size, height: size })
  .resize(1024, 1024)
  .png()
  .toFile(tempPath);

unlinkSync(inputPath);
renameSync(tempPath, inputPath);
console.log(`Wrote square icon 1024×1024 to ${inputPath}`);
