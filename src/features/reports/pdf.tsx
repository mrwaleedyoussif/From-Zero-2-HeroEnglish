import "server-only";
import { Document, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import { fontFor, shape } from "@/lib/pdf/arabic";
import { type MailLocale, reportTranslator } from "./emails/digest";
import { reportTables, suggestionLines, type T } from "./tables";
import type { ReportData } from "./types";

/** A single react-pdf style object. */
type Style = Parameters<typeof StyleSheet.create>[0][string];

// SPEC §16 staff palette.
const s = StyleSheet.create({
  page: { padding: 32, fontSize: 9, color: "#0F172A" },
  title: { fontSize: 18, color: "#1E3A8A", marginBottom: 4 },
  sub: { color: "#475569", marginBottom: 14 },
  h2: { fontSize: 12, color: "#1E3A8A", marginTop: 12, marginBottom: 4 },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E2E8F0",
    paddingVertical: 3,
  },
  cell: { flex: 1, paddingHorizontal: 2 },
  head: { fontWeight: 700, color: "#475569" },
});

/** Text with the right font and Arabic shaping; RTL layout for Arabic reports. */
function Txt({ children, style, rtl }: { children: string | number; style?: Style; rtl: boolean }) {
  const text = String(children);
  return (
    <Text style={[{ fontFamily: fontFor(text), textAlign: rtl ? "right" : "left" }, style ?? {}]}>
      {shape(text)}
    </Text>
  );
}

/** The full report as an A4 PDF for the Drive archive (SPEC §12 delivery 3). */
export async function reportPdf(data: ReportData, locale: MailLocale): Promise<Buffer> {
  const tr = reportTranslator(locale);
  const t: T = (k, p) => tr(k as Parameters<typeof tr>[0], p);
  const rtl = locale === "ar";
  const dir = { flexDirection: rtl ? ("row-reverse" as const) : ("row" as const) };
  const doc = (
    <Document title={`LinguaPath ${data.period} ${data.start}`} author="LinguaPath">
      <Page size="A4" style={s.page}>
        <Txt rtl={rtl} style={s.title}>
          {t("pdfTitle", { period: t(`period.${data.period}`) })}
        </Txt>
        <Txt rtl={rtl} style={s.sub}>
          {t("range", { school: data.school, start: data.start, end: data.end })}
        </Txt>
        {reportTables(data, t).map((table) => (
          <View key={table.id} wrap={false}>
            <Txt rtl={rtl} style={s.h2}>
              {table.title}
            </Txt>
            <View style={[s.row, dir]}>
              {table.headers.map((h, i) => (
                <View key={i} style={s.cell}>
                  <Txt rtl={rtl} style={s.head}>
                    {h}
                  </Txt>
                </View>
              ))}
            </View>
            {table.rows.map((r, i) => (
              <View key={i} style={[s.row, dir]}>
                {r.map((cell, j) => (
                  <View key={j} style={s.cell}>
                    <Txt rtl={rtl}>{cell}</Txt>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ))}
        {data.suggestions.length > 0 && (
          <View>
            <Txt rtl={rtl} style={s.h2}>
              {t("section.suggestions")}
            </Txt>
            {suggestionLines(data, t).map((line) => (
              <Txt key={line} rtl={rtl}>{`• ${line}`}</Txt>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
