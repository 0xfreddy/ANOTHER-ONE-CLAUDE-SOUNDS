#!/usr/bin/env node
// Interactive setup wizard for claude-sounds.
// Run: node bin/setup.js  (or: claude-sounds setup after npm link)

const { execFile, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const CONFIG_PATH = path.join(os.homedir(), '.claude-sounds.json');
const SOUNDS_DIR = path.join(__dirname, '..', 'sounds');
const PLAY_SCRIPT = path.join(__dirname, 'play.js');

// ─── ANSI helpers ────────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};
const b = (s) => `${c.bold}${s}${c.reset}`;
const dim = (s) => `${c.dim}${s}${c.reset}`;
const col = (color, s) => `${c[color]}${s}${c.reset}`;

// ─── Events definition ───────────────────────────────────────────────────────
const PRIMARY_EVENTS = [
  {
    key: 'stop',
    label: 'Task completed',
    description: 'Claude finishes a task and returns control',
    example: 'e.g. "fix the login bug" — Claude edits files, runs tests, then stops',
    defaultSound: 'djkhaled.mp3',
  },
  {
    key: 'question',
    label: 'Claude asks a question',
    description: 'Claude pauses to ask you for input or clarification',
    example: 'e.g. "Should I delete the old migration file or keep it?"',
    defaultSound: 'ronnie.mp3',
  },
  {
    key: 'pr-push',
    label: 'PR / git push',
    description: 'Claude pushes code to a remote repository',
    example: 'e.g. Claude runs "git push origin main" or creates a pull request',
    defaultSound: 'djkhaled.mp3',
  },
];

const SECONDARY_EVENTS = [
  {
    key: 'notification',
    label: 'Notification',
    description: 'A background job or sub-agent finishes',
    example: 'e.g. a background agent completes a code review while you keep working',
    defaultSound: '808mafia.mp3',
  },
  {
    key: 'tool-start',
    label: 'Tool call started',
    description: 'Claude begins using a tool (Bash, Read, Edit, Write, etc.)',
    example: 'e.g. Claude runs "npm test" or reads a file — you hear this as it starts',
    defaultSound: '808mafia.mp3',
  },
  {
    key: 'tool-end',
    label: 'Tool call finished',
    description: 'A tool call completes and returns its result',
    example: 'e.g. "npm test" finishes running and output is returned to Claude',
    defaultSound: 'ronnie.mp3',
  },
  {
    key: 'error',
    label: 'Error / failed task',
    description: 'A tool exits with a non-zero code or a command fails',
    example: 'e.g. "npm test" fails with 3 broken tests, or a build error occurs',
    defaultSound: '808mafia.mp3',
  },
];

const EVENTS = [...PRIMARY_EVENTS, ...SECONDARY_EVENTS];

// ─── Bundled sounds list ─────────────────────────────────────────────────────
function getBundledSounds() {
  return fs.readdirSync(SOUNDS_DIR)
    .filter((f) => f.endsWith('.wav') || f.endsWith('.mp3'))
    .sort();
}

// ─── Audio player detection ──────────────────────────────────────────────────
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
    return { cmd: 'afplay', args: [filePath] };
  }
  if (platform === 'win32') {
    if (ext === '.wav') {
      return { cmd: 'powershell', args: ['-c', `(New-Object Media.SoundPlayer '${filePath}').PlaySync()`] };
    }
    return { cmd: 'powershell', args: ['-c', `Start-Process wmplayer '${filePath}' -Wait`] };
  }
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

let _currentPlayback = null;

function stopPlayback() {
  if (_currentPlayback) {
    try { _currentPlayback.kill(); } catch (_) {}
    _currentPlayback = null;
  }
}

function previewSound(filename) {
  stopPlayback();
  const filePath = path.join(SOUNDS_DIR, filename);
  const player = getPlayer(filePath);
  if (!player) return;
  try {
    _currentPlayback = execFile(player.cmd, player.args, { stdio: 'ignore' }, () => {
      _currentPlayback = null;
    });
  } catch (_) {}
}

// ─── Simple raw readline menu ─────────────────────────────────────────────────
function clearLine() {
  process.stdout.write('\r\x1b[K');
}


function waitKey(message) {
  return new Promise((resolve) => {
    process.stdout.write(message);
    const rl = readline.createInterface({ input: process.stdin });
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once('data', (key) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      rl.close();
      process.stdout.write('\n');
      resolve(key.toString());
    });
  });
}

