/**
 * Writes a short loud alarm-like WAV (line-level, under 30s) for iOS notification sounds.
 * Run: node scripts/generate-shabbos-alarm.mjs
 */
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../assets/sounds');
const outFile = join(outDir, 'shabbos-alarm.wav');

const sampleRate = 22050;
const durationSec = 28;
const numSamples = sampleRate * durationSec;
const twoPi = Math.PI * 2;
const freq = 880;
const vol = 0.92 * 0x7fff;

const buf = new Int16Array(numSamples);
let phase = 0;
const dPhase = (twoPi * freq) / sampleRate;
for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;
  // Urgent: fast beep pattern (0.12s on / 0.1s off)
  const cycle = t % 0.22;
  const on = cycle < 0.12;
  if (on) {
    // Square-ish + fundamental for a harsh "alarm" character
    const s = Math.sin(phase) > 0 ? 1 : -1;
    buf[i] = s * vol;
  } else {
    buf[i] = 0;
  }
  phase += dPhase;
  if (phase > twoPi) phase -= twoPi;
}

// Minimal WAV (PCM 16-bit mono)
const dataSize = numSamples * 2;
const fileSize = 36 + dataSize;
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(fileSize, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(dataSize, 40);

const pcm = Buffer.alloc(dataSize);
for (let i = 0; i < numSamples; i++) {
  pcm.writeInt16LE(buf[i], i * 2);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, Buffer.concat([header, pcm]));
console.log('Wrote', outFile, `(${durationSec}s)`);
