import { defineGate } from "./types";

export const studentGate = defineGate({
  key: "student",
  basePath: "/student",
  permission: "gate:student",
  priority: 50,
  theme: "student",
  nav: [
    { key: "nav.student.home", href: "/student" },
    { key: "nav.student.lessons", href: "/student/lessons", permission: "learning:self" },
    { key: "nav.student.placement", href: "/student/placement", permission: "placement:take" },
    { key: "nav.student.rewards", href: "/student/rewards", permission: "rewards:view" },
    { key: "nav.student.profile", href: "/student/profile", permission: "learning:self" },
  ],
  homeWidgets: [
    "widget.student.journey",
    "widget.student.fromMyTeacher",
    "widget.student.placementCta",
    "widget.student.recommended",
    "widget.student.departments",
    "widget.student.progress",
    "widget.student.streak",
    "widget.student.badges",
    "widget.student.leaderboard",
  ],
});
