import { describe, it, expect } from "vitest";
import {
  orderMarkerColor,
  pswMarkerColor,
  UNACCEPTED_BUCKETS,
  ACCEPTED_BUCKETS,
} from "../markerColors";
import type { OrderBucket, PSWRow } from "../types";

const ALL_BUCKETS: OrderBucket[] = [
  "open",
  "pending",
  "assigned",
  "active",
  "in_progress",
  "unserved",
  "completed",
];

const ALL_PSW_STATUSES: PSWRow["status"][] = ["available", "on_shift", "assigned"];

describe("admin coverage map marker colours", () => {
  it("uses green for jobs that have not been accepted or assigned", () => {
    UNACCEPTED_BUCKETS.forEach((b) => expect(orderMarkerColor(b)).toBe("green"));
    expect(orderMarkerColor("open")).toBe("green");
  });

  it("uses blue for accepted / assigned jobs", () => {
    ACCEPTED_BUCKETS.forEach((b) => expect(orderMarkerColor(b)).toBe("blue"));
    expect(orderMarkerColor("assigned")).toBe("blue");
  });

  it("never colours an order red and covers every bucket", () => {
    ALL_BUCKETS.forEach((b) => expect(["green", "blue"]).toContain(orderMarkerColor(b)));
    expect([...UNACCEPTED_BUCKETS, ...ACCEPTED_BUCKETS].sort()).toEqual([...ALL_BUCKETS].sort());
  });

  it("keeps every worker colour distinct from blue and green", () => {
    ALL_PSW_STATUSES.forEach((s) => {
      const c = pswMarkerColor(s);
      expect(c).not.toBe("blue");
      expect(c).not.toBe("green");
    });
  });

  it("keeps worker statuses visually distinguishable from each other", () => {
    const colors = ALL_PSW_STATUSES.map(pswMarkerColor);
    expect(new Set(colors).size).toBe(ALL_PSW_STATUSES.length);
  });
});
