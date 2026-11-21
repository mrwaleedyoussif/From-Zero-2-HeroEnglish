import { describe, expect, it } from "vitest";
import {
  addGateMessages,
  GATE_NAME,
  migrationName,
  renderConfig,
  renderIndex,
  renderLayout,
  renderMigration,
  renderPage,
} from "./gen-gate-lib.mts";

describe("gen:gate templates", () => {
  it("validates gate names", () => {
    expect(GATE_NAME.test("kiosk")).toBe(true);
    expect(GATE_NAME.test("Kiosk")).toBe(false);
    expect(GATE_NAME.test("ki-osk")).toBe(false);
    expect(GATE_NAME.test("k")).toBe(false);
  });

  it("renders a config entered by the gate:<name> permission", () => {
    const cfg = renderConfig("kiosk", 60);
    expect(cfg).toContain("export const kioskGate = defineGate({");
    expect(cfg).toContain('permission: "gate:kiosk"');
    expect(cfg).toContain('basePath: "/kiosk"');
    expect(cfg).toContain("priority: 60");
  });

  it("renders thin route files bound to the config", () => {
    expect(renderLayout("kiosk")).toContain('LayoutProps<"/[locale]/kiosk">');
    expect(renderLayout("kiosk")).toContain("<GateLayout gate={kioskGate}");
    expect(renderPage("kiosk")).toContain("<GateHome gate={kioskGate}");
  });

  it("renders a sorted index of every gate", () => {
    const idx = renderIndex(["teacher", "coach"]);
    expect(idx.indexOf("coachGate")).toBeLessThan(idx.indexOf("teacherGate"));
    expect(idx).toContain("export const gates: readonly GateConfig[] = [coachGate, teacherGate];");
  });

  it("renders a migration granting the new gate to the Owner only", () => {
    const sql = renderMigration("kiosk");
    expect(sql).toContain("'gate:kiosk'");
    expect(sql).toContain("r.is_system and r.default_scope_type = 'platform'");
  });

  it("adds labels without overwriting existing ones", () => {
    const before = { Registry: { gate: { kiosk: "Custom" }, nav: {} }, Other: { a: "b" } };
    const after = addGateMessages(before, "kiosk") as {
      Registry: Record<string, Record<string, unknown>>;
    };
    expect(after.Registry.gate?.kiosk).toBe("Custom");
    expect(after.Registry.nav?.kiosk).toEqual({ home: "Kiosk" });
    expect(after.Registry.page?.kiosk).toEqual({ home: "Kiosk" });
    expect(before.Registry.nav).toEqual({});
  });

  it("names migrations after the latest existing one", () => {
    const now = new Date("2026-11-22T10:00:00Z");
    expect(migrationName(["20261121000001_core.sql"], "kiosk", now)).toBe(
      "20261122100000_gate_kiosk.sql",
    );
    expect(migrationName(["20991231000000_future.sql"], "kiosk", now)).toBe(
      "20991231000001_gate_kiosk.sql",
    );
  });
});
