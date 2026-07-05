/**
 * Hand-written to match supabase/migrations/*.sql as of the reports &
 * communication migration (audit_logs, notifications, whatsapp_settings,
 * whatsapp_messages, report_runs). Regenerate for real once migrations are
 * applied:
 *   pnpm supabase gen types typescript --linked > src/types/database.ts
 */

export type OrgRole = "owner" | "admin" | "teacher";
export type StudentStatus = "active" | "inactive" | "graduated" | "withdrawn";
export type AttendanceStatus = "present" | "absent" | "late" | "excused" | "half_day";
export type AttendanceSessionType = "before_break" | "after_break";
export type WhatsappMessageStatus = "pending" | "sent" | "failed" | "disabled";
export type ReportRunStatus = "success" | "failed";

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      organization_members: {
        Row: {
          organization_id: string;
          user_id: string;
          role: OrgRole;
          created_at: string;
        };
        Insert: {
          organization_id: string;
          user_id: string;
          role?: OrgRole;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["organization_members"]["Insert"]>;
        Relationships: [];
      };
      school_settings: {
        Row: {
          organization_id: string;
          timezone: string;
          address: string | null;
          phone: string | null;
          contact_email: string | null;
          logo_url: string | null;
          working_days: number[];
          before_break_cutoff: string;
          after_break_cutoff: string;
          attendance_lock_grace_hours: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          timezone?: string;
          address?: string | null;
          phone?: string | null;
          contact_email?: string | null;
          logo_url?: string | null;
          working_days?: number[];
          before_break_cutoff?: string;
          after_break_cutoff?: string;
          attendance_lock_grace_hours?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["school_settings"]["Insert"]>;
        Relationships: [];
      };
      academic_years: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          start_date: string;
          end_date: string;
          is_current: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          start_date: string;
          end_date: string;
          is_current?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["academic_years"]["Insert"]>;
        Relationships: [];
      };
      terms: {
        Row: {
          id: string;
          organization_id: string;
          academic_year_id: string;
          name: string;
          start_date: string;
          end_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          academic_year_id: string;
          name: string;
          start_date: string;
          end_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["terms"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "terms_academic_year_id_fkey";
            columns: ["academic_year_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["id"];
          },
        ];
      };
      holidays: {
        Row: {
          id: string;
          organization_id: string;
          academic_year_id: string | null;
          name: string;
          start_date: string;
          end_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          academic_year_id?: string | null;
          name: string;
          start_date: string;
          end_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["holidays"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "holidays_academic_year_id_fkey";
            columns: ["academic_year_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["id"];
          },
        ];
      };
      grades: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["grades"]["Insert"]>;
        Relationships: [];
      };
      sections: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sections"]["Insert"]>;
        Relationships: [];
      };
      classes: {
        Row: {
          id: string;
          organization_id: string;
          academic_year_id: string;
          grade_id: string;
          section_id: string;
          homeroom_teacher_id: string | null;
          capacity: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          academic_year_id: string;
          grade_id: string;
          section_id: string;
          homeroom_teacher_id?: string | null;
          capacity?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["classes"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "classes_academic_year_id_fkey";
            columns: ["academic_year_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "classes_grade_id_fkey";
            columns: ["grade_id"];
            isOneToOne: false;
            referencedRelation: "grades";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "classes_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "sections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "classes_homeroom_teacher_id_fkey";
            columns: ["homeroom_teacher_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      students: {
        Row: {
          id: string;
          organization_id: string;
          admission_number: string;
          first_name: string;
          last_name: string;
          full_name: string;
          date_of_birth: string | null;
          gender: string | null;
          class_id: string | null;
          status: StudentStatus;
          enrollment_date: string;
          photo_url: string | null;
          address: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          admission_number: string;
          first_name: string;
          last_name: string;
          date_of_birth?: string | null;
          gender?: string | null;
          class_id?: string | null;
          status?: StudentStatus;
          enrollment_date?: string;
          photo_url?: string | null;
          address?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["students"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
        ];
      };
      teacher_profiles: {
        Row: {
          organization_id: string;
          user_id: string;
          staff_id: string | null;
          phone: string | null;
          subjects: string[];
          qualification: string | null;
          hire_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          user_id: string;
          staff_id?: string | null;
          phone?: string | null;
          subjects?: string[];
          qualification?: string | null;
          hire_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["teacher_profiles"]["Insert"]>;
        Relationships: [];
      };
      guardians: {
        Row: {
          id: string;
          organization_id: string;
          full_name: string;
          phone: string | null;
          email: string | null;
          address: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          full_name: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["guardians"]["Insert"]>;
        Relationships: [];
      };
      student_guardians: {
        Row: {
          id: string;
          organization_id: string;
          student_id: string;
          guardian_id: string;
          relationship: string;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          student_id: string;
          guardian_id: string;
          relationship: string;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["student_guardians"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "student_guardians_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_guardians_guardian_id_fkey";
            columns: ["guardian_id"];
            isOneToOne: false;
            referencedRelation: "guardians";
            referencedColumns: ["id"];
          },
        ];
      };
      attendance_sessions: {
        Row: {
          id: string;
          organization_id: string;
          class_id: string;
          session_date: string;
          session_type: AttendanceSessionType;
          submitted_by: string | null;
          submitted_at: string | null;
          locked_override: boolean | null;
          locked_override_by: string | null;
          locked_override_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          class_id: string;
          session_date: string;
          session_type: AttendanceSessionType;
          submitted_by?: string | null;
          submitted_at?: string | null;
          locked_override?: boolean | null;
          locked_override_by?: string | null;
          locked_override_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["attendance_sessions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
        ];
      };
      attendance_records: {
        Row: {
          id: string;
          organization_id: string;
          session_id: string;
          student_id: string;
          status: AttendanceStatus;
          notes: string | null;
          marked_by: string | null;
          marked_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          session_id: string;
          student_id: string;
          status?: AttendanceStatus;
          notes?: string | null;
          marked_by?: string | null;
          marked_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["attendance_records"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "attendance_records_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "attendance_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          organization_id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          organization_id: string;
          recipient_id: string;
          type: string;
          title: string;
          body: string | null;
          link: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          recipient_id: string;
          type: string;
          title: string;
          body?: string | null;
          link?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [];
      };
      whatsapp_settings: {
        Row: {
          organization_id: string;
          provider: "twilio" | null;
          account_sid: string | null;
          phone_number_id: string | null;
          access_token: string | null;
          is_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          provider?: "twilio" | null;
          account_sid?: string | null;
          phone_number_id?: string | null;
          access_token?: string | null;
          is_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["whatsapp_settings"]["Insert"]>;
        Relationships: [];
      };
      whatsapp_messages: {
        Row: {
          id: string;
          organization_id: string;
          recipient_phone: string;
          recipient_name: string | null;
          template_key: string | null;
          body: string;
          status: WhatsappMessageStatus;
          provider_message_id: string | null;
          error: string | null;
          created_at: string;
          sent_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          recipient_phone: string;
          recipient_name?: string | null;
          template_key?: string | null;
          body: string;
          status?: WhatsappMessageStatus;
          provider_message_id?: string | null;
          error?: string | null;
          created_at?: string;
          sent_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["whatsapp_messages"]["Insert"]>;
        Relationships: [];
      };
      report_runs: {
        Row: {
          id: string;
          organization_id: string;
          report_type: string;
          run_date: string;
          status: ReportRunStatus;
          summary: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          report_type: string;
          run_date: string;
          status: ReportRunStatus;
          summary?: Record<string, unknown>;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["report_runs"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      attendance_session_overview: {
        Row: {
          session_id: string;
          organization_id: string;
          class_id: string;
          grade_id: string;
          section_id: string;
          homeroom_teacher_id: string | null;
          session_date: string;
          session_type: AttendanceSessionType;
          submitted_by: string | null;
          submitted_at: string | null;
          locked_override: boolean | null;
          effective_lock_at: string;
          is_locked: boolean;
          total_students: number;
          marked_count: number;
          present_count: number;
          absent_count: number;
          late_count: number;
          excused_count: number;
          half_day_count: number;
        };
        Relationships: [];
      };
      student_attendance_stats: {
        Row: {
          student_id: string;
          organization_id: string;
          class_id: string | null;
          total_marked: number;
          present_count: number;
          absent_count: number;
          late_count: number;
          excused_count: number;
          half_day_count: number;
          attendance_percentage: number | null;
        };
        Relationships: [];
      };
      class_attendance_stats: {
        Row: {
          class_id: string;
          organization_id: string;
          total_marked: number;
          present_count: number;
          absent_count: number;
          late_count: number;
          excused_count: number;
          half_day_count: number;
          attendance_percentage: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      get_user_org_ids: {
        Args: Record<string, never>;
        Returns: string[];
      };
      is_org_admin: {
        Args: { org_id: string };
        Returns: boolean;
      };
      is_class_teacher: {
        Args: { p_class_id: string };
        Returns: boolean;
      };
      attendance_lock_at: {
        Args: {
          p_class_id: string;
          p_session_date: string;
          p_session_type: AttendanceSessionType;
        };
        Returns: string;
      };
      attendance_session_is_locked: {
        Args: {
          p_class_id: string;
          p_session_date: string;
          p_session_type: AttendanceSessionType;
          p_locked_override: boolean | null;
        };
        Returns: boolean;
      };
      attendance_session_locked: {
        Args: { p_session_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      org_role: OrgRole;
      student_status: StudentStatus;
      attendance_status: AttendanceStatus;
      attendance_session_type: AttendanceSessionType;
      whatsapp_message_status: WhatsappMessageStatus;
      report_run_status: ReportRunStatus;
    };
  };
};
