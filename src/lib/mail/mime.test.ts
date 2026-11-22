import { describe, expect, it } from "vitest";
import { buildMime, encodeHeader, toBase64Url } from "./mime";

describe("mime", () => {
  it("encodes non-ASCII headers and keeps ASCII as is", () => {
    expect(encodeHeader("Weekly report")).toBe("Weekly report");
    expect(encodeHeader("التقرير")).toBe(
      `=?UTF-8?B?${Buffer.from("التقرير").toString("base64")}?=`,
    );
  });

  it("builds a multipart/alternative message with base64 bodies", () => {
    const m = buildMime({
      from: "LP <a@b.c>",
      to: "x@y.z",
      subject: "Hi",
      html: "<p>مرحبا</p>",
      text: "مرحبا",
      boundary: "B",
    });
    expect(m).toContain('Content-Type: multipart/alternative; boundary="B"');
    expect(m).toContain(Buffer.from("مرحبا").toString("base64"));
    expect(m.endsWith("--B--\r\n")).toBe(true);
    expect(m.split("\r\n").every((line) => line.length <= 998)).toBe(true);
  });

  it("refuses header injection and makes base64url", () => {
    expect(() =>
      buildMime({ from: "a", to: "x@y.z\r\nBcc: evil@x", subject: "s", html: "", text: "" }),
    ).toThrow();
    expect(toBase64Url("??>")).toBe("Pz8-");
  });
});
