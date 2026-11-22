import "server-only";
import {
  Document,
  type DocumentProps,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { ArabicShaper } from "arabic-persian-reshaper";
import type { ReactElement } from "react";

// Arabic-capable font (OFL) for names and the Arabic line; Latin text uses the built-in Helvetica.
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
const fontFor = (text: string) => (ARABIC.test(text) ? "NotoNaskhArabic" : "Helvetica-Bold");
/** react-pdf doesn't join Arabic letters: convert to presentation forms before drawing. */
const shape = (text: string) => (ARABIC.test(text) ? ArabicShaper.convertArabic(text) : text);

// Staff palette (SPEC §16): navy primary, amber accent for rewards.
const s = StyleSheet.create({
  page: { padding: 36, backgroundColor: "#FFFFFF" },
  frame: {
    flex: 1,
    borderWidth: 6,
    borderColor: "#1E3A8A",
    borderStyle: "solid",
    padding: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  ribbon: { width: 120, height: 8, backgroundColor: "#F59E0B", marginBottom: 24 },
  kicker: { fontFamily: "Helvetica", fontSize: 14, color: "#475569", letterSpacing: 2 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 34, color: "#1E3A8A", marginTop: 8 },
  titleAr: { fontFamily: "NotoNaskhArabic", fontSize: 22, color: "#1E3A8A", marginTop: 4 },
  name: { fontSize: 30, color: "#0F172A", marginTop: 28 },
  body: {
    fontFamily: "Helvetica",
    fontSize: 14,
    color: "#0F172A",
    marginTop: 16,
    textAlign: "center",
  },
  achievement: { fontFamily: "Helvetica-Bold", fontSize: 22, color: "#0F766E", marginTop: 10 },
  footer: { fontFamily: "Helvetica", fontSize: 11, color: "#475569", marginTop: 36 },
});

export interface CertificateData {
  studentName: string;
  schoolName: string;
  /** e.g. "Level 3 — Navigator" or "CEFR B1 in General English" */
  achievement: string;
  issuedOn: string;
  id: string;
}

/** A printable A4 landscape certificate (level-up or CEFR milestone, SPEC §10). */
export function CertificateDocument({
  data,
}: {
  data: CertificateData;
}): ReactElement<DocumentProps> {
  return (
    <Document title={`Certificate — ${data.achievement}`} author="LinguaPath">
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.frame}>
          <View style={s.ribbon} />
          <Text style={s.kicker}>LINGUAPATH</Text>
          <Text style={s.title}>Certificate of Achievement</Text>
          <Text style={s.titleAr}>{shape("شهادة إنجاز")}</Text>
          <Text style={[s.name, { fontFamily: fontFor(data.studentName) }]}>
            {shape(data.studentName)}
          </Text>
          <Text style={s.body}>has reached</Text>
          <Text style={s.achievement}>{data.achievement}</Text>
          <Text style={[s.body, { fontFamily: fontFor(data.schoolName) }]}>
            {shape(data.schoolName)}
          </Text>
          <Text style={s.footer}>
            {data.issuedOn} · {data.id.slice(0, 8).toUpperCase()}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
