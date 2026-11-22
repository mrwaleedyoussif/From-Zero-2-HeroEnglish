import type { ReportData } from "./types";

/** Translate a key inside the "Reports" namespace. */
export type T = (key: string, params?: Record<string, string | number>) => string;

export interface ReportTable {
  id: keyof ReportData;
  title: string;
  headers: string[];
  rows: (string | number)[][];
}

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
const dash = (v: number | null) => (v === null ? "—" : v);

/** The report's sections as tables (shared by the screen and the PDF); empty sections are left out. */
export function reportTables(d: ReportData, t: T): ReportTable[] {
  const c = (k: string) => t(`col.${k}`);
  const tables: ReportTable[] = [
    {
      id: "classes",
      title: t("section.classes"),
      headers: [
        c("class"),
        c("students"),
        c("active"),
        c("lessons"),
        c("accuracy"),
        c("atRisk"),
        c("overdue"),
        c("growth"),
      ],
      rows: d.classes.map((x) => [
        x.code,
        x.students,
        pct(x.active, x.students),
        x.lessons,
        x.accuracy === null ? "—" : `${x.accuracy}%`,
        x.atRisk,
        x.overdue,
        dash(x.growth),
      ]),
    },
    {
      id: "improvers",
      title: t("section.improvers"),
      headers: [c("name"), c("class"), c("gain")],
      rows: d.improvers.map((x) => [x.name, x.class, `+${x.gain}`]),
    },
    {
      id: "atRisk",
      title: t("section.atRisk"),
      headers: [c("name"), c("class"), c("flags")],
      rows: d.atRisk.map((x) => [x.name, x.class, x.flags.map((f) => t(`flag.${f}`)).join(", ")]),
    },
    {
      id: "assignments",
      title: t("section.assignments"),
      headers: [c("class"), c("assigned"), c("done"), ""],
      rows: d.assignments.map((x) => [x.class, x.assigned, x.done, pct(x.done, x.assigned)]),
    },
    {
      id: "skillGaps",
      title: t("section.skillGaps"),
      headers: [c("class"), c("skill"), c("theta")],
      rows: d.skillGaps.map((x) => [x.class, x.skill, x.theta]),
    },
    {
      id: "cefr",
      title: t("section.cefr"),
      headers: [c("level"), c("students"), c("change")],
      rows: d.cefr.map((x) => [
        x.cefr === "none" ? "—" : x.cefr,
        x.n,
        x.change === null ? "—" : x.change > 0 ? `+${x.change}` : x.change,
      ]),
    },
    {
      id: "teachers",
      title: t("section.teachers"),
      headers: [c("teacher"), c("assignments"), c("kudos"), c("lastSignIn")],
      rows: d.teachers.map((x) => [
        x.name,
        x.assignments,
        x.kudos,
        x.lastSignIn?.slice(0, 10) ?? "—",
      ]),
    },
    {
      id: "followUps",
      title: t("section.followUps"),
      headers: [c("teacher"), c("date")],
      rows: d.followUps.map((x) => [x.teacher, x.date]),
    },
    {
      id: "coaching",
      title: t("section.coaching"),
      headers: [c("date"), c("coach"), c("teacher")],
      rows: d.coaching.map((x) => [x.date, x.coach, x.teacher]),
    },
  ];
  return tables.filter((x) => x.rows.length > 0);
}

export const suggestionLines = (d: ReportData, t: T) =>
  d.suggestions.map((s) => t(`suggestion.${s.key}`, s.params));
