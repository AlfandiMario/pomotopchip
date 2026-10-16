#!/usr/bin/env bash
set -euo pipefail

UUID="pomodoro-chip@alfandimario.github.io"
DEST="$HOME/.local/share/gnome-shell/extensions/$UUID"

mkdir -p "$DEST"

cp metadata.json extension.js prefs.js stylesheet.css beep.wav "$DEST/"
cp -r schemas "$DEST/"

glib-compile-schemas "$DEST/schemas"

echo "Installed to $DEST"
echo "Now restart GNOME Shell (Alt+F2 -> r -> Enter, or log out/in),"
echo "then enable the extension:"
echo "  gnome-extensions enable $UUID"
