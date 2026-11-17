// Schema and value checks for the tuxhub live interface (protocol 1).
// Kept free of React, Jotai and Tauri so `npm test` can run it with plain Node.
import { LOCALE_OPTIONS, UI_LANGUAGE_OPTIONS, FONT_OPTIONS, TEMPERATURE_UNIT_OPTIONS, SLIDER_CONFIGS } from "../settings/options.ts";
import { LAYOUT_KEYS } from "../layout/LayoutMigration.ts";
import { LayoutValidator } from "../layout/LayoutValidator.ts";
import type { SavedLayout } from "../layout/LayoutLibrary.ts";

type Locale = "en" | "de";
type Text = Record<Locale, string>;

type FieldDef =
  | { key: string; type: "toggle"; label: Text; help?: Text }
  | { key: string; type: "number"; label: Text; help?: Text; min: number; max: number; unit: string }
  | { key: string; type: "select"; label: Text; help?: Text; options: { value: string; label: Text }[] }
  | { key: string; type: "text"; label: Text; help?: Text; placeholder?: Text; max_length: number; multiline?: boolean }
  | { key: string; type: "color"; label: Text; help?: Text };

export type Field = {
    key: string;
    type: FieldDef["type"];
    label: string;
    help?: string;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    slider?: boolean;
    options?: { value: string; label: string }[];
    placeholder?: string;
    max_length?: number;
    multiline?: boolean;
    alpha?: boolean;
};

export type Schema = {
    sections: { id: string; label: string; fields: Field[] }[];
    actions: { id: string; label: string; danger?: boolean; confirm?: string }[];
};

const same = (s: string): Text => ({ en: s, de: s });

const number = (key: string, label: Text, cfg: { min: number; max: number; unit: string }): FieldDef => ({
    key,
    type: "number",
    label,
    min: cfg.min,
    max: cfg.max,
    unit: cfg.unit,
});