// Arrow-key menu: returns selected index
async function arrowMenu(options, selectedIndex = 0) {
  const render = (idx) => {
    process.stdout.write('\x1b[?25l'); // hide cursor
    for (let i = 0; i < options.length; i++) {
      const prefix = i === idx ? col('cyan', ' > ') : '   ';
      const label = i === idx ? b(options[i]) : dim(options[i]);
      process.stdout.write(`${prefix}${label}\n`);
    }
  };

  const clear = () => {
    process.stdout.write(`\x1b[${options.length}A`); // move up
    for (let i = 0; i < options.length; i++) {
      process.stdout.write('\r\x1b[K\n');
    }
    process.stdout.write(`\x1b[${options.length}A`);
  };

  render(selectedIndex);

  return new Promise((resolve) => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const handler = (key) => {
      if (key === '\u001B\u005B\u0041' || key === '\u001b[A') {
        // Up
        selectedIndex = (selectedIndex - 1 + options.length) % options.length;
        clear();
        render(selectedIndex);
      } else if (key === '\u001B\u005B\u0042' || key === '\u001b[B') {
        // Down
        selectedIndex = (selectedIndex + 1) % options.length;
        clear();
        render(selectedIndex);
      } else if (key === '\r' || key === '\n') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener('data', handler);
        process.stdout.write('\x1b[?25h'); // show cursor
        resolve(selectedIndex);
      } else if (key === '\u0003') {
        // Ctrl+C
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write('\x1b[?25h');
        process.exit(0);
      }
    };

    process.stdin.on('data', handler);
  });
}

// ─── Sound picker for a single event ─────────────────────────────────────────
async function pickSound(event, currentSound) {
  const bundled = getBundledSounds();
  const options = [
    ...bundled.map((f) => ({ label: f, value: f })),
    { label: '[ Disable this event ]', value: '__none__' },
  ];

  const currentIdx = options.findIndex((o) => o.value === currentSound) ?? 0;

  console.log(`\n${b(col('cyan', event.label))} — ${dim(event.description)}`);
  if (event.example) console.log(`  ${col('gray', event.example)}`);
  console.log(dim('\nUse arrow keys to browse. Press P to preview. Enter to select.\n'));

  // We'll do a custom loop for preview support
  let idx = Math.max(0, currentIdx);
  const labels = options.map((o) => {
    if (o.value === currentSound) return `${o.label}  ${col('green', '(current)')}`;
    return o.label;
  });

  const render = (i) => {
    process.stdout.write('\x1b[?25l');
    for (let j = 0; j < labels.length; j++) {
      const prefix = j === i ? col('cyan', ' > ') : '   ';
      const label = j === i ? b(labels[j]) : dim(labels[j]);
      process.stdout.write(`${prefix}${label}\n`);
    }
  };

  const clear = () => {
    process.stdout.write(`\x1b[${labels.length}A`);
    for (let j = 0; j < labels.length; j++) {
      process.stdout.write('\r\x1b[K\n');
    }
    process.stdout.write(`\x1b[${labels.length}A`);
  };

  render(idx);

  return new Promise((resolve) => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const handler = (key) => {
      if (key === '\u001b[A' || key === '\u001B\u005B\u0041') {
        idx = (idx - 1 + options.length) % options.length;
        clear(); render(idx);
      } else if (key === '\u001b[B' || key === '\u001B\u005B\u0042') {
        idx = (idx + 1) % options.length;
        clear(); render(idx);
      } else if (key === 'p' || key === 'P') {
        const sel = options[idx];
        if (sel.value !== '__none__') {
          clear(); render(idx);
          process.stdout.write(col('yellow', '  Playing...\n'));
          previewSound(sel.value);
          process.stdout.write('\x1b[1A\r\x1b[K');
        }
      } else if (key === '\r' || key === '\n') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener('data', handler);
        process.stdout.write('\x1b[?25h');
        resolve(options[idx]);
      } else if (key === '\u0003') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write('\x1b[?25h');
        process.exit(0);
      }
    };

    process.stdin.on('data', handler);
  });
}

