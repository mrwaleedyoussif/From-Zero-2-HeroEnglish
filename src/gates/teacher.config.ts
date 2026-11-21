import { defineGate } from "./types";

export const teacherGate = defineGate({
  key: "teacher",
  basePath: "/teacher",
  permission: "gate:teacher",
  priority: 40,
  theme: "staff",
  nav: [
    { key: "nav.teacher.home", href: "/teacher" },
    { key: "nav.teacher.library", href: "/teacher/library", permission: "content:view" },
  ],
  homeWidgets: [
    "widget.teacher.classRoster",
    "widget.teacher.atRiskStudents",
    "widget.teacher.assignmentTracker",
    "widget.teacher.skillHeatmap",
    "widget.teacher.suggestedGroups",
    "widget.teacher.quickActions",
  ],
});
