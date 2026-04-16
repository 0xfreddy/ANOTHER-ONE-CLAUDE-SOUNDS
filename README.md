# claude-sounds

Your terminal has no business being this quiet.

claude-sounds hooks into [Claude Code](https://claude.ai/code) events and drops producer tags every time something happens — task done, tool fired, PR pushed. Like having a hype man in your IDE.

## The Sound Pack

Every sound in here is a producer tag. You know the ones.

| File | Tag |
|---|---|
| `808mafia.mp3` | 808 Mafia (Southside) |
| `djkhaled.mp3` | DJ Khaled |
| `ronnie.mp3` | Ronny J |

Map any tag to any event. Want DJ Khaled screaming "ANOTHER ONE" every time Claude finishes a task? Done. Want Ronny J ad-libbing every tool call? Say less.

## Setup

```bash
cd claude-sounds
npm install
node bin/setup.js
```

The setup wizard lets you:
1. **Assign tags to events** — arrow keys to browse, `P` to preview, Enter to lock it in
2. **Preview all tags** — auto-plays as you scroll through the roster
3. **Install hooks into Claude Code** — writes everything to `~/.claude/settings.json`
4. **Show current config** — see what's mapped where

Restart Claude Code after installing hooks.

## Events

| Event | When it fires |
|---|---|
| `stop` | Claude finishes a task and returns control |
| `question` | Claude stops to ask you something |
| `notification` | Background agent or sub-agent finishes |
| `tool-start` | Any tool call begins (Bash, Read, Edit, etc.) |
| `tool-end` | Any tool call finishes |
| `pr-push` | A `git push` is detected |
| `error` | A command or tool fails |

## Requirements

- Node.js 16+
- Audio playback:
  - **macOS**: `afplay` (built-in, handles mp3 natively)
  - **Linux**: `mpg123`, `ffplay`, or `mplayer`
  - **Windows**: PowerShell / Windows Media Player

## Config

Assignments live in `~/.claude-sounds.json`:

```json
{
  "stop": "djkhaled.mp3",
  "question": "ronnie.mp3",
  "notification": "808mafia.mp3",
  "pr-push": "djkhaled.mp3"
}
```

## Adding Your Own Tags

Drop any `.mp3` or `.wav` into `sounds/` and it shows up in the setup wizard. Collect the whole discography.

## Manual Hook Setup

If you'd rather wire it up yourself, add this to `~/.claude/settings.json`:

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
