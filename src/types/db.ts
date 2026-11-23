
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "ability_estimates": {
                  Row: {
                    "cefr": string | null,"created_at": string,"department_id": string,"id": string,"measured_at": string,"school_id": string,"se": number | null,"session_id": string | null,"skill_id": string | null,"source": string,"student_id": string,"theta": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cefr"?: string | null,"created_at"?: string,"department_id": string,"id"?: string,"measured_at"?: string,"school_id": string,"se"?: number | null,"session_id"?: string | null,"skill_id"?: string | null,"source": string,"student_id": string,"theta": number,"updated_at"?: string
                  }
                  Update: {
                    "cefr"?: string | null,"created_at"?: string,"department_id"?: string,"id"?: string,"measured_at"?: string,"school_id"?: string,"se"?: number | null,"session_id"?: string | null,"skill_id"?: string | null,"source"?: string,"student_id"?: string,"theta"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ability_estimates_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ability_estimates_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ability_estimates_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "test_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ability_estimates_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: false
      referencedRelation: "skills"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ability_estimates_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"ability_priors": {
                  Row: {
                    "created_at": string,"department_id": string,"grade_band": string,"id": string,"theta0": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"department_id": string,"grade_band": string,"id"?: string,"theta0"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"department_id"?: string,"grade_band"?: string,"id"?: string,"theta0"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ability_priors_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    }
                  ]
                },"academic_years": {
                  Row: {
                    "created_at": string,"ends_on": string,"id": string,"is_current": boolean,"name": string,"school_id": string,"starts_on": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ends_on": string,"id"?: string,"is_current"?: boolean,"name": string,"school_id": string,"starts_on": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"ends_on"?: string,"id"?: string,"is_current"?: boolean,"name"?: string,"school_id"?: string,"starts_on"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "academic_years_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"assignment_progress": {
                  Row: {
                    "assignment_id": string,"completed_at": string | null,"school_id": string,"score": number | null,"started_at": string | null,"status": string,"student_id": string,"time_spent_sec": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignment_id": string,"completed_at"?: string | null,"school_id": string,"score"?: number | null,"started_at"?: string | null,"status"?: string,"student_id": string,"time_spent_sec"?: number,"updated_at"?: string
                  }
                  Update: {
                    "assignment_id"?: string,"completed_at"?: string | null,"school_id"?: string,"score"?: number | null,"started_at"?: string | null,"status"?: string,"student_id"?: string,"time_spent_sec"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "assignment_progress_assignment_id_fkey"
      columns: ["assignment_id"]
isOneToOne: false
      referencedRelation: "assignments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assignment_progress_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assignment_progress_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"assignment_targets": {
                  Row: {
                    "assignment_id": string,"target_id": string,"target_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignment_id": string,"target_id": string,"target_type": string
                  }
                  Update: {
                    "assignment_id"?: string,"target_id"?: string,"target_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "assignment_targets_assignment_id_fkey"
      columns: ["assignment_id"]
isOneToOne: false
      referencedRelation: "assignments"
      referencedColumns: ["id"]
    }
                  ]
                },"assignments": {
                  Row: {
                    "class_id": string,"created_at": string,"created_by": string | null,"due_at": string | null,"id": string,"lesson_id": string,"note": string | null,"required": boolean,"school_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "class_id": string,"created_at"?: string,"created_by"?: string | null,"due_at"?: string | null,"id"?: string,"lesson_id": string,"note"?: string | null,"required"?: boolean,"school_id": string,"updated_at"?: string
                  }
                  Update: {
                    "class_id"?: string,"created_at"?: string,"created_by"?: string | null,"due_at"?: string | null,"id"?: string,"lesson_id"?: string,"note"?: string | null,"required"?: boolean,"school_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "assignments_class_id_fkey"
      columns: ["class_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assignments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assignments_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assignments_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"after": Json | null,"before": Json | null,"created_at": string,"id": string,"school_id": string | null,"target_id": string | null,"target_table": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"after"?: Json | null,"before"?: Json | null,"created_at"?: string,"id"?: string,"school_id"?: string | null,"target_id"?: string | null,"target_table"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"after"?: Json | null,"before"?: Json | null,"created_at"?: string,"id"?: string,"school_id"?: string | null,"target_id"?: string | null,"target_table"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"badges": {
                  Row: {
                    "code": string,"created_at": string,"description": string | null,"icon_file": string | null,"id": string,"media_asset_id": string | null,"name_ar": string,"name_en": string,"rule": NonNullable<Json>,"status": string,"updated_at": string,"xp_bonus": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"description"?: string | null,"icon_file"?: string | null,"id"?: string,"media_asset_id"?: string | null,"name_ar": string,"name_en": string,"rule": NonNullable<Json>,"status"?: string,"updated_at"?: string,"xp_bonus"?: number
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"description"?: string | null,"icon_file"?: string | null,"id"?: string,"media_asset_id"?: string | null,"name_ar"?: string,"name_en"?: string,"rule"?: NonNullable<Json>,"status"?: string,"updated_at"?: string,"xp_bonus"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "badges_media_asset_id_fkey"
      columns: ["media_asset_id"]
isOneToOne: false
      referencedRelation: "media_assets"
      referencedColumns: ["id"]
    }
                  ]
                },"certificates": {
                  Row: {
                    "department_id": string | null,"id": string,"issued_at": string,"kind": string,"school_id": string,"student_id": string,"value": string
                  }
                  ComputedFields: never
                  Insert: {
                    "department_id"?: string | null,"id"?: string,"issued_at"?: string,"kind": string,"school_id": string,"student_id": string,"value": string
                  }
                  Update: {
                    "department_id"?: string | null,"id"?: string,"issued_at"?: string,"kind"?: string,"school_id"?: string,"student_id"?: string,"value"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "certificates_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "certificates_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "certificates_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"class_reward_settings": {
                  Row: {
                    "class_id": string,"created_at": string,"leaderboard_enabled": boolean,"school_id": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "class_id": string,"created_at"?: string,"leaderboard_enabled"?: boolean,"school_id": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "class_id"?: string,"created_at"?: string,"leaderboard_enabled"?: boolean,"school_id"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "class_reward_settings_class_id_fkey"
      columns: ["class_id"]
isOneToOne: true
      referencedRelation: "classes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "class_reward_settings_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "class_reward_settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"classes": {
                  Row: {
                    "code": string,"created_at": string,"grade_id": string,"id": string,"name": string | null,"school_id": string,"status": string,"updated_at": string,"year_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"grade_id": string,"id"?: string,"name"?: string | null,"school_id": string,"status"?: string,"updated_at"?: string,"year_id": string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"grade_id"?: string,"id"?: string,"name"?: string | null,"school_id"?: string,"status"?: string,"updated_at"?: string,"year_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "classes_grade_id_fkey"
      columns: ["grade_id"]
isOneToOne: false
      referencedRelation: "grades"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "classes_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "classes_year_id_fkey"
      columns: ["year_id"]
isOneToOne: false
      referencedRelation: "academic_years"
      referencedColumns: ["id"]
    }
                  ]
                },"coaching_logs": {
                  Row: {
                    "agreed_actions": string | null,"class_id": string | null,"coach_id": string,"created_at": string,"follow_up_on": string | null,"id": string,"kind": string,"notes": string | null,"observed_on": string,"rubric_id": string | null,"school_id": string,"scores": NonNullable<Json>,"status": string,"teacher_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "agreed_actions"?: string | null,"class_id"?: string | null,"coach_id": string,"created_at"?: string,"follow_up_on"?: string | null,"id"?: string,"kind": string,"notes"?: string | null,"observed_on"?: string,"rubric_id"?: string | null,"school_id": string,"scores"?: NonNullable<Json>,"status"?: string,"teacher_id": string,"updated_at"?: string
                  }
                  Update: {
                    "agreed_actions"?: string | null,"class_id"?: string | null,"coach_id"?: string,"created_at"?: string,"follow_up_on"?: string | null,"id"?: string,"kind"?: string,"notes"?: string | null,"observed_on"?: string,"rubric_id"?: string | null,"school_id"?: string,"scores"?: NonNullable<Json>,"status"?: string,"teacher_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "coaching_logs_class_id_fkey"
      columns: ["class_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "coaching_logs_coach_id_fkey"
      columns: ["coach_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "coaching_logs_rubric_id_fkey"
      columns: ["rubric_id"]
isOneToOne: false
      referencedRelation: "rubrics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "coaching_logs_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "coaching_logs_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"coin_ledger": {
                  Row: {
                    "created_at": string,"delta": number,"id": string,"reason": string,"ref_id": string | null,"school_id": string,"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"delta": number,"id"?: string,"reason": string,"ref_id"?: string | null,"school_id": string,"student_id": string
                  }
                  Update: {
                    "created_at"?: string,"delta"?: number,"id"?: string,"reason"?: string,"ref_id"?: string | null,"school_id"?: string,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "coin_ledger_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "coin_ledger_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"cron_runs": {
                  Row: {
                    "deferred": number,"failed": number,"finished_at": string | null,"id": string,"planned": number,"processed": number,"source": string,"started_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "deferred"?: number,"failed"?: number,"finished_at"?: string | null,"id"?: string,"planned"?: number,"processed"?: number,"source": string,"started_at"?: string
                  }
                  Update: {
                    "deferred"?: number,"failed"?: number,"finished_at"?: string | null,"id"?: string,"planned"?: number,"processed"?: number,"source"?: string,"started_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"cut_scores": {
                  Row: {
                    "cefr": string,"created_at": string,"department_id": string,"id": string,"max_theta": number,"min_theta": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cefr": string,"created_at"?: string,"department_id": string,"id"?: string,"max_theta": number,"min_theta": number,"updated_at"?: string
                  }
                  Update: {
                    "cefr"?: string,"created_at"?: string,"department_id"?: string,"id"?: string,"max_theta"?: number,"min_theta"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cut_scores_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    }
                  ]
                },"departments": {
                  Row: {
                    "code": string,"created_at": string,"description": string | null,"id": string,"name_ar": string,"name_en": string,"placement_max_items": number,"placement_min_items": number,"placement_target_se": number,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"description"?: string | null,"id"?: string,"name_ar": string,"name_en": string,"placement_max_items"?: number,"placement_min_items"?: number,"placement_target_se"?: number,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"name_ar"?: string,"name_en"?: string,"placement_max_items"?: number,"placement_min_items"?: number,"placement_target_se"?: number,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"email_log": {
                  Row: {
                    "created_at": string,"day": string,"id": string,"provider": string,"recipient_id": string | null,"report_id": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"day"?: string,"id"?: string,"provider": string,"recipient_id"?: string | null,"report_id"?: string | null,"status"?: string
                  }
                  Update: {
                    "created_at"?: string,"day"?: string,"id"?: string,"provider"?: string,"recipient_id"?: string | null,"report_id"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "email_log_recipient_id_fkey"
      columns: ["recipient_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "email_log_report_id_fkey"
      columns: ["report_id"]
isOneToOne: true
      referencedRelation: "reports"
      referencedColumns: ["id"]
    }
                  ]
                },"enrolments": {
                  Row: {
                    "class_id": string,"created_at": string,"id": string,"school_id": string,"status": string,"student_id": string,"updated_at": string,"year_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "class_id": string,"created_at"?: string,"id"?: string,"school_id": string,"status"?: string,"student_id": string,"updated_at"?: string,"year_id": string
                  }
                  Update: {
                    "class_id"?: string,"created_at"?: string,"id"?: string,"school_id"?: string,"status"?: string,"student_id"?: string,"updated_at"?: string,"year_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "enrolments_class_id_fkey"
      columns: ["class_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "enrolments_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "enrolments_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "enrolments_year_id_fkey"
      columns: ["year_id"]
isOneToOne: false
      referencedRelation: "academic_years"
      referencedColumns: ["id"]
    }
                  ]
                },"feature_flags": {
                  Row: {
                    "created_at": string,"enabled": boolean,"id": string,"key": string,"rollout": string,"subjects": NonNullable<Json>,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"enabled"?: boolean,"id"?: string,"key": string,"rollout"?: string,"subjects"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"enabled"?: boolean,"id"?: string,"key"?: string,"rollout"?: string,"subjects"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"grades": {
                  Row: {
                    "code": string,"created_at": string,"id": string,"name_ar": string,"name_en": string,"school_id": string,"sort_order": number,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"id"?: string,"name_ar": string,"name_en": string,"school_id": string,"sort_order"?: number,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"id"?: string,"name_ar"?: string,"name_en"?: string,"school_id"?: string,"sort_order"?: number,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "grades_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"group_members": {
                  Row: {
                    "created_at": string,"group_id": string,"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"group_id": string,"student_id": string
                  }
                  Update: {
                    "created_at"?: string,"group_id"?: string,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "group_members_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_members_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"groups": {
                  Row: {
                    "class_id": string,"created_at": string,"created_by": string | null,"id": string,"name": string,"school_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "class_id": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"name": string,"school_id": string,"updated_at"?: string
                  }
                  Update: {
                    "class_id"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"name"?: string,"school_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "groups_class_id_fkey"
      columns: ["class_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "groups_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "groups_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"import_jobs": {
                  Row: {
                    "applied_at": string | null,"created_at": string,"errors": NonNullable<Json>,"id": string,"missing_media": NonNullable<Json>,"payload": Json | null,"started_by": string | null,"status": string,"summary": NonNullable<Json>,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "applied_at"?: string | null,"created_at"?: string,"errors"?: NonNullable<Json>,"id"?: string,"missing_media"?: NonNullable<Json>,"payload"?: Json | null,"started_by"?: string | null,"status"?: string,"summary"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Update: {
                    "applied_at"?: string | null,"created_at"?: string,"errors"?: NonNullable<Json>,"id"?: string,"missing_media"?: NonNullable<Json>,"payload"?: Json | null,"started_by"?: string | null,"status"?: string,"summary"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"integration_secrets": {
                  Row: {
                    "account_email": string | null,"ciphertext": string,"connected_by": string | null,"created_at": string,"id": string,"provider": string,"scopes": (string)[],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "account_email"?: string | null,"ciphertext": string,"connected_by"?: string | null,"created_at"?: string,"id"?: string,"provider": string,"scopes"?: (string)[],"updated_at"?: string
                  }
                  Update: {
                    "account_email"?: string | null,"ciphertext"?: string,"connected_by"?: string | null,"created_at"?: string,"id"?: string,"provider"?: string,"scopes"?: (string)[],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"item_options": {
                  Row: {
                    "body": string,"created_at": string,"id": string,"item_id": string,"label": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"id"?: string,"item_id": string,"label": string,"updated_at"?: string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"id"?: string,"item_id"?: string,"label"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "item_options_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    }
                  ]
                },"items": {
                  Row: {
                    "author": string | null,"b_calibrated": number | null,"b_initial": number | null,"cefr": string | null,"code": string,"correct": string | null,"created_at": string,"department_id": string,"difficulty": number,"explanation": string | null,"grade_band": string | null,"id": string,"item_type": string,"media_asset_id": string | null,"media_file": string | null,"passage_id": string | null,"skill_id": string,"status": string,"stem": string,"sub_skill": string | null,"tags": (string)[],"time_limit_sec": number | null,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "author"?: string | null,"b_calibrated"?: number | null,"b_initial"?: never,"cefr"?: string | null,"code": string,"correct"?: string | null,"created_at"?: string,"department_id": string,"difficulty": number,"explanation"?: string | null,"grade_band"?: string | null,"id"?: string,"item_type": string,"media_asset_id"?: string | null,"media_file"?: string | null,"passage_id"?: string | null,"skill_id": string,"status"?: string,"stem": string,"sub_skill"?: string | null,"tags"?: (string)[],"time_limit_sec"?: number | null,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "author"?: string | null,"b_calibrated"?: number | null,"b_initial"?: never,"cefr"?: string | null,"code"?: string,"correct"?: string | null,"created_at"?: string,"department_id"?: string,"difficulty"?: number,"explanation"?: string | null,"grade_band"?: string | null,"id"?: string,"item_type"?: string,"media_asset_id"?: string | null,"media_file"?: string | null,"passage_id"?: string | null,"skill_id"?: string,"status"?: string,"stem"?: string,"sub_skill"?: string | null,"tags"?: (string)[],"time_limit_sec"?: number | null,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "items_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "items_media_asset_id_fkey"
      columns: ["media_asset_id"]
isOneToOne: false
      referencedRelation: "media_assets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "items_passage_id_fkey"
      columns: ["passage_id"]
isOneToOne: false
      referencedRelation: "passages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "items_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: false
      referencedRelation: "skills"
      referencedColumns: ["id"]
    }
                  ]
                },"learner_notes": {
                  Row: {
                    "author_id": string,"body": string,"created_at": string,"id": string,"school_id": string,"student_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"body": string,"created_at"?: string,"id"?: string,"school_id": string,"student_id": string,"updated_at"?: string
                  }
                  Update: {
                    "author_id"?: string,"body"?: string,"created_at"?: string,"id"?: string,"school_id"?: string,"student_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "learner_notes_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "learner_notes_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "learner_notes_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"learner_profiles": {
                  Row: {
                    "accommodations": (string)[],"created_at": string,"goals": (string)[],"interests": (string)[],"language_background": string | null,"mindset_answers": NonNullable<Json>,"mindset_score": number | null,"onboarded_at": string | null,"preferred_formats": (string)[],"school_id": string,"student_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accommodations"?: (string)[],"created_at"?: string,"goals"?: (string)[],"interests"?: (string)[],"language_background"?: string | null,"mindset_answers"?: NonNullable<Json>,"mindset_score"?: number | null,"onboarded_at"?: string | null,"preferred_formats"?: (string)[],"school_id": string,"student_id": string,"updated_at"?: string
                  }
                  Update: {
                    "accommodations"?: (string)[],"created_at"?: string,"goals"?: (string)[],"interests"?: (string)[],"language_background"?: string | null,"mindset_answers"?: NonNullable<Json>,"mindset_score"?: number | null,"onboarded_at"?: string | null,"preferred_formats"?: (string)[],"school_id"?: string,"student_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "learner_profiles_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "learner_profiles_student_id_fkey"
      columns: ["student_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"lesson_items": {
                  Row: {
                    "created_at": string,"id": string,"item_id": string,"lesson_id": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"item_id": string,"lesson_id": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"item_id"?: string,"lesson_id"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lesson_items_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lesson_items_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    }
                  ]
                },"lesson_progress": {
                  Row: {
                    "attempts": number,"best_score": number | null,"completed_at": string | null,"created_at": string,"last_opened_at": string,"lesson_id": string,"school_id": string,"status": string,"student_id": string,"time_spent_sec": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"best_score"?: number | null,"completed_at"?: string | null,"created_at"?: string,"last_opened_at"?: string,"lesson_id": string,"school_id": string,"status"?: string,"student_id": string,"time_spent_sec"?: number,"updated_at"?: string
                  }
                  Update: {
                    "attempts"?: number,"best_score"?: number | null,"completed_at"?: string | null,"created_at"?: string,"last_opened_at"?: string,"lesson_id"?: string,"school_id"?: string,"status"?: string,"student_id"?: string,"time_spent_sec"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lesson_progress_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lesson_progress_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lesson_progress_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"lessons": {
                  Row: {
                    "cefr": string | null,"code": string,"content_link": string | null,"content_url": string | null,"created_at": string,"department_id": string,"duration_min": number | null,"format": string,"grade_band": string | null,"id": string,"media_asset_id": string | null,"objectives": string | null,"prerequisites": (string)[],"skill_id": string,"status": string,"tags": (string)[],"title_ar": string,"title_en": string,"updated_at": string,"version": number,"xp": number
                  }
                  ComputedFields: never
                  Insert: {
                    "cefr"?: string | null,"code": string,"content_link"?: string | null,"content_url"?: string | null,"created_at"?: string,"department_id": string,"duration_min"?: number | null,"format": string,"grade_band"?: string | null,"id"?: string,"media_asset_id"?: string | null,"objectives"?: string | null,"prerequisites"?: (string)[],"skill_id": string,"status"?: string,"tags"?: (string)[],"title_ar": string,"title_en": string,"updated_at"?: string,"version"?: number,"xp"?: number
                  }
                  Update: {
                    "cefr"?: string | null,"code"?: string,"content_link"?: string | null,"content_url"?: string | null,"created_at"?: string,"department_id"?: string,"duration_min"?: number | null,"format"?: string,"grade_band"?: string | null,"id"?: string,"media_asset_id"?: string | null,"objectives"?: string | null,"prerequisites"?: (string)[],"skill_id"?: string,"status"?: string,"tags"?: (string)[],"title_ar"?: string,"title_en"?: string,"updated_at"?: string,"version"?: number,"xp"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "lessons_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lessons_media_asset_id_fkey"
      columns: ["media_asset_id"]
isOneToOne: false
      referencedRelation: "media_assets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lessons_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: false
      referencedRelation: "skills"
      referencedColumns: ["id"]
    }
                  ]
                },"levels": {
                  Row: {
                    "created_at": string,"level": number,"name_ar": string,"name_en": string,"updated_at": string,"xp_required": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"level": number,"name_ar": string,"name_en": string,"updated_at"?: string,"xp_required": number
                  }
                  Update: {
                    "created_at"?: string,"level"?: number,"name_ar"?: string,"name_en"?: string,"updated_at"?: string,"xp_required"?: number
                  }
                  Relationships: [
                    
                  ]
                },"media_assets": {
                  Row: {
                    "created_at": string,"drive_file_id": string,"drive_modified_at": string | null,"file_name": string,"folder": string | null,"id": string,"last_seen_at": string,"mime_type": string,"size_bytes": number | null,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"drive_file_id": string,"drive_modified_at"?: string | null,"file_name": string,"folder"?: string | null,"id"?: string,"last_seen_at"?: string,"mime_type": string,"size_bytes"?: number | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"drive_file_id"?: string,"drive_modified_at"?: string | null,"file_name"?: string,"folder"?: string | null,"id"?: string,"last_seen_at"?: string,"mime_type"?: string,"size_bytes"?: number | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"notifications": {
                  Row: {
                    "created_at": string,"href": string | null,"id": string,"kind": string,"params": NonNullable<Json>,"read_at": string | null,"school_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"href"?: string | null,"id"?: string,"kind": string,"params"?: NonNullable<Json>,"read_at"?: string | null,"school_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"href"?: string | null,"id"?: string,"kind"?: string,"params"?: NonNullable<Json>,"read_at"?: string | null,"school_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"passages": {
                  Row: {
                    "body": string,"cefr": string | null,"code": string,"created_at": string,"id": string,"media_asset_id": string | null,"media_file": string | null,"source_note": string | null,"status": string,"tags": (string)[],"title": string,"updated_at": string,"version": number,"word_count": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"cefr"?: string | null,"code": string,"created_at"?: string,"id"?: string,"media_asset_id"?: string | null,"media_file"?: string | null,"source_note"?: string | null,"status"?: string,"tags"?: (string)[],"title": string,"updated_at"?: string,"version"?: number,"word_count"?: number | null
                  }
                  Update: {
                    "body"?: string,"cefr"?: string | null,"code"?: string,"created_at"?: string,"id"?: string,"media_asset_id"?: string | null,"media_file"?: string | null,"source_note"?: string | null,"status"?: string,"tags"?: (string)[],"title"?: string,"updated_at"?: string,"version"?: number,"word_count"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "passages_media_asset_id_fkey"
      columns: ["media_asset_id"]
isOneToOne: false
      referencedRelation: "media_assets"
      referencedColumns: ["id"]
    }
                  ]
                },"permissions": {
                  Row: {
                    "created_at": string,"description_ar": string,"description_en": string,"id": string,"key": string,"module": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description_ar": string,"description_en": string,"id"?: string,"key": string,"module": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description_ar"?: string,"description_en"?: string,"id"?: string,"key"?: string,"module"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"placement_retakes": {
                  Row: {
                    "created_at": string,"department_id": string,"granted_by": string,"id": string,"reason": string | null,"school_id": string,"student_id": string,"updated_at": string,"used_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"department_id": string,"granted_by": string,"id"?: string,"reason"?: string | null,"school_id": string,"student_id": string,"updated_at"?: string,"used_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"department_id"?: string,"granted_by"?: string,"id"?: string,"reason"?: string | null,"school_id"?: string,"student_id"?: string,"updated_at"?: string,"used_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "placement_retakes_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "placement_retakes_granted_by_fkey"
      columns: ["granted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "placement_retakes_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "placement_retakes_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"placement_windows": {
                  Row: {
                    "class_id": string,"closes_at": string,"created_at": string,"created_by": string,"department_id": string,"id": string,"opens_at": string,"school_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "class_id": string,"closes_at": string,"created_at"?: string,"created_by": string,"department_id": string,"id"?: string,"opens_at"?: string,"school_id": string,"updated_at"?: string
                  }
                  Update: {
                    "class_id"?: string,"closes_at"?: string,"created_at"?: string,"created_by"?: string,"department_id"?: string,"id"?: string,"opens_at"?: string,"school_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "placement_windows_class_id_fkey"
      columns: ["class_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "placement_windows_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "placement_windows_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "placement_windows_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"plan_entitlements": {
                  Row: {
                    "created_at": string,"id": string,"key": string,"limit_value": number | null,"plan_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"key": string,"limit_value"?: number | null,"plan_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"key"?: string,"limit_value"?: number | null,"plan_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "plan_entitlements_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    }
                  ]
                },"plans": {
                  Row: {
                    "created_at": string,"id": string,"key": string,"name_ar": string,"name_en": string,"sort_order": number,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"key": string,"name_ar": string,"name_en": string,"sort_order"?: number,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"key"?: string,"name_ar"?: string,"name_en"?: string,"sort_order"?: number,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"productive_submissions": {
                  Row: {
                    "body": string | null,"created_at": string,"drive_file_id": string | null,"duration_ms": number | null,"id": string,"item_id": string,"kind": string,"mime_type": string | null,"school_id": string,"session_id": string,"skill_id": string,"status": string,"student_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"drive_file_id"?: string | null,"duration_ms"?: number | null,"id"?: string,"item_id": string,"kind": string,"mime_type"?: string | null,"school_id": string,"session_id": string,"skill_id": string,"status"?: string,"student_id": string,"updated_at"?: string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"drive_file_id"?: string | null,"duration_ms"?: number | null,"id"?: string,"item_id"?: string,"kind"?: string,"mime_type"?: string | null,"school_id"?: string,"session_id"?: string,"skill_id"?: string,"status"?: string,"student_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "productive_submissions_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "productive_submissions_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "productive_submissions_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "test_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "productive_submissions_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: false
      referencedRelation: "skills"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "productive_submissions_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_options": {
                  Row: {
                    "created_at": string,"emoji": string | null,"id": string,"key": string,"kind": string,"name_ar": string,"name_en": string,"reverse_scored": boolean,"sort_order": number,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"emoji"?: string | null,"id"?: string,"key": string,"kind": string,"name_ar": string,"name_en": string,"reverse_scored"?: boolean,"sort_order"?: number,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"emoji"?: string | null,"id"?: string,"key"?: string,"kind"?: string,"name_ar"?: string,"name_en"?: string,"reverse_scored"?: boolean,"sort_order"?: number,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "consent": boolean,"consent_at": string | null,"created_at": string,"email": string | null,"full_name": string,"id": string,"kind": string,"last_seen_at": string | null,"locale": string,"school_id": string | null,"status": string,"updated_at": string,"username": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "consent"?: boolean,"consent_at"?: string | null,"created_at"?: string,"email"?: string | null,"full_name": string,"id": string,"kind": string,"last_seen_at"?: string | null,"locale"?: string,"school_id"?: string | null,"status"?: string,"updated_at"?: string,"username"?: string | null
                  }
                  Update: {
                    "consent"?: boolean,"consent_at"?: string | null,"created_at"?: string,"email"?: string | null,"full_name"?: string,"id"?: string,"kind"?: string,"last_seen_at"?: string | null,"locale"?: string,"school_id"?: string | null,"status"?: string,"updated_at"?: string,"username"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"rate_limits": {
                  Row: {
                    "count": number,"key": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "count"?: number,"key": string,"window_start"?: string
                  }
                  Update: {
                    "count"?: number,"key"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"recommendations": {
                  Row: {
                    "computed_on": string,"items": NonNullable<Json>,"school_id": string,"student_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "computed_on"?: string,"items"?: NonNullable<Json>,"school_id": string,"student_id": string,"updated_at"?: string
                  }
                  Update: {
                    "computed_on"?: string,"items"?: NonNullable<Json>,"school_id"?: string,"student_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recommendations_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recommendations_student_id_fkey"
      columns: ["student_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"redemptions": {
                  Row: {
                    "cost": number,"created_at": string,"decided_at": string | null,"decided_by": string | null,"id": string,"item_id": string,"school_id": string,"status": string,"student_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cost": number,"created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"id"?: string,"item_id": string,"school_id": string,"status"?: string,"student_id": string,"updated_at"?: string
                  }
                  Update: {
                    "cost"?: number,"created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"id"?: string,"item_id"?: string,"school_id"?: string,"status"?: string,"student_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "redemptions_decided_by_fkey"
      columns: ["decided_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "redemptions_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "reward_catalog"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "redemptions_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "redemptions_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"report_jobs": {
                  Row: {
                    "attempts": number,"created_at": string,"dedupe_key": string,"deferrals": number,"id": string,"kind": string,"last_error": string | null,"locked_at": string | null,"period": string | null,"period_start": string | null,"priority": number,"recipient_id": string | null,"report_id": string | null,"run_after": string,"school_id": string | null,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"created_at"?: string,"dedupe_key": string,"deferrals"?: number,"id"?: string,"kind": string,"last_error"?: string | null,"locked_at"?: string | null,"period"?: string | null,"period_start"?: string | null,"priority"?: number,"recipient_id"?: string | null,"report_id"?: string | null,"run_after"?: string,"school_id"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "attempts"?: number,"created_at"?: string,"dedupe_key"?: string,"deferrals"?: number,"id"?: string,"kind"?: string,"last_error"?: string | null,"locked_at"?: string | null,"period"?: string | null,"period_start"?: string | null,"priority"?: number,"recipient_id"?: string | null,"report_id"?: string | null,"run_after"?: string,"school_id"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "report_jobs_recipient_id_fkey"
      columns: ["recipient_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "report_jobs_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"report_preferences": {
                  Row: {
                    "email": boolean,"monthly": boolean,"updated_at": string,"user_id": string,"weekly": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "email"?: boolean,"monthly"?: boolean,"updated_at"?: string,"user_id": string,"weekly"?: boolean
                  }
                  Update: {
                    "email"?: boolean,"monthly"?: boolean,"updated_at"?: string,"user_id"?: string,"weekly"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "report_preferences_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "created_at": string,"data": NonNullable<Json>,"drive_file_id": string | null,"emailed_at": string | null,"id": string,"period": string,"period_end": string,"period_start": string,"recipient_id": string,"school_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"data": NonNullable<Json>,"drive_file_id"?: string | null,"emailed_at"?: string | null,"id"?: string,"period": string,"period_end": string,"period_start": string,"recipient_id": string,"school_id": string
                  }
                  Update: {
                    "created_at"?: string,"data"?: NonNullable<Json>,"drive_file_id"?: string | null,"emailed_at"?: string | null,"id"?: string,"period"?: string,"period_end"?: string,"period_start"?: string,"recipient_id"?: string,"school_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_recipient_id_fkey"
      columns: ["recipient_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"response_aggregates": {
                  Row: {
                    "answered": number,"correct": number,"month": string,"skill_id": string,"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answered": number,"correct": number,"month": string,"skill_id": string,"student_id": string
                  }
                  Update: {
                    "answered"?: number,"correct"?: number,"month"?: string,"skill_id"?: string,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "response_aggregates_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: false
      referencedRelation: "skills"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "response_aggregates_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"responses": {
                  Row: {
                    "answer": NonNullable<Json>,"b_used": number,"correct": boolean | null,"created_at": string,"id": string,"item_id": string,"item_version": number,"school_id": string,"se_after": number | null,"seq": number,"session_id": string,"skill_id": string,"student_id": string,"theta_after": number | null,"time_ms": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer": NonNullable<Json>,"b_used": number,"correct"?: boolean | null,"created_at"?: string,"id"?: string,"item_id": string,"item_version": number,"school_id": string,"se_after"?: number | null,"seq": number,"session_id": string,"skill_id": string,"student_id": string,"theta_after"?: number | null,"time_ms": number,"updated_at"?: string
                  }
                  Update: {
                    "answer"?: NonNullable<Json>,"b_used"?: number,"correct"?: boolean | null,"created_at"?: string,"id"?: string,"item_id"?: string,"item_version"?: number,"school_id"?: string,"se_after"?: number | null,"seq"?: number,"session_id"?: string,"skill_id"?: string,"student_id"?: string,"theta_after"?: number | null,"time_ms"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "responses_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "responses_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "responses_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "test_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "responses_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: false
      referencedRelation: "skills"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "responses_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"reward_catalog": {
                  Row: {
                    "code": string,"cost": number,"created_at": string,"emoji": string | null,"id": string,"kind": string,"name_ar": string,"name_en": string,"needs_approval": boolean,"school_id": string | null,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"cost": number,"created_at"?: string,"emoji"?: string | null,"id"?: string,"kind": string,"name_ar": string,"name_en": string,"needs_approval"?: boolean,"school_id"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "code"?: string,"cost"?: number,"created_at"?: string,"emoji"?: string | null,"id"?: string,"kind"?: string,"name_ar"?: string,"name_en"?: string,"needs_approval"?: boolean,"school_id"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reward_catalog_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"reward_rules": {
                  Row: {
                    "active": boolean,"coins": number,"created_at": string,"daily_cap": number | null,"event_type": string,"min_accuracy": number | null,"min_seconds": number | null,"scale": string,"updated_at": string,"xp": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"coins"?: number,"created_at"?: string,"daily_cap"?: number | null,"event_type": string,"min_accuracy"?: number | null,"min_seconds"?: number | null,"scale"?: string,"updated_at"?: string,"xp"?: number
                  }
                  Update: {
                    "active"?: boolean,"coins"?: number,"created_at"?: string,"daily_cap"?: number | null,"event_type"?: string,"min_accuracy"?: number | null,"min_seconds"?: number | null,"scale"?: string,"updated_at"?: string,"xp"?: number
                  }
                  Relationships: [
                    
                  ]
                },"role_permissions": {
                  Row: {
                    "created_at": string,"id": string,"permission_key": string,"role_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"permission_key": string,"role_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"permission_key"?: string,"role_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "role_permissions_permission_key_fkey"
      columns: ["permission_key"]
isOneToOne: false
      referencedRelation: "permissions"
      referencedColumns: ["key"]
    },{
      foreignKeyName: "role_permissions_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "roles"
      referencedColumns: ["id"]
    }
                  ]
                },"roles": {
                  Row: {
                    "created_at": string,"default_scope_type": string,"id": string,"is_system": boolean,"key": string,"name_ar": string,"name_en": string,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"default_scope_type": string,"id"?: string,"is_system"?: boolean,"key": string,"name_ar": string,"name_en": string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"default_scope_type"?: string,"id"?: string,"is_system"?: boolean,"key"?: string,"name_ar"?: string,"name_en"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"rubrics": {
                  Row: {
                    "code": string,"created_at": string,"criteria": NonNullable<Json>,"department_id": string | null,"id": string,"skill_id": string | null,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"criteria"?: NonNullable<Json>,"department_id"?: string | null,"id"?: string,"skill_id"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"criteria"?: NonNullable<Json>,"department_id"?: string | null,"id"?: string,"skill_id"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rubrics_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rubrics_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: false
      referencedRelation: "skills"
      referencedColumns: ["id"]
    }
                  ]
                },"schools": {
                  Row: {
                    "code": string,"created_at": string,"id": string,"name_ar": string,"name_en": string,"status": string,"theme": NonNullable<Json>,"timezone": string,"updated_at": string,"week_start": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"id"?: string,"name_ar": string,"name_en": string,"status"?: string,"theme"?: NonNullable<Json>,"timezone"?: string,"updated_at"?: string,"week_start"?: number
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"id"?: string,"name_ar"?: string,"name_en"?: string,"status"?: string,"theme"?: NonNullable<Json>,"timezone"?: string,"updated_at"?: string,"week_start"?: number
                  }
                  Relationships: [
                    
                  ]
                },"skills": {
                  Row: {
                    "blueprint_min_share": number,"code": string,"created_at": string,"department_id": string,"id": string,"name_ar": string,"name_en": string,"sort_order": number,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blueprint_min_share"?: number,"code": string,"created_at"?: string,"department_id": string,"id"?: string,"name_ar": string,"name_en": string,"sort_order"?: number,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "blueprint_min_share"?: number,"code"?: string,"created_at"?: string,"department_id"?: string,"id"?: string,"name_ar"?: string,"name_en"?: string,"sort_order"?: number,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "skills_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    }
                  ]
                },"streaks": {
                  Row: {
                    "current": number,"freeze_week": string | null,"last_active_on": string | null,"longest": number,"school_id": string,"student_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "current"?: number,"freeze_week"?: string | null,"last_active_on"?: string | null,"longest"?: number,"school_id": string,"student_id": string,"updated_at"?: string
                  }
                  Update: {
                    "current"?: number,"freeze_week"?: string | null,"last_active_on"?: string | null,"longest"?: number,"school_id"?: string,"student_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "streaks_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "streaks_student_id_fkey"
      columns: ["student_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"submission_scores": {
                  Row: {
                    "cefr": string,"comment": string | null,"created_at": string,"id": string,"rubric_id": string | null,"school_id": string,"scorer_id": string,"scores": NonNullable<Json>,"submission_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cefr": string,"comment"?: string | null,"created_at"?: string,"id"?: string,"rubric_id"?: string | null,"school_id": string,"scorer_id": string,"scores": NonNullable<Json>,"submission_id": string,"updated_at"?: string
                  }
                  Update: {
                    "cefr"?: string,"comment"?: string | null,"created_at"?: string,"id"?: string,"rubric_id"?: string | null,"school_id"?: string,"scorer_id"?: string,"scores"?: NonNullable<Json>,"submission_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "submission_scores_rubric_id_fkey"
      columns: ["rubric_id"]
isOneToOne: false
      referencedRelation: "rubrics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submission_scores_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submission_scores_scorer_id_fkey"
      columns: ["scorer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submission_scores_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: true
      referencedRelation: "productive_submissions"
      referencedColumns: ["id"]
    }
                  ]
                },"subscriptions": {
                  Row: {
                    "created_at": string,"current_period_end": string | null,"free_until": string | null,"id": string,"plan_id": string,"provider": string,"provider_ref": string | null,"school_id": string,"status": string,"trial_ends_at": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"current_period_end"?: string | null,"free_until"?: string | null,"id"?: string,"plan_id": string,"provider"?: string,"provider_ref"?: string | null,"school_id": string,"status"?: string,"trial_ends_at"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"current_period_end"?: string | null,"free_until"?: string | null,"id"?: string,"plan_id"?: string,"provider"?: string,"provider_ref"?: string | null,"school_id"?: string,"status"?: string,"trial_ends_at"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscriptions_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscriptions_school_id_fkey"
      columns: ["school_id"]
isOneToOne: true
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"supervision_defaults": {
                  Row: {
                    "created_at": string,"id": string,"kind": string,"supervisee_role_id": string,"supervisor_role_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"kind": string,"supervisee_role_id": string,"supervisor_role_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"kind"?: string,"supervisee_role_id"?: string,"supervisor_role_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "supervision_defaults_supervisee_role_id_fkey"
      columns: ["supervisee_role_id"]
isOneToOne: false
      referencedRelation: "roles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "supervision_defaults_supervisor_role_id_fkey"
      columns: ["supervisor_role_id"]
isOneToOne: false
      referencedRelation: "roles"
      referencedColumns: ["id"]
    }
                  ]
                },"supervision_links": {
                  Row: {
                    "active_from": string,"active_to": string | null,"created_at": string,"id": string,"kind": string,"school_id": string,"source": string,"supervisee_id": string,"supervisor_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active_from"?: string,"active_to"?: string | null,"created_at"?: string,"id"?: string,"kind"?: string,"school_id": string,"source"?: string,"supervisee_id": string,"supervisor_id": string,"updated_at"?: string
                  }
                  Update: {
                    "active_from"?: string,"active_to"?: string | null,"created_at"?: string,"id"?: string,"kind"?: string,"school_id"?: string,"source"?: string,"supervisee_id"?: string,"supervisor_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "supervision_links_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "supervision_links_supervisee_id_fkey"
      columns: ["supervisee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "supervision_links_supervisor_id_fkey"
      columns: ["supervisor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"teaching_assignments": {
                  Row: {
                    "class_id": string,"created_at": string,"id": string,"school_id": string,"teacher_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "class_id": string,"created_at"?: string,"id"?: string,"school_id": string,"teacher_id": string,"updated_at"?: string
                  }
                  Update: {
                    "class_id"?: string,"created_at"?: string,"id"?: string,"school_id"?: string,"teacher_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "teaching_assignments_class_id_fkey"
      columns: ["class_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teaching_assignments_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teaching_assignments_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"team_members": {
                  Row: {
                    "created_at": string,"student_id": string,"team_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"student_id": string,"team_id": string
                  }
                  Update: {
                    "created_at"?: string,"student_id"?: string,"team_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "team_members_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "team_members_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    }
                  ]
                },"team_xp": {
                  Row: {
                    "awarded_by": string | null,"created_at": string,"id": string,"points": number,"reason": string | null,"school_id": string,"team_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "awarded_by"?: string | null,"created_at"?: string,"id"?: string,"points": number,"reason"?: string | null,"school_id": string,"team_id": string
                  }
                  Update: {
                    "awarded_by"?: string | null,"created_at"?: string,"id"?: string,"points"?: number,"reason"?: string | null,"school_id"?: string,"team_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "team_xp_awarded_by_fkey"
      columns: ["awarded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "team_xp_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "team_xp_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    }
                  ]
                },"teams": {
                  Row: {
                    "class_id": string,"created_at": string,"created_by": string | null,"id": string,"name": string,"school_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "class_id": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"name": string,"school_id": string,"updated_at"?: string
                  }
                  Update: {
                    "class_id"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"name"?: string,"school_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "teams_class_id_fkey"
      columns: ["class_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teams_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teams_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"test_blueprints": {
                  Row: {
                    "created_at": string,"department_id": string,"id": string,"kind": string,"max_items": number,"min_items": number,"retake_cooldown_days": number,"status": string,"target_se": number,"time_limit_sec": number | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"department_id": string,"id"?: string,"kind": string,"max_items": number,"min_items": number,"retake_cooldown_days"?: number,"status"?: string,"target_se": number,"time_limit_sec"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"department_id"?: string,"id"?: string,"kind"?: string,"max_items"?: number,"min_items"?: number,"retake_cooldown_days"?: number,"status"?: string,"target_se"?: number,"time_limit_sec"?: number | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "test_blueprints_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    }
                  ]
                },"test_sessions": {
                  Row: {
                    "cefr": string | null,"completed_at": string | null,"created_at": string,"current_item_id": string | null,"current_served_at": string | null,"deadline_at": string | null,"department_id": string,"id": string,"items_count": number,"kind": string,"rng_seed": number,"scaled_score": number | null,"school_id": string,"se": number | null,"skill_estimates": NonNullable<Json>,"started_at": string,"status": string,"stop_reason": string | null,"student_id": string,"tab_switches": number,"theta": number | null,"theta0": number,"updated_at": string,"window_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cefr"?: string | null,"completed_at"?: string | null,"created_at"?: string,"current_item_id"?: string | null,"current_served_at"?: string | null,"deadline_at"?: string | null,"department_id": string,"id"?: string,"items_count"?: number,"kind": string,"rng_seed": number,"scaled_score"?: number | null,"school_id": string,"se"?: number | null,"skill_estimates"?: NonNullable<Json>,"started_at"?: string,"status"?: string,"stop_reason"?: string | null,"student_id": string,"tab_switches"?: number,"theta"?: number | null,"theta0"?: number,"updated_at"?: string,"window_id"?: string | null
                  }
                  Update: {
                    "cefr"?: string | null,"completed_at"?: string | null,"created_at"?: string,"current_item_id"?: string | null,"current_served_at"?: string | null,"deadline_at"?: string | null,"department_id"?: string,"id"?: string,"items_count"?: number,"kind"?: string,"rng_seed"?: number,"scaled_score"?: number | null,"school_id"?: string,"se"?: number | null,"skill_estimates"?: NonNullable<Json>,"started_at"?: string,"status"?: string,"stop_reason"?: string | null,"student_id"?: string,"tab_switches"?: number,"theta"?: number | null,"theta0"?: number,"updated_at"?: string,"window_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "test_sessions_current_item_id_fkey"
      columns: ["current_item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "test_sessions_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "test_sessions_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "test_sessions_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "test_sessions_window_fk"
      columns: ["window_id"]
isOneToOne: false
      referencedRelation: "placement_windows"
      referencedColumns: ["id"]
    }
                  ]
                },"usage_counters": {
                  Row: {
                    "count": number,"day": string,"kind": string
                  }
                  ComputedFields: never
                  Insert: {
                    "count"?: number,"day"?: string,"kind": string
                  }
                  Update: {
                    "count"?: number,"day"?: string,"kind"?: string
                  }
                  Relationships: [
                    
                  ]
                },"user_badges": {
                  Row: {
                    "awarded_at": string,"badge_id": string,"school_id": string,"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "awarded_at"?: string,"badge_id": string,"school_id": string,"student_id": string
                  }
                  Update: {
                    "awarded_at"?: string,"badge_id"?: string,"school_id"?: string,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_badges_badge_id_fkey"
      columns: ["badge_id"]
isOneToOne: false
      referencedRelation: "badges"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_badges_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_badges_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_permission_overrides": {
                  Row: {
                    "created_at": string,"created_by": string | null,"effect": string,"expires_at": string | null,"id": string,"permission_key": string,"reason": string | null,"school_id": string | null,"scope_id": string | null,"scope_type": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"effect": string,"expires_at"?: string | null,"id"?: string,"permission_key": string,"reason"?: string | null,"school_id"?: string | null,"scope_id"?: string | null,"scope_type": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"effect"?: string,"expires_at"?: string | null,"id"?: string,"permission_key"?: string,"reason"?: string | null,"school_id"?: string | null,"scope_id"?: string | null,"scope_type"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_permission_overrides_permission_key_fkey"
      columns: ["permission_key"]
isOneToOne: false
      referencedRelation: "permissions"
      referencedColumns: ["key"]
    },{
      foreignKeyName: "user_permission_overrides_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_permission_overrides_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_roles": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"role_id": string,"school_id": string | null,"scope_id": string | null,"scope_type": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"role_id": string,"school_id"?: string | null,"scope_id"?: string | null,"scope_type": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"role_id"?: string,"school_id"?: string | null,"scope_id"?: string | null,"scope_type"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_roles_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "roles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_roles_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_roles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"visibility_rules": {
                  Row: {
                    "created_at": string,"effect": string,"ends_at": string | null,"id": string,"note": string | null,"starts_at": string | null,"subject_id": string | null,"subject_type": string,"target_key": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"effect": string,"ends_at"?: string | null,"id"?: string,"note"?: string | null,"starts_at"?: string | null,"subject_id"?: string | null,"subject_type": string,"target_key": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"effect"?: string,"ends_at"?: string | null,"id"?: string,"note"?: string | null,"starts_at"?: string | null,"subject_id"?: string | null,"subject_type"?: string,"target_key"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"xp_events": {
                  Row: {
                    "coins": number,"created_at": string,"event_type": string,"id": string,"meta": NonNullable<Json>,"school_id": string,"source_key": string,"student_id": string,"xp": number
                  }
                  ComputedFields: never
                  Insert: {
                    "coins"?: number,"created_at"?: string,"event_type": string,"id"?: string,"meta"?: NonNullable<Json>,"school_id": string,"source_key": string,"student_id": string,"xp": number
                  }
                  Update: {
                    "coins"?: number,"created_at"?: string,"event_type"?: string,"id"?: string,"meta"?: NonNullable<Json>,"school_id"?: string,"source_key"?: string,"student_id"?: string,"xp"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "xp_events_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "xp_events_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "mv_student_activity": {
                  Row: {
                    "accuracy_7d": number | null,"accuracy_prev": number | null,"active_days_7d": number | null,"cefr_now": string | null,"class_id": string,"grade_id": string,"last_active_at": string | null,"lessons_7d": number | null,"overdue": number | null,"refreshed_at": string | null,"school_id": string,"student_id": string,"theta_first": number | null,"theta_now": number | null,"xp_7d": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "classes_grade_id_fkey"
      columns: ["grade_id"]
isOneToOne: false
      referencedRelation: "grades"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "classes_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "enrolments_class_id_fkey"
      columns: ["class_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "enrolments_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "apply_supervision_defaults":
{ Args: { "p_school": string }; Returns: number
                           },
"assign_class":
{ Args: { "p_class": string,"p_role": string,"p_user": string }; Returns: undefined
                           },
"assign_lesson":
{ Args: { "p_class": string,"p_due": string,"p_lesson": string,"p_note": string,"p_required": boolean,"p_targets": Json }; Returns: string
                           },
"auth_can":
{ Args: { "p_class"?: string,"p_perm": string,"p_school": string }; Returns: boolean
                           },
"auth_can_assign_role":
{ Args: { "p_role": string,"p_scope_id": string,"p_scope_type": string,"p_user": string }; Returns: boolean
                           },
"auth_can_grant":
{ Args: { "p_perm": string,"p_scope_id": string,"p_scope_type": string,"p_user": string }; Returns: boolean
                           },
"auth_can_user":
{ Args: { "p_perm": string,"p_target": string }; Returns: boolean
                           },
"auth_holds":
{ Args: { "p_perm": string }; Returns: boolean
                           },
"auth_in_class":
{ Args: { "p_class": string }; Returns: boolean
                           },
"auth_in_group":
{ Args: { "p_group": string }; Returns: boolean
                           },
"auth_in_team":
{ Args: { "p_team": string }; Returns: boolean
                           },
"auth_sees_class":
{ Args: { "p_class": string }; Returns: boolean
                           },
"auth_supervises":
{ Args: { "p_user": string }; Returns: boolean
                           },
"auth_supervises_class":
{ Args: { "p_class": string }; Returns: boolean
                           },
"budget_stats":
{ Args: Record<PropertyKey, never>; Returns: {
              "db_bytes": number,"drive_calls_today": number,"emails_today": number,"staff": number,"students": number
            }[]
                           },
"bump_usage":
{ Args: { "p_kind": string,"p_n"?: number }; Returns: undefined
                           },
"can_user_on":
{ Args: { "p_actor": string,"p_class": string,"p_grade": string,"p_perm": string,"p_school": string,"p_user": string }; Returns: boolean
                           },
"claim_jobs":
{ Args: { "p_n": number }; Returns: {
              "attempts": number,
"created_at": string,
"dedupe_key": string,
"deferrals": number,
"id": string,
"kind": string,
"last_error": string | null,
"locked_at": string | null,
"period": string | null,
"period_start": string | null,
"priority": number,
"recipient_id": string | null,
"report_id": string | null,
"run_after": string,
"school_id": string | null,
"status": string,
"updated_at": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "report_jobs"
        isOneToOne: false
        isSetofReturn: true
      } },
"class_cefr":
{ Args: { "p_school"?: string }; Returns: {
              "cefr": string,"class_id": string,"n": number
            }[]
                           },
"class_leaderboard":
{ Args: { "p_class": string,"p_since": string }; Returns: {
              "full_name": string,"points": number,"student_id": string
            }[]
                           },
"class_skill_matrix":
{ Args: { "p_class": string }; Returns: {
              "cefr": string,"full_name": string,"skill_code": string,"skill_id": string,"student_id": string,"theta": number
            }[]
                           },
"class_stats":
{ Args: { "p_school"?: string }; Returns: {
              "accuracy_7d": number,"active_7d": number,"at_risk": number,"avg_growth": number,"avg_theta": number,"class_code": string,"class_id": string,"grade_code": string,"grade_id": string,"grade_name_ar": string,"grade_name_en": string,"lessons_7d": number,"overdue": number,"school_id": string,"students": number,"xp_7d": number
            }[]
                           },
"class_stats_for":
{ Args: { "p_school": string,"p_user": string }; Returns: {
              "accuracy_7d": number,"active_7d": number,"at_risk": number,"avg_growth": number,"avg_theta": number,"class_code": string,"class_id": string,"grade_code": string,"grade_id": string,"grade_name_ar": string,"grade_name_en": string,"lessons_7d": number,"overdue": number,"school_id": string,"students": number,"xp_7d": number
            }[]
                           },
"decide_redemption":
{ Args: { "p_approve": boolean,"p_id": string }; Returns: undefined
                           },
"feature_flags_for":
{ Args: { "p_user": string }; Returns: string[]
                           },
"feature_flags_off_for":
{ Args: { "p_user": string }; Returns: string[]
                           },
"hit_rate_limit":
{ Args: { "p_key": string,"p_max": number,"p_window_sec": number }; Returns: boolean
                           },
"insights_refreshed_at":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"log_audit":
{ Args: { "p_action": string,"p_details"?: Json,"p_school"?: string,"p_target_id"?: string,"p_target_table": string }; Returns: undefined
                           },
"my_school_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"redeem_item":
{ Args: { "p_item": string }; Returns: string
                           },
"refresh_insights":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"report_recipients":
{ Args: { "p_period": string,"p_school": string }; Returns: {
              "email": string,"full_name": string,"locale": string,"priority": number,"user_id": string
            }[]
                           },
"school_averages":
{ Args: { "p_school": string }; Returns: {
              "accuracy_7d": number,"active_7d": number,"avg_growth": number,"lessons_7d": number,"students": number
            }[]
                           },
"school_plan":
{ Args: { "p_school": string }; Returns: string
                           },
"scope_contains":
{ Args: { "p_class": string,"p_grade": string,"p_holder": string,"p_school": string,"p_scope_id": string,"p_scope_type": string,"p_user": string }; Returns: boolean
                           },
"scope_target":
{ Args: { "p_scope_id": string,"p_scope_type": string,"p_user": string }; Returns: {
              "class_id": string,"grade_id": string,"school_id": string,"user_id": string
            }[]
                           },
"sees_class":
{ Args: { "p_class": string,"p_user": string }; Returns: boolean
                           },
"staff_last_seen":
{ Args: { "p_school": string }; Returns: {
              "last_sign_in_at": string,"user_id": string
            }[]
                           },
"student_stats":
{ Args: { "p_class": string }; Returns: {
              "accuracy_7d": number,"accuracy_prev": number,"active_days_7d": number,"cefr_now": string,"full_name": string,"last_active_at": string,"lessons_7d": number,"overdue": number,"student_id": string,"theta_first": number,"theta_now": number,"xp_7d": number
            }[]
                           },
"student_stats_for":
{ Args: { "p_class": string,"p_user": string }; Returns: {
              "accuracy_7d": number,"accuracy_prev": number,"active_days_7d": number,"cefr_now": string,"full_name": string,"last_active_at": string,"lessons_7d": number,"overdue": number,"student_id": string,"theta_first": number,"theta_now": number,"xp_7d": number
            }[]
                           },
"teacher_usage":
{ Args: { "p_school": string }; Returns: {
              "assignments_30d": number,"classes": number,"full_name": string,"kudos_30d": number,"last_assignment_at": string,"last_sign_in_at": string,"teacher_id": string
            }[]
                           },
"team_scores":
{ Args: { "p_class": string,"p_since": string }; Returns: {
              "baseline": number,"challenge": number,"current": number,"student_id": string,"team_id": string,"team_name": string
            }[]
                           },
"user_contexts":
{ Args: { "p_user": string }; Returns: {
              "class_id": string,"grade_id": string,"school_id": string
            }[]
                           },
"user_subjects":
{ Args: { "p_user": string }; Returns: {
              "subject_id": string,"subject_type": string
            }[]
                           },
"visibility_rules_for":
{ Args: { "p_user": string }; Returns: {
              "created_at": string,
"effect": string,
"ends_at": string | null,
"id": string,
"note": string | null,
"starts_at": string | null,
"subject_id": string | null,
"subject_type": string,
"target_key": string,
"updated_at": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "visibility_rules"
        isOneToOne: false
        isSetofReturn: true
      } }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
