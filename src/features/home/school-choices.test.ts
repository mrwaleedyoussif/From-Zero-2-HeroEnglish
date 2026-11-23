import { describe, expect, it } from "vitest";
import { groupSchools } from "./school-choices";
import { schoolLogo } from "./school-logos";

describe("schools and branches on the home page", () => {
  it("groups branches under their school and keeps single schools whole", () => {
    const out = groupSchools([
      {
        code: "TAIFB",
        name_en: "Andalus International Schools · Taif Boys",
        name_ar: "مدارس الأندلس · الطائف بنين",
      },
      {
        code: "TAIFG",
        name_en: "Andalus International Schools - Taif Girls",
        name_ar: "مدارس الأندلس - الطائف بنات",
      },
      { code: "PRAC1", name_en: "Practice School", name_ar: "مدرسة تجريبية" },
      { code: "ALNUR", name_en: "Al-Nur School | Main", name_ar: "مدرسة النور" },
    ]);
    expect(out.map((s) => s.name.en)).toEqual([
      "Al-Nur School",
      "Andalus International Schools",
      "Practice School",
    ]);
    expect(out[1]?.branches).toEqual([
      { code: "TAIFB", name: { en: "Taif Boys", ar: "الطائف بنين" } },
      { code: "TAIFG", name: { en: "Taif Girls", ar: "الطائف بنات" } },
    ]);
    expect(out[1]?.name.ar).toBe("مدارس الأندلس");
    expect(out[2]?.branches).toEqual([{ code: "PRAC1", name: null }]);
    // A hyphen inside a name is not a separator; a missing Arabic branch falls back to English.
    expect(out[0]).toEqual({
      name: { en: "Al-Nur School", ar: "مدرسة النور" },
      branches: [{ code: "ALNUR", name: { en: "Main", ar: "Main" } }],
    });
  });

  it("finds a school group's logo from its name, however it is punctuated", () => {
    expect(schoolLogo("Andalus International Schools")).toMatch(/andalus-international/);
    expect(schoolLogo("Al-Andalus Private School")).toMatch(/alandalus-private/);
    expect(schoolLogo("Alandalus Private Schools")).toMatch(/alandalus-private/);
    expect(schoolLogo("Riyadh Demo School")).toBeNull();
  });
});
