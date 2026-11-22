import "server-only";
import { Font } from "@react-pdf/renderer";
import { ArabicShaper } from "arabic-persian-reshaper";

// Arabic-capable font (OFL) for Arabic text in PDFs; Latin text uses the built-in Helvetica.
Font.register({
  family: "NotoNaskhArabic",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/notonaskharabic/v44/RrQ5bpV-9Dd1b1OAGA6M9PkyDuVBePeKNaxcsss0Y7bwvc5krA.ttf",
    },
    {
      src: "https://fonts.gstatic.com/s/notonaskharabic/v44/RrQ5bpV-9Dd1b1OAGA6M9PkyDuVBePeKNaxcsss0Y7bwWslkrA.ttf",
      fontWeight: 700,
    },
  ],
});

const ARABIC = /[؀-ۿ]/;
export const hasArabic = (text: string) => ARABIC.test(text);
/** Font family for a piece of text: the Arabic font when it contains Arabic. */
export const fontFor = (text: string, latin = "Helvetica") =>
  hasArabic(text) ? "NotoNaskhArabic" : latin;
/** react-pdf doesn't join Arabic letters: convert to presentation forms before drawing. */
export const shape = (text: string) => (hasArabic(text) ? ArabicShaper.convertArabic(text) : text);