// Same order and grouping as the settings window, then the context menu.
const SECTIONS: { id: string; label: Text; fields: FieldDef[] }[] = [
    {
        id: "general",
        label: { en: "General", de: "Allgemein" },
        fields: [
            {
                key: "uiLanguage",
                type: "select",
                label: { en: "Language", de: "Sprache" },
                help: { en: "Language of the settings window and the right-click menu.", de: "Sprache des Einstellungsfensters und des Rechtsklick-Menüs." },
                options: UI_LANGUAGE_OPTIONS.map((language) => ({ value: language.value, label: same(language.label) })),
            },
            number("clockScale", { en: "Size", de: "Größe" }, SLIDER_CONFIGS.SCALE),
            { key: "boxBackgroundColor", type: "color", label: { en: "Background color", de: "Hintergrundfarbe" } },
            number("clockCornerRadius", { en: "Corner rounding", de: "Eckenrundung" }, SLIDER_CONFIGS.CORNER_RADIUS),
            number("clockPadding", { en: "Padding", de: "Innenabstand" }, SLIDER_CONFIGS.PADDING),
            {
                key: "textFont",
                type: "select",
                label: { en: "Default font", de: "Standardschrift" },
                help: { en: "Blocks without a font of their own use it.", de: "Gilt für alle Blöcke ohne eigene Schrift." },
                options: FONT_OPTIONS.map((f) => ({ value: f.value, label: same(f.label) })),
            },
            {
                key: "textColor",
                type: "color",
                label: { en: "Default text color", de: "Standard-Textfarbe" },
                help: { en: "Blocks are edited in the settings window.", de: "Die Blöcke selbst bearbeitest du im Einstellungsfenster." },
            },
            {
                key: "overlayMode",
                type: "select",
                label: { en: "Overlay mode (Linux)", de: "Overlay-Modus (Linux)" },
                help: {
                    en: "Layer-Shell stays above fullscreen windows but needs KDE, Sway or Hyprland. X11 Compatibility works everywhere. Takes effect after a restart.",
                    de: "Layer-Shell bleibt über Vollbildfenstern, braucht aber KDE, Sway oder Hyprland. X11-Kompatibilität läuft überall. Wirkt nach einem Neustart.",
                },
                options: [
                    { value: "auto", label: { en: "Auto (recommended)", de: "Automatisch (empfohlen)" } },
                    { value: "layer-shell", label: same("Layer-Shell") },
                    { value: "x11", label: { en: "X11 Compatibility", de: "X11-Kompatibilität" } },
                ],
            },
        ],
    },
    {
        id: "time",
        label: { en: "Time", de: "Zeit" },
        fields: [
            {
                key: "hourCycle",
                type: "select",
                label: { en: "Clock format", de: "Uhrzeitformat" },
                help: { en: "Blocks with a custom format keep it.", de: "Blöcke mit eigenem Format behalten es." },
                options: [
                    { value: "24", label: { en: "24-hour", de: "24 Stunden" } },
                    { value: "12", label: { en: "12-hour", de: "12 Stunden" } },
                ],
            },
            { key: "hourLeadingZero", type: "toggle", label: { en: "Leading zero for hours", de: "Führende Null bei Stunden" } },
            {
                key: "lang",
                type: "select",
                label: { en: "Date language", de: "Datumssprache" },
                help: { en: "Language of dates and weather.", de: "Sprache von Datum und Wetter." },
                options: LOCALE_OPTIONS.map((l) => ({ value: l.code, label: same(l.name) })),
            },
        ],
    },
    {
        id: "weather",
        label: { en: "Weather", de: "Wetter" },
        fields: [
            {
                key: "weatherUnit",
                type: "select",
                label: { en: "Weather unit", de: "Temperatureinheit" },
                options: TEMPERATURE_UNIT_OPTIONS.map((u) => ({ value: u.value, label: same(u.label) })),
            },
            {
                key: "weatherLocation",
                type: "text",
                label: { en: "Location", de: "Ort" },
                placeholder: { en: "Leave empty for automatic detection.", de: "Leer lassen für automatische Erkennung." },
                max_length: 200,
            },
        ],
    },
    {
        id: "calendar",
        label: { en: "Calendar", de: "Kalender" },
        fields: [
            number("calendarRefreshMinutes", { en: "Refresh every", de: "Aktualisieren alle" }, { min: 5, max: 240, unit: "min" }),
        ],
    },
    {
        id: "window",
        label: { en: "Window", de: "Fenster" },
        fields: [
            { key: "autostart", type: "toggle", label: { en: "Autostart", de: "Mit dem PC starten" } },
            { key: "hideInTaskbar", type: "toggle", label: { en: "Hide in taskbar", de: "In der Taskleiste verstecken" } },
            { key: "alwaysOnTop", type: "toggle", label: { en: "Always on top", de: "Immer im Vordergrund" } },
        ],
    },
];

const ACTIONS: { id: string; label: Text; danger?: boolean; confirm?: Text }[] = [
    { id: "open-styling", label: { en: "Open settings", de: "Einstellungen öffnen" } },
    {
        id: "reset",
        label: { en: "Reset all settings", de: "Alle Einstellungen zurücksetzen" },
        danger: true,
        confirm: {
            en: "Reset all settings to their defaults? This can't be undone.",
            de: "Alle Einstellungen auf die Standardwerte zurücksetzen? Das lässt sich nicht rückgängig machen.",
        },
    },
    { id: "quit", label: { en: "Quit Fliq", de: "Fliq beenden" } },
];

const DEFS = new Map(SECTIONS.flatMap((s) => s.fields).map((f) => [f.key, f]));

export const KEYS: string[] = [...DEFS.keys()];

export function toLocale(locale: unknown): Locale 
{
    return typeof locale === "string" && locale.toLowerCase().startsWith("de") ? "de" : "en";
}

