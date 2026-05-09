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
      appointments: {
        Row: {
          created_at: string
          date: string
          id: string
          location: string | null
          recipient_id: string | null
          time: string | null
          title: string
          type: string | null
          updated_at: string
          user_id: string
          with_name: string | null
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          location?: string | null
          recipient_id?: string | null
          time?: string | null
          title: string
          type?: string | null
          updated_at?: string
          user_id: string
          with_name?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          location?: string | null
          recipient_id?: string | null
          time?: string | null
          title?: string
          type?: string | null
          updated_at?: string
          user_id?: string
          with_name?: string | null
        }
        Relationships: []
      }
      birthdays: {
        Row: {
          created_at: string
          date: string
          id: string
          name: string
          notes: string | null
          relation: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          name: string
          notes?: string | null
          relation?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          name?: string
          notes?: string | null
          relation?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      care_notes: {
        Row: {
          body: string
          created_at: string
          date: string
          id: string
          recipient_id: string
          tag: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          date?: string
          id?: string
          recipient_id: string
          tag?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          date?: string
          id?: string
          recipient_id?: string
          tag?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_notes_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "care_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      care_recipients: {
        Row: {
          contacts: Json
          created_at: string
          id: string
          kind: string
          meds: Json
          name: string
          notes: string | null
          sensory: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contacts?: Json
          created_at?: string
          id?: string
          kind?: string
          meds?: Json
          name: string
          notes?: string | null
          sensory?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contacts?: Json
          created_at?: string
          id?: string
          kind?: string
          meds?: Json
          name?: string
          notes?: string | null
          sensory?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cleaning_tasks: {
        Row: {
          auto_reset: boolean
          cadence: string
          created_at: string
          done: boolean
          id: string
          last_completed_at: string | null
          last_done: string | null
          next_due_date: string | null
          recurrence_days: number[]
          recurrence_interval: number
          recurrence_type: string
          sort_order: number
          title: string
          updated_at: string
          user_id: string
          weekday: number | null
          zone: string
        }
        Insert: {
          auto_reset?: boolean
          cadence?: string
          created_at?: string
          done?: boolean
          id?: string
          last_completed_at?: string | null
          last_done?: string | null
          next_due_date?: string | null
          recurrence_days?: number[]
          recurrence_interval?: number
          recurrence_type?: string
          sort_order?: number
          title: string
          updated_at?: string
          user_id: string
          weekday?: number | null
          zone?: string
        }
        Update: {
          auto_reset?: boolean
          cadence?: string
          created_at?: string
          done?: boolean
          id?: string
          last_completed_at?: string | null
          last_done?: string | null
          next_due_date?: string | null
          recurrence_days?: number[]
          recurrence_interval?: number
          recurrence_type?: string
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
          weekday?: number | null
          zone?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          progress: number
          status: string
          timeline: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          progress?: number
          status?: string
          timeline?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          progress?: number
          status?: string
          timeline?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      grocery_items: {
        Row: {
          bought: boolean
          category: string | null
          created_at: string
          id: string
          name: string
          qty: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bought?: boolean
          category?: string | null
          created_at?: string
          id?: string
          name: string
          qty?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bought?: boolean
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          qty?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      habit_logs: {
        Row: {
          created_at: string
          date: string
          done: boolean
          habit_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          done?: boolean
          habit_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          done?: boolean
          habit_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          cadence: string
          category: string
          created_at: string
          id: string
          streak: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cadence?: string
          category?: string
          created_at?: string
          id?: string
          streak?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cadence?: string
          category?: string
          created_at?: string
          id?: string
          streak?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      holidays: {
        Row: {
          created_at: string
          date: string
          id: string
          name: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ideas: {
        Row: {
          category: string
          created_at: string
          id: string
          notes: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          notes?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          notes?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          body: string
          created_at: string
          date: string
          id: string
          mood: string | null
          title: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          date?: string
          id?: string
          mood?: string | null
          title?: string | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          date?: string
          id?: string
          mood?: string | null
          title?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meals: {
        Row: {
          created_at: string
          date: string
          id: string
          kid_safe: boolean
          name: string
          notes: string | null
          slot: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          kid_safe?: boolean
          name: string
          notes?: string | null
          slot: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          kid_safe?: boolean
          name?: string
          notes?: string | null
          slot?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          energy_date: string | null
          energy_today: string | null
          id: string
          low_energy_mode: boolean
          name: string
          planning_style: string
          theme: string
          time_zone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          energy_date?: string | null
          energy_today?: string | null
          id: string
          low_energy_mode?: boolean
          name?: string
          planning_style?: string
          theme?: string
          time_zone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          energy_date?: string | null
          energy_today?: string | null
          id?: string
          low_energy_mode?: boolean
          name?: string
          planning_style?: string
          theme?: string
          time_zone?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          area: string
          auto_reset: boolean
          created_at: string
          day_part: string | null
          done: boolean
          due_date: string | null
          energy: string | null
          est_minutes: number | null
          goal_id: string | null
          id: string
          is_top_three: boolean
          last_completed_at: string | null
          next_due_date: string | null
          notes: string | null
          priority: string
          recipient_id: string | null
          recurrence_days: number[]
          recurrence_interval: number
          recurrence_type: string
          sort_order: number
          status: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area?: string
          auto_reset?: boolean
          created_at?: string
          day_part?: string | null
          done?: boolean
          due_date?: string | null
          energy?: string | null
          est_minutes?: number | null
          goal_id?: string | null
          id?: string
          is_top_three?: boolean
          last_completed_at?: string | null
          next_due_date?: string | null
          notes?: string | null
          priority?: string
          recipient_id?: string | null
          recurrence_days?: number[]
          recurrence_interval?: number
          recurrence_type?: string
          sort_order?: number
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string
          auto_reset?: boolean
          created_at?: string
          day_part?: string | null
          done?: boolean
          due_date?: string | null
          energy?: string | null
          est_minutes?: number | null
          goal_id?: string | null
          id?: string
          is_top_three?: boolean
          last_completed_at?: string | null
          next_due_date?: string | null
          notes?: string | null
          priority?: string
          recipient_id?: string | null
          recurrence_days?: number[]
          recurrence_interval?: number
          recurrence_type?: string
          sort_order?: number
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
