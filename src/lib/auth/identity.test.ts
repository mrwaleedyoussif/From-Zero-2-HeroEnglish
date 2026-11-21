import { describe, expect, it } from "vitest";
import {
  generatePin,
  isStudentEmail,
  pinSchema,
  studentEmail,
  studentLoginSchema,
  suggestUsername,
} from "./student-identity";
import { signViewAs, verifyViewAs } from "./view-as-token";

describe("student identity", () => {
  it("builds the synthetic email from school code + username", () => {
    expect(studentEmail("riy01", "Sara.K")).toBe("sara.k@riy01.students.local");
    expect(isStudentEmail("sara.k@riy01.students.local")).toBe(true);
    expect(isStudentEmail("teacher@school.sa")).toBe(false);
  });

  it("normalises login input and rejects bad values", () => {
    expect(
      studentLoginSchema.parse({ schoolCode: " riy01 ", username: "Sara.K", pin: "246810" }),
    ).toEqual({
      schoolCode: "RIY01",
      username: "sara.k",
      pin: "246810",
    });
    expect(
      studentLoginSchema.safeParse({ schoolCode: "R", username: "sara", pin: "246810" }).success,
    ).toBe(false);
    expect(
      studentLoginSchema.safeParse({ schoolCode: "RIY01", username: "a b", pin: "246810" }).success,
    ).toBe(false);
    expect(pinSchema.safeParse("12345").success).toBe(false);
    expect(pinSchema.safeParse("12a456").success).toBe(false);
  });

  it("generates 6-digit, non-trivial PINs", () => {
    for (let i = 0; i < 500; i++) {
      const pin = generatePin();
      expect(pin).toMatch(/^\d{6}$/);
      expect(pin).not.toMatch(/^(\d)\1{5}$/);
      expect(pin).not.toBe("123456");
    }
  });

  it("suggests usernames from names", () => {
    expect(suggestUsername("Sara Khalid")).toBe("sara.k");
    expect(suggestUsername("Omar")).toBe("omar");
    expect(suggestUsername("سارة خالد")).toBeNull();
  });
});

describe("view-as token", () => {
  const key = "k".repeat(44);
  const viewer = "11111111-1111-4111-8111-111111111111";
  const target = "22222222-2222-4222-8222-222222222222";
  const now = new Date("2026-11-21T12:00:00Z");
  const later = new Date("2026-11-21T13:00:00Z");

  it("round-trips for the same viewer before expiry", () => {
    expect(verifyViewAs(key, signViewAs(key, viewer, target, later), viewer, now)).toBe(target);
  });

  it("rejects another viewer, expiry, tampering and wrong key", () => {
    const token = signViewAs(key, viewer, target, later);
    expect(verifyViewAs(key, token, target, now)).toBeNull();
    expect(verifyViewAs(key, token, viewer, new Date("2026-11-21T14:00:00Z"))).toBeNull();
    expect(verifyViewAs(key, token.replace(target, viewer), viewer, now)).toBeNull();
    expect(verifyViewAs("other-key", token, viewer, now)).toBeNull();
    expect(verifyViewAs(key, "garbage", viewer, now)).toBeNull();
    expect(verifyViewAs(key, undefined, viewer, now)).toBeNull();
  });
});
