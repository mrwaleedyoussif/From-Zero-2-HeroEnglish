import { defineGate } from "./types";

export const coachGate = defineGate({
  key: "coach",
  basePath: "/coach",
  permission: "gate:coach",
  priority: 30,
  theme: "staff",
  nav: [{ key: "nav.coach.home", href: "/coach" }],
  homeWidgets: [
    "widget.coach.supportedTeachers",
    "widget.coach.coachingFollowUps",
    "widget.coach.growthVsSchool",
  ],
});