// ─── Preview all sounds — interactive list, plays on navigation ───────────────
async function previewAllSounds() {
  const sounds = getBundledSounds();
  if (sounds.length === 0) {
    console.log(col('yellow', '  No sounds found in sounds/ folder.'));
    return;
  }

  console.log(`\n${b('  Preview sounds')}`);
  console.log(dim('  Arrow keys to navigate (plays automatically). Enter or Esc to go back.\n'));

  let idx = 0;
  let playDebounce = null;

  const render = (i) => {
    process.stdout.write('\x1b[?25l');
    for (let j = 0; j < sounds.length; j++) {
      const prefix = j === i ? col('cyan', ' > ') : '   ';
      const label  = j === i ? b(col('cyan', sounds[j])) : dim(sounds[j]);
      process.stdout.write(`${prefix}${label}\n`);
    }
  };

  const clear = () => {
    process.stdout.write(`\x1b[${sounds.length}A`);
    for (let j = 0; j < sounds.length; j++) {
      process.stdout.write('\r\x1b[K\n');
    }
    process.stdout.write(`\x1b[${sounds.length}A`);
  };

  // Play immediately on load
  render(idx);
  previewSound(sounds[idx]);

  return new Promise((resolve) => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const handler = (key) => {
      let moved = false;

      if (key === '\u001b[A' || key === '\u001B\u005B\u0041') {
        idx = (idx - 1 + sounds.length) % sounds.length;
        moved = true;
      } else if (key === '\u001b[B' || key === '\u001B\u005B\u0042') {
        idx = (idx + 1) % sounds.length;
        moved = true;
      } else if (key === '\r' || key === '\n' || key === '\u001b') {
        // Enter or Esc — go back
        if (playDebounce) clearTimeout(playDebounce);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener('data', handler);
        process.stdout.write('\x1b[?25h\n');
        resolve();
        return;
      } else if (key === '\u0003') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write('\x1b[?25h');
        process.exit(0);
      }

      if (moved) {
        clear();
        render(idx);
        // Debounce: wait 120ms after last navigation before playing
        // so rapid scrolling doesn't stack up audio processes
        if (playDebounce) clearTimeout(playDebounce);
        playDebounce = setTimeout(() => previewSound(sounds[idx]), 120);
      }
    };

    process.stdin.on('data', handler);
  });
}

// ─── Install hooks into Claude Code settings ──────────────────────────────────
function getClaudeSettingsPath() {
  const platform = process.platform;
  if (platform === 'darwin' || platform === 'linux') {
    return path.join(os.homedir(), '.claude', 'settings.json');
  }
  if (platform === 'win32') {
    return path.join(os.homedir(), 'AppData', 'Roaming', 'Claude', 'settings.json');
  }
  return path.join(os.homedir(), '.claude', 'settings.json');
}

function buildHookCommand(eventKey) {
  return `node "${PLAY_SCRIPT}" ${eventKey}`;
}

function installHooks() {
  const settingsPath = getClaudeSettingsPath();
  let settings = {};

  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (_) {
      settings = {};
    }
  } else {
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  }

  if (!settings.hooks) settings.hooks = {};

  // Helper to build an async command hook entry (async: true so sounds never block Claude)
  const asyncHook = (eventKey) => ({
    type: 'command',
    command: buildHookCommand(eventKey),
    async: true,
  });

  // Helper: replace or append a top-level hook group matching play.js
  const upsertHook = (arr, newEntry) => {
    const idx = arr.findIndex(
      (h) => h.hooks && h.hooks.some((hh) => hh.command && hh.command.includes('play.js'))
    );
    if (idx >= 0) arr[idx] = newEntry; else arr.push(newEntry);
  };

  // Stop — fires when Claude yields control back
  settings.hooks.Stop = settings.hooks.Stop || [];
  upsertHook(settings.hooks.Stop, {
    matcher: '',
    hooks: [asyncHook('stop')],
  });

  // Notification
  settings.hooks.Notification = settings.hooks.Notification || [];
  upsertHook(settings.hooks.Notification, {
    matcher: '',
    hooks: [asyncHook('notification')],
  });

  // PreToolUse — tool-start
  settings.hooks.PreToolUse = settings.hooks.PreToolUse || [];
  upsertHook(settings.hooks.PreToolUse, {
    matcher: '',
    hooks: [asyncHook('tool-start')],
  });

  // PostToolUse — tool-end (all tools) + pr-push (Bash with git push)
  settings.hooks.PostToolUse = settings.hooks.PostToolUse || [];
  // Remove all existing claude-sounds PostToolUse hooks before reinserting
  settings.hooks.PostToolUse = settings.hooks.PostToolUse.filter(
    (h) => !(h.hooks && h.hooks.some((hh) => hh.command && hh.command.includes('play.js')))
  );
  // tool-end for all tools
  settings.hooks.PostToolUse.push({
    matcher: '',
    hooks: [asyncHook('tool-end')],
  });
  // pr-push: best-effort — fires after any Bash call; play.js is fast and async so no perf impact
  settings.hooks.PostToolUse.push({
    matcher: 'Bash',
    hooks: [{
      type: 'command',
      command: `node "${PLAY_SCRIPT}" pr-push`,
      async: true,
    }],
  });

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  return settingsPath;
}

