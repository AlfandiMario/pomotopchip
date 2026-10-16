#!/usr/bin/env bash
# Static checks for the extension. Run before installing.
set -euo pipefail

cd "$(dirname "$0")"

fail=0

echo "== metadata.json =="
if ! rtk python3 -c 'import json,sys; d=json.load(open("metadata.json")); assert d["uuid"] and d["name"] and d["shell-version"], "missing required keys"; print("ok:", d["uuid"], d["shell-version"])'; then
    echo "FAIL: metadata.json invalid or missing required keys"; fail=1
fi

if rtk grep -q '@local' metadata.json; then
    echo "FAIL: uuid uses @local; use a unique domain-qualified uuid for the extensions store"; fail=1
else
    echo "ok: uuid is not @local"
fi

echo "== JS syntax =="
for f in extension.js prefs.js; do
    if rtk node --check "$f"; then echo "ok: $f"; else echo "FAIL: $f"; fail=1; fi
done

echo "== gettext-domain guard =="
# initTranslations() without an argument reads metadata['gettext-domain'].
# If it is missing, Gettext.bindtextdomain gets undefined and throws:
#   Expected type string for argument 'domain' but got type undefined
if rtk grep -q "initTranslations" extension.js prefs.js; then
    if rtk grep -q '"gettext-domain"' metadata.json; then
        echo "ok: initTranslations is called and gettext-domain is set"
    else
        echo "FAIL: initTranslations() called but metadata.json has no gettext-domain"; fail=1
    fi
else
    echo "ok: no initTranslations() calls"
fi

echo "== schema =="
if rtk glib-compile-schemas --strict schemas/; then echo "ok: schemas compile"; else echo "FAIL: schema"; fail=1; fi

echo "== required files =="
for f in metadata.json extension.js prefs.js stylesheet.css beep.wav schemas/org.gnome.shell.extensions.pomodoro-chip.gschema.xml; do
    if [ -e "$f" ]; then echo "ok: $f"; else echo "FAIL: missing $f"; fail=1; fi
done

if [ "$fail" -ne 0 ]; then
    echo "TESTS FAILED"
    exit 1
fi
echo "ALL CHECKS PASSED"
