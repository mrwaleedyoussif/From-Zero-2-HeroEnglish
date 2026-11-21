import { describe, expect, it } from "vitest";
import { directionOf, routing } from "./routing";

describe("routing", () => {
  it("supports English and Arabic with English as default", () => {
    expect(routing.locales).toEqual(["en", "ar"]);
    expect(routing.defaultLocale).toBe("en");
  });

  it("marks Arabic as right-to-left", () => {
    expect(directionOf("ar")).toBe("rtl");
    expect(directionOf("en")).toBe("ltr");
  });
});
