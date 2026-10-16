const { Gtk, Gio } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;

const SCHEMA_ID = 'org.gnome.shell.extensions.pomodoro-chip';

function init() {}

function addSpinRow(box, title, key, settings) {
    const row = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        spacing: 12,
        margin_top: 8,
        margin_bottom: 8,
    });

    const lbl = new Gtk.Label({ label: title, hexpand: true, halign: Gtk.Align.START });

    const spin = new Gtk.SpinButton();
    spin.set_range(1, 600);
    spin.set_increments(1, 5);
    settings.bind(key, spin, 'value', Gio.SettingsBindFlags.DEFAULT);

    row.append(lbl);
    row.append(spin);
    box.append(row);
}

function addPositionRow(box, settings) {
    const row = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        spacing: 12,
        margin_top: 8,
        margin_bottom: 8,
    });

    const lbl = new Gtk.Label({ label: 'Chip position', hexpand: true, halign: Gtk.Align.START });

    const combo = new Gtk.ComboBoxText();
    combo.append('left', 'Left');
    combo.append('center', 'Center');
    combo.append('right', 'Right');
    combo.set_active_id(settings.get_string('position'));
    combo.connect('changed', () => settings.set_string('position', combo.get_active_id()));

    row.append(lbl);
    row.append(combo);
    box.append(row);
}

function addShortcutRow(box, settings) {
    const row = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        spacing: 12,
        margin_top: 8,
        margin_bottom: 8,
    });

    const lbl = new Gtk.Label({ label: 'Pause/resume shortcut', hexpand: true, halign: Gtk.Align.START });

    const entry = new Gtk.Entry();
    entry.set_text(settings.get_strv('toggle-pomodoro')[0] || '');
    entry.set_placeholder_text('<Control><Alt>p');
    entry.set_width_chars(18);

    const apply = () => {
        const text = entry.get_text().trim();
        if (!text) return;
        const [ok, keyval] = Gtk.accelerator_parse(text);
        if (ok && keyval) settings.set_strv('toggle-pomodoro', [text]);
    };
    entry.connect('activate', apply);
    entry.connect('changed', apply);

    row.append(lbl);
    row.append(entry);
    box.append(row);
}

function buildPrefsWidget() {
    const settings = ExtensionUtils.getSettings(SCHEMA_ID);

    const box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        margin_top: 16,
        margin_bottom: 16,
        margin_start: 16,
        margin_end: 16,
    });

    addSpinRow(box, 'Work (minutes)', 'work-duration', settings);
    addSpinRow(box, 'Short break (minutes)', 'short-break-duration', settings);
    addSpinRow(box, 'Long break (minutes)', 'long-break-duration', settings);
    addShortcutRow(box, settings);
    addPositionRow(box, settings);

    const hint = new Gtk.Label({
        label: 'Durations apply to the next phase.\nShortcut format: <Control><Alt>p (press Enter to apply).\nPosition changes take effect immediately.',
        halign: Gtk.Align.START,
        margin_top: 16,
    });
    hint.get_style_context().add_class('dim-label');
    box.append(hint);

    return box;
}