// ─── Main wizard ──────────────────────────────────────────────────────────────
async function main() {
  console.clear();
  console.log(b(col('cyan', '  Claude Sounds — Setup Wizard')));
  console.log(dim('  Producer tags for your terminal\n'));

  // Load existing config
  let config = {};
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      console.log(col('green', `  Found existing config at ${CONFIG_PATH}\n`));
    } catch (_) {}
  }

  // Check audio player
  const player = getPlayer(path.join(SOUNDS_DIR, 'complete.wav'));
  if (!player) {
    console.log(col('yellow', '  Warning: No audio player detected (afplay/paplay/aplay/powershell).'));
    console.log(col('yellow', '  Sounds will be configured but may not play on this system.\n'));
  }

  // Top-level menu
  while (true) {
    console.log(b('\n  What would you like to do?\n'));
    const topOptions = [
      'Configure event sounds',
      'Preview all sounds',
      'Install hooks into Claude Code',
      'Show current config',
      'Exit',
    ];
    const choice = await arrowMenu(topOptions);
    console.log('');

    if (choice === 0) {
      // ── Primary events ──
      console.log(b(col('cyan', '\n  Main Events\n')));
      console.log(dim('  These fire on key moments — when Claude finishes, asks you something, or pushes code.\n'));

      for (const event of PRIMARY_EVENTS) {
        const current = config[event.key] || event.defaultSound;
        const selected = await pickSound(event, current);

        if (selected.value === '__none__') {
          delete config[event.key];
          console.log(col('gray', `  ${event.label}: disabled\n`));
        } else {
          config[event.key] = selected.value;
          console.log(col('green', `  ${event.label}: ${selected.value}\n`));
        }
      }

      // ── Secondary events ──
      console.log(b(col('yellow', '\n  Secondary Events\n')));
      console.log(col('yellow', '  Heads up: configuring these too could turn your room into a Chief Keef music video.\n'));
      console.log(dim('  These fire on every tool call, notification, and error — it adds up fast.\n'));

      const secondaryOptions = ['Yes, configure secondary events', 'Skip — keep it chill'];
      const secondaryChoice = await arrowMenu(secondaryOptions);
      console.log('');

      if (secondaryChoice === 0) {
        for (const event of SECONDARY_EVENTS) {
          const current = config[event.key] || event.defaultSound;
          const selected = await pickSound(event, current);

          if (selected.value === '__none__') {
            delete config[event.key];
            console.log(col('gray', `  ${event.label}: disabled\n`));
          } else {
            config[event.key] = selected.value;
            console.log(col('green', `  ${event.label}: ${selected.value}\n`));
          }
        }
      } else {
        console.log(dim('  Skipped secondary events. You can configure them later.\n'));
      }

      // Save config
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
      console.log(col('green', b(`\n  Config saved to ${CONFIG_PATH}`)));

    } else if (choice === 1) {
      // Preview all sounds — interactive list, auto-plays on navigation
      await previewAllSounds();

    } else if (choice === 2) {
      // Install hooks
      try {
        const settingsPath = installHooks();
        console.log(col('green', `  Hooks installed into ${settingsPath}`));
        console.log(dim('  Restart Claude Code for hooks to take effect.'));
      } catch (e) {
        console.log(col('red', `  Failed to install hooks: ${e.message}`));
      }

    } else if (choice === 3) {
      // Show config
      if (Object.keys(config).length === 0) {
        console.log(col('yellow', '  No config found. Run "Configure event sounds" first.'));
      } else {
        console.log(b(col('cyan', '  Main Events:\n')));
        for (const event of PRIMARY_EVENTS) {
          const sound = config[event.key];
          const label = event.label.padEnd(28);
          if (sound) {
            console.log(`  ${col('cyan', label)} ${col('green', sound)}`);
          } else {
            console.log(`  ${col('cyan', label)} ${dim('(disabled)')}`);
          }
        }
        console.log(b(col('yellow', '\n  Secondary Events:\n')));
        for (const event of SECONDARY_EVENTS) {
          const sound = config[event.key];
          const label = event.label.padEnd(28);
          if (sound) {
            console.log(`  ${col('cyan', label)} ${col('green', sound)}`);
          } else {
            console.log(`  ${col('cyan', label)} ${dim('(disabled)')}`);
          }
        }
      }

    } else if (choice === 4) {
      console.log(col('cyan', '\n  Goodbye.\n'));
      process.exit(0);
    }
  }
}

main().catch((e) => {
  console.error(col('red', `\nError: ${e.message}`));
  process.exit(1);
});
