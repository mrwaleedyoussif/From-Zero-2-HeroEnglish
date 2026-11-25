import { describe, expect, it } from "vitest";
import { cleanSvg, pictureFile } from "./pictures";

const ok =
  '<svg viewBox="0 0 120 120"><rect x="10" y="10" width="100" height="100" fill="#fde68a"/><circle cx="60" cy="60" r="20" fill="#0e223d"/></svg>';

describe("word pictures", () => {
  it("keeps a plain drawing and adds what a browser needs to show it", () => {
    expect(cleanSvg(ok)).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(cleanSvg(`  ${ok}  `)).not.toBeNull();
  });
  it("refuses anything that could run, load or link", () => {
    const bad = [
      ok.replace("<rect", "<script>alert(1)</script><rect"),
      ok.replace("<rect", '<rect onload="x()"'),
      ok.replace("<rect", '<image href="https://x.test/a.png"/><rect'),
      ok.replace("<rect", '<a href="https://x.test"><rect').replace("</svg>", "</a></svg>"),
      ok.replace("<rect", "<foreignObject><div>hi</div></foreignObject><rect"),
      ok.replace('fill="#fde68a"', 'fill="url(https://x.test/p)"'),
      ok.replace("<rect", "<text>hello</text><rect"),
      "<p>not a drawing at all, just some words to fill the space</p>",
      "",
    ];
    for (const svg of bad) expect(cleanSvg(svg)).toBeNull();
  });
  it("names the file after the word", () => {
    expect(pictureFile("RW-A1-U01-VOC01", true)).toBe("RW-A1-U01-VOC01.svg");
    expect(pictureFile("RW-A1-U01-VOC01", false)).toBe("RW-A1-U01-VOC01.none.txt");
  });
});
