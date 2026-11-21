import { defineGate } from "./types";

export const studentGate = defineGate({
  key: "student",
  basePath: "/student",
  permission: "gate:student",
  priority: 50,
  theme: "student",
  nav: [{ key: "nav.student.home", href: "/student" }],
  homeWidgets: [
    "widget.student.placementCta",
    "widget.student.fromMyTeacher",
    "widget.student.recommended",
    "widget.student.progress",
    "widget.student.streak",
    "widget.student.badges",
    "widget.student.leaderboard",
  ],
});