function render(def: FieldDef, lang: Locale): Field 
{
    const f: Field = { key: def.key, type: def.type, label: def.label[lang] };
    if (def.help) f.help = def.help[lang];
    switch (def.type) 
    {
        case "number":
            Object.assign(f, { min: def.min, max: def.max, step: 1, unit: def.unit, slider: true });
            break;
        case "select":
            f.options = def.options.map((o) => ({ value: o.value, label: o.label[lang] }));
            break;
        case "text":
            f.max_length = def.max_length;
            if (def.placeholder) f.placeholder = def.placeholder[lang];
            if (def.multiline) f.multiline = true;
            break;
        case "color":
            f.alpha = true;
            break;
    }
    return f;
}

export function schema(locale: unknown): Schema 
{
    const lang = toLocale(locale);
    return {
        sections: SECTIONS.map((s) => ({
            id: s.id,
            label: s.label[lang],
            fields: s.fields.map((f) => render(f, lang)),
        })),
        actions: ACTIONS.map((a) => ({
            id: a.id,
            label: a.label[lang],
            ...(a.danger ? { danger: true } : {}),
            ...(a.confirm ? { confirm: a.confirm[lang] } : {}),
        })),
    };
}

export const ACTION_IDS = ACTIONS.map((a) => a.id);

/** A refused `set`; tuxhub shows the message at the field. */
export class Refusal extends Error 
{
    field: string;
    constructor(field: string, message: string) 
    {
        super(message);
        this.field = field;
    }
}

const MESSAGES = {
    unknown: { en: "Fliq has no setting with this name.", de: "Diese Einstellung gibt es in Fliq nicht." },
    toggle: { en: "Expected on or off.", de: "Erwartet ein oder aus." },
    number: { en: "Expected a number.", de: "Erwartet eine Zahl." },
    range: { en: "Choose a value from {min} to {max}.", de: "Wähle einen Wert von {min} bis {max}." },
    option: { en: "This option does not exist.", de: "Diese Auswahl gibt es nicht." },
    text: { en: "Expected text.", de: "Erwartet Text." },
    length: { en: "At most {max} characters.", de: "Höchstens {max} Zeichen." },
    color: { en: "Expected a color like #rrggbbaa.", de: "Erwartet eine Farbe wie #rrggbbaa." },
    layout: { en: "This layout does not fit Fliq's grid.", de: "Dieses Layout passt nicht in Fliqs Raster." },
    savedLayouts: {
        en: "Expected at most 50 saved layouts, each with its own id, a name of 1 to 80 characters and a layout that fits Fliq's grid.",
        de: "Erwartet höchstens 50 gespeicherte Layouts, jedes mit eigener Id, einem Namen mit 1 bis 80 Zeichen und einem Layout, das in Fliqs Raster passt.",
    },
    activeLayoutId: { en: "Expected none or the id of a saved layout.", de: "Erwartet keines oder die Id eines gespeicherten Layouts." },
    readOnly: { en: "This setting can only be changed in Fliq.", de: "Diese Einstellung lässt sich nur in Fliq ändern." },
};

// Saved layouts tuxhub may write at most, and the longest name.
const MAX_SAVED_LAYOUTS = 50;
const MAX_LAYOUT_NAME = 80;

// One calendar as tuxhub sees it: everything of a calendar source except its secret link.
export interface CalendarListEntry
{
    id: string;
    name: string;
    color: string;
    enabled: boolean;
}

/**
 * The calendar sources without their links, for `settings.get` and `settings-changed`
 * (`calendarList`). Built from an allow list, so whatever a source carries besides these four
 * fields never leaves Fliq.
 */
export function calendarListOf(sources: unknown): CalendarListEntry[]
{
    if (!Array.isArray(sources))
    {
        return [];
    }
    const objects = sources.filter((source): source is Record<string, unknown> => Boolean(source) && typeof source === "object");
    return objects.map((source) => ({
        id: String(source.id),
        name: String(source.name),
        color: String(source.color),
        enabled: source.enabled === true,
    }));
}

// What `checkStored` needs to know of the stored settings besides the value.
export interface StoredContext
{
    savedLayouts?: unknown;
}

