
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
            "academic_years": {
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
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "apply_supervision_defaults":
{ Args: { "p_school": string }; Returns: number
                           },
"assign_class":
{ Args: { "p_class": string,"p_role": string,"p_user": string }; Returns: undefined
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
"can_user_on":
{ Args: { "p_actor": string,"p_class": string,"p_grade": string,"p_perm": string,"p_school": string,"p_user": string }; Returns: boolean
                           },
"log_audit":
{ Args: { "p_action": string,"p_details"?: Json,"p_school"?: string,"p_target_id"?: string,"p_target_table": string }; Returns: undefined
                           },
"my_school_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"scope_contains":
{ Args: { "p_class": string,"p_grade": string,"p_holder": string,"p_school": string,"p_scope_id": string,"p_scope_type": string,"p_user": string }; Returns: boolean
                           },
"scope_target":
{ Args: { "p_scope_id": string,"p_scope_type": string,"p_user": string }; Returns: {
              "class_id": string,"grade_id": string,"school_id": string,"user_id": string
            }[]
                           },
"user_contexts":
{ Args: { "p_user": string }; Returns: {
              "class_id": string,"grade_id": string,"school_id": string
            }[]
                           }
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
