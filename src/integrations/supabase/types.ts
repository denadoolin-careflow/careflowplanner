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
      ai_usage: {
        Row: {
          id: string
          updated_at: string
          user_id: string
          weighted_calls: number
          year_month: string
        }
        Insert: {
          id?: string
          updated_at?: string
          user_id: string
          weighted_calls?: number
          year_month: string
        }
        Update: {
          id?: string
          updated_at?: string
          user_id?: string
          weighted_calls?: number
          year_month?: string
        }
        Relationships: []
      }
      anchors: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          key: string
          label: string
          pillar: string | null
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          key: string
          label: string
          pillar?: string | null
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          key?: string
          label?: string
          pillar?: string | null
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          all_day: boolean
          area_name: string | null
          color: string | null
          created_at: string
          date: string
          end_date: string | null
          end_time: string | null
          google_calendar_id: string | null
          google_event_id: string | null
          google_last_synced_at: string | null
          household_id: string | null
          icon: string | null
          id: string
          location: string | null
          notes: string | null
          project_id: string | null
          recipient_id: string | null
          sync_to_google: boolean
          time: string | null
          title: string
          type: string | null
          updated_at: string
          user_id: string
          visibility: string
          with_name: string | null
        }
        Insert: {
          all_day?: boolean
          area_name?: string | null
          color?: string | null
          created_at?: string
          date: string
          end_date?: string | null
          end_time?: string | null
          google_calendar_id?: string | null
          google_event_id?: string | null
          google_last_synced_at?: string | null
          household_id?: string | null
          icon?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          project_id?: string | null
          recipient_id?: string | null
          sync_to_google?: boolean
          time?: string | null
          title: string
          type?: string | null
          updated_at?: string
          user_id: string
          visibility?: string
          with_name?: string | null
        }
        Update: {
          all_day?: boolean
          area_name?: string | null
          color?: string | null
          created_at?: string
          date?: string
          end_date?: string | null
          end_time?: string | null
          google_calendar_id?: string | null
          google_event_id?: string | null
          google_last_synced_at?: string | null
          household_id?: string | null
          icon?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          project_id?: string | null
          recipient_id?: string | null
          sync_to_google?: boolean
          time?: string | null
          title?: string
          type?: string | null
          updated_at?: string
          user_id?: string
          visibility?: string
          with_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      area_resources: {
        Row: {
          area_name: string
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          kind: string
          sort_order: number
          title: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          area_name: string
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          kind?: string
          sort_order?: number
          title: string
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          area_name?: string
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          kind?: string
          sort_order?: number
          title?: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      areas: {
        Row: {
          color: string | null
          cover_url: string | null
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
          cover_url?: string | null
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
          cover_url?: string | null
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
      automation_runs: {
        Row: {
          automation_id: string
          created_at: string
          error: string | null
          id: string
          payload: Json
          status: string
          triggered_by: string | null
          user_id: string
        }
        Insert: {
          automation_id: string
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json
          status?: string
          triggered_by?: string | null
          user_id: string
        }
        Update: {
          automation_id?: string
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json
          status?: string
          triggered_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          action_config: Json
          action_type: string
          created_at: string
          enabled: boolean
          id: string
          last_run_at: string | null
          name: string
          sort_order: number
          trigger_config: Json
          trigger_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_config?: Json
          action_type: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          name: string
          sort_order?: number
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          name?: string
          sort_order?: number
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      billing_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id?: string
          paddle_subscription_id?: string
          price_id?: string
          product_id?: string
          status?: string
          updated_at?: string | null
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
      brain_dumps: {
        Row: {
          ai_category: string | null
          ai_title: string | null
          content: string
          created_at: string
          id: string
          promoted_task_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_category?: string | null
          ai_title?: string | null
          content: string
          created_at?: string
          id?: string
          promoted_task_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_category?: string | null
          ai_title?: string | null
          content?: string
          created_at?: string
          id?: string
          promoted_task_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bucket_items: {
        Row: {
          created_at: string
          done: boolean
          done_at: string | null
          due_date: string | null
          id: string
          list_id: string
          notes: string | null
          photo_url: string | null
          sort_order: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          done_at?: string | null
          due_date?: string | null
          id?: string
          list_id: string
          notes?: string | null
          photo_url?: string | null
          sort_order?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          done?: boolean
          done_at?: string | null
          due_date?: string | null
          id?: string
          list_id?: string
          notes?: string | null
          photo_url?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bucket_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "bucket_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      bucket_lists: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_shared: boolean
          season: Database["public"]["Enums"]["bucket_season"]
          sort_order: number
          title: string
          updated_at: string
          user_id: string
          year: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_shared?: boolean
          season?: Database["public"]["Enums"]["bucket_season"]
          sort_order?: number
          title: string
          updated_at?: string
          user_id: string
          year?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_shared?: boolean
          season?: Database["public"]["Enums"]["bucket_season"]
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
          year?: number | null
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
      care_profile: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          mvp_items: Json
          pillars_enabled: Json
          pillars_order: Json
          season: string | null
          top_n: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          mvp_items?: Json
          pillars_enabled?: Json
          pillars_order?: Json
          season?: string | null
          top_n?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          mvp_items?: Json
          pillars_enabled?: Json
          pillars_order?: Json
          season?: string | null
          top_n?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          cycle: Json
          diagnoses: string[]
          diagnosis_notes: string | null
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
          sex: string | null
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
          cycle?: Json
          diagnoses?: string[]
          diagnosis_notes?: string | null
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
          sex?: string | null
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
          cycle?: Json
          diagnoses?: string[]
          diagnosis_notes?: string | null
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
          sex?: string | null
          ssn_full?: string | null
          ssn_last4?: string | null
          updated_at?: string
          user_id?: string
          zodiac?: string | null
        }
        Relationships: []
      }
      caregiver_checkins: {
        Row: {
          created_at: string
          date: string
          energy: number | null
          food: boolean
          id: string
          meds: boolean
          mood: string | null
          movement: boolean
          outside: boolean
          sleep_hours: number | null
          updated_at: string
          user_id: string
          water: boolean
        }
        Insert: {
          created_at?: string
          date: string
          energy?: number | null
          food?: boolean
          id?: string
          meds?: boolean
          mood?: string | null
          movement?: boolean
          outside?: boolean
          sleep_hours?: number | null
          updated_at?: string
          user_id: string
          water?: boolean
        }
        Update: {
          created_at?: string
          date?: string
          energy?: number | null
          food?: boolean
          id?: string
          meds?: boolean
          mood?: string | null
          movement?: boolean
          outside?: boolean
          sleep_hours?: number | null
          updated_at?: string
          user_id?: string
          water?: boolean
        }
        Relationships: []
      }
      caregiving_chores: {
        Row: {
          area: string | null
          assigned_to: string | null
          cadence: string | null
          created_at: string
          done: boolean
          est_minutes: number | null
          id: string
          last_done_at: string | null
          linked_task_id: string | null
          notes: string | null
          recipient_id: string | null
          title: string
          updated_at: string
          user_id: string
          zone: string | null
        }
        Insert: {
          area?: string | null
          assigned_to?: string | null
          cadence?: string | null
          created_at?: string
          done?: boolean
          est_minutes?: number | null
          id?: string
          last_done_at?: string | null
          linked_task_id?: string | null
          notes?: string | null
          recipient_id?: string | null
          title: string
          updated_at?: string
          user_id: string
          zone?: string | null
        }
        Update: {
          area?: string | null
          assigned_to?: string | null
          cadence?: string | null
          created_at?: string
          done?: boolean
          est_minutes?: number | null
          id?: string
          last_done_at?: string | null
          linked_task_id?: string | null
          notes?: string | null
          recipient_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          zone?: string | null
        }
        Relationships: []
      }
      celebration_tasks: {
        Row: {
          category: Database["public"]["Enums"]["celebration_task_category"]
          celebration_id: string
          created_at: string
          done: boolean
          due_offset_days: number | null
          id: string
          linked_task_id: string | null
          sort_order: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["celebration_task_category"]
          celebration_id: string
          created_at?: string
          done?: boolean
          due_offset_days?: number | null
          id?: string
          linked_task_id?: string | null
          sort_order?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["celebration_task_category"]
          celebration_id?: string
          created_at?: string
          done?: boolean
          due_offset_days?: number | null
          id?: string
          linked_task_id?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "celebration_tasks_celebration_id_fkey"
            columns: ["celebration_id"]
            isOneToOne: false
            referencedRelation: "celebrations"
            referencedColumns: ["id"]
          },
        ]
      }
      celebrations: {
        Row: {
          budget_cents: number | null
          color: string | null
          cover_url: string | null
          created_at: string
          date: string
          end_date: string | null
          icon: string | null
          id: string
          kind: Database["public"]["Enums"]["celebration_kind"]
          linked_money_category: string | null
          notes: string | null
          parent_celebration_id: string | null
          person_age_anchor: number | null
          recipient_id: string | null
          recurs_yearly: boolean
          spent_cents: number | null
          status: Database["public"]["Enums"]["celebration_status"]
          theme: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_cents?: number | null
          color?: string | null
          cover_url?: string | null
          created_at?: string
          date: string
          end_date?: string | null
          icon?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["celebration_kind"]
          linked_money_category?: string | null
          notes?: string | null
          parent_celebration_id?: string | null
          person_age_anchor?: number | null
          recipient_id?: string | null
          recurs_yearly?: boolean
          spent_cents?: number | null
          status?: Database["public"]["Enums"]["celebration_status"]
          theme?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_cents?: number | null
          color?: string | null
          cover_url?: string | null
          created_at?: string
          date?: string
          end_date?: string | null
          icon?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["celebration_kind"]
          linked_money_category?: string | null
          notes?: string | null
          parent_celebration_id?: string | null
          person_age_anchor?: number | null
          recipient_id?: string | null
          recurs_yearly?: boolean
          spent_cents?: number | null
          status?: Database["public"]["Enums"]["celebration_status"]
          theme?: string | null
          title?: string
          updated_at?: string
          user_id?: string
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
      cosmic_birth_chart: {
        Row: {
          birth_date: string
          birth_lat: number | null
          birth_lng: number | null
          birth_place: string | null
          birth_time: string | null
          birth_tz: string | null
          chart_settings: Json
          created_at: string
          house_system: string
          natal_json: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          birth_date: string
          birth_lat?: number | null
          birth_lng?: number | null
          birth_place?: string | null
          birth_time?: string | null
          birth_tz?: string | null
          chart_settings?: Json
          created_at?: string
          house_system?: string
          natal_json?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          birth_date?: string
          birth_lat?: number | null
          birth_lng?: number | null
          birth_place?: string | null
          birth_time?: string | null
          birth_tz?: string | null
          chart_settings?: Json
          created_at?: string
          house_system?: string
          natal_json?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cosmic_chapters: {
        Row: {
          chapter_theme: string
          characters: Json
          created_at: string
          generated_at: string
          id: string
          lessons: Json
          practices: Json
          reflection_prompt: string | null
          source_signals: Json | null
          summary: string
          updated_at: string
          user_id: string
          valid_from: string
          valid_to: string
        }
        Insert: {
          chapter_theme: string
          characters?: Json
          created_at?: string
          generated_at?: string
          id?: string
          lessons?: Json
          practices?: Json
          reflection_prompt?: string | null
          source_signals?: Json | null
          summary: string
          updated_at?: string
          user_id: string
          valid_from: string
          valid_to: string
        }
        Update: {
          chapter_theme?: string
          characters?: Json
          created_at?: string
          generated_at?: string
          id?: string
          lessons?: Json
          practices?: Json
          reflection_prompt?: string | null
          source_signals?: Json | null
          summary?: string
          updated_at?: string
          user_id?: string
          valid_from?: string
          valid_to?: string
        }
        Relationships: []
      }
      cosmic_chart_cache: {
        Row: {
          birth_hash: string
          chart: Json
          computed_at: string
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          birth_hash: string
          chart: Json
          computed_at?: string
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          birth_hash?: string
          chart?: Json
          computed_at?: string
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cosmic_daily_guidance: {
        Row: {
          body: string
          created_at: string
          gentle_reminder: string | null
          guidance_date: string
          headline: string
          id: string
          journal_prompt: string | null
          mood_tags: string[]
          source_signals: Json | null
          suggested_actions: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          gentle_reminder?: string | null
          guidance_date: string
          headline: string
          id?: string
          journal_prompt?: string | null
          mood_tags?: string[]
          source_signals?: Json | null
          suggested_actions?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          gentle_reminder?: string | null
          guidance_date?: string
          headline?: string
          id?: string
          journal_prompt?: string | null
          mood_tags?: string[]
          source_signals?: Json | null
          suggested_actions?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cosmic_event_saves: {
        Row: {
          created_at: string
          event_date: string
          event_id: string
          event_kind: string
          id: string
          payload: Json | null
          reminder_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_date: string
          event_id: string
          event_kind: string
          id?: string
          payload?: Json | null
          reminder_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_date?: string
          event_id?: string
          event_kind?: string
          id?: string
          payload?: Json | null
          reminder_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cosmic_journal_entries: {
        Row: {
          created_at: string
          event_date: string | null
          event_id: string | null
          event_kind: string | null
          id: string
          journal_entry_id: string | null
          phase: string | null
          planet: string | null
          sign: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_date?: string | null
          event_id?: string | null
          event_kind?: string | null
          id?: string
          journal_entry_id?: string | null
          phase?: string | null
          planet?: string | null
          sign?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_date?: string | null
          event_id?: string | null
          event_kind?: string | null
          id?: string
          journal_entry_id?: string | null
          phase?: string | null
          planet?: string | null
          sign?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cosmic_journal_entries_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      cosmic_journal_themes: {
        Row: {
          breakthroughs: Json
          created_at: string
          entry_count: number
          id: string
          patterns: Json
          period_end: string
          period_start: string
          reflection_prompt: string | null
          themes: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          breakthroughs?: Json
          created_at?: string
          entry_count?: number
          id?: string
          patterns?: Json
          period_end: string
          period_start: string
          reflection_prompt?: string | null
          themes?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          breakthroughs?: Json
          created_at?: string
          entry_count?: number
          id?: string
          patterns?: Json
          period_end?: string
          period_start?: string
          reflection_prompt?: string | null
          themes?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cosmic_settings: {
        Row: {
          atmosphere: string | null
          created_at: string
          enabled_event_kinds: string[]
          show_in_calendar: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          atmosphere?: string | null
          created_at?: string
          enabled_event_kinds?: string[]
          show_in_calendar?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          atmosphere?: string | null
          created_at?: string
          enabled_event_kinds?: string[]
          show_in_calendar?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cosmic_transit_interpretations: {
        Row: {
          careflow: Json | null
          created_at: string
          emotional: string | null
          event_id: string
          growth: string | null
          id: string
          meaning: string | null
          practical: string | null
          technical: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          careflow?: Json | null
          created_at?: string
          emotional?: string | null
          event_id: string
          growth?: string | null
          id?: string
          meaning?: string | null
          practical?: string | null
          technical?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          careflow?: Json | null
          created_at?: string
          emotional?: string | null
          event_id?: string
          growth?: string | null
          id?: string
          meaning?: string | null
          practical?: string | null
          technical?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      dinner_poll_candidates: {
        Row: {
          created_at: string
          custom_title: string | null
          day_date: string
          id: string
          meal_id: string | null
          notes: string | null
          poll_id: string
          position: number
          slot: string
        }
        Insert: {
          created_at?: string
          custom_title?: string | null
          day_date: string
          id?: string
          meal_id?: string | null
          notes?: string | null
          poll_id: string
          position?: number
          slot?: string
        }
        Update: {
          created_at?: string
          custom_title?: string | null
          day_date?: string
          id?: string
          meal_id?: string | null
          notes?: string | null
          poll_id?: string
          position?: number
          slot?: string
        }
        Relationships: [
          {
            foreignKeyName: "dinner_poll_candidates_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "dinner_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      dinner_poll_responses: {
        Row: {
          candidate_id: string | null
          created_at: string
          custom_title: string | null
          day_date: string
          id: string
          kind: string
          meal_id: string | null
          note: string | null
          poll_id: string
          user_id: string
        }
        Insert: {
          candidate_id?: string | null
          created_at?: string
          custom_title?: string | null
          day_date: string
          id?: string
          kind?: string
          meal_id?: string | null
          note?: string | null
          poll_id: string
          user_id: string
        }
        Update: {
          candidate_id?: string | null
          created_at?: string
          custom_title?: string | null
          day_date?: string
          id?: string
          kind?: string
          meal_id?: string | null
          note?: string | null
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dinner_poll_responses_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "dinner_poll_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dinner_poll_responses_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "dinner_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      dinner_polls: {
        Row: {
          created_at: string
          created_by: string
          household_id: string
          id: string
          notes: string | null
          status: string
          title: string | null
          updated_at: string
          week_start: string
        }
        Insert: {
          created_at?: string
          created_by: string
          household_id: string
          id?: string
          notes?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          week_start: string
        }
        Update: {
          created_at?: string
          created_by?: string
          household_id?: string
          id?: string
          notes?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "dinner_polls_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
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
      goal_contributions: {
        Row: {
          amount: number
          created_at: string
          date: string
          goal_id: string
          id: string
          linked_transaction_id: string | null
          note: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          date?: string
          goal_id: string
          id?: string
          linked_transaction_id?: string | null
          note?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          goal_id?: string
          id?: string
          linked_transaction_id?: string | null
          note?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "savings_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          anchor_key: string | null
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
          anchor_key?: string | null
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
          anchor_key?: string | null
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
      google_calendar_sync_state: {
        Row: {
          calendar_id: string
          created_at: string
          id: string
          last_pulled_at: string | null
          sync_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_id: string
          created_at?: string
          id?: string
          last_pulled_at?: string | null
          sync_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_id?: string
          created_at?: string
          id?: string
          last_pulled_at?: string | null
          sync_token?: string | null
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
          write_calendar_id: string
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
          write_calendar_id?: string
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
          write_calendar_id?: string
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
          tags: string[]
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
          tags?: string[]
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
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      grocery_list_activity: {
        Row: {
          action: string
          created_at: string
          id: string
          item_name: string | null
          list_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          item_name?: string | null
          list_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          item_name?: string | null
          list_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grocery_list_activity_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "grocery_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_lists: {
        Row: {
          created_at: string
          household_id: string | null
          id: string
          items: Json
          name: string
          updated_at: string
          user_id: string
          week_start: string | null
        }
        Insert: {
          created_at?: string
          household_id?: string | null
          id?: string
          items?: Json
          name: string
          updated_at?: string
          user_id: string
          week_start?: string | null
        }
        Update: {
          created_at?: string
          household_id?: string | null
          id?: string
          items?: Json
          name?: string
          updated_at?: string
          user_id?: string
          week_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grocery_lists_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_prefs: {
        Row: {
          backup_store: string | null
          created_at: string
          delivery_mode: string
          preferred_store: string
          updated_at: string
          user_id: string
        }
        Insert: {
          backup_store?: string | null
          created_at?: string
          delivery_mode?: string
          preferred_store?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          backup_store?: string | null
          created_at?: string
          delivery_mode?: string
          preferred_store?: string
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
          anchor_key: string | null
          cadence: string
          category: string
          created_at: string
          id: string
          meta: Json
          streak: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          anchor_key?: string | null
          cadence?: string
          category?: string
          created_at?: string
          id?: string
          meta?: Json
          streak?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          anchor_key?: string | null
          cadence?: string
          category?: string
          created_at?: string
          id?: string
          meta?: Json
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
          intention: string | null
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
          intention?: string | null
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
          intention?: string | null
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
      holiday_plans: {
        Row: {
          budget_cents: number | null
          category: Database["public"]["Enums"]["holiday_plan_category"]
          color: string | null
          created_at: string
          custom_date: string | null
          custom_name: string | null
          holiday_id: string | null
          icon: string | null
          id: string
          notes: string | null
          spent_cents: number | null
          status: Database["public"]["Enums"]["celebration_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_cents?: number | null
          category?: Database["public"]["Enums"]["holiday_plan_category"]
          color?: string | null
          created_at?: string
          custom_date?: string | null
          custom_name?: string | null
          holiday_id?: string | null
          icon?: string | null
          id?: string
          notes?: string | null
          spent_cents?: number | null
          status?: Database["public"]["Enums"]["celebration_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_cents?: number | null
          category?: Database["public"]["Enums"]["holiday_plan_category"]
          color?: string | null
          created_at?: string
          custom_date?: string | null
          custom_name?: string | null
          holiday_id?: string | null
          icon?: string | null
          id?: string
          notes?: string | null
          spent_cents?: number | null
          status?: Database["public"]["Enums"]["celebration_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holiday_plans_holiday_id_fkey"
            columns: ["holiday_id"]
            isOneToOne: false
            referencedRelation: "holidays"
            referencedColumns: ["id"]
          },
        ]
      }
      holiday_timeline_steps: {
        Row: {
          created_at: string
          days_before: number
          done: boolean
          holiday_plan_id: string
          id: string
          notes: string | null
          sort_order: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days_before: number
          done?: boolean
          holiday_plan_id: string
          id?: string
          notes?: string | null
          sort_order?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          days_before?: number
          done?: boolean
          holiday_plan_id?: string
          id?: string
          notes?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holiday_timeline_steps_holiday_plan_id_fkey"
            columns: ["holiday_plan_id"]
            isOneToOne: false
            referencedRelation: "holiday_plans"
            referencedColumns: ["id"]
          },
        ]
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
          attachments: Json
          body: string | null
          cover_url: string | null
          created_at: string
          id: string
          pinned: boolean
          sort_order: number
          tags: string[]
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: Json
          body?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          pinned?: boolean
          sort_order?: number
          tags?: string[]
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attachments?: Json
          body?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          pinned?: boolean
          sort_order?: number
          tags?: string[]
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      home_rhythm_assignments: {
        Row: {
          created_at: string
          date: string
          done: boolean
          id: string
          notes: string | null
          slot: string
          sort_order: number
          source_id: string | null
          source_type: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          done?: boolean
          id?: string
          notes?: string | null
          slot: string
          sort_order?: number
          source_id?: string | null
          source_type: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          done?: boolean
          id?: string
          notes?: string | null
          slot?: string
          sort_order?: number
          source_id?: string | null
          source_type?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      household_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          household_id: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["household_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          household_id: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["household_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          household_id?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["household_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_invites_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
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
      household_users: {
        Row: {
          color: string | null
          display_name: string | null
          household_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["household_role"]
          user_id: string
        }
        Insert: {
          color?: string | null
          display_name?: string | null
          household_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["household_role"]
          user_id: string
        }
        Update: {
          color?: string | null
          display_name?: string | null
          household_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["household_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_users_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
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
          anchor_key: string | null
          attachments: Json
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
          anchor_key?: string | null
          attachments?: Json
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
          anchor_key?: string | null
          attachments?: Json
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
      lifetime_purchases: {
        Row: {
          created_at: string | null
          environment: string
          id: string
          paddle_customer_id: string | null
          paddle_transaction_id: string
          price_id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          environment?: string
          id?: string
          paddle_customer_id?: string | null
          paddle_transaction_id: string
          price_id: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          environment?: string
          id?: string
          paddle_customer_id?: string | null
          paddle_transaction_id?: string
          price_id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: []
      }
      loved_ones: {
        Row: {
          avatar_emoji: string | null
          avatar_url: string | null
          birth_date: string | null
          color: string | null
          created_at: string
          id: string
          kind: string
          name: string
          notes: string | null
          relation: string | null
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_emoji?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          color?: string | null
          created_at?: string
          id?: string
          kind?: string
          name: string
          notes?: string | null
          relation?: string | null
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_emoji?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          color?: string | null
          created_at?: string
          id?: string
          kind?: string
          name?: string
          notes?: string | null
          relation?: string | null
          sort_order?: number
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
          anchor_key: string | null
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
          anchor_key?: string | null
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
          anchor_key?: string | null
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
      memories: {
        Row: {
          atmosphere: string | null
          attachments: Json
          beautiful_note: string | null
          calendar_event_id: string | null
          challenging_note: string | null
          chapter: string | null
          cover_index: number
          created_at: string
          date: string
          description: string | null
          id: string
          is_favorite: boolean
          is_pinned: boolean
          journal_entry_id: string | null
          location: string | null
          loved_one_ids: string[]
          meaningful_note: string | null
          memory_type: string
          mood: string | null
          moon_phase: string | null
          privacy: string
          project_id: string | null
          recipient_ids: string[]
          reflection: string | null
          remember_note: string | null
          routine_id: string | null
          season: string | null
          shared_loved_one_ids: string[]
          tags: string[]
          time: string | null
          title: string
          updated_at: string
          user_id: string
          voice_note_path: string | null
        }
        Insert: {
          atmosphere?: string | null
          attachments?: Json
          beautiful_note?: string | null
          calendar_event_id?: string | null
          challenging_note?: string | null
          chapter?: string | null
          cover_index?: number
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          is_favorite?: boolean
          is_pinned?: boolean
          journal_entry_id?: string | null
          location?: string | null
          loved_one_ids?: string[]
          meaningful_note?: string | null
          memory_type?: string
          mood?: string | null
          moon_phase?: string | null
          privacy?: string
          project_id?: string | null
          recipient_ids?: string[]
          reflection?: string | null
          remember_note?: string | null
          routine_id?: string | null
          season?: string | null
          shared_loved_one_ids?: string[]
          tags?: string[]
          time?: string | null
          title: string
          updated_at?: string
          user_id: string
          voice_note_path?: string | null
        }
        Update: {
          atmosphere?: string | null
          attachments?: Json
          beautiful_note?: string | null
          calendar_event_id?: string | null
          challenging_note?: string | null
          chapter?: string | null
          cover_index?: number
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          is_favorite?: boolean
          is_pinned?: boolean
          journal_entry_id?: string | null
          location?: string | null
          loved_one_ids?: string[]
          meaningful_note?: string | null
          memory_type?: string
          mood?: string | null
          moon_phase?: string | null
          privacy?: string
          project_id?: string | null
          recipient_ids?: string[]
          reflection?: string | null
          remember_note?: string | null
          routine_id?: string | null
          season?: string | null
          shared_loved_one_ids?: string[]
          tags?: string[]
          time?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          voice_note_path?: string | null
        }
        Relationships: []
      }
      memory_book_entries: {
        Row: {
          body: string | null
          cover_url: string | null
          created_at: string
          date: string
          group_key: string
          group_type: Database["public"]["Enums"]["memory_group_type"]
          id: string
          linked_celebration_id: string | null
          linked_holiday_id: string | null
          linked_memory_id: string | null
          media: Json
          mood: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          cover_url?: string | null
          created_at?: string
          date?: string
          group_key: string
          group_type?: Database["public"]["Enums"]["memory_group_type"]
          id?: string
          linked_celebration_id?: string | null
          linked_holiday_id?: string | null
          linked_memory_id?: string | null
          media?: Json
          mood?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          cover_url?: string | null
          created_at?: string
          date?: string
          group_key?: string
          group_type?: Database["public"]["Enums"]["memory_group_type"]
          id?: string
          linked_celebration_id?: string | null
          linked_holiday_id?: string | null
          linked_memory_id?: string | null
          media?: Json
          mood?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_book_entries_linked_celebration_id_fkey"
            columns: ["linked_celebration_id"]
            isOneToOne: false
            referencedRelation: "celebrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_book_entries_linked_holiday_id_fkey"
            columns: ["linked_holiday_id"]
            isOneToOne: false
            referencedRelation: "holidays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_book_entries_linked_memory_id_fkey"
            columns: ["linked_memory_id"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
        ]
      }
      mental_health_logs: {
        Row: {
          anxiety: number | null
          created_at: string
          date: string
          emotions: string[] | null
          focus: number | null
          gratitude: string | null
          id: string
          intention: string | null
          mood_score: number | null
          mood_word: string | null
          notes: string | null
          sensory_load: number | null
          support_needed: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          anxiety?: number | null
          created_at?: string
          date?: string
          emotions?: string[] | null
          focus?: number | null
          gratitude?: string | null
          id?: string
          intention?: string | null
          mood_score?: number | null
          mood_word?: string | null
          notes?: string | null
          sensory_load?: number | null
          support_needed?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          anxiety?: number | null
          created_at?: string
          date?: string
          emotions?: string[] | null
          focus?: number | null
          gratitude?: string | null
          id?: string
          intention?: string | null
          mood_score?: number | null
          mood_word?: string | null
          notes?: string | null
          sensory_load?: number | null
          support_needed?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mental_load_checkins: {
        Row: {
          caregiving: number
          created_at: string
          date: string
          emotional: number
          energy: number
          id: string
          minimum_mode: boolean
          note: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          caregiving?: number
          created_at?: string
          date?: string
          emotional?: number
          energy?: number
          id?: string
          minimum_mode?: boolean
          note?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          caregiving?: number
          created_at?: string
          date?: string
          emotional?: number
          energy?: number
          id?: string
          minimum_mode?: boolean
          note?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      minimum_viable_day: {
        Row: {
          created_at: string
          id: string
          items: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: string[]
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
      monthly_plans: {
        Row: {
          activities: Json
          ai_generated_at: string | null
          created_at: string
          cycle_notes: string | null
          cycle_phase_items: Json
          id: string
          intention: string | null
          month: string
          moon_notes: string | null
          moon_phase_items: Json
          outings: Json
          priorities: Json
          season: string | null
          season_notes: string | null
          theme: string | null
          updated_at: string
          user_id: string
          word: string | null
        }
        Insert: {
          activities?: Json
          ai_generated_at?: string | null
          created_at?: string
          cycle_notes?: string | null
          cycle_phase_items?: Json
          id?: string
          intention?: string | null
          month: string
          moon_notes?: string | null
          moon_phase_items?: Json
          outings?: Json
          priorities?: Json
          season?: string | null
          season_notes?: string | null
          theme?: string | null
          updated_at?: string
          user_id: string
          word?: string | null
        }
        Update: {
          activities?: Json
          ai_generated_at?: string | null
          created_at?: string
          cycle_notes?: string | null
          cycle_phase_items?: Json
          id?: string
          intention?: string | null
          month?: string
          moon_notes?: string | null
          moon_phase_items?: Json
          outings?: Json
          priorities?: Json
          season?: string | null
          season_notes?: string | null
          theme?: string | null
          updated_at?: string
          user_id?: string
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
      moon_journal_entries: {
        Row: {
          body: string
          created_at: string
          cycle_phase: string | null
          date: string
          energy: string | null
          gratitude: Json
          id: string
          intentions: Json
          mood: string | null
          moon_phase: string
          prompts: Json
          releases: Json
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          cycle_phase?: string | null
          date?: string
          energy?: string | null
          gratitude?: Json
          id?: string
          intentions?: Json
          mood?: string | null
          moon_phase: string
          prompts?: Json
          releases?: Json
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          cycle_phase?: string | null
          date?: string
          energy?: string | null
          gratitude?: Json
          id?: string
          intentions?: Json
          mood?: string | null
          moon_phase?: string
          prompts?: Json
          releases?: Json
          title?: string | null
          updated_at?: string
          user_id?: string
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
          anchor_key: string | null
          archived: boolean
          body: string
          cover_gradient: string | null
          cover_position: number | null
          cover_url: string | null
          created_at: string
          date: string | null
          icon: string | null
          id: string
          kind: string
          pinned: boolean
          project_id: string | null
          tags: string[]
          title: string
          updated_at: string
          user_id: string
          word_goal: number | null
        }
        Insert: {
          anchor_key?: string | null
          archived?: boolean
          body?: string
          cover_gradient?: string | null
          cover_position?: number | null
          cover_url?: string | null
          created_at?: string
          date?: string | null
          icon?: string | null
          id?: string
          kind?: string
          pinned?: boolean
          project_id?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id: string
          word_goal?: number | null
        }
        Update: {
          anchor_key?: string | null
          archived?: boolean
          body?: string
          cover_gradient?: string | null
          cover_position?: number | null
          cover_url?: string | null
          created_at?: string
          date?: string | null
          icon?: string | null
          id?: string
          kind?: string
          pinned?: boolean
          project_id?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
          word_goal?: number | null
        }
        Relationships: []
      }
      pantry_items: {
        Row: {
          category: string | null
          created_at: string
          id: string
          in_stock: boolean
          last_restocked_at: string | null
          location: string
          name: string
          notes: string | null
          price: number | null
          qty: string | null
          restock_cadence: string
          sort_order: number
          stock_status: string
          store_pref: string | null
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          in_stock?: boolean
          last_restocked_at?: string | null
          location?: string
          name: string
          notes?: string | null
          price?: number | null
          qty?: string | null
          restock_cadence?: string
          sort_order?: number
          stock_status?: string
          store_pref?: string | null
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          in_stock?: boolean
          last_restocked_at?: string | null
          location?: string
          name?: string
          notes?: string | null
          price?: number | null
          qty?: string | null
          restock_cadence?: string
          sort_order?: number
          stock_status?: string
          store_pref?: string | null
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payee_beneficiaries: {
        Row: {
          benefit_type: string
          claim_number_last4: string | null
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          monthly_benefit_amount: number
          notes: string | null
          recipient_id: string | null
          relationship: string | null
          sort_order: number
          started_payee_on: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          benefit_type?: string
          claim_number_last4?: string | null
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          monthly_benefit_amount?: number
          notes?: string | null
          recipient_id?: string | null
          relationship?: string | null
          sort_order?: number
          started_payee_on?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          benefit_type?: string
          claim_number_last4?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          monthly_benefit_amount?: number
          notes?: string | null
          recipient_id?: string | null
          relationship?: string | null
          sort_order?: number
          started_payee_on?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payee_conserved_funds: {
        Row: {
          account_label: string | null
          amount: number
          beneficiary_id: string
          created_at: string
          date: string
          id: string
          note: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_label?: string | null
          amount?: number
          beneficiary_id: string
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_label?: string | null
          amount?: number
          beneficiary_id?: string
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payee_conserved_funds_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "payee_beneficiaries"
            referencedColumns: ["id"]
          },
        ]
      }
      payee_expenses: {
        Row: {
          amount: number
          beneficiary_id: string
          category: string
          created_at: string
          date: string
          id: string
          note: string | null
          payment_method: string | null
          receipt_url: string | null
          subcategory: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          beneficiary_id: string
          category?: string
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          subcategory?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          beneficiary_id?: string
          category?: string
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          subcategory?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payee_expenses_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "payee_beneficiaries"
            referencedColumns: ["id"]
          },
        ]
      }
      payee_income: {
        Row: {
          amount: number
          beneficiary_id: string
          created_at: string
          date: string
          id: string
          note: string | null
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          beneficiary_id: string
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          beneficiary_id?: string
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payee_income_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "payee_beneficiaries"
            referencedColumns: ["id"]
          },
        ]
      }
      period_reviews: {
        Row: {
          checklist: Json
          content: Json | null
          created_at: string
          id: string
          intentions: string[]
          kind: string
          period: string
          period_start: string
          reflection: string | null
          releases: string[]
          updated_at: string
          user_id: string
          wins: string[]
        }
        Insert: {
          checklist?: Json
          content?: Json | null
          created_at?: string
          id?: string
          intentions?: string[]
          kind?: string
          period: string
          period_start: string
          reflection?: string | null
          releases?: string[]
          updated_at?: string
          user_id: string
          wins?: string[]
        }
        Update: {
          checklist?: Json
          content?: Json | null
          created_at?: string
          id?: string
          intentions?: string[]
          kind?: string
          period?: string
          period_start?: string
          reflection?: string | null
          releases?: string[]
          updated_at?: string
          user_id?: string
          wins?: string[]
        }
        Relationships: []
      }
      person_checkin_responses: {
        Row: {
          checkin_id: string
          created_at: string
          cycle_phase: string | null
          energy: number | null
          id: string
          mood: number | null
          notes: string | null
          recipient_id: string
          responded_at: string
          tags: string[]
          user_id: string
        }
        Insert: {
          checkin_id: string
          created_at?: string
          cycle_phase?: string | null
          energy?: number | null
          id?: string
          mood?: number | null
          notes?: string | null
          recipient_id: string
          responded_at?: string
          tags?: string[]
          user_id: string
        }
        Update: {
          checkin_id?: string
          created_at?: string
          cycle_phase?: string | null
          energy?: number | null
          id?: string
          mood?: number | null
          notes?: string | null
          recipient_id?: string
          responded_at?: string
          tags?: string[]
          user_id?: string
        }
        Relationships: []
      }
      person_checkins: {
        Row: {
          active: boolean
          cadence: string
          cadence_config: Json
          created_at: string
          id: string
          last_completed_at: string | null
          next_due_at: string | null
          prompt: string | null
          recipient_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          cadence?: string
          cadence_config?: Json
          created_at?: string
          id?: string
          last_completed_at?: string | null
          next_due_at?: string | null
          prompt?: string | null
          recipient_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          cadence?: string
          cadence_config?: Json
          created_at?: string
          id?: string
          last_completed_at?: string | null
          next_due_at?: string | null
          prompt?: string | null
          recipient_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      person_overviews: {
        Row: {
          generated_at: string
          id: string
          payload: Json
          recipient_id: string
          signature: string
          user_id: string
        }
        Insert: {
          generated_at?: string
          id?: string
          payload?: Json
          recipient_id: string
          signature: string
          user_id: string
        }
        Update: {
          generated_at?: string
          id?: string
          payload?: Json
          recipient_id?: string
          signature?: string
          user_id?: string
        }
        Relationships: []
      }
      person_progress_entries: {
        Row: {
          category: string
          created_at: string
          id: string
          label: string
          notes: string | null
          recipient_id: string
          recorded_at: string
          updated_at: string
          user_id: string
          value_numeric: number | null
          value_text: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          label: string
          notes?: string | null
          recipient_id: string
          recorded_at?: string
          updated_at?: string
          user_id: string
          value_numeric?: number | null
          value_text?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          label?: string
          notes?: string | null
          recipient_id?: string
          recorded_at?: string
          updated_at?: string
          user_id?: string
          value_numeric?: number | null
          value_text?: string | null
        }
        Relationships: []
      }
      person_progress_goals: {
        Row: {
          category: string
          created_at: string
          current_value: number | null
          id: string
          notes: string | null
          recipient_id: string
          status: string
          target_date: string | null
          target_value: number | null
          title: string
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          current_value?: number | null
          id?: string
          notes?: string | null
          recipient_id: string
          status?: string
          target_date?: string | null
          target_value?: number | null
          title: string
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          current_value?: number | null
          id?: string
          notes?: string | null
          recipient_id?: string
          status?: string
          target_date?: string | null
          target_value?: number | null
          title?: string
          unit?: string | null
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
          current_household_id: string | null
          default_route: string
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
          current_household_id?: string | null
          default_route?: string
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
          current_household_id?: string | null
          default_route?: string
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
        Relationships: [
          {
            foreignKeyName: "profiles_current_household_id_fkey"
            columns: ["current_household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      project_ideas: {
        Row: {
          created_at: string
          id: string
          note: string | null
          project_id: string | null
          promoted_project_id: string | null
          source: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          project_id?: string | null
          promoted_project_id?: string | null
          source?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          project_id?: string | null
          promoted_project_id?: string | null
          source?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_ideas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_ideas_promoted_project_id_fkey"
            columns: ["promoted_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
          ai_overview: string | null
          ai_overview_updated_at: string | null
          archived_at: string | null
          area_id: string | null
          area_name: string | null
          atmosphere: string | null
          budget_cents: number | null
          color: string | null
          cover_url: string | null
          created_at: string
          deadline: string | null
          end_date: string | null
          focus_this_week: string | null
          health: string | null
          icon: string | null
          id: string
          is_favorite: boolean
          linked_goal_ids: string[]
          linked_habit_ids: string[]
          linked_savings_goal_ids: string[]
          linked_transaction_ids: string[]
          milestones: Json
          name: string
          notes: string | null
          parent_project_id: string | null
          sort_order: number
          stage: string | null
          start_date: string | null
          status: string
          target_date: string | null
          updated_at: string
          user_id: string
          waiting_on: string | null
        }
        Insert: {
          ai_overview?: string | null
          ai_overview_updated_at?: string | null
          archived_at?: string | null
          area_id?: string | null
          area_name?: string | null
          atmosphere?: string | null
          budget_cents?: number | null
          color?: string | null
          cover_url?: string | null
          created_at?: string
          deadline?: string | null
          end_date?: string | null
          focus_this_week?: string | null
          health?: string | null
          icon?: string | null
          id?: string
          is_favorite?: boolean
          linked_goal_ids?: string[]
          linked_habit_ids?: string[]
          linked_savings_goal_ids?: string[]
          linked_transaction_ids?: string[]
          milestones?: Json
          name: string
          notes?: string | null
          parent_project_id?: string | null
          sort_order?: number
          stage?: string | null
          start_date?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
          user_id: string
          waiting_on?: string | null
        }
        Update: {
          ai_overview?: string | null
          ai_overview_updated_at?: string | null
          archived_at?: string | null
          area_id?: string | null
          area_name?: string | null
          atmosphere?: string | null
          budget_cents?: number | null
          color?: string | null
          cover_url?: string | null
          created_at?: string
          deadline?: string | null
          end_date?: string | null
          focus_this_week?: string | null
          health?: string | null
          icon?: string | null
          id?: string
          is_favorite?: boolean
          linked_goal_ids?: string[]
          linked_habit_ids?: string[]
          linked_savings_goal_ids?: string[]
          linked_transaction_ids?: string[]
          milestones?: Json
          name?: string
          notes?: string | null
          parent_project_id?: string | null
          sort_order?: number
          stage?: string | null
          start_date?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
          user_id?: string
          waiting_on?: string | null
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
      quiz_results: {
        Row: {
          answers: Json
          archetype: string
          atmosphere: string
          created_at: string
          id: string
          identity: string | null
          planning_style: string
          taken_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          archetype: string
          atmosphere: string
          created_at?: string
          id?: string
          identity?: string | null
          planning_style: string
          taken_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          archetype?: string
          atmosphere?: string
          created_at?: string
          id?: string
          identity?: string | null
          planning_style?: string
          taken_at?: string
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
          last_paid_at: string | null
          linked_goal_id: string | null
          name: string
          next_due_date: string | null
          notes: string | null
          priority: string
          recurrence_interval: number
          status: string
          tags: string[]
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
          last_paid_at?: string | null
          linked_goal_id?: string | null
          name: string
          next_due_date?: string | null
          notes?: string | null
          priority?: string
          recurrence_interval?: number
          status?: string
          tags?: string[]
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
          last_paid_at?: string | null
          linked_goal_id?: string | null
          name?: string
          next_due_date?: string | null
          notes?: string | null
          priority?: string
          recurrence_interval?: number
          status?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      remembrances: {
        Row: {
          birth_date: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["remembrance_kind"]
          name: string
          photo_url: string | null
          remembrance_date: string | null
          show_prompts: boolean
          story: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["remembrance_kind"]
          name: string
          photo_url?: string | null
          remembrance_date?: string | null
          show_prompts?: boolean
          story?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["remembrance_kind"]
          name?: string
          photo_url?: string | null
          remembrance_date?: string | null
          show_prompts?: boolean
          story?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reset_checklists: {
        Row: {
          auto_reset: boolean
          created_at: string
          id: string
          is_template: boolean
          kind: string
          last_run_at: string | null
          name: string
          next_run_at: string | null
          recurrence_days: number[]
          recurrence_time: string | null
          recurrence_type: string
          sort_order: number
          updated_at: string
          user_id: string
          week_start: string | null
        }
        Insert: {
          auto_reset?: boolean
          created_at?: string
          id?: string
          is_template?: boolean
          kind?: string
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          recurrence_days?: number[]
          recurrence_time?: string | null
          recurrence_type?: string
          sort_order?: number
          updated_at?: string
          user_id: string
          week_start?: string | null
        }
        Update: {
          auto_reset?: boolean
          created_at?: string
          id?: string
          is_template?: boolean
          kind?: string
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          recurrence_days?: number[]
          recurrence_time?: string | null
          recurrence_type?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
          week_start?: string | null
        }
        Relationships: []
      }
      reset_history: {
        Row: {
          checklist_id: string | null
          completed_at: string
          created_at: string
          duration_seconds: number | null
          est_minutes: number | null
          id: string
          item_id: string | null
          kind: string | null
          title: string
          user_id: string
        }
        Insert: {
          checklist_id?: string | null
          completed_at?: string
          created_at?: string
          duration_seconds?: number | null
          est_minutes?: number | null
          id?: string
          item_id?: string | null
          kind?: string | null
          title: string
          user_id: string
        }
        Update: {
          checklist_id?: string | null
          completed_at?: string
          created_at?: string
          duration_seconds?: number | null
          est_minutes?: number | null
          id?: string
          item_id?: string | null
          kind?: string | null
          title?: string
          user_id?: string
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
      routine_completions: {
        Row: {
          completed_on: string
          created_at: string
          id: string
          item_id: string
          routine_id: string
          user_id: string
        }
        Insert: {
          completed_on?: string
          created_at?: string
          id?: string
          item_id: string
          routine_id: string
          user_id: string
        }
        Update: {
          completed_on?: string
          created_at?: string
          id?: string
          item_id?: string
          routine_id?: string
          user_id?: string
        }
        Relationships: []
      }
      routine_people: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      routines: {
        Row: {
          anchor_key: string | null
          cadence: string
          created_at: string
          id: string
          items: Json
          meta: Json
          notes: string | null
          person_name: string
          recipient_id: string | null
          slot: string
          tags: string[]
          time_of_day: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          anchor_key?: string | null
          cadence?: string
          created_at?: string
          id?: string
          items?: Json
          meta?: Json
          notes?: string | null
          person_name: string
          recipient_id?: string | null
          slot: string
          tags?: string[]
          time_of_day?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          anchor_key?: string | null
          cadence?: string
          created_at?: string
          id?: string
          items?: Json
          meta?: Json
          notes?: string | null
          person_name?: string
          recipient_id?: string | null
          slot?: string
          tags?: string[]
          time_of_day?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      savings_goals: {
        Row: {
          category_id: string | null
          color: string | null
          contribution_amount: number | null
          contribution_cadence: string | null
          created_at: string
          current_amount: number
          icon: string | null
          id: string
          name: string
          notes: string | null
          priority: string
          sort_order: number
          status: string
          target_amount: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          color?: string | null
          contribution_amount?: number | null
          contribution_cadence?: string | null
          created_at?: string
          current_amount?: number
          icon?: string | null
          id?: string
          name: string
          notes?: string | null
          priority?: string
          sort_order?: number
          status?: string
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          color?: string | null
          contribution_amount?: number | null
          contribution_cadence?: string | null
          created_at?: string
          current_amount?: number
          icon?: string | null
          id?: string
          name?: string
          notes?: string | null
          priority?: string
          sort_order?: number
          status?: string
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seasonal_goals: {
        Row: {
          created_at: string
          done: boolean
          id: string
          notes: string | null
          season: Database["public"]["Enums"]["bucket_season"]
          sort_order: number
          title: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          done?: boolean
          id?: string
          notes?: string | null
          season: Database["public"]["Enums"]["bucket_season"]
          sort_order?: number
          title: string
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          done?: boolean
          id?: string
          notes?: string | null
          season?: Database["public"]["Enums"]["bucket_season"]
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      sleep_logs: {
        Row: {
          bedtime: string | null
          created_at: string
          date: string
          dreams: string | null
          hours_slept: number | null
          id: string
          notes: string | null
          quality: number | null
          updated_at: string
          user_id: string
          wake_time: string | null
          wind_down: string[] | null
        }
        Insert: {
          bedtime?: string | null
          created_at?: string
          date?: string
          dreams?: string | null
          hours_slept?: number | null
          id?: string
          notes?: string | null
          quality?: number | null
          updated_at?: string
          user_id: string
          wake_time?: string | null
          wind_down?: string[] | null
        }
        Update: {
          bedtime?: string | null
          created_at?: string
          date?: string
          dreams?: string | null
          hours_slept?: number | null
          id?: string
          notes?: string | null
          quality?: number | null
          updated_at?: string
          user_id?: string
          wake_time?: string | null
          wind_down?: string[] | null
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
          last_charged_at: string | null
          name: string
          next_charge_date: string | null
          notes: string | null
          recurrence_interval: number
          status: string
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          cadence?: string
          category_id?: string | null
          created_at?: string
          id?: string
          last_charged_at?: string | null
          name: string
          next_charge_date?: string | null
          notes?: string | null
          recurrence_interval?: number
          status?: string
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          cadence?: string
          category_id?: string | null
          created_at?: string
          id?: string
          last_charged_at?: string | null
          name?: string
          next_charge_date?: string | null
          notes?: string | null
          recurrence_interval?: number
          status?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          pinned: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          pinned?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          pinned?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      task_templates: {
        Row: {
          created_at: string
          id: string
          kind: string
          name: string
          payload: Json
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          name: string
          payload?: Json
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          name?: string
          payload?: Json
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          anchor_key: string | null
          area: string
          attachments: Json
          auto_reset: boolean
          cosmic_tag: string | null
          cover_url: string | null
          created_at: string
          day_part: string | null
          done: boolean
          due_date: string | null
          end_date: string | null
          end_time: string | null
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
          person_tag: string | null
          priority: string
          project_id: string | null
          recipient_id: string | null
          recurrence_days: number[]
          recurrence_interval: number
          recurrence_type: string
          reset_item_id: string | null
          section_id: string | null
          snoozed_until: string | null
          sort_order: number
          start_date: string | null
          start_time: string | null
          status: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          anchor_key?: string | null
          area?: string
          attachments?: Json
          auto_reset?: boolean
          cosmic_tag?: string | null
          cover_url?: string | null
          created_at?: string
          day_part?: string | null
          done?: boolean
          due_date?: string | null
          end_date?: string | null
          end_time?: string | null
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
          person_tag?: string | null
          priority?: string
          project_id?: string | null
          recipient_id?: string | null
          recurrence_days?: number[]
          recurrence_interval?: number
          recurrence_type?: string
          reset_item_id?: string | null
          section_id?: string | null
          snoozed_until?: string | null
          sort_order?: number
          start_date?: string | null
          start_time?: string | null
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          anchor_key?: string | null
          area?: string
          attachments?: Json
          auto_reset?: boolean
          cosmic_tag?: string | null
          cover_url?: string | null
          created_at?: string
          day_part?: string | null
          done?: boolean
          due_date?: string | null
          end_date?: string | null
          end_time?: string | null
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
          person_tag?: string | null
          priority?: string
          project_id?: string | null
          recipient_id?: string | null
          recurrence_days?: number[]
          recurrence_interval?: number
          recurrence_type?: string
          reset_item_id?: string | null
          section_id?: string | null
          snoozed_until?: string | null
          sort_order?: number
          start_date?: string | null
          start_time?: string | null
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
      tradition_instances: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          item_state: Json
          notes: string | null
          started_at: string | null
          tradition_id: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          item_state?: Json
          notes?: string | null
          started_at?: string | null
          tradition_id: string
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          item_state?: Json
          notes?: string | null
          started_at?: string | null
          tradition_id?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "tradition_instances_tradition_id_fkey"
            columns: ["tradition_id"]
            isOneToOne: false
            referencedRelation: "traditions"
            referencedColumns: ["id"]
          },
        ]
      }
      tradition_items: {
        Row: {
          created_at: string
          id: string
          sort_order: number
          title: string
          tradition_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sort_order?: number
          title: string
          tradition_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          tradition_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tradition_items_tradition_id_fkey"
            columns: ["tradition_id"]
            isOneToOne: false
            referencedRelation: "traditions"
            referencedColumns: ["id"]
          },
        ]
      }
      traditions: {
        Row: {
          active: boolean
          anchor: Database["public"]["Enums"]["tradition_anchor"]
          anchor_date: string | null
          category: string | null
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          recurs_yearly: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          anchor?: Database["public"]["Enums"]["tradition_anchor"]
          anchor_date?: string | null
          category?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          recurs_yearly?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          anchor?: Database["public"]["Enums"]["tradition_anchor"]
          anchor_date?: string | null
          category?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          recurs_yearly?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          linked_bill_id: string | null
          linked_goal_id: string | null
          linked_subscription_id: string | null
          note: string | null
          status: string
          tags: string[]
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
          linked_bill_id?: string | null
          linked_goal_id?: string | null
          linked_subscription_id?: string | null
          note?: string | null
          status?: string
          tags?: string[]
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
          linked_bill_id?: string | null
          linked_goal_id?: string | null
          linked_subscription_id?: string | null
          note?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trip_itinerary_items: {
        Row: {
          address: string | null
          category: string
          cost: number | null
          created_at: string
          day_date: string | null
          end_time: string | null
          id: string
          lat: number | null
          lng: number | null
          notes: string | null
          place_id: string | null
          place_name: string | null
          sort_order: number
          start_time: string | null
          title: string
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          category?: string
          cost?: number | null
          created_at?: string
          day_date?: string | null
          end_time?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          place_id?: string | null
          place_name?: string | null
          sort_order?: number
          start_time?: string | null
          title: string
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          category?: string
          cost?: number | null
          created_at?: string
          day_date?: string | null
          end_time?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          place_id?: string | null
          place_name?: string | null
          sort_order?: number
          start_time?: string | null
          title?: string
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_itinerary_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_packing_items: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          packed: boolean
          quantity: number
          sort_order: number
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          name: string
          packed?: boolean
          quantity?: number
          sort_order?: number
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          packed?: boolean
          quantity?: number
          sort_order?: number
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_packing_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_places: {
        Row: {
          added_to_itinerary: boolean
          address: string | null
          category: string
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          name: string
          notes: string | null
          photo_url: string | null
          place_id: string | null
          rating: number | null
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          added_to_itinerary?: boolean
          address?: string | null
          category?: string
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          notes?: string | null
          photo_url?: string | null
          place_id?: string | null
          rating?: number | null
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          added_to_itinerary?: boolean
          address?: string | null
          category?: string
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          notes?: string | null
          photo_url?: string | null
          place_id?: string | null
          rating?: number | null
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_places_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          cover_image_url: string | null
          created_at: string
          destination: string | null
          end_date: string | null
          id: string
          notes: string | null
          start_date: string | null
          status: string
          title: string
          travelers: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          destination?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          start_date?: string | null
          status?: string
          title: string
          travelers?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          destination?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          start_date?: string | null
          status?: string
          title?: string
          travelers?: string[]
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waitlist_signups: {
        Row: {
          archetype: string | null
          created_at: string
          email: string
          id: string
          name: string
          quiz_score: Json | null
          reason: string | null
          source: string | null
        }
        Insert: {
          archetype?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          quiz_score?: Json | null
          reason?: string | null
          source?: string | null
        }
        Update: {
          archetype?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          quiz_score?: Json | null
          reason?: string | null
          source?: string | null
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
      wellness_rituals: {
        Row: {
          amount: number | null
          created_at: string
          date: string
          duration_minutes: number | null
          id: string
          notes: string | null
          ritual_type: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          date?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          ritual_type: string
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          date?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          ritual_type?: string
          user_id?: string
        }
        Relationships: []
      }
      whiteboards: {
        Row: {
          created_at: string
          data: Json
          description: string | null
          id: string
          project_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          description?: string | null
          id?: string
          project_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          description?: string | null
          id?: string
          project_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whiteboards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      wishlist_items: {
        Row: {
          celebration_id: string | null
          claimed_by: string | null
          created_at: string
          done: boolean
          id: string
          notes: string | null
          price_cents: number | null
          recipient_id: string | null
          title: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          celebration_id?: string | null
          claimed_by?: string | null
          created_at?: string
          done?: boolean
          id?: string
          notes?: string | null
          price_cents?: number | null
          recipient_id?: string | null
          title: string
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          celebration_id?: string | null
          claimed_by?: string | null
          created_at?: string
          done?: boolean
          id?: string
          notes?: string | null
          price_cents?: number | null
          recipient_id?: string | null
          title?: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_celebration_id_fkey"
            columns: ["celebration_id"]
            isOneToOne: false
            referencedRelation: "celebrations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_household_invite: { Args: { _token: string }; Returns: string }
      create_household_with_owner: {
        Args: { _name: string }
        Returns: {
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "households"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_ai_usage: {
        Args: { p_user_id: string; p_weight: number; p_year_month: string }
        Returns: number
      }
      is_household_member: {
        Args: { _household_id: string; _user_id: string }
        Returns: boolean
      }
      is_household_owner: {
        Args: { _household_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      bucket_season: "spring" | "summer" | "autumn" | "winter" | "all"
      celebration_kind:
        | "birthday"
        | "anniversary"
        | "graduation"
        | "family_milestone"
        | "care_milestone"
        | "therapy_win"
        | "adoption"
        | "special_event"
        | "custom"
      celebration_status: "planning" | "in_progress" | "done"
      celebration_task_category:
        | "decor"
        | "cake"
        | "gifts"
        | "food"
        | "invitations"
        | "other"
      holiday_plan_category:
        | "federal"
        | "religious"
        | "family"
        | "seasonal"
        | "custom"
      household_role: "owner" | "editor" | "viewer"
      memory_group_type:
        | "season"
        | "holiday"
        | "birthday"
        | "celebration"
        | "year"
      remembrance_kind: "person" | "pet" | "date"
      tradition_anchor:
        | "christmas_eve"
        | "thanksgiving"
        | "first_snow"
        | "birthday"
        | "custom_date"
        | "season"
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
      app_role: ["admin", "moderator", "user"],
      bucket_season: ["spring", "summer", "autumn", "winter", "all"],
      celebration_kind: [
        "birthday",
        "anniversary",
        "graduation",
        "family_milestone",
        "care_milestone",
        "therapy_win",
        "adoption",
        "special_event",
        "custom",
      ],
      celebration_status: ["planning", "in_progress", "done"],
      celebration_task_category: [
        "decor",
        "cake",
        "gifts",
        "food",
        "invitations",
        "other",
      ],
      holiday_plan_category: [
        "federal",
        "religious",
        "family",
        "seasonal",
        "custom",
      ],
      household_role: ["owner", "editor", "viewer"],
      memory_group_type: [
        "season",
        "holiday",
        "birthday",
        "celebration",
        "year",
      ],
      remembrance_kind: ["person", "pet", "date"],
      tradition_anchor: [
        "christmas_eve",
        "thanksgiving",
        "first_snow",
        "birthday",
        "custom_date",
        "season",
      ],
    },
  },
} as const
