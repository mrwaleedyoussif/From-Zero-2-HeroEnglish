import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { isRetryable, withBackoff } from "./backoff";
import { decryptSecret, encryptSecret } from "./crypto";
import { createFakeStorage, parseRange } from "./fake";
import { Readable } from "node:stream";
import { childQuery, escapeQuery, header, toWebStream } from "./google";
import { DRIVE_ROOT, findLayoutFolder, initLayout, LAYOUT, listRecursive } from "./layout";
import { SHEET_MIME } from "./types";

const KEY = Buffer.alloc(32, 7).toString("base64");
const FIXTURES = resolve(__dirname, "../../../supabase/fixtures/drive");

describe("secret encryption", () => {
  it("round-trips and uses a fresh IV each time", () => {
    const a = encryptSecret("1//refresh-token", KEY);
    const b = encryptSecret("1//refresh-token", KEY);
    expect(a).not.toBe(b);
    expect(decryptSecret(a, KEY)).toBe("1//refresh-token");
  });

  it("rejects tampering and the wrong key", () => {
    const token = encryptSecret("secret", KEY);
    const parts = token.split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => decryptSecret(parts.join("."), KEY)).toThrow();
    expect(() => decryptSecret(token, Buffer.alloc(32, 9).toString("base64"))).toThrow();
    expect(() => decryptSecret("v2.x.y.z", KEY)).toThrow(/format/);
  });
});

describe("backoff", () => {
  it("retries quota and server errors, not client errors", () => {
    expect(isRetryable({ code: 429 })).toBe(true);
    expect(isRetryable({ response: { status: 503 } })).toBe(true);
    expect(isRetryable({ code: 403, errors: [{ reason: "userRateLimitExceeded" }] })).toBe(true);
    expect(isRetryable({ code: 403, errors: [{ reason: "insufficientPermissions" }] })).toBe(false);
    expect(isRetryable({ code: 404 })).toBe(false);
    expect(isRetryable(new Error("boom"))).toBe(false);
  });

  it("waits exponentially longer and gives up after the retry budget", async () => {
    const sleep = vi.fn(async () => undefined);
    const fn = vi.fn(async () => {
      throw { code: 429 };
    });
    await expect(
      withBackoff(fn, { retries: 3, baseMs: 100, sleep, random: () => 1 }),
    ).rejects.toEqual({ code: 429 });
    expect(fn).toHaveBeenCalledTimes(4);
    expect(sleep.mock.calls.map((c) => (c as unknown[])[0])).toEqual([100, 200, 400]);
  });

  it("returns as soon as a retry succeeds", async () => {
    let n = 0;
    const result = await withBackoff(
      async () => {
        if (n++ < 2) throw { code: 500 };
        return "ok";
      },
      { sleep: async () => undefined },
    );
    expect(result).toBe("ok");
  });
});

describe("Drive query escaping", () => {
  it("escapes quotes and backslashes so names cannot break out of the query", () => {
    expect(escapeQuery("O'Brien\\x")).toBe("O\\'Brien\\\\x");
    expect(childQuery("abc", "Bob's sheet", "sheet")).toBe(
      "'abc' in parents and name = 'Bob\\'s sheet' and trashed = false and mimeType = 'application/vnd.google-apps.spreadsheet'",
    );
  });
});

describe("fake driver", () => {
  const storage = createFakeStorage(FIXTURES);

  it("finds the layout and reads a sheet as rows", async () => {
    const content = await findLayoutFolder(storage, "01_Content");
    expect(content).not.toBeNull();
    const sheet = await storage.findChild(content ?? "", "Departments", "sheet");
    expect(sheet?.mimeType).toBe(SHEET_MIME);
    const rows = await storage.readSheet(sheet?.id ?? "");
    expect(rows[0]?.[0]).toBe("department_id");
    expect(rows[1]?.slice(0, 2)).toEqual(["GEN", "General English"]);
  });

  it("lists media recursively with paths", async () => {
    const media = await findLayoutFolder(storage, "02_Media");
    const files = await listRecursive(storage, media ?? "");
    expect(files.map((f) => f.path).sort()).toEqual([
      "audio/listen_0001.mp3",
      "docs/past_simple_slides.pdf",
    ]);
  });

  it("streams byte ranges for seeking", async () => {
    const media = await findLayoutFolder(storage, "02_Media/audio");
    const mp3 = await storage.findChild(media ?? "", "listen_0001.mp3", "file");
    const part = await storage.stream(mp3?.id ?? "", "bytes=0-99");
    expect(part).toMatchObject({ status: 206, contentLength: 100, contentType: "audio/mpeg" });
    expect(part.contentRange).toMatch(/^bytes 0-99\/\d+$/);
  });

  it("refuses ids that point outside its folder", async () => {
    const escape = `fake_${Buffer.from("../../package.json").toString("base64url")}`;
    expect(await storage.getFile(escape)).toBeNull();
    await expect(storage.stream(escape)).rejects.toThrow(/Not found/);
    await expect(storage.stream("1AbcRealDriveId")).rejects.toThrow(/Not found/);
  });

  it("creates the whole layout idempotently", async () => {
    const dir = await mkdtemp(join(tmpdir(), "drive-"));
    const fresh = createFakeStorage(dir);
    const first = await initLayout(fresh);
    const second = await initLayout(fresh);
    expect(Object.keys(first)).toEqual([DRIVE_ROOT, ...LAYOUT]);
    expect(second).toEqual(first);
  });
});

describe("parseRange", () => {
  it.each([
    ["bytes=0-99", 1000, { start: 0, end: 99 }],
    ["bytes=900-", 1000, { start: 900, end: 999 }],
    ["bytes=-100", 1000, { start: 900, end: 999 }],
    ["bytes=0-5000", 1000, { start: 0, end: 999 }],
    ["bytes=2000-", 1000, null],
    ["items=0-1", 1000, null],
    [null, 1000, null],
  ])("%s of %i", (range, size, expected) => {
    expect(parseRange(range, size)).toEqual(expected);
  });
});

describe("Google Drive responses", () => {
  it("reads headers from a Fetch Headers object and from a plain record", () => {
    const fetched = new Headers({ "Content-Range": "bytes 0-99/5000", "Content-Length": "100" });
    expect(header(fetched, "content-range")).toBe("bytes 0-99/5000");
    expect(header(fetched, "content-length")).toBe("100");
    expect(header(fetched, "etag")).toBeNull();
    expect(header({ "content-range": "bytes 0-1/2" }, "content-range")).toBe("bytes 0-1/2");
    expect(header({}, "content-range")).toBeNull();
    expect(header(undefined, "content-range")).toBeNull();
  });

  it("turns either kind of stream into a web stream", async () => {
    const read = async (s: ReadableStream<Uint8Array>) =>
      Buffer.from(await new Response(s).arrayBuffer()).toString();
    expect(await read(toWebStream(Readable.from([Buffer.from("node")])))).toBe("node");
    expect(await read(toWebStream(new Response("web").body))).toBe("web");
  });
});
