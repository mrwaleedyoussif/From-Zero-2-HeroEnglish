import type { ComponentType } from "react";
import type { Actor } from "@/lib/auth/session";
import { OwnerAuditLogWidget } from "./owner-audit-log";
import { OwnerSchoolsWidget } from "./owner-schools";

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
};
