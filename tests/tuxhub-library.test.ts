// Runs with `npm test`: what tuxhub may read and write of the calendars and saved layouts over
// the socket (settings.get / settings.set / settings-changed).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { activeAfterSaved, calendarListOf, checkStored, Refusal } from "../src/tuxhub/tuxhubSchema.ts";

const SOURCES = [
    { id: "a1", name: "Work", url: "https://calendar.example.org/secret-1.ics", color: "#ff0000ff", enabled: true },
    { id: "b2", name: "Bins", url: "webcal://example.org/secret-2.ics", color: "#00ff00ff", enabled: false },
];

const layout = { columns: 4, rows: 1, blocks: [{ id: 1, kind: "text" as const, x: 0, y: 0, w: 2, h: 1, display: "text", text: "Hi" }] };

function refusedStored(key: string, value: unknown, context = {}): void
{
    assert.throws(() => checkStored(key, value, "en", context), (error: unknown) => error instanceof Refusal && error.field === key, `${key} ${JSON.stringify(value)}`);
}

test("F1: the calendar list carries id, name, color and state, never the link", () =>
{
    const list = calendarListOf(SOURCES);
    assert.deepEqual(list, [
        { id: "a1", name: "Work", color: "#ff0000ff", enabled: true },
        { id: "b2", name: "Bins", color: "#00ff00ff", enabled: false },
    ]);
    assert.equal(JSON.stringify(list).includes("secret"), false);
    // Whatever else a source may carry later stays out too.
    assert.deepEqual(calendarListOf([{ ...SOURCES[0], token: "x", headers: { a: 1 } }]), [list[0]]);
    assert.deepEqual(calendarListOf("not a list"), []);
});

test("F1, F3: the bridge reads calendar sources only through the list and reports changes of them", () =>
{
    const bridge = readFileSync(new URL("../src/tuxhub/TuxhubBridge.ts", import.meta.url), "utf8");
    const reads = bridge.match(/ATOMS\.CALENDAR_SOURCES/g) ?? [];
    const wrapped = bridge.match(/calendarListOf\(this\.store\.get\(ATOMS\.CALENDAR_SOURCES\)\)/g) ?? [];
    assert.ok(reads.length >= 2, "the bridge reads and watches the calendar sources");
    // Every read goes through calendarListOf, apart from the one subscription that reports changes.
    assert.equal(reads.length - wrapped.length, 1);
    assert.match(bridge, /this\.store\.sub\(ATOMS\.CALENDAR_SOURCES, /);
    assert.equal(bridge.includes("ATOMS.CALENDAR_FEEDS"), false);
});

test("F2: the calendar list and the calendar sources cannot be written", () =>
{
    refusedStored("calendarList", calendarListOf(SOURCES));
    refusedStored("calendarSources", SOURCES);
    refusedStored("calendarFeeds", {});
});

test("F4: saved layouts are written only when every entry fits, the layouts as the validator returns them", () =>
{
    const saved = checkStored("savedLayouts", [
        { id: 1, name: " Mine ", layout: { ...layout, extra: 1 } },
        { id: 3, name: "Second", layout, note: "dropped" },
    ]);
    assert.deepEqual(saved, [
        { id: 1, name: " Mine ", layout },
        { id: 3, name: "Second", layout },
    ]);
    assert.deepEqual(checkStored("savedLayouts", []), []);

    const entry = (fields: Record<string, unknown>) => ({ id: 1, name: "A", layout, ...fields });
    refusedStored("savedLayouts", [entry({ layout: { columns: 99, rows: 1, blocks: [] } })]);
    refusedStored("savedLayouts", [entry({}), entry({ name: "B" })]);
    refusedStored("savedLayouts", [entry({ name: "   " })]);
    refusedStored("savedLayouts", [entry({ name: "x".repeat(81) })]);
    refusedStored("savedLayouts", [entry({ id: 0 })]);
    refusedStored("savedLayouts", [entry({ id: 1.5 })]);
    refusedStored("savedLayouts", [entry({ name: 7 })]);
    refusedStored("savedLayouts", Array.from({ length: 51 }, (_, i) => entry({ id: i + 1 })));
    refusedStored("savedLayouts", "layouts");
    assert.equal(checkStored("savedLayouts", Array.from({ length: 50 }, (_, i) => entry({ id: i + 1 }))).length, 50);
});

test("F5: the active layout is none or one of the saved layouts", () =>
{
    const context = { savedLayouts: [{ id: 1, name: "A", layout }] };
    assert.equal(checkStored("activeLayoutId", null, "en", context), null);
    assert.equal(checkStored("activeLayoutId", 1, "en", context), 1);
    refusedStored("activeLayoutId", 2, context);
    refusedStored("activeLayoutId", "1", context);
    refusedStored("activeLayoutId", 1, { savedLayouts: [] });
    // Saved layouts written without the active one leave no active layout.
    assert.equal(activeAfterSaved(1, []), null);
    assert.equal(activeAfterSaved(1, context.savedLayouts), 1);
    assert.equal(activeAfterSaved(null, context.savedLayouts), null);
});
