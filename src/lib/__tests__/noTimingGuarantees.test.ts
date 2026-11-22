import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const dirs = [join(__dirname, "../../pages/seo"), join(__dirname, "../../components/seo")];
const extra = [join(__dirname, "../cityContentVariation.ts"), join(__dirname, "../serviceOntarioHubs.ts")];
const banned = [/within hours/i, /within a few hours/i, /immediately notified/i, /same-day (availability|bookings?) (is|are) (common|usually)/i,
  /Book a PSW Today/i, /can begin care the same day/i, /matched (immediately|instantly|the same day)/i, /matched instantly/i, /instantly matched/i,
  /no waitlists?/i, /Same-day and next-day availability/i, /Yes[.\u2014 —-]+ ?Same-day care is not guaranteed/i, /Immediately\. Same-day/i,
  /same-day dispatch is standard/i, /no surge pricing/i, /same hourly rate regardless of booking timing/i, /(?<!depend )on demand/i, /Book (a PSW |a Caregiver )?Instantly/i];

describe("public SEO copy makes no timing guarantees", () => {
  const files = [...dirs.flatMap(d => readdirSync(d).filter(f => /\.tsx?$/.test(f)).map(f => join(d, f))), ...extra];
  for (const p of files) {
    it(p.split("/src/")[1], () => {
      const s = readFileSync(p, "utf8");
      for (const re of banned) expect(s).not.toMatch(re);
    });
  }
  it("same-day page states it is not guaranteed", () => {
    expect(readFileSync(join(dirs[0], "SameDayHomeCarePage.tsx"), "utf8")).toMatch(/not guaranteed/);
  });
});

describe("short-notice price wording", () => {
  it("same-day page mentions possible ASAP surcharge instead of claiming the same rate", () => {
    const s = readFileSync(join(dirs[0], "SameDayHomeCarePage.tsx"), "utf8");
    expect(s).toMatch(/ASAP may include a rush surcharge/);
  });
});