function savedLayouts(key: string, value: unknown, lang: Locale): SavedLayout[]
{
    const refuse = () => new Refusal(key, MESSAGES.savedLayouts[lang]);
    if (!Array.isArray(value) || value.length > MAX_SAVED_LAYOUTS)
    {
        throw refuse();
    }
    const ids = new Set<number>();
    const validator = new LayoutValidator();
    return value.map((entry: unknown) =>
    {
        const saved = (entry && typeof entry === "object" && !Array.isArray(entry) ? entry : {}) as Record<string, unknown>;
        const { id, name } = saved;
        const layout = validator.validated(saved.layout);
        const validId = typeof id === "number" && Number.isInteger(id) && id >= 1 && !ids.has(id);
        const validName = typeof name === "string" && name.trim().length > 0 && [...name].length <= MAX_LAYOUT_NAME;
        if (!validId || !validName || layout === null)
        {
            throw refuse();
        }
        ids.add(id as number);
        return { id: id as number, name: name as string, layout };
    });
}

/** The active layout after the saved layouts changed: none when it is no longer among them. */
export function activeAfterSaved(activeId: number | null, layouts: SavedLayout[]): number | null
{
    return layouts.some((saved) => saved.id === activeId) ? activeId : null;
}

/**
 * Checks a value for `set` and returns it as Fliq stores it: numbers rounded to whole steps,
 * colors in lower case with alpha (the styling window uses the "hexa" format).
 */
export function check(key: string, value: unknown, locale: unknown = "en"): unknown 
{
    const lang = toLocale(locale);
    const refuse = (m: keyof typeof MESSAGES, vars: Record<string, number> = {}) =>
        new Refusal(key, MESSAGES[m][lang].replace(/\{(\w+)\}/g, (_, v) => String(vars[v])));
    const def = DEFS.get(key);
    if (!def) throw refuse("unknown");
    switch (def.type) 
    {
        case "toggle":
            if (typeof value !== "boolean") throw refuse("toggle");
            return value;
        case "number": {
            if (typeof value !== "number" || !Number.isFinite(value)) throw refuse("number");
            const n = Math.round(value);
            if (n < def.min || n > def.max) throw refuse("range", { min: def.min, max: def.max });
            return n;
        }
        case "select":
            if (typeof value !== "string" || !def.options.some((o) => o.value === value)) throw refuse("option");
            return value;
        case "text":
            if (typeof value !== "string") throw refuse("text");
            if ([...value].length > def.max_length) throw refuse("length", { max: def.max_length });
            return value;
        case "color":
            if (typeof value !== "string" || !/^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) throw refuse("color");
            return value.length === 7 ? `${value.toLowerCase()}ff` : value.toLowerCase();
    }
}

/**
 * Checks a value for `settings.set`. Besides the schema fields tuxhub may write the block
 * layout, the saved layouts (each layout checked by the LayoutValidator) and which of them is
 * active. Everything else Fliq stores (the weather caches, the calendar sources with their
 * secret links, the calendar list built from them) is not writable from outside.
 */
export function checkStored(key: string, value: unknown, locale: unknown = "en", context: StoredContext = {}): unknown
{
    const lang = toLocale(locale);
    switch (key)
    {
        case LAYOUT_KEYS.layout:
        {
            const layout = new LayoutValidator().validated(value);
            if (layout === null)
            {
                throw new Refusal(key, MESSAGES.layout[lang]);
            }
            return layout;
        }
        case "savedLayouts":
            return savedLayouts(key, value, lang);
        case "activeLayoutId":
        {
            const layouts = Array.isArray(context.savedLayouts) ? (context.savedLayouts as SavedLayout[]) : [];
            if (value !== null && !layouts.some((saved) => saved.id === value))
            {
                throw new Refusal(key, MESSAGES.activeLayoutId[lang]);
            }
            return value;
        }
        case "calendarList":
            throw new Refusal(key, MESSAGES.readOnly[lang]);
    }
    return check(key, value, locale);
}
