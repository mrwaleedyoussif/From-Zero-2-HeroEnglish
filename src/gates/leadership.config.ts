import { defineGate } from "./types";

export const leadershipGate = defineGate({
  key: "leadership",
  basePath: "/leadership",
  permission: "gate:leadership",
  priority: 20,
  theme: "staff",
  nav: [
    { key: "nav.leadership.home", href: "/leadership" },
    { key: "nav.leadership.insights", href: "/leadership/insights", permission: "students:view" },
    {
      key: "nav.leadership.supervision",
      href: "/leadership/supervision",
      permission: "supervision:view",
    },
    { key: "nav.leadership.reports", href: "/leadership/reports", permission: "reports:view" },
    { key: "nav.leadership.messages", href: "/leadership/messages" },
    { key: "nav.leadership.online", href: "/leadership/online", permission: "presence:view" },
  ],
  homeWidgets: [
    "widget.leadership.headline",
    "widget.leadership.schoolOverview",
    "widget.leadership.gradeComparison",
    "widget.leadership.placementDistribution",
    "widget.leadership.engagement",
    "widget.leadership.teacherUsage",
    "widget.leadership.interventionList",
    "widget.leadership.supervisionTree",
    "widget.leadership.reportArchive",
  ],
});
