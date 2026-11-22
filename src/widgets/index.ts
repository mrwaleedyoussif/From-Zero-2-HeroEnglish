import type { ComponentType } from "react";
import type { Actor } from "@/lib/auth/session";
import {
  CoachFollowUpsWidget,
  CoachGrowthWidget,
  CoachSupportedTeachersWidget,
} from "./coach-insights";
import {
  LeadershipEngagementWidget,
  LeadershipGradesWidget,
  LeadershipOverviewWidget,
  LeadershipPlacementWidget,
} from "./leadership-insights";
import {
  LeadershipInterventionWidget,
  LeadershipSupervisionWidget,
  LeadershipTeacherUsageWidget,
} from "./leadership-people";
import { OwnerAuditLogWidget } from "./owner-audit-log";
import { OwnerBudgetWidget, OwnerContentHealthWidget } from "./owner-health";
import { OwnerSchoolsWidget } from "./owner-schools";
import { StudentFromMyTeacherWidget, StudentRecommendedWidget } from "./student-learning";
import { StudentPlacementCtaWidget } from "./student-placement-cta";
import { StudentProgressWidget } from "./student-progress";
import {
  StudentBadgesWidget,
  StudentLeaderboardWidget,
  StudentStreakWidget,
} from "./student-rewards";
import {
  TeacherAssignmentTrackerWidget,
  TeacherQuickActionsWidget,
  TeacherSuggestedGroupsWidget,
} from "./teacher-learning";
import {
  TeacherAtRiskWidget,
  TeacherClassRosterWidget,
  TeacherSkillHeatmapWidget,
} from "./teacher-insights";

export interface WidgetProps {
  actor: Actor;
}

/**
 * Built widgets by registry key. Keys listed in a gate config but missing here render a
 * "coming in a later phase" card (see gates/components/widget-slot.tsx).
 */
export const widgets: Partial<Record<string, ComponentType<WidgetProps>>> = {
  "widget.owner.schools": OwnerSchoolsWidget,
  "widget.owner.auditLog": OwnerAuditLogWidget,
  "widget.owner.budgetMeters": OwnerBudgetWidget,
  "widget.owner.contentHealth": OwnerContentHealthWidget,
  "widget.leadership.schoolOverview": LeadershipOverviewWidget,
  "widget.leadership.gradeComparison": LeadershipGradesWidget,
  "widget.leadership.placementDistribution": LeadershipPlacementWidget,
  "widget.leadership.engagement": LeadershipEngagementWidget,
  "widget.leadership.teacherUsage": LeadershipTeacherUsageWidget,
  "widget.leadership.interventionList": LeadershipInterventionWidget,
  "widget.leadership.supervisionTree": LeadershipSupervisionWidget,
  "widget.coach.supportedTeachers": CoachSupportedTeachersWidget,
  "widget.coach.coachingFollowUps": CoachFollowUpsWidget,
  "widget.coach.growthVsSchool": CoachGrowthWidget,
  "widget.teacher.classRoster": TeacherClassRosterWidget,
  "widget.teacher.atRiskStudents": TeacherAtRiskWidget,
  "widget.teacher.skillHeatmap": TeacherSkillHeatmapWidget,
  "widget.student.progress": StudentProgressWidget,
  "widget.student.placementCta": StudentPlacementCtaWidget,
  "widget.student.fromMyTeacher": StudentFromMyTeacherWidget,
  "widget.student.recommended": StudentRecommendedWidget,
  "widget.student.streak": StudentStreakWidget,
  "widget.student.badges": StudentBadgesWidget,
  "widget.student.leaderboard": StudentLeaderboardWidget,
  "widget.teacher.assignmentTracker": TeacherAssignmentTrackerWidget,
  "widget.teacher.suggestedGroups": TeacherSuggestedGroupsWidget,
  "widget.teacher.quickActions": TeacherQuickActionsWidget,
};
