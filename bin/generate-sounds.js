#!/usr/bin/env node
// Generates simple WAV files for the bundled sound pack.
// Each sound is a sine wave at a specific frequency and duration.
// Run once: node bin/generate-sounds.js

const fs = require('fs');
const path = require('path');

function generateWav(frequency, durationMs, volume = 0.5, fadeMs = 30) {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * durationMs / 1000);
  const fadeSamples = Math.floor(sampleRate * fadeMs / 1000);
  const dataSize = numSamples * 2; // 16-bit samples

  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);       // PCM chunk size
  buffer.writeUInt16LE(1, 20);        // PCM format
  buffer.writeUInt16LE(1, 22);        // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32);        // block align
  buffer.writeUInt16LE(16, 34);       // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    let env = 1.0;
    if (i < fadeSamples) env = i / fadeSamples;
    if (i > numSamples - fadeSamples) env = (numSamples - i) / fadeSamples;

    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate);
    const value = Math.round(sample * volume * env * 32767);
    buffer.writeInt16LE(value, 44 + i * 2);
  }

  return buffer;
}

function generateChord(frequencies, durationMs, volume = 0.4, fadeMs = 40) {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * durationMs / 1000);
  const fadeSamples = Math.floor(sampleRate * fadeMs / 1000);
  const dataSize = numSamples * 2;

  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    let env = 1.0;
    if (i < fadeSamples) env = i / fadeSamples;
    if (i > numSamples - fadeSamples) env = (numSamples - i) / fadeSamples;

    let sample = 0;
    for (const freq of frequencies) {
      sample += Math.sin(2 * Math.PI * freq * i / sampleRate);
    }
    sample /= frequencies.length;

    const value = Math.round(sample * volume * env * 32767);
    buffer.writeInt16LE(value, 44 + i * 2);
  }

  return buffer;
}

function generateArpeggio(frequencies, noteDurationMs, volume = 0.45, fadeMs = 20) {
  const sampleRate = 44100;
  const noteSamples = Math.floor(sampleRate * noteDurationMs / 1000);
  const fadeSamples = Math.floor(sampleRate * fadeMs / 1000);
  const numSamples = noteSamples * frequencies.length;
  const dataSize = numSamples * 2;

  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let n = 0; n < frequencies.length; n++) {
    const freq = frequencies[n];
    for (let i = 0; i < noteSamples; i++) {
      const gi = n * noteSamples + i;
      let env = 1.0;
      if (i < fadeSamples) env = i / fadeSamples;
      if (i > noteSamples - fadeSamples) env = (noteSamples - i) / fadeSamples;

      const sample = Math.sin(2 * Math.PI * freq * i / sampleRate);
      const value = Math.round(sample * volume * env * 32767);
      buffer.writeInt16LE(value, 44 + gi * 2);
    }
  }

  return buffer;
}

const soundsDir = path.join(__dirname, '..', 'sounds');

const sounds = {
  // Task completed — rising major chord arpeggio
  'complete.wav': () => generateArpeggio([523, 659, 784], 120, 0.45, 15),

  // Claude asks a question — two-tone rising interval
  'question.wav': () => generateArpeggio([440, 550], 160, 0.4, 20),

  // Tool call started — soft low click
  'tool-start.wav': () => generateWav(280, 80, 0.3, 20),

  // Tool call finished — soft mid pop
  'tool-end.wav': () => generateWav(520, 90, 0.3, 20),

  // Notification / sub-agent done — bright ping
  'notification.wav': () => generateWav(880, 180, 0.42, 30),

  // PR pushed — short fanfare arpeggio
  'pr-push.wav': () => generateArpeggio([523, 659, 784, 1047], 100, 0.45, 15),

  // Error — descending minor interval
  'error.wav': () => generateArpeggio([440, 330], 150, 0.4, 20),

  // Alert — pulsed double beep
  'alert.wav': () => {
    const a = generateWav(660, 100, 0.4, 15);
    const b = generateWav(660, 100, 0.4, 15);
    const silence = Buffer.alloc(44100 * 2 * 0.08); // 80ms silence
    // Merge: skip headers of b and silence, concat raw PCM
    const pcmA = a.slice(44);
    const pcmB = b.slice(44);
    const totalPcm = Buffer.concat([pcmA, silence, pcmB]);
    const dataSize = totalPcm.length;
    const out = Buffer.alloc(44 + dataSize);
    out.write('RIFF', 0);
    out.writeUInt32LE(36 + dataSize, 4);
    out.write('WAVE', 8);
    out.write('fmt ', 12);
    out.writeUInt32LE(16, 16);
    out.writeUInt16LE(1, 20);
    out.writeUInt16LE(1, 22);
    out.writeUInt32LE(44100, 24);
    out.writeUInt32LE(44100 * 2, 28);
    out.writeUInt16LE(2, 32);
    out.writeUInt16LE(16, 34);
    out.write('data', 36);
    out.writeUInt32LE(dataSize, 40);
    totalPcm.copy(out, 44);
    return out;
  },

  // Chime — soft major chord
  'chime.wav': () => generateChord([523, 659, 784], 350, 0.38, 50),
};

for (const [filename, generate] of Object.entries(sounds)) {
  const outPath = path.join(soundsDir, filename);
  fs.writeFileSync(outPath, generate());
  console.log(`Generated ${filename}`);
}

console.log('All sounds generated.');
