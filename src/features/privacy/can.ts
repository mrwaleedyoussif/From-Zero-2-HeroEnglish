import "server-only";
import { can } from "@/lib/auth/can";
import { platformTarget } from "@/lib/auth/scope";
import type { Actor } from "@/lib/auth/session";

/** Export/erase of student data is platform-level (the Owner): users:edit on the platform. */
export const canEraseStudents = (actor: Actor) => can(actor, "users:edit", platformTarget);
