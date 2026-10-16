const { St, Clutter, GLib, Gio, Shell, Meta } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;

const SCHEMA_ID = 'org.gnome.shell.extensions.pomodoro-chip';
const KEY_TOGGLE = 'toggle-pomodoro';

const PHASE = { WORK: 0, SHORT: 1, LONG: 2 };
const LONG_BREAK_EVERY = 4; // classic pomodoro: 4 work sessions, then a long break

let settings;
let chip;
let phaseLabel;
let timeLabel;
let pauseItem;
let cyclesItem;
let positionHandlerId = 0;
let timeoutId = null;
let themeFile = null;

let phase = PHASE.WORK;
let remaining = 0;
let completedWork = 0;
let cycles = 0; // completed work + break cycles
let workCount = 0;   // which work session we're on (1-based)
let shortCount = 0;  // which short break we're on
let longCount = 0;   // which long break we're on
let paused = false;

function fmt(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function phaseSeconds() {
    if (phase === PHASE.WORK) return settings.get_int('work-duration') * 60;
    if (phase === PHASE.SHORT) return settings.get_int('short-break-duration') * 60;
    return settings.get_int('long-break-duration') * 60;
}

function phaseCount() {
    if (phase === PHASE.WORK) return workCount;
    if (phase === PHASE.SHORT) return shortCount;
    return longCount;
}

function playBeep() {
    const file = ExtensionUtils.getCurrentExtension().dir.get_child('beep.wav').get_path();
    GLib.spawn_command_line_async(`paplay "${file}"`);
}

function nextPhase() {
    if (phase === PHASE.WORK) {
        completedWork++;
        phase = (completedWork % LONG_BREAK_EVERY === 0) ? PHASE.LONG : PHASE.SHORT;
    } else {
        phase = PHASE.WORK;
        cycles++;
    }
    if (phase === PHASE.WORK) workCount++;
    else if (phase === PHASE.SHORT) shortCount++;
    else longCount++;
    remaining = phaseSeconds();
    paused = false;
    playBeep();
}

function render() {
    phaseLabel.text = String(phaseCount()).padStart(2, '0');
    timeLabel.text = fmt(remaining);
    if (cyclesItem) cyclesItem.label.text = `Cycles: ${cycles}`;

    for (const c of ['work', 'short', 'long']) chip.remove_style_class_name(c);
    if (phase === PHASE.WORK) chip.add_style_class_name('work');
    else if (phase === PHASE.SHORT) chip.add_style_class_name('short');
    else chip.add_style_class_name('long');

    if (paused) chip.add_style_class_name('paused');
    else chip.remove_style_class_name('paused');

    if (pauseItem) pauseItem.label.text = paused ? 'Resume' : 'Pause';
}

function tick() {
    if (paused) return GLib.SOURCE_CONTINUE;
    remaining--;
    if (remaining <= 0) {
        nextPhase();
        Main.notify('Pomodoro', phase === PHASE.WORK ? 'Time to focus' : 'Break time');
    }
    render();
    return GLib.SOURCE_CONTINUE;
}

function togglePause() {
    paused = !paused;
    render();
}

function skipPhase() {
    nextPhase();
    render();
}

function resetPhase() {
    remaining = phaseSeconds();
    paused = false;
    render();
}

function resetCounter() {
    cycles = 0;
    workCount = 0;
    shortCount = 0;
    longCount = 0;
    if (phase === PHASE.WORK) workCount = 1;
    else if (phase === PHASE.SHORT) shortCount = 1;
    else longCount = 1;
    render();
}

function reposition() {
    if (!chip || !chip.container)
        return;

    const pos = settings.get_string('position');
    const box = pos === 'left' ? Main.panel._leftBox
        : pos === 'center' ? Main.panel._centerBox
        : Main.panel._rightBox;

    const container = chip.container;
    const parent = container.get_parent();
    if (parent)
        parent.remove_actor(container);
    box.add_child(container);
    container.show();
}

function enable() {
    settings = ExtensionUtils.getSettings(SCHEMA_ID);

    phase = PHASE.WORK;
    completedWork = 0;
    cycles = 0;
    workCount = 1;
    shortCount = 0;
    longCount = 0;
    paused = false;
    remaining = phaseSeconds();

    chip = new PanelMenu.Button(0.0, 'Pomodoro', false);
    chip.add_style_class_name('pomodoro-chip');

    const box = new St.BoxLayout({ vertical: false });
    phaseLabel = new St.Label({ text: 'WK' });
    const sep = new St.Label({ text: ' | ' });
    sep.add_style_class_name('sep');
    timeLabel = new St.Label({ text: fmt(remaining) });
    box.add_child(phaseLabel);
    box.add_child(sep);
    box.add_child(timeLabel);
    chip.add_child(box);

    pauseItem = new PopupMenu.PopupMenuItem('Pause');
    pauseItem.connect('activate', togglePause);
    chip.menu.addMenuItem(pauseItem);

    const skipItem = new PopupMenu.PopupMenuItem('Skip phase');
    skipItem.connect('activate', skipPhase);
    chip.menu.addMenuItem(skipItem);

    const resetPhaseItem = new PopupMenu.PopupMenuItem('Reset phase');
    resetPhaseItem.connect('activate', resetPhase);
    chip.menu.addMenuItem(resetPhaseItem);

    chip.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    cyclesItem = new PopupMenu.PopupMenuItem('Cycles: 0', { reactive: false, can_focus: false });
    chip.menu.addMenuItem(cyclesItem);

    const resetCounterItem = new PopupMenu.PopupMenuItem('Reset counters');
    resetCounterItem.connect('activate', resetCounter);
    chip.menu.addMenuItem(resetCounterItem);

    chip.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    const settingsItem = new PopupMenu.PopupMenuItem('Settings');
    settingsItem.connect('activate', () => ExtensionUtils.openPrefs());
    chip.menu.addMenuItem(settingsItem);

    Main.panel.addToStatusArea('pomodoro-chip', chip, 0, settings.get_string('position'));

    positionHandlerId = settings.connect('changed::position', reposition);

    Main.wm.addKeybinding(KEY_TOGGLE, settings,
        Meta.KeyBindingFlags.NONE,
        Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
        togglePause);

    const file = ExtensionUtils.getCurrentExtension().dir.get_child('stylesheet.css');
    St.ThemeContext.get_for_stage(global.stage).get_theme().load_stylesheet(file);
    themeFile = file;

    render();
    timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, tick);
}

function disable() {
    if (timeoutId) {
        GLib.source_remove(timeoutId);
        timeoutId = null;
    }
    if (positionHandlerId) {
        settings.disconnect(positionHandlerId);
        positionHandlerId = 0;
    }
    Main.wm.removeKeybinding(KEY_TOGGLE);
    if (themeFile) {
        St.ThemeContext.get_for_stage(global.stage).get_theme().unload_stylesheet(themeFile);
        themeFile = null;
    }
    if (chip) {
        chip.destroy();
        chip = null;
        phaseLabel = null;
        timeLabel = null;
        pauseItem = null;
        cyclesItem = null;
    }
    settings = null;
}
