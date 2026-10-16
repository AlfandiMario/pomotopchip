# Pomodoro Chip

A minimal Pomodoro timer that lives as a colored chip in the GNOME Shell top
bar. Built and tested on Pop!_OS 22.04 (GNOME Shell 42).

- **Red** = work session
- **Green** = short break
- **Blue** = long break

The chip shows `NN | MM:SS`, where `NN` is a 2-digit phase counter: which
work/short/long session you're on. Classic pomodoro cycle: 4 work sessions,
then a long break, repeat.

## Features

- Colored countdown chip in the top bar (work / short break / long break)
- 2-digit phase counter and countdown in `MM:SS`
- Configurable work, short break, and long break durations
- Pause/resume, skip phase, reset phase, reset counters
- Configurable keyboard shortcut (default `Ctrl+Alt+P`)
- Configurable chip position (left / center / right)
- `beep-beep--beep-beep` sound and a desktop notification on every phase switch
- No runtime dependencies beyond what GNOME Shell already provides

## Files

| File | Purpose |
|------|---------|
| `metadata.json` | Extension manifest (uuid, name, shell version) |
| `extension.js` | Main logic: state machine + top-bar chip |
| `prefs.js` | Settings UI (GTK4) |
| `stylesheet.css` | Chip colors |
| `beep.wav` | Beep-beep--beep-beep sound on phase switch |
| `schemas/org.gnome.shell.extensions.pomodoro-chip.gschema.xml` | GSettings keys |
| `install.sh` | Copies files and compiles the schema |
| `test.sh` | Static checks (run before installing) |
| `LICENSE` | MIT |

## Install

```bash
./test.sh     # sanity checks first
./install.sh
```

That copies everything to `~/.local/share/gnome-shell/extensions/pomodoro-chip@alfandimario.github.io`
and compiles the settings schema.

Then restart GNOME Shell and enable it:

```bash
# Alt+F2, type: r, Enter  (X11)
# or log out and back in (Wayland)

gnome-extensions enable pomodoro-chip@alfandimario.github.io
```

If the chip doesn't show up immediately, reload the shell.

## Configure

Open the extension preferences:

```bash
gnome-extensions prefs pomodoro-chip@alfandimario.github.io
```

Set:

- **Work** — default 25 minutes
- **Short break** — default 5 minutes
- **Long break** — default 15 minutes
- **Pause/resume shortcut** — default `<Control><Alt>p`, type a new one and press Enter
- **Chip position** — left, center, or right (default left)

Duration changes apply to the next phase, not the one currently running.
Position changes take effect immediately.

## Use

- The chip shows `01 | 25:00` — the 2-digit phase counter + countdown — and changes color by phase.
- Click the chip to open the menu:
  - **Pause / Resume**
  - **Skip phase**
  - **Reset phase** — restart the current phase at full length
  - **Cycles: N** — completed work+break cycles (read-only)
  - **Reset counters** — reset the phase counter and cycle count to 0
  - **Settings** — open the preferences window
- A notification fires when a phase ends, along with a `beep-beep--beep-beep` sound.

## Keyboard shortcut

Default **Ctrl+Alt+P** toggles pause/resume. Change it in the preferences
window (press Enter to apply), or via gsettings:

```bash
gsettings set org.gnome.shell.extensions.pomodoro-chip toggle-pomodoro "['<Super>p']"
```

## Compatibility

Built and tested on GNOME Shell 42 (Pop!_OS 22.04). The extension is declared
for `42` only; other versions are untested. The code targets the classic
`imports` API shared by GNOME Shell 40-44, so those versions will likely work,
but they are not verified.

GNOME Shell 45+ (Ubuntu 23.10+, Fedora 39+) replaced the `imports` system with
ES modules, so the extension will **not** load there without a port.

## Uninstall

```bash
rm -rf ~/.local/share/gnome-shell/extensions/pomodoro-chip@alfandimario.github.io
```

## Debugging

Watch the journal while the shell runs:

```bash
journalctl -f -o cat /usr/bin/gnome-shell
```

To reload the extension after editing code without full shell restart:

```bash
gnome-extensions disable pomodoro-chip@alfandimario.github.io
gnome-extensions enable pomodoro-chip@alfandimario.github.io
```
