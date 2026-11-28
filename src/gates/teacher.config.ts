import { defineGate } from "./types";

export const teacherGate = defineGate({
  key: "teacher",
  basePath: "/teacher",
  permission: "gate:teacher",
  priority: 40,
  theme: "staff",
  nav: [
    { key: "nav.teacher.home", main: true, href: "/teacher" },
    { key: "nav.teacher.insights", href: "/teacher/insights", permission: "students:view" },
    { key: "nav.teacher.library", href: "/teacher/library", permission: "content:view" },
    {
      key: "nav.teacher.assignments",
      main: true,
      href: "/teacher/assignments",
      permission: "lessons:assign",
    },
    {
      key: "nav.teacher.departments",
      main: true,
      href: "/student",
      permission: "learning:self",
    },
    { key: "nav.teacher.units", main: true, href: "/teacher/units", permission: "students:view" },
    {
      key: "nav.teacher.monitor",
      main: true,
      href: "/teacher/monitor",
      permission: "students:view",
    },
    { key: "nav.teacher.messages", main: true, href: "/teacher/messages" },
    { key: "nav.teacher.groups", href: "/teacher/groups", permission: "students:edit" },
    { key: "nav.teacher.rewards", href: "/teacher/rewards", permission: "rewards:grant" },
    { key: "nav.teacher.reports", href: "/teacher/reports", permission: "reports:view" },
    {
      key: "nav.teacher.placement",
      href: "/teacher/placement",
      permission: "placement:view_results",
    },
  ],
  homeWidgets: [
    "widget.teacher.headline",
    "widget.teacher.classRoster",
    "widget.teacher.atRiskStudents",
    "widget.teacher.assignmentTracker",
    "widget.teacher.skillHeatmap",
    "widget.teacher.suggestedGroups",
    "widget.teacher.quickActions",
  ],
});
