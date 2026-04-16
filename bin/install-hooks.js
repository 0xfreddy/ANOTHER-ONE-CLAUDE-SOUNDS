#!/usr/bin/env node
// One-shot hook installer. Adds claude-sounds hooks to ~/.claude/settings.json
// without touching any existing hooks.

const fs = require('fs');
const path = require('path');
const os = require('os');

const PLAY_SCRIPT = path.join(__dirname, 'play.js');
const SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');

const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
if (!settings.hooks) settings.hooks = {};

const asyncCmd = (eventKey) => ({
  type: 'command',
  command: `node "${PLAY_SCRIPT}" ${eventKey}`,
  async: true,
});

const alreadyInstalled = (arr) =>
  arr && arr.some((h) => h.hooks && h.hooks.some((hh) => hh.command && hh.command.includes('play.js')));

// Stop
settings.hooks.Stop = settings.hooks.Stop || [];
if (!alreadyInstalled(settings.hooks.Stop)) {
  settings.hooks.Stop.push({ matcher: '', hooks: [asyncCmd('stop')] });
}

// Notification
settings.hooks.Notification = settings.hooks.Notification || [];
if (!alreadyInstalled(settings.hooks.Notification)) {
  settings.hooks.Notification.push({ matcher: '', hooks: [asyncCmd('notification')] });
}

// PreToolUse
settings.hooks.PreToolUse = settings.hooks.PreToolUse || [];
if (!alreadyInstalled(settings.hooks.PreToolUse)) {
  settings.hooks.PreToolUse.push({ matcher: '', hooks: [asyncCmd('tool-start')] });
}

// PostToolUse — tool-end (all) + pr-push (Bash only)
settings.hooks.PostToolUse = settings.hooks.PostToolUse || [];
if (!alreadyInstalled(settings.hooks.PostToolUse)) {
  settings.hooks.PostToolUse.push({ matcher: '', hooks: [asyncCmd('tool-end')] });
  settings.hooks.PostToolUse.push({ matcher: 'Bash', hooks: [asyncCmd('pr-push')] });
}

fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
console.log('Hooks installed into', SETTINGS_PATH);
