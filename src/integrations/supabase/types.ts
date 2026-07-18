export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assignment_submissions: {
        Row: {
          assignment_id: string
          content: string | null
          feedback: string | null
          files: Json
          grade: number | null
          graded_at: string | null
          id: string
          student_id: string
          submitted_at: string
        }
        Insert: {
          assignment_id: string
          content?: string | null
          feedback?: string | null
          files?: Json
          grade?: number | null
          graded_at?: string | null
          id?: string
          student_id: string
          submitted_at?: string
        }
        Update: {
          assignment_id?: string
          content?: string | null
          feedback?: string | null
          files?: Json
          grade?: number | null
          graded_at?: string | null
          id?: string
          student_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          group_id: string
          id: string
          session_id: string | null
          title: string
          total_marks: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          group_id: string
          id?: string
          session_id?: string | null
          title: string
          total_marks?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          group_id?: string
          id?: string
          session_id?: string | null
          title?: string
          total_marks?: number
        }
        Relationships: [
          {
            foreignKeyName: "assignments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          id: string
          marked_at: string
          session_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
        }
        Insert: {
          id?: string
          marked_at?: string
          session_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
        }
        Update: {
          id?: string
          marked_at?: string
          session_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_questions: {
        Row: {
          correct: Json | null
          exam_id: string
          id: string
          marks: number
          options: Json
          ord: number
          prompt: string
          type: Database["public"]["Enums"]["question_type"]
        }
        Insert: {
          correct?: Json | null
          exam_id: string
          id?: string
          marks?: number
          options?: Json
          ord?: number
          prompt: string
          type: Database["public"]["Enums"]["question_type"]
        }
        Update: {
          correct?: Json | null
          exam_id?: string
          id?: string
          marks?: number
          options?: Json
          ord?: number
          prompt?: string
          type?: Database["public"]["Enums"]["question_type"]
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_submissions: {
        Row: {
          answers: Json
          auto_score: number | null
          exam_id: string
          feedback: string | null
          id: string
          manual_score: number | null
          score: number | null
          started_at: string
          status: Database["public"]["Enums"]["submission_status"]
          student_id: string
          submitted_at: string | null
        }
        Insert: {
          answers?: Json
          auto_score?: number | null
          exam_id: string
          feedback?: string | null
          id?: string
          manual_score?: number | null
          score?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["submission_status"]
          student_id: string
          submitted_at?: string | null
        }
        Update: {
          answers?: Json
          auto_score?: number | null
          exam_id?: string
          feedback?: string | null
          id?: string
          manual_score?: number | null
          score?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["submission_status"]
          student_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_submissions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          end_at: string
          group_id: string
          id: string
          kind: Database["public"]["Enums"]["exam_kind"]
          published_results: boolean
          session_id: string | null
          start_at: string
          title: string
          total_marks: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          end_at: string
          group_id: string
          id?: string
          kind?: Database["public"]["Enums"]["exam_kind"]
          published_results?: boolean
          session_id?: string | null
          start_at: string
          title: string
          total_marks?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          end_at?: string
          group_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["exam_kind"]
          published_results?: boolean
          session_id?: string | null
          start_at?: string
          title?: string
          total_marks?: number
        }
        Relationships: [
          {
            foreignKeyName: "exams_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          bucket: string
          created_at: string
          group_id: string
          id: string
          mime: string | null
          name: string
          path: string
          session_id: string | null
          size: number | null
          uploader_id: string
        }
        Insert: {
          bucket?: string
          created_at?: string
          group_id: string
          id?: string
          mime?: string | null
          name: string
          path: string
          session_id?: string | null
          size?: number | null
          uploader_id: string
        }
        Update: {
          bucket?: string
          created_at?: string
          group_id?: string
          id?: string
          mime?: string | null
          name?: string
          path?: string
          session_id?: string | null
          size?: number | null
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          created_at: string
          feedback: string | null
          group_id: string
          id: string
          max_score: number
          score: number
          source: Database["public"]["Enums"]["grade_source"]
          source_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          group_id: string
          id?: string
          max_score: number
          score: number
          source: Database["public"]["Enums"]["grade_source"]
          source_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          feedback?: string | null
          group_id?: string
          id?: string
          max_score?: number
          score?: number
          source?: Database["public"]["Enums"]["grade_source"]
          source_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grades_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_blocks: {
        Row: {
          blocked_at: string
          group_id: string
          id: string
          student_id: string
        }
        Insert: {
          blocked_at?: string
          group_id: string
          id?: string
          student_id: string
        }
        Update: {
          blocked_at?: string
          group_id?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_blocks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          student_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          student_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          description: string | null
          grade: string
          id: string
          image_url: string | null
          join_code: string
          name: string
          subject: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          grade?: string
          id?: string
          image_url?: string | null
          join_code?: string
          name: string
          subject?: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          grade?: string
          id?: string
          image_url?: string | null
          join_code?: string
          name?: string
          subject?: string
          teacher_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          group_id: string
          id: string
          parent_id: string | null
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          group_id: string
          id?: string
          parent_id?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          group_id?: string
          id?: string
          parent_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          grade_level: string | null
          id: string
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          grade_level?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          grade_level?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      section_reads: {
        Row: {
          group_id: string
          last_read_at: string
          section: string
          user_id: string
        }
        Insert: {
          group_id: string
          last_read_at?: string
          section: string
          user_id: string
        }
        Update: {
          group_id?: string
          last_read_at?: string
          section?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "section_reads_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          date: string
          description: string | null
          group_id: string
          id: string
          meeting_url: string | null
          notes: string | null
          number: number
          start_time: string
          title: string
        }
        Insert: {
          created_at?: string
          date?: string
          description?: string | null
          group_id: string
          id?: string
          meeting_url?: string | null
          notes?: string | null
          number?: number
          start_time?: string
          title: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          group_id?: string
          id?: string
          meeting_url?: string | null
          notes?: string | null
          number?: number
          start_time?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assignment_group: { Args: { _aid: string }; Returns: string }
      exam_group: { Args: { _eid: string }; Returns: string }
      gen_join_code: { Args: { _subject: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user: string }
        Returns: boolean
      }
      is_group_teacher: {
        Args: { _group_id: string; _user: string }
        Returns: boolean
      }
      notify_group_members: {
        Args: {
          _body: string
          _group: string
          _link: string
          _title: string
          _type: string
        }
        Returns: undefined
      }
      session_group: { Args: { _session_id: string }; Returns: string }
    }
    Enums: {
      app_role: "teacher" | "student"
      attendance_status: "present" | "absent"
      exam_kind: "quiz" | "exam"
      grade_source: "exam" | "assignment"
      question_type: "mcq" | "tf" | "short"
      submission_status: "in_progress" | "submitted" | "graded"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["teacher", "student"],
      attendance_status: ["present", "absent"],
      exam_kind: ["quiz", "exam"],
      grade_source: ["exam", "assignment"],
      question_type: ["mcq", "tf", "short"],
      submission_status: ["in_progress", "submitted", "graded"],
    },
  },
} as const
