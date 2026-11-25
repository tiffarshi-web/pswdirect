import { describe, it, expect } from "vitest";
import { matchOntarioServiceCity } from "../nearMeServiceCity";

describe("near-me service city matching", () => {
  it("matches Toronto in Ontario", () => expect(matchOntarioServiceCity(["Toronto"], "Ontario")).toBe("Toronto"));
  it("strips 'City of' prefix", () => expect(matchOntarioServiceCity(["City of Brampton"], "Ontario")).toBe("Brampton"));
  it("rejects non-Ontario provinces", () => expect(matchOntarioServiceCity(["Calgary"], "Alberta")).toBeNull());
  it("rejects unknown places without defaulting to Toronto", () => expect(matchOntarioServiceCity(["Nowhereville"], "Ontario")).toBeNull());
  it("rejects missing province", () => expect(matchOntarioServiceCity(["Toronto"], undefined)).toBeNull());
});
