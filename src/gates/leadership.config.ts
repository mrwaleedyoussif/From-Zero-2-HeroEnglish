import { defineGate } from "./types";

export const leadershipGate = defineGate({
  key: "leadership",
  basePath: "/leadership",
  permission: "gate:leadership",
  priority: 20,
  theme: "staff",
  nav: [{ key: "nav.leadership.home", href: "/leadership" }],
  homeWidgets: [
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
