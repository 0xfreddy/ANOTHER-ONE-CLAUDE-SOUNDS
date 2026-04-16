# claude-sounds

Your terminal has no business being this quiet.

**claude-sounds** hooks into [Claude Code](https://claude.ai/code) events and drops producer tags every time something happens — task done, tool fired, PR pushed. Like having a hype man in your IDE.

---

## The Sound Pack

Every sound in here is a producer tag. You know the ones.

| File | Tag | Duration |
|------|-----|----------|
| `808mafia.mp3` | 808 Mafia (Southside) | 5s |
| `djkhaled.mp3` | DJ Khaled | 6s |
| `maybach-music.mp3` | Maybach Music (Rick Ross) | 23s |
| `Metro Boomin.mp3` | Metro Boomin | 5s |
| `Murda Beatz.mp3` | Murda Beatz | 5s |
| `pierre.mp3` | Pi'erre Bourne | 4s |
| `ronnie.mp3` | Ronny J | 10s |
| `Young Chop.mp3` | Young Chop | 5s |

Map any tag to any event. Want DJ Khaled screaming "ANOTHER ONE" every time Claude finishes a task? Done. Want Ronny J ad-libbing every tool call? Say less.

---

## Setup

```bash
git clone https://github.com/0xfreddy/ANOTHER-ONE-CLAUDE-SOUNDS.git
cd ANOTHER-ONE-CLAUDE-SOUNDS
npm install
node bin/setup.js
```

The setup wizard walks you through everything:

1. **Assign tags to events** — arrow keys to browse, `P` to preview, Enter to lock it in
2. **Preview all tags** — auto-plays as you scroll through the roster
3. **Install hooks into Claude Code** — writes everything to `~/.claude/settings.json`
4. **Show current config** — see what's mapped where

> Restart Claude Code after installing hooks.

---

## Events

Events are split into **main** and **secondary**. Main events fire on key moments. Secondary events fire constantly (every tool call, every error) — the wizard warns you before you go there.

### Main Events

| Event | When it fires |
|-------|---------------|
| `stop` | Claude finishes a task and returns control |
| `question` | Claude stops to ask you something |
| `pr-push` | A `git push` is detected |

### Secondary Events

| Event | When it fires |
|-------|---------------|
| `notification` | Background agent or sub-agent finishes |
| `tool-start` | Any tool call begins (Bash, Read, Edit, etc.) |
| `tool-end` | Any tool call finishes |
| `error` | A command or tool fails |

---

## Requirements

- **Node.js** 16+
- **Audio playback:**
  - macOS — `afplay` (built-in, handles mp3 natively)
  - Linux — `mpg123`, `ffplay`, or `mplayer`
  - Windows — PowerShell / Windows Media Player

---

## Config

Assignments live in `~/.claude-sounds.json`:

```json
{
  "stop": "djkhaled.mp3",
  "question": "ronnie.mp3",
  "pr-push": "808mafia.mp3"
}
```

---

## Adding Your Own Tags

Drop any `.mp3` or `.wav` into `sounds/` and it shows up in the setup wizard automatically. Collect the whole discography.

---

## Manual Hook Setup

If you'd rather wire it up yourself, add this to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [
      { "matcher": "", "hooks": [{ "type": "command", "command": "node /path/to/claude-sounds/bin/play.js stop", "async": true }] }
    ],
    "Notification": [
      { "matcher": "", "hooks": [{ "type": "command", "command": "node /path/to/claude-sounds/bin/play.js notification", "async": true }] }
    ],
    "PreToolUse": [
      { "matcher": "", "hooks": [{ "type": "command", "command": "node /path/to/claude-sounds/bin/play.js tool-start", "async": true }] }
    ],
    "PostToolUse": [
      { "matcher": "", "hooks": [{ "type": "command", "command": "node /path/to/claude-sounds/bin/play.js tool-end", "async": true }] },
      { "matcher": "Bash", "hooks": [{ "type": "command", "command": "node /path/to/claude-sounds/bin/play.js pr-push", "async": true }] }
    ]
  }
}
```
