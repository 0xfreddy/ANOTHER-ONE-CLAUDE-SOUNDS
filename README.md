# claude-sounds

Sound notifications for Claude Code events. Plays a sound whenever Claude completes a task, asks a question, pushes a PR, and more.

## Requirements

- Node.js 16+
- Audio playback:
  - **macOS**: `afplay` (built-in)
  - **Linux**: `paplay` or `aplay` (wav), `mpg123` or `ffplay` (mp3)
  - **Windows**: PowerShell built-in (wav), Windows Media Player (mp3)

## Setup

```bash
cd claude-sounds
npm install
node bin/setup.js
```

The wizard lets you:
1. **Configure event sounds** — browse the bundled sound pack with arrow keys, press `P` to preview any sound, Enter to assign it to an event
2. **Preview all sounds** — play through all bundled sounds in sequence
3. **Install hooks into Claude Code** — writes hooks to `~/.claude/settings.json` automatically
4. **Show current config** — review your assignments

After installing hooks, restart Claude Code for them to take effect.

## Events

| Event key | When it fires |
|---|---|
| `stop` | Claude finishes a task and returns control |
| `question` | Claude stops and asks for clarification |
| `notification` | Sub-agent done, background notification |
| `tool-start` | Any tool call begins (Bash, Read, Edit, etc.) |
| `tool-end` | Any tool call finishes |
| `pr-push` | A `git push` command is detected |

## Bundled sounds

All sounds live in `sounds/` and are included with the tool:

| File | Character |
|---|---|
| `complete.wav` | Rising major arpeggio |
| `question.wav` | Two-tone rising interval |
| `tool-start.wav` | Soft low click |
| `tool-end.wav` | Soft mid pop |
| `notification.wav` | Bright ping |
| `pr-push.wav` | Four-note fanfare |
| `error.wav` | Descending minor interval |
| `alert.wav` | Double beep |
| `chime.wav` | Soft major chord |

## Config file

Assignments are stored in `~/.claude-sounds.json`:

```json
{
  "stop": "complete.wav",
  "question": "question.wav",
  "notification": "notification.wav",
  "tool-start": "tool-start.wav",
  "tool-end": "tool-end.wav",
  "pr-push": "pr-push.wav"
}
```

## Manual hook setup

If you prefer to configure hooks by hand, add this to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "Stop":         [{ "matcher": "", "hooks": [{ "type": "command", "command": "node /path/to/claude-sounds/bin/play.js stop",         "async": true }] }],
    "Notification": [{ "matcher": "", "hooks": [{ "type": "command", "command": "node /path/to/claude-sounds/bin/play.js notification", "async": true }] }],
    "PreToolUse":   [{ "matcher": "", "hooks": [{ "type": "command", "command": "node /path/to/claude-sounds/bin/play.js tool-start",   "async": true }] }],
    "PostToolUse":  [
      { "matcher": "",     "hooks": [{ "type": "command", "command": "node /path/to/claude-sounds/bin/play.js tool-end",  "async": true }] },
      { "matcher": "Bash", "hooks": [{ "type": "command", "command": "node /path/to/claude-sounds/bin/play.js pr-push",  "async": true }] }
    ]
  }
}
```
