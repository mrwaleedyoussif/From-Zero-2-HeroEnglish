import type { ComponentType } from "react";
import type { Actor } from "@/lib/auth/session";
import { OwnerAuditLogWidget } from "./owner-audit-log";
import { OwnerSchoolsWidget } from "./owner-schools";
import { StudentFromMyTeacherWidget, StudentRecommendedWidget } from "./student-learning";
import { StudentPlacementCtaWidget } from "./student-placement-cta";
import {
  TeacherAssignmentTrackerWidget,
  TeacherQuickActionsWidget,
  TeacherSuggestedGroupsWidget,
} from "./teacher-learning";

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
  "widget.student.placementCta": StudentPlacementCtaWidget,
  "widget.student.fromMyTeacher": StudentFromMyTeacherWidget,
  "widget.student.recommended": StudentRecommendedWidget,
  "widget.teacher.assignmentTracker": TeacherAssignmentTrackerWidget,
  "widget.teacher.suggestedGroups": TeacherSuggestedGroupsWidget,
  "widget.teacher.quickActions": TeacherQuickActionsWidget,
};
