import "server-only";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  render,
} from "@react-email/components";
import { createTranslator } from "use-intl/core";
import ar from "../../../../messages/ar.json";
import en from "../../../../messages/en.json";
import { headline, type ReportData } from "../types";

const MESSAGES = { en, ar } as const;
export type MailLocale = keyof typeof MESSAGES;

/** Translator for code that runs outside a request (the scheduler). */
export const reportTranslator = (locale: MailLocale) =>
  createTranslator({ locale, messages: MESSAGES[locale], namespace: "Reports" });

/** Short digest (SPEC §12): key numbers + "Open full report" link, no attachments. */
function Digest({
  locale,
  name,
  data,
  url,
}: {
  locale: MailLocale;
  name: string;
  data: ReportData;
  url: string;
}) {
  const t = reportTranslator(locale);
  const h = headline(data);
  const dir = locale === "ar" ? "rtl" : "ltr";
  const rows: [string, string | number][] = [
    [t("mail.classes"), h.classes],
    [t("mail.students"), h.students],
    [t("mail.active"), `${h.activePct}%`],
    [t("mail.lessons"), h.lessons],
    [t("mail.atRisk"), h.atRisk],
  ];
  if (h.followUps) rows.push([t("mail.followUps"), h.followUps]);
  return (
    <Html lang={locale} dir={dir}>
      <Head />
      <Preview>
        {t("mail.preview", { period: t(`period.${data.period}`), start: data.start })}
      </Preview>
      <Body
        style={{ backgroundColor: "#F8FAFC", fontFamily: "Arial, sans-serif", color: "#0F172A" }}
      >
        <Container
          style={{
            backgroundColor: "#FFFFFF",
            padding: 24,
            maxWidth: 560,
            direction: dir,
            textAlign: locale === "ar" ? "right" : "left",
          }}
        >
          <Heading as="h1" style={{ color: "#1E3A8A", fontSize: 22 }}>
            {t("mail.title", { period: t(`period.${data.period}`) })}
          </Heading>
          <Text>{t("mail.hello", { name })}</Text>
          <Text style={{ color: "#475569" }}>
            {t("mail.range", { school: data.school, start: data.start, end: data.end })}
          </Text>
          <Section>
            {rows.map(([k, v]) => (
              <Text key={k} style={{ margin: "4px 0" }}>
                <strong>{v}</strong> · {k}
              </Text>
            ))}
          </Section>
          {data.suggestions.length > 0 && (
            <Section>
              <Text style={{ fontWeight: "bold" }}>{t("mail.nextWeek")}</Text>
              {data.suggestions.map((s) => (
                <Text key={s.key} style={{ margin: "2px 0" }}>
                  • {t(`suggestion.${s.key}`, s.params)}
                </Text>
              ))}
            </Section>
          )}
          <Button
            href={url}
            style={{
              backgroundColor: "#1E3A8A",
              color: "#FFFFFF",
              padding: "12px 20px",
              borderRadius: 6,
            }}
          >
            {t("mail.open")}
          </Button>
          <Hr />
          <Text style={{ color: "#475569", fontSize: 12 }}>{t("mail.footer")}</Text>
        </Container>
      </Body>
    </Html>
  );
}

export async function renderDigest(args: {
  locale: MailLocale;
  name: string;
  data: ReportData;
  url: string;
}) {
  const t = reportTranslator(args.locale);
  const element = <Digest {...args} />;
  return {
    subject: t("mail.subject", { period: t(`period.${args.data.period}`), start: args.data.start }),
    html: await render(element),
    text: await render(element, { plainText: true }),
  };
}
