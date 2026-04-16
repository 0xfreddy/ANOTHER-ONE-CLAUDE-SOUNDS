#!/usr/bin/env node
// Usage: node bin/play.js <event-name>
// Called by Claude Code hooks via async command hooks.
// Reads ~/.claude-sounds.json and plays the assigned sound for the event.
// Claude Code passes hook context JSON on stdin — used for pr-push detection.
// Silent no-op if unconfigured or no audio player available.

const { execFile, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_PATH = path.join(os.homedir(), '.claude-sounds.json');
const SOUNDS_DIR = path.join(__dirname, '..', 'sounds');

function hasBin(name) {
  try {
    execFileSync('which', [name], { stdio: 'ignore' });
    return true;
  } catch (_) {
    return false;
  }
}

function getPlayer(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const platform = process.platform;

  if (platform === 'darwin') {
    // afplay handles both .wav and .mp3 natively on macOS
    return { cmd: 'afplay', args: [filePath] };
  }

  if (platform === 'win32') {
    if (ext === '.wav') {
      return {
        cmd: 'powershell',
        args: ['-c', `(New-Object Media.SoundPlayer '${filePath}').PlaySync()`],
      };
    }
    return {
      cmd: 'powershell',
      args: ['-c', `Start-Process wmplayer '${filePath}' -Wait`],
    };
  }

  // Linux
  if (ext === '.mp3') {
    for (const bin of ['mpg123', 'ffplay', 'mplayer']) {
      if (hasBin(bin)) {
        if (bin === 'ffplay') return { cmd: 'ffplay', args: ['-nodisp', '-autoexit', filePath] };
        return { cmd: bin, args: ['-q', filePath] };
      }
    }
  } else {
    for (const bin of ['paplay', 'aplay']) {
      if (hasBin(bin)) return { cmd: bin, args: [filePath] };
    }
    if (hasBin('ffplay')) return { cmd: 'ffplay', args: ['-nodisp', '-autoexit', filePath] };
  }

  return null;
}

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (_) {
    return {};
  }
}

function resolveSound(filename) {
  if (!filename) return null;
  const bundled = path.join(SOUNDS_DIR, filename);
  return fs.existsSync(bundled) ? bundled : null;
}

function playSound(filePath) {
  const player = getPlayer(filePath);
  if (!player) return;
  execFile(player.cmd, player.args, { stdio: 'ignore' }, () => {});
}

// ─── Main ─────────────────────────────────────────────────────────────────────

let eventName = process.argv[2];
if (!eventName) process.exit(0);

// For pr-push: Claude Code sends hook context as JSON on stdin.
// We inspect the Bash command to confirm it contains "git push".
// Other events don't need stdin inspection — we read it but ignore it.
function run(stdinData) {
  let resolvedEvent = eventName;

  if (eventName === 'pr-push') {
    // Only play pr-push sound if the Bash command contains "git push"
    try {
      const ctx = JSON.parse(stdinData);
      const cmd = (ctx.tool_input && ctx.tool_input.command) || '';
      if (!/git\s+push/.test(cmd)) {
        process.exit(0);
      }
    } catch (_) {
      // No valid JSON context — skip to avoid false positives
      process.exit(0);
    }
  }

  const config = loadConfig();
  const soundValue = config[resolvedEvent];
  const soundFile = resolveSound(soundValue);

  if (soundFile) {
    playSound(soundFile);
  }
}

// Only pr-push needs stdin (to inspect the Bash command).
// All other events run immediately without reading stdin.
if (eventName !== 'pr-push') {
  run('');
} else {
  let stdinData = '';
  const stdinTimeout = setTimeout(() => run(stdinData), 200);
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { stdinData += chunk; });
  process.stdin.on('end', () => { clearTimeout(stdinTimeout); run(stdinData); });
  process.stdin.resume();
}
