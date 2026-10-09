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
      announcements: {
        Row: {
          author_name: string | null
          category: string
          content: string | null
          created_at: string
          excerpt: string | null
          featured_image: string | null
          id: string
          is_featured: boolean
          published_at: string | null
          scheduled_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          category?: string
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          is_featured?: boolean
          published_at?: string | null
          scheduled_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          category?: string
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          is_featured?: boolean
          published_at?: string | null
          scheduled_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      change_history: {
        Row: {
          action: string
          change_id: string
          created_at: string
          id: string
          message: string | null
          performed_by: string | null
          performed_by_name: string | null
          performed_by_role: string | null
        }
        Insert: {
          action: string
          change_id: string
          created_at?: string
          id?: string
          message?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
          performed_by_role?: string | null
        }
        Update: {
          action?: string
          change_id?: string
          created_at?: string
          id?: string
          message?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
          performed_by_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_history_change_id_fkey"
            columns: ["change_id"]
            isOneToOne: false
            referencedRelation: "pending_changes"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          deleted_at: string | null
          email: string
          id: string
          is_read: boolean
          is_spam: boolean
          message: string
          name: string
          resolved_at: string | null
          resolved_by: string | null
          spam_reason: string | null
          spam_score: number
          spam_source: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          email: string
          id?: string
          is_read?: boolean
          is_spam?: boolean
          message: string
          name: string
          resolved_at?: string | null
          resolved_by?: string | null
          spam_reason?: string | null
          spam_score?: number
          spam_source?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          email?: string
          id?: string
          is_read?: boolean
          is_spam?: boolean
          message?: string
          name?: string
          resolved_at?: string | null
          resolved_by?: string | null
          spam_reason?: string | null
          spam_score?: number
          spam_source?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          description: string | null
          end_time: string | null
          event_date: string
          event_status: string
          id: string
          image_url: string | null
          location: string | null
          organizer: string | null
          registration_url: string | null
          scheduled_at: string | null
          slug: string
          start_time: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date: string
          event_status?: string
          id?: string
          image_url?: string | null
          location?: string | null
          organizer?: string | null
          registration_url?: string | null
          scheduled_at?: string | null
          slug: string
          start_time?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date?: string
          event_status?: string
          id?: string
          image_url?: string | null
          location?: string | null
          organizer?: string | null
          registration_url?: string | null
          scheduled_at?: string | null
          slug?: string
          start_time?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      faculty_members: {
        Row: {
          biography: string | null
          created_at: string
          department: string | null
          display_order: number
          email: string | null
          id: string
          is_active: boolean
          name: string
          photo_url: string | null
          title: string
        }
        Insert: {
          biography?: string | null
          created_at?: string
          department?: string | null
          display_order?: number
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          photo_url?: string | null
          title: string
        }
        Update: {
          biography?: string | null
          created_at?: string
          department?: string | null
          display_order?: number
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          photo_url?: string | null
          title?: string
        }
        Relationships: []
      }
      officer_birthdates: {
        Row: {
          birthdate: string
          created_at: string
          officer_id: string
          updated_at: string
        }
        Insert: {
          birthdate: string
          created_at?: string
          officer_id: string
          updated_at?: string
        }
        Update: {
          birthdate?: string
          created_at?: string
          officer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "officer_birthdates_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: true
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      officers: {
        Row: {
          academic_year: string | null
          biography: string | null
          created_at: string
          display_order: number
          email: string | null
          facebook_url: string | null
          id: string
          is_active: boolean
          linkedin_url: string | null
          name: string
          photo_url: string | null
          position: string
          program: string | null
        }
        Insert: {
          academic_year?: string | null
          biography?: string | null
          created_at?: string
          display_order?: number
          email?: string | null
          facebook_url?: string | null
          id?: string
          is_active?: boolean
          linkedin_url?: string | null
          name: string
          photo_url?: string | null
          position: string
          program?: string | null
        }
        Update: {
          academic_year?: string | null
          biography?: string | null
          created_at?: string
          display_order?: number
          email?: string | null
          facebook_url?: string | null
          id?: string
          is_active?: boolean
          linkedin_url?: string | null
          name?: string
          photo_url?: string | null
          position?: string
          program?: string | null
        }
        Relationships: []
      }
      organization_settings: {
        Row: {
          about_text: string | null
          academic_year: string | null
          college: string | null
          created_at: string
          email: string | null
          established_date: string | null
          id: string
          mission: string | null
          objectives: Json
          office_location: string | null
          organization_name: string | null
          phone: string | null
          school: string | null
          social_links: Json
          tagline: string | null
          updated_at: string
          vision: string | null
        }
        Insert: {
          about_text?: string | null
          academic_year?: string | null
          college?: string | null
          created_at?: string
          email?: string | null
          established_date?: string | null
          id?: string
          mission?: string | null
          objectives?: Json
          office_location?: string | null
          organization_name?: string | null
          phone?: string | null
          school?: string | null
          social_links?: Json
          tagline?: string | null
          updated_at?: string
          vision?: string | null
        }
        Update: {
          about_text?: string | null
          academic_year?: string | null
          college?: string | null
          created_at?: string
          email?: string | null
          established_date?: string | null
          id?: string
          mission?: string | null
          objectives?: Json
          office_location?: string | null
          organization_name?: string | null
          phone?: string | null
          school?: string | null
          social_links?: Json
          tagline?: string | null
          updated_at?: string
          vision?: string | null
        }
        Relationships: []
      }
      password_reset_requests: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      pending_changes: {
        Row: {
          action: string
          created_at: string
          id: string
          payload: Json
          record_id: string | null
          resubmitted_at: string | null
          review_message: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string
          submitted_email: string | null
          summary: string | null
          table_name: string
          updated_at: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          payload?: Json
          record_id?: string | null
          resubmitted_at?: string | null
          review_message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by: string
          submitted_email?: string | null
          summary?: string | null
          table_name: string
          updated_at?: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          payload?: Json
          record_id?: string | null
          resubmitted_at?: string | null
          review_message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string
          submitted_email?: string | null
          summary?: string | null
          table_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_disabled: boolean
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_disabled?: boolean
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_disabled?: boolean
        }
        Relationships: []
      }
      super_admin_trials: {
        Row: {
          created_at: string
          expires_at: string
          granted_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          granted_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          granted_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transparency_documents: {
        Row: {
          academic_year: string | null
          category: string
          created_at: string
          description: string | null
          document_type: string | null
          file_name: string | null
          file_size: number | null
          file_url: string
          id: string
          published_at: string | null
          scheduled_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          academic_year?: string | null
          category: string
          created_at?: string
          description?: string | null
          document_type?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url: string
          id?: string
          published_at?: string | null
          scheduled_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          academic_year?: string | null
          category?: string
          created_at?: string
          description?: string | null
          document_type?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string
          id?: string
          published_at?: string | null
          scheduled_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_is_staff: { Args: never; Returns: boolean }
      current_is_super_admin: { Args: never; Returns: boolean }
      edit_change: {
        Args: {
          _id: string
          _payload: Json
          _resubmit?: boolean
          _summary?: string
        }
        Returns: undefined
      }
      review_change: {
        Args: { _decision: string; _id: string; _message?: string }
        Returns: undefined
      }
    }
    Enums: {
      admin_role: "admin" | "super_admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      admin_role: ["admin", "super_admin"],
    },
  },
} as const
