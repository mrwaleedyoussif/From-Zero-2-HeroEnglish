import { defineGate } from "./types";

export const coachGate = defineGate({
  key: "coach",
  basePath: "/coach",
  permission: "gate:coach",
  priority: 30,
  theme: "staff",
  nav: [
    { key: "nav.coach.home", href: "/coach" },
    { key: "nav.coach.insights", href: "/coach/insights", permission: "supervision:view" },
    { key: "nav.coach.coachingLog", href: "/coach/coaching-log", permission: "coaching:log" },
  ],
  homeWidgets: [
    "widget.coach.supportedTeachers",
    "widget.coach.coachingFollowUps",
    "widget.coach.growthVsSchool",
  ],
});
