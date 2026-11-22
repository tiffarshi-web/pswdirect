import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const dir = join(__dirname, "../../pages/seo");
const banned = [/within hours/i, /immediately notified/i, /same-day starts are common/i, /Book a PSW Today/i];

describe("public SEO copy makes no timing guarantees", () => {
  for (const f of readdirSync(dir).filter(f => /\.(tsx?|ts)$/.test(f))) {
    it(f, () => {
      const s = readFileSync(join(dir, f), "utf8");
      for (const re of banned) expect(s).not.toMatch(re);
    });
  }
  it("same-day page states it is not guaranteed", () => {
    expect(readFileSync(join(dir, "SameDayHomeCarePage.tsx"), "utf8")).toMatch(/not guaranteed/);
  });
});
