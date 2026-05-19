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
          icon: string | null
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
          icon?: string | null
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
          icon?: string | null
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
      areas: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_archived: boolean
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
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
      budget_categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          kind: string
          monthly_limit: number
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          kind?: string
          monthly_limit?: number
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          kind?: string
          monthly_limit?: number
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      care_ai_notes: {
        Row: {
          body: string
          created_at: string
          focus: string
          id: string
          prompt: string | null
          recipient_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          focus?: string
          id?: string
          prompt?: string | null
          recipient_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          focus?: string
          id?: string
          prompt?: string | null
          recipient_id?: string
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
      care_providers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          next_appt: string | null
          notes: string | null
          phone: string | null
          recipient_id: string
          role: string
          specialty: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          next_appt?: string | null
          notes?: string | null
          phone?: string | null
          recipient_id: string
          role?: string
          specialty?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          next_appt?: string | null
          notes?: string | null
          phone?: string | null
          recipient_id?: string
          role?: string
          specialty?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      care_recipients: {
        Row: {
          birth_date: string | null
          contacts: Json
          created_at: string
          education_level: string | null
          food_preferences: Json
          id: string
          kind: string
          location: string | null
          love_languages: string[]
          meds: Json
          name: string
          notes: string | null
          schedule: Json
          school: string | null
          sensory: string | null
          ssn_full: string | null
          ssn_last4: string | null
          updated_at: string
          user_id: string
          zodiac: string | null
        }
        Insert: {
          birth_date?: string | null
          contacts?: Json
          created_at?: string
          education_level?: string | null
          food_preferences?: Json
          id?: string
          kind?: string
          location?: string | null
          love_languages?: string[]
          meds?: Json
          name: string
          notes?: string | null
          schedule?: Json
          school?: string | null
          sensory?: string | null
          ssn_full?: string | null
          ssn_last4?: string | null
          updated_at?: string
          user_id: string
          zodiac?: string | null
        }
        Update: {
          birth_date?: string | null
          contacts?: Json
          created_at?: string
          education_level?: string | null
          food_preferences?: Json
          id?: string
          kind?: string
          location?: string | null
          love_languages?: string[]
          meds?: Json
          name?: string
          notes?: string | null
          schedule?: Json
          school?: string | null
          sensory?: string | null
          ssn_full?: string | null
          ssn_last4?: string | null
          updated_at?: string
          user_id?: string
          zodiac?: string | null
        }
        Relationships: []
      }
      chore_assignments: {
        Row: {
          created_at: string
          id: string
          member_id: string
          notes: string | null
          sort_order: number
          title: string
          updated_at: string
          user_id: string
          weekdays: number[]
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          notes?: string | null
          sort_order?: number
          title: string
          updated_at?: string
          user_id: string
          weekdays?: number[]
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          notes?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
          weekdays?: number[]
        }
        Relationships: []
      }
      chore_completions: {
        Row: {
          assignment_id: string
          done_at: string
          id: string
          member_id: string
          user_id: string
          week_start: string
          weekday: number
        }
        Insert: {
          assignment_id: string
          done_at?: string
          id?: string
          member_id: string
          user_id: string
          week_start: string
          weekday: number
        }
        Update: {
          assignment_id?: string
          done_at?: string
          id?: string
          member_id?: string
          user_id?: string
          week_start?: string
          weekday?: number
        }
        Relationships: []
      }
      cleaning_tasks: {
        Row: {
          auto_reset: boolean
          cadence: string
          category: string | null
          created_at: string
          done: boolean
          est_minutes: number | null
          id: string
          last_completed_at: string | null
          last_done: string | null
          next_due_date: string | null
          parent_id: string | null
          recurrence_days: number[]
          recurrence_interval: number
          recurrence_type: string
          sort_order: number
          start_time: string | null
          time_block: string | null
          title: string
          updated_at: string
          user_id: string
          weekday: number | null
          zone: string
        }
        Insert: {
          auto_reset?: boolean
          cadence?: string
          category?: string | null
          created_at?: string
          done?: boolean
          est_minutes?: number | null
          id?: string
          last_completed_at?: string | null
          last_done?: string | null
          next_due_date?: string | null
          parent_id?: string | null
          recurrence_days?: number[]
          recurrence_interval?: number
          recurrence_type?: string
          sort_order?: number
          start_time?: string | null
          time_block?: string | null
          title: string
          updated_at?: string
          user_id: string
          weekday?: number | null
          zone?: string
        }
        Update: {
          auto_reset?: boolean
          cadence?: string
          category?: string | null
          created_at?: string
          done?: boolean
          est_minutes?: number | null
          id?: string
          last_completed_at?: string | null
          last_done?: string | null
          next_due_date?: string | null
          parent_id?: string | null
          recurrence_days?: number[]
          recurrence_interval?: number
          recurrence_type?: string
          sort_order?: number
          start_time?: string | null
          time_block?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          weekday?: number | null
          zone?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_tasks_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cleaning_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      cycle_day_logs: {
        Row: {
          bbt: number | null
          cervical_mucus: string | null
          created_at: string
          date: string
          energy_level: string | null
          flow: string | null
          id: string
          is_intimate: boolean
          mood: string | null
          notes: string | null
          symptoms: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          bbt?: number | null
          cervical_mucus?: string | null
          created_at?: string
          date: string
          energy_level?: string | null
          flow?: string | null
          id?: string
          is_intimate?: boolean
          mood?: string | null
          notes?: string | null
          symptoms?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          bbt?: number | null
          cervical_mucus?: string | null
          created_at?: string
          date?: string
          energy_level?: string | null
          flow?: string | null
          id?: string
          is_intimate?: boolean
          mood?: string | null
          notes?: string | null
          symptoms?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cycle_logs: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          period_end: string | null
          period_start: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          period_end?: string | null
          period_start: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          period_end?: string | null
          period_start?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cycle_settings: {
        Row: {
          auto_low_energy: boolean
          avg_cycle_length: number
          avg_period_length: number
          created_at: string
          enabled: boolean
          id: string
          luteal_length: number
          moon_archetype: string
          pair_with_moon: boolean
          show_fertility: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_low_energy?: boolean
          avg_cycle_length?: number
          avg_period_length?: number
          created_at?: string
          enabled?: boolean
          id?: string
          luteal_length?: number
          moon_archetype?: string
          pair_with_moon?: boolean
          show_fertility?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_low_energy?: boolean
          avg_cycle_length?: number
          avg_period_length?: number
          created_at?: string
          enabled?: boolean
          id?: string
          luteal_length?: number
          moon_archetype?: string
          pair_with_moon?: boolean
          show_fertility?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_intentions: {
        Row: {
          created_at: string
          date: string
          emotional_focus: string | null
          energy: string | null
          gratitude: Json
          id: string
          intention: string | null
          mood: string | null
          notes: string | null
          priorities: Json
          theme: string | null
          top_three: Json
          updated_at: string
          user_id: string
          weather_note: string | null
          word: string | null
        }
        Insert: {
          created_at?: string
          date: string
          emotional_focus?: string | null
          energy?: string | null
          gratitude?: Json
          id?: string
          intention?: string | null
          mood?: string | null
          notes?: string | null
          priorities?: Json
          theme?: string | null
          top_three?: Json
          updated_at?: string
          user_id: string
          weather_note?: string | null
          word?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          emotional_focus?: string | null
          energy?: string | null
          gratitude?: Json
          id?: string
          intention?: string | null
          mood?: string | null
          notes?: string | null
          priorities?: Json
          theme?: string | null
          top_three?: Json
          updated_at?: string
          user_id?: string
          weather_note?: string | null
          word?: string | null
        }
        Relationships: []
      }
      daily_plan_layouts: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
          widgets: Json
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          widgets?: Json
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          widgets?: Json
        }
        Relationships: []
      }
      daily_reviews: {
        Row: {
          challenges: string | null
          created_at: string
          date: string
          gratitude: string | null
          id: string
          lessons: string | null
          rating: number | null
          tomorrow_focus: string | null
          updated_at: string
          user_id: string
          wins: string | null
        }
        Insert: {
          challenges?: string | null
          created_at?: string
          date: string
          gratitude?: string | null
          id?: string
          lessons?: string | null
          rating?: number | null
          tomorrow_focus?: string | null
          updated_at?: string
          user_id: string
          wins?: string | null
        }
        Update: {
          challenges?: string | null
          created_at?: string
          date?: string
          gratitude?: string | null
          id?: string
          lessons?: string | null
          rating?: number | null
          tomorrow_focus?: string | null
          updated_at?: string
          user_id?: string
          wins?: string | null
        }
        Relationships: []
      }
      dashboard_layouts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          layout: Json
          name: string
          sort_order: number
          updated_at: string
          user_id: string
          widgets: Json
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          layout?: Json
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
          widgets?: Json
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          layout?: Json
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
          widgets?: Json
        }
        Relationships: []
      }
      debts: {
        Row: {
          apr: number
          balance: number
          created_at: string
          id: string
          min_payment: number
          name: string
          notes: string | null
          strategy: string
          target_payoff_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          apr?: number
          balance?: number
          created_at?: string
          id?: string
          min_payment?: number
          name: string
          notes?: string | null
          strategy?: string
          target_payoff_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          apr?: number
          balance?: number
          created_at?: string
          id?: string
          min_payment?: number
          name?: string
          notes?: string | null
          strategy?: string
          target_payoff_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      favorite_meals: {
        Row: {
          created_at: string
          id: string
          ingredients: Json
          name: string
          notes: string | null
          prep_minutes: number | null
          slot: string | null
          steps: Json
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ingredients?: Json
          name: string
          notes?: string | null
          prep_minutes?: number | null
          slot?: string | null
          steps?: Json
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ingredients?: Json
          name?: string
          notes?: string | null
          prep_minutes?: number | null
          slot?: string | null
          steps?: Json
          tags?: string[]
          updated_at?: string
          user_id?: string
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
      google_calendar_selected: {
        Row: {
          calendar_id: string
          color: string | null
          created_at: string
          enabled: boolean
          id: string
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_id: string
          color?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_id?: string
          color?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          refresh_token: string
          scope: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          refresh_token: string
          scope?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          scope?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      grocery_categories: {
        Row: {
          collapsed: boolean
          color: string | null
          created_at: string
          id: string
          is_default: boolean
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          collapsed?: boolean
          color?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          collapsed?: boolean
          color?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          sort_order?: number
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
          notes: string | null
          qty: string | null
          sort_order: number
          source_date: string | null
          source_meal_id: string | null
          source_meal_name: string | null
          source_slot: string | null
          stock_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bought?: boolean
          category?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          qty?: string | null
          sort_order?: number
          source_date?: string | null
          source_meal_id?: string | null
          source_meal_name?: string | null
          source_slot?: string | null
          stock_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bought?: boolean
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          qty?: string | null
          sort_order?: number
          source_date?: string | null
          source_meal_id?: string | null
          source_meal_name?: string | null
          source_slot?: string | null
          stock_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      grocery_lists: {
        Row: {
          created_at: string
          id: string
          items: Json
          name: string
          updated_at: string
          user_id: string
          week_start: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          name: string
          updated_at?: string
          user_id: string
          week_start?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          name?: string
          updated_at?: string
          user_id?: string
          week_start?: string | null
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
      health_checkins: {
        Row: {
          created_at: string
          date: string
          id: string
          meds_taken: boolean
          mindfulness_minutes: number | null
          mood: string | null
          notes: string | null
          sleep_hours: number | null
          stress: string | null
          updated_at: string
          user_id: string
          water_cups: number | null
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          meds_taken?: boolean
          mindfulness_minutes?: number | null
          mood?: string | null
          notes?: string | null
          sleep_hours?: number | null
          stress?: string | null
          updated_at?: string
          user_id: string
          water_cups?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          meds_taken?: boolean
          mindfulness_minutes?: number | null
          mood?: string | null
          notes?: string | null
          sleep_hours?: number | null
          stress?: string | null
          updated_at?: string
          user_id?: string
          water_cups?: number | null
        }
        Relationships: []
      }
      health_goals: {
        Row: {
          goal_type: string
          target_calories: number | null
          target_protein_g: number | null
          target_weight_lb: number | null
          updated_at: string
          user_id: string
          weekly_movement_minutes: number
        }
        Insert: {
          goal_type?: string
          target_calories?: number | null
          target_protein_g?: number | null
          target_weight_lb?: number | null
          updated_at?: string
          user_id: string
          weekly_movement_minutes?: number
        }
        Update: {
          goal_type?: string
          target_calories?: number | null
          target_protein_g?: number | null
          target_weight_lb?: number | null
          updated_at?: string
          user_id?: string
          weekly_movement_minutes?: number
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
      home_documents: {
        Row: {
          category: string | null
          created_at: string
          expires_on: string | null
          file_path: string
          id: string
          mime_type: string | null
          notes: string | null
          size_bytes: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          expires_on?: string | null
          file_path: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          size_bytes?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          expires_on?: string | null
          file_path?: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          size_bytes?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      home_maintenance: {
        Row: {
          category: string | null
          created_at: string
          id: string
          interval_months: number | null
          last_done: string | null
          next_due: string | null
          notes: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          interval_months?: number | null
          last_done?: string | null
          next_due?: string | null
          notes?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          interval_months?: number | null
          last_done?: string | null
          next_due?: string | null
          notes?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      home_notes: {
        Row: {
          body: string | null
          created_at: string
          id: string
          pinned: boolean
          sort_order: number
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          pinned?: boolean
          sort_order?: number
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          pinned?: boolean
          sort_order?: number
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      household_members: {
        Row: {
          avatar_emoji: string | null
          color: string | null
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_emoji?: string | null
          color?: string | null
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_emoji?: string | null
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
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
          energy: string | null
          gratitude_items: Json
          id: string
          linked_ids: Json
          mood: string | null
          pinned: boolean
          prompts: Json
          tags: string[]
          template: string | null
          title: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          date?: string
          energy?: string | null
          gratitude_items?: Json
          id?: string
          linked_ids?: Json
          mood?: string | null
          pinned?: boolean
          prompts?: Json
          tags?: string[]
          template?: string | null
          title?: string | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          date?: string
          energy?: string | null
          gratitude_items?: Json
          id?: string
          linked_ids?: Json
          mood?: string | null
          pinned?: boolean
          prompts?: Json
          tags?: string[]
          template?: string | null
          title?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_preferences: {
        Row: {
          allergies: string[]
          budget_level: string
          created_at: string
          cuisines: string[]
          diets: string[]
          dislikes: string[]
          family_size: number
          low_energy: boolean
          max_prep_minutes: number
          picky_notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allergies?: string[]
          budget_level?: string
          created_at?: string
          cuisines?: string[]
          diets?: string[]
          dislikes?: string[]
          family_size?: number
          low_energy?: boolean
          max_prep_minutes?: number
          picky_notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allergies?: string[]
          budget_level?: string
          created_at?: string
          cuisines?: string[]
          diets?: string[]
          dislikes?: string[]
          family_size?: number
          low_energy?: boolean
          max_prep_minutes?: number
          picky_notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_themes: {
        Row: {
          color: string | null
          created_at: string
          default_slot: string | null
          emoji: string | null
          id: string
          meal_ids: string[]
          name: string
          notes: string | null
          sort_order: number
          updated_at: string
          user_id: string
          weekday: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          default_slot?: string | null
          emoji?: string | null
          id?: string
          meal_ids?: string[]
          name: string
          notes?: string | null
          sort_order?: number
          updated_at?: string
          user_id: string
          weekday?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          default_slot?: string | null
          emoji?: string | null
          id?: string
          meal_ids?: string[]
          name?: string
          notes?: string | null
          sort_order?: number
          updated_at?: string
          user_id?: string
          weekday?: number | null
        }
        Relationships: []
      }
      meals: {
        Row: {
          created_at: string
          date: string
          id: string
          ingredients: Json
          kid_safe: boolean
          name: string
          notes: string | null
          prep_minutes: number | null
          slot: string
          steps: Json
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          ingredients?: Json
          kid_safe?: boolean
          name: string
          notes?: string | null
          prep_minutes?: number | null
          slot: string
          steps?: Json
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          ingredients?: Json
          kid_safe?: boolean
          name?: string
          notes?: string | null
          prep_minutes?: number | null
          slot?: string
          steps?: Json
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meals_library: {
        Row: {
          color: string | null
          cook_minutes: number | null
          created_at: string
          description: string | null
          energy_level: string
          family_rating: number | null
          icon: string | null
          id: string
          image_url: string | null
          ingredients: Json
          is_archived: boolean
          is_favorite: boolean
          notes: string | null
          prep_minutes: number | null
          servings: number | null
          slot: string | null
          sort_order: number
          steps: Json
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          cook_minutes?: number | null
          created_at?: string
          description?: string | null
          energy_level?: string
          family_rating?: number | null
          icon?: string | null
          id?: string
          image_url?: string | null
          ingredients?: Json
          is_archived?: boolean
          is_favorite?: boolean
          notes?: string | null
          prep_minutes?: number | null
          servings?: number | null
          slot?: string | null
          sort_order?: number
          steps?: Json
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          cook_minutes?: number | null
          created_at?: string
          description?: string | null
          energy_level?: string
          family_rating?: number | null
          icon?: string | null
          id?: string
          image_url?: string | null
          ingredients?: Json
          is_archived?: boolean
          is_favorite?: boolean
          notes?: string | null
          prep_minutes?: number | null
          servings?: number | null
          slot?: string | null
          sort_order?: number
          steps?: Json
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      medical_history: {
        Row: {
          attachments: Json
          category: string | null
          created_at: string
          date: string
          id: string
          notes: string | null
          provider: string | null
          recipient_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: Json
          category?: string | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          provider?: string | null
          recipient_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attachments?: Json
          category?: string | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          provider?: string | null
          recipient_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      monthly_intentions: {
        Row: {
          created_at: string
          emotional_focus: string | null
          focus_areas: Json
          id: string
          intention: string | null
          month: string
          mood_board: Json
          priorities: Json
          quote: string | null
          updated_at: string
          user_id: string
          vision: string | null
          word: string | null
        }
        Insert: {
          created_at?: string
          emotional_focus?: string | null
          focus_areas?: Json
          id?: string
          intention?: string | null
          month: string
          mood_board?: Json
          priorities?: Json
          quote?: string | null
          updated_at?: string
          user_id: string
          vision?: string | null
          word?: string | null
        }
        Update: {
          created_at?: string
          emotional_focus?: string | null
          focus_areas?: Json
          id?: string
          intention?: string | null
          month?: string
          mood_board?: Json
          priorities?: Json
          quote?: string | null
          updated_at?: string
          user_id?: string
          vision?: string | null
          word?: string | null
        }
        Relationships: []
      }
      monthly_reviews: {
        Row: {
          challenges: string | null
          created_at: string
          gratitude: string | null
          id: string
          lessons: string | null
          month: string
          next_month_focus: string | null
          rating: number | null
          updated_at: string
          user_id: string
          wins: string | null
        }
        Insert: {
          challenges?: string | null
          created_at?: string
          gratitude?: string | null
          id?: string
          lessons?: string | null
          month: string
          next_month_focus?: string | null
          rating?: number | null
          updated_at?: string
          user_id: string
          wins?: string | null
        }
        Update: {
          challenges?: string | null
          created_at?: string
          gratitude?: string | null
          id?: string
          lessons?: string | null
          month?: string
          next_month_focus?: string | null
          rating?: number | null
          updated_at?: string
          user_id?: string
          wins?: string | null
        }
        Relationships: []
      }
      movement_logs: {
        Row: {
          activity: string
          created_at: string
          date: string
          id: string
          intensity: string | null
          minutes: number
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity: string
          created_at?: string
          date?: string
          id?: string
          intensity?: string | null
          minutes?: number
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity?: string
          created_at?: string
          date?: string
          id?: string
          intensity?: string | null
          minutes?: number
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      note_links: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          note_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          note_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          note_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_links_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          archived: boolean
          body: string
          created_at: string
          date: string | null
          id: string
          kind: string
          pinned: boolean
          project_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          body?: string
          created_at?: string
          date?: string | null
          id?: string
          kind?: string
          pinned?: boolean
          project_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          body?: string
          created_at?: string
          date?: string | null
          id?: string
          kind?: string
          pinned?: boolean
          project_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pantry_items: {
        Row: {
          category: string | null
          created_at: string
          id: string
          in_stock: boolean
          name: string
          notes: string | null
          qty: string | null
          stock_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          in_stock?: boolean
          name: string
          notes?: string | null
          qty?: string | null
          stock_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          in_stock?: boolean
          name?: string
          notes?: string | null
          qty?: string | null
          stock_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pomodoro_sessions: {
        Row: {
          completed_at: string
          created_at: string
          focus_seconds: number
          id: string
          meal_name: string | null
          task_id: string | null
          task_title: string | null
          template_id: string | null
          template_label: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          focus_seconds?: number
          id?: string
          meal_name?: string | null
          task_id?: string | null
          task_title?: string | null
          template_id?: string | null
          template_label?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          focus_seconds?: number
          id?: string
          meal_name?: string | null
          task_id?: string | null
          task_title?: string | null
          template_id?: string | null
          template_label?: string | null
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
          header_image_url: string | null
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
          header_image_url?: string | null
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
          header_image_url?: string | null
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
      project_sections: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          project_id: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          project_id: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          archived_at: string | null
          area_id: string | null
          area_name: string | null
          color: string | null
          created_at: string
          deadline: string | null
          icon: string | null
          id: string
          name: string
          notes: string | null
          parent_project_id: string | null
          sort_order: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          area_id?: string | null
          area_name?: string | null
          color?: string | null
          created_at?: string
          deadline?: string | null
          icon?: string | null
          id?: string
          name: string
          notes?: string | null
          parent_project_id?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          area_id?: string | null
          area_name?: string | null
          color?: string | null
          created_at?: string
          deadline?: string | null
          icon?: string | null
          id?: string
          name?: string
          notes?: string | null
          parent_project_id?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_parent_project_id_fkey"
            columns: ["parent_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_add_presets: {
        Row: {
          color: string | null
          created_at: string
          default_area: string | null
          default_project_id: string | null
          hotkey: string | null
          icon: string | null
          id: string
          kind: string
          label: string
          pinned: boolean
          sort_order: number
          template_body: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          default_area?: string | null
          default_project_id?: string | null
          hotkey?: string | null
          icon?: string | null
          id?: string
          kind: string
          label: string
          pinned?: boolean
          sort_order?: number
          template_body?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          default_area?: string | null
          default_project_id?: string | null
          hotkey?: string | null
          icon?: string | null
          id?: string
          kind?: string
          label?: string
          pinned?: boolean
          sort_order?: number
          template_body?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_bills: {
        Row: {
          amount: number
          auto_create_task: boolean
          cadence: string
          category_id: string | null
          created_at: string
          id: string
          name: string
          next_due_date: string | null
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          auto_create_task?: boolean
          cadence?: string
          category_id?: string | null
          created_at?: string
          id?: string
          name: string
          next_due_date?: string | null
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          auto_create_task?: boolean
          cadence?: string
          category_id?: string | null
          created_at?: string
          id?: string
          name?: string
          next_due_date?: string | null
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reset_checklists: {
        Row: {
          created_at: string
          id: string
          is_template: boolean
          kind: string
          name: string
          sort_order: number
          updated_at: string
          user_id: string
          week_start: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_template?: boolean
          kind?: string
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
          week_start?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_template?: boolean
          kind?: string
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
          week_start?: string | null
        }
        Relationships: []
      }
      reset_items: {
        Row: {
          category: string | null
          checklist_id: string
          created_at: string
          day_of_week: number | null
          done: boolean
          due_date: string | null
          est_minutes: number | null
          id: string
          linked_task_id: string | null
          notes: string | null
          parent_id: string | null
          recurrence_days: number[]
          recurrence_type: string
          sort_order: number
          start_time: string | null
          time_block: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          checklist_id: string
          created_at?: string
          day_of_week?: number | null
          done?: boolean
          due_date?: string | null
          est_minutes?: number | null
          id?: string
          linked_task_id?: string | null
          notes?: string | null
          parent_id?: string | null
          recurrence_days?: number[]
          recurrence_type?: string
          sort_order?: number
          start_time?: string | null
          time_block?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          checklist_id?: string
          created_at?: string
          day_of_week?: number | null
          done?: boolean
          due_date?: string | null
          est_minutes?: number | null
          id?: string
          linked_task_id?: string | null
          notes?: string | null
          parent_id?: string | null
          recurrence_days?: number[]
          recurrence_type?: string
          sort_order?: number
          start_time?: string | null
          time_block?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reset_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "reset_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reset_items_linked_task_fk"
            columns: ["linked_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reset_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "reset_items"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          cadence: string
          created_at: string
          id: string
          items: Json
          notes: string | null
          person_name: string
          recipient_id: string | null
          slot: string
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          cadence?: string
          created_at?: string
          id?: string
          items?: Json
          notes?: string | null
          person_name: string
          recipient_id?: string | null
          slot: string
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          cadence?: string
          created_at?: string
          id?: string
          items?: Json
          notes?: string | null
          person_name?: string
          recipient_id?: string | null
          slot?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number
          cadence: string
          category_id: string | null
          created_at: string
          id: string
          name: string
          next_charge_date: string | null
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          cadence?: string
          category_id?: string | null
          created_at?: string
          id?: string
          name: string
          next_charge_date?: string | null
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          cadence?: string
          category_id?: string | null
          created_at?: string
          id?: string
          name?: string
          next_charge_date?: string | null
          notes?: string | null
          updated_at?: string
          user_id?: string
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
          icon: string | null
          id: string
          inbox: boolean
          is_top_three: boolean
          last_completed_at: string | null
          next_due_date: string | null
          notes: string | null
          parent_task_id: string | null
          priority: string
          project_id: string | null
          recipient_id: string | null
          recurrence_days: number[]
          recurrence_interval: number
          recurrence_type: string
          reset_item_id: string | null
          section_id: string | null
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
          icon?: string | null
          id?: string
          inbox?: boolean
          is_top_three?: boolean
          last_completed_at?: string | null
          next_due_date?: string | null
          notes?: string | null
          parent_task_id?: string | null
          priority?: string
          project_id?: string | null
          recipient_id?: string | null
          recurrence_days?: number[]
          recurrence_interval?: number
          recurrence_type?: string
          reset_item_id?: string | null
          section_id?: string | null
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
          icon?: string | null
          id?: string
          inbox?: boolean
          is_top_three?: boolean
          last_completed_at?: string | null
          next_due_date?: string | null
          notes?: string | null
          parent_task_id?: string | null
          priority?: string
          project_id?: string | null
          recipient_id?: string | null
          recurrence_days?: number[]
          recurrence_interval?: number
          recurrence_type?: string
          reset_item_id?: string | null
          section_id?: string | null
          sort_order?: number
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_reset_item_fk"
            columns: ["reset_item_id"]
            isOneToOne: false
            referencedRelation: "reset_items"
            referencedColumns: ["id"]
          },
        ]
      }
      time_blocks: {
        Row: {
          all_day: boolean
          color: string
          created_at: string
          date: string
          end_time: string
          icon: string | null
          id: string
          notes: string | null
          start_time: string
          task_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          all_day?: boolean
          color?: string
          created_at?: string
          date: string
          end_time: string
          icon?: string | null
          id?: string
          notes?: string | null
          start_time: string
          task_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          all_day?: boolean
          color?: string
          created_at?: string
          date?: string
          end_time?: string
          icon?: string | null
          id?: string
          notes?: string | null
          start_time?: string
          task_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_blocks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account: string | null
          amount: number
          category_id: string | null
          created_at: string
          date: string
          id: string
          kind: string
          note: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account?: string | null
          amount: number
          category_id?: string | null
          created_at?: string
          date?: string
          id?: string
          kind?: string
          note?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          date?: string
          id?: string
          kind?: string
          note?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_pantry_colors: {
        Row: {
          created_at: string
          in_stock_color: string
          low_color: string
          out_color: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          in_stock_color?: string
          low_color?: string
          out_color?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          in_stock_color?: string
          low_color?: string
          out_color?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_intentions: {
        Row: {
          created_at: string
          emotional_focus: string | null
          id: string
          intention: string | null
          notes: string | null
          priorities: Json
          theme: string | null
          top_three: Json
          updated_at: string
          user_id: string
          week_start: string
          word: string | null
        }
        Insert: {
          created_at?: string
          emotional_focus?: string | null
          id?: string
          intention?: string | null
          notes?: string | null
          priorities?: Json
          theme?: string | null
          top_three?: Json
          updated_at?: string
          user_id: string
          week_start: string
          word?: string | null
        }
        Update: {
          created_at?: string
          emotional_focus?: string | null
          id?: string
          intention?: string | null
          notes?: string | null
          priorities?: Json
          theme?: string | null
          top_three?: Json
          updated_at?: string
          user_id?: string
          week_start?: string
          word?: string | null
        }
        Relationships: []
      }
      weekly_reviews: {
        Row: {
          challenges: string | null
          created_at: string
          energy_avg: string | null
          gratitude: string | null
          id: string
          lessons: string | null
          next_week_focus: string | null
          rating: number | null
          updated_at: string
          user_id: string
          week_start: string
          wins: string | null
        }
        Insert: {
          challenges?: string | null
          created_at?: string
          energy_avg?: string | null
          gratitude?: string | null
          id?: string
          lessons?: string | null
          next_week_focus?: string | null
          rating?: number | null
          updated_at?: string
          user_id: string
          week_start: string
          wins?: string | null
        }
        Update: {
          challenges?: string | null
          created_at?: string
          energy_avg?: string | null
          gratitude?: string | null
          id?: string
          lessons?: string | null
          next_week_focus?: string | null
          rating?: number | null
          updated_at?: string
          user_id?: string
          week_start?: string
          wins?: string | null
        }
        Relationships: []
      }
      weight_logs: {
        Row: {
          created_at: string
          date: string
          id: string
          notes: string | null
          user_id: string
          weight_lb: number
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          user_id: string
          weight_lb: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          user_id?: string
          weight_lb?: number
        }
        Relationships: []
      }
      widget_text_overrides: {
        Row: {
          created_at: string
          field: string
          id: string
          updated_at: string
          user_id: string
          value: string
          widget_id: string
        }
        Insert: {
          created_at?: string
          field: string
          id?: string
          updated_at?: string
          user_id: string
          value: string
          widget_id: string
        }
        Update: {
          created_at?: string
          field?: string
          id?: string
          updated_at?: string
          user_id?: string
          value?: string
          widget_id?: string
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
