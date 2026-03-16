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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          category_id: string
          created_at: string
          date: string
          id: string
          notes: string | null
          organization_id: string
          performance_status:
            | Database["public"]["Enums"]["attendance_performance_status"]
            | null
          player_id: string
          recorded_by: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          organization_id: string
          performance_status?:
            | Database["public"]["Enums"]["attendance_performance_status"]
            | null
          player_id: string
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          organization_id?: string
          performance_status?:
            | Database["public"]["Enums"]["attendance_performance_status"]
            | null
          player_id?: string
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events_log: {
        Row: {
          created_at: string
          event_type: string
          id: string
          meta: Json
          organization_id: string
          player_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          meta?: Json
          organization_id: string
          player_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          meta?: Json
          organization_id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_events_log_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          age_group: string
          created_at: string
          days_of_week: string[] | null
          end_time: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          sport_id: string | null
          start_time: string | null
          trainer_id: string | null
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          age_group?: string
          created_at?: string
          days_of_week?: string[] | null
          end_time?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          sport_id?: string | null
          start_time?: string | null
          trainer_id?: string | null
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          age_group?: string
          created_at?: string
          days_of_week?: string[] | null
          end_time?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          sport_id?: string | null
          start_time?: string | null
          trainer_id?: string | null
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_notifications: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          payload: Json
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          payload?: Json
          read_at?: string | null
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          payload?: Json
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_achievements: {
        Row: {
          achievement_key: string
          created_at: string
          evaluation_id: string
          id: string
          xp_bonus: number
        }
        Insert: {
          achievement_key: string
          created_at?: string
          evaluation_id: string
          id?: string
          xp_bonus?: number
        }
        Update: {
          achievement_key?: string
          created_at?: string
          evaluation_id?: string
          id?: string
          xp_bonus?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_achievements_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_comments: {
        Row: {
          comment: string
          created_at: string
          created_by: string | null
          evaluation_id: string
          id: string
        }
        Insert: {
          comment: string
          created_at?: string
          created_by?: string | null
          evaluation_id: string
          id?: string
        }
        Update: {
          comment?: string
          created_at?: string
          created_by?: string | null
          evaluation_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_comments_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_delivery: {
        Row: {
          created_at: string
          delivery_status: string
          error_message: string | null
          evaluation_id: string
          id: string
          last_attempt_at: string | null
          organization_id: string
          recipient_email: string | null
        }
        Insert: {
          created_at?: string
          delivery_status?: string
          error_message?: string | null
          evaluation_id: string
          id?: string
          last_attempt_at?: string | null
          organization_id: string
          recipient_email?: string | null
        }
        Update: {
          created_at?: string
          delivery_status?: string
          error_message?: string | null
          evaluation_id?: string
          id?: string
          last_attempt_at?: string | null
          organization_id?: string
          recipient_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_delivery_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_delivery_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_event_players: {
        Row: {
          created_at: string
          evaluated_at: string | null
          evaluated_by: string | null
          event_id: string
          id: string
          organization_id: string
          player_id: string
          status: string
        }
        Insert: {
          created_at?: string
          evaluated_at?: string | null
          evaluated_by?: string | null
          event_id: string
          id?: string
          organization_id: string
          player_id: string
          status?: string
        }
        Update: {
          created_at?: string
          evaluated_at?: string | null
          evaluated_by?: string | null
          event_id?: string
          id?: string
          organization_id?: string
          player_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_event_players_evaluated_by_fkey"
            columns: ["evaluated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_event_players_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "evaluation_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_event_players_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_event_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_events: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          created_by: string | null
          event_date: string | null
          id: string
          organization_id: string
          status: string
          title: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string | null
          event_date?: string | null
          id?: string
          organization_id: string
          status?: string
          title: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string | null
          event_date?: string | null
          id?: string
          organization_id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_events_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_rubrics: {
        Row: {
          age_group: string
          band_max: number
          band_min: number
          bullets: Json
          id: string
          stat_key: string
        }
        Insert: {
          age_group: string
          band_max: number
          band_min: number
          bullets?: Json
          id?: string
          stat_key: string
        }
        Update: {
          age_group?: string
          band_max?: number
          band_min?: number
          bullets?: Json
          id?: string
          stat_key?: string
        }
        Relationships: []
      }
      evaluation_scores: {
        Row: {
          created_at: string
          evaluation_id: string
          id: string
          score: number
          stat_key: string
        }
        Insert: {
          created_at?: string
          evaluation_id: string
          id?: string
          score?: number
          stat_key: string
        }
        Update: {
          created_at?: string
          evaluation_id?: string
          id?: string
          score?: number
          stat_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_scores_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_weights: {
        Row: {
          age_group: string
          created_at: string
          id: string
          organization_id: string
          weights: Json
        }
        Insert: {
          age_group: string
          created_at?: string
          id?: string
          organization_id: string
          weights?: Json
        }
        Update: {
          age_group?: string
          created_at?: string
          id?: string
          organization_id?: string
          weights?: Json
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_weights_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          age_group: string
          block_id: string | null
          category_id: string
          closed_at: string | null
          closed_by: string | null
          created_at: string
          event_id: string | null
          id: string
          insights_json: Json | null
          organization_id: string
          overall_score: number | null
          period: string
          player_id: string
          previous_overall: number | null
          recorded_by: string | null
          status: string
        }
        Insert: {
          age_group: string
          block_id?: string | null
          category_id: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          insights_json?: Json | null
          organization_id: string
          overall_score?: number | null
          period: string
          player_id: string
          previous_overall?: number | null
          recorded_by?: string | null
          status?: string
        }
        Update: {
          age_group?: string
          block_id?: string | null
          category_id?: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          insights_json?: Json | null
          organization_id?: string
          overall_score?: number | null
          period?: string
          player_id?: string
          previous_overall?: number | null
          recorded_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "membership_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "evaluation_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_addon_subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          guardian_id: string | null
          id: string
          organization_id: string
          plan_type: string | null
          player_id: string | null
          status: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          guardian_id?: string | null
          id?: string
          organization_id: string
          plan_type?: string | null
          player_id?: string | null
          status?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          guardian_id?: string | null
          id?: string
          organization_id?: string
          plan_type?: string | null
          player_id?: string | null
          status?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_addon_subscriptions_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_addon_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_addon_subscriptions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_library: {
        Row: {
          age_max: number | null
          age_min: number | null
          category: string
          coach_tip: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty: string | null
          duration_minutes: number | null
          equipment_needed: string | null
          id: string
          is_active: boolean | null
          organization_id: string
          partner_required: boolean | null
          skill_tags: string[] | null
          thumbnail_url: string | null
          title: string
          video_source: string | null
          video_url: string
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          category: string
          coach_tip?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          equipment_needed?: string | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          partner_required?: boolean | null
          skill_tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          video_source?: string | null
          video_url: string
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          category?: string
          coach_tip?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          equipment_needed?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          partner_required?: boolean | null
          skill_tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          video_source?: string | null
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_library_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_library_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          expense_date: string
          id: string
          organization_id: string
          recorded_by: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          organization_id: string
          recorded_by?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          organization_id?: string
          recorded_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guardians: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          is_primary: boolean | null
          occupation: string | null
          organization_id: string
          phone: string
          phone_normalized: string
          relationship: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_primary?: boolean | null
          occupation?: string | null
          organization_id: string
          phone: string
          phone_normalized: string
          relationship?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_primary?: boolean | null
          occupation?: string | null
          organization_id?: string
          phone?: string
          phone_normalized?: string
          relationship?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardians_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      idp_cycles: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          ends_at: string
          id: string
          initial_evaluation_id: string | null
          latest_evaluation_id: string | null
          organization_id: string
          plan_json: Json | null
          plan_text: string | null
          player_id: string
          stage: string
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          ends_at: string
          id?: string
          initial_evaluation_id?: string | null
          latest_evaluation_id?: string | null
          organization_id: string
          plan_json?: Json | null
          plan_text?: string | null
          player_id: string
          stage?: string
          starts_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          ends_at?: string
          id?: string
          initial_evaluation_id?: string | null
          latest_evaluation_id?: string | null
          organization_id?: string
          plan_json?: Json | null
          plan_text?: string | null
          player_id?: string
          stage?: string
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "idp_cycles_initial_evaluation_id_fkey"
            columns: ["initial_evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idp_cycles_latest_evaluation_id_fkey"
            columns: ["latest_evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idp_cycles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idp_cycles_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      idp_focus_areas: {
        Row: {
          created_at: string
          focus_type: string
          id: string
          idp_cycle_id: string
          initial_score: number
          organization_id: string
          stat_key: string
          target_score: number
        }
        Insert: {
          created_at?: string
          focus_type?: string
          id?: string
          idp_cycle_id: string
          initial_score: number
          organization_id: string
          stat_key: string
          target_score: number
        }
        Update: {
          created_at?: string
          focus_type?: string
          id?: string
          idp_cycle_id?: string
          initial_score?: number
          organization_id?: string
          stat_key?: string
          target_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "idp_focus_areas_idp_cycle_id_fkey"
            columns: ["idp_cycle_id"]
            isOneToOne: false
            referencedRelation: "idp_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idp_focus_areas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      idp_sessions: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          idp_cycle_id: string
          organization_id: string
          player_id: string
          session_number: number
          xp_awarded: number
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          idp_cycle_id: string
          organization_id: string
          player_id: string
          session_number: number
          xp_awarded?: number
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          idp_cycle_id?: string
          organization_id?: string
          player_id?: string
          session_number?: number
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "idp_sessions_idp_cycle_id_fkey"
            columns: ["idp_cycle_id"]
            isOneToOne: false
            referencedRelation: "idp_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idp_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idp_sessions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_documents: {
        Row: {
          bucket_id: string
          created_at: string | null
          document_type: string
          file_name: string | null
          file_size: number | null
          id: string
          intake_request_id: string
          mime_type: string | null
          object_path: string
          organization_id: string
          uploaded_by: string | null
        }
        Insert: {
          bucket_id?: string
          created_at?: string | null
          document_type?: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          intake_request_id: string
          mime_type?: string | null
          object_path: string
          organization_id: string
          uploaded_by?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          document_type?: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          intake_request_id?: string
          mime_type?: string | null
          object_path?: string
          organization_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intake_documents_intake_request_id_fkey"
            columns: ["intake_request_id"]
            isOneToOne: false
            referencedRelation: "intake_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_requests: {
        Row: {
          category_id: string | null
          created_at: string | null
          created_by: string
          guardian_email: string | null
          guardian_id: string | null
          guardian_name: string
          guardian_occupation: string | null
          guardian_phone: string
          guardian_phone_normalized: string
          id: string
          idempotency_key: string
          monthly_fee: number
          organization_id: string
          payment_id: string | null
          payment_method: string
          plan_id: string | null
          plan_ids: string[] | null
          player_age: number | null
          player_birth_date: string
          player_id: string | null
          player_name: string
          player_name_normalized: string
          processed_at: string | null
          processed_by: string | null
          processing_error: string | null
          promo_applied: boolean | null
          promo_code: string | null
          receipt_error: string | null
          receipt_retry_count: number | null
          receipt_sent_at: string | null
          receipt_status: string | null
          registration_fee: number
          sport_id: string | null
          status: string
          total_amount: number
          updated_at: string | null
          venue_id: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          created_by: string
          guardian_email?: string | null
          guardian_id?: string | null
          guardian_name: string
          guardian_occupation?: string | null
          guardian_phone: string
          guardian_phone_normalized: string
          id?: string
          idempotency_key: string
          monthly_fee?: number
          organization_id: string
          payment_id?: string | null
          payment_method: string
          plan_id?: string | null
          plan_ids?: string[] | null
          player_age?: number | null
          player_birth_date: string
          player_id?: string | null
          player_name: string
          player_name_normalized: string
          processed_at?: string | null
          processed_by?: string | null
          processing_error?: string | null
          promo_applied?: boolean | null
          promo_code?: string | null
          receipt_error?: string | null
          receipt_retry_count?: number | null
          receipt_sent_at?: string | null
          receipt_status?: string | null
          registration_fee?: number
          sport_id?: string | null
          status?: string
          total_amount?: number
          updated_at?: string | null
          venue_id?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          created_by?: string
          guardian_email?: string | null
          guardian_id?: string | null
          guardian_name?: string
          guardian_occupation?: string | null
          guardian_phone?: string
          guardian_phone_normalized?: string
          id?: string
          idempotency_key?: string
          monthly_fee?: number
          organization_id?: string
          payment_id?: string | null
          payment_method?: string
          plan_id?: string | null
          plan_ids?: string[] | null
          player_age?: number | null
          player_birth_date?: string
          player_id?: string | null
          player_name?: string
          player_name_normalized?: string
          processed_at?: string | null
          processed_by?: string | null
          processing_error?: string | null
          promo_applied?: boolean | null
          promo_code?: string | null
          receipt_error?: string | null
          receipt_retry_count?: number | null
          receipt_sent_at?: string | null
          receipt_status?: string | null
          registration_fee?: number
          sport_id?: string | null
          status?: string
          total_amount?: number
          updated_at?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intake_requests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_requests_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_requests_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_requests_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_requests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_requests_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_requests_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      match_media: {
        Row: {
          created_at: string
          created_by: string | null
          file_name: string
          file_size: number | null
          id: string
          match_id: string
          mime_type: string | null
          organization_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          match_id: string
          mime_type?: string | null
          organization_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          match_id?: string
          mime_type?: string | null
          organization_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_media_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_media_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_media_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      match_players: {
        Row: {
          assists: number | null
          attended: boolean
          created_at: string
          goals: number | null
          id: string
          is_guest: boolean | null
          match_id: string
          organization_id: string
          performance: string | null
          player_id: string
          points: number | null
          position: string | null
          updated_at: string
        }
        Insert: {
          assists?: number | null
          attended?: boolean
          created_at?: string
          goals?: number | null
          id?: string
          is_guest?: boolean | null
          match_id: string
          organization_id: string
          performance?: string | null
          player_id: string
          points?: number | null
          position?: string | null
          updated_at?: string
        }
        Update: {
          assists?: number | null
          attended?: boolean
          created_at?: string
          goals?: number | null
          id?: string
          is_guest?: boolean | null
          match_id?: string
          organization_id?: string
          performance?: string | null
          player_id?: string
          points?: number | null
          position?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          category_id: string
          created_at: string
          created_by: string | null
          goals_against: number
          goals_for: number
          id: string
          importance: string
          last_edited_at: string | null
          last_edited_by: string | null
          match_date: string
          match_type: string
          mvp_player_id: string | null
          notes: string | null
          organization_id: string
          rival_name: string
          status: string
          technical_notes: string | null
          trainer_id: string | null
          updated_at: string
          venue_id: string | null
          xp_multiplier: number
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by?: string | null
          goals_against?: number
          goals_for?: number
          id?: string
          importance?: string
          last_edited_at?: string | null
          last_edited_by?: string | null
          match_date: string
          match_type?: string
          mvp_player_id?: string | null
          notes?: string | null
          organization_id: string
          rival_name: string
          status?: string
          technical_notes?: string | null
          trainer_id?: string | null
          updated_at?: string
          venue_id?: string | null
          xp_multiplier?: number
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string | null
          goals_against?: number
          goals_for?: number
          id?: string
          importance?: string
          last_edited_at?: string | null
          last_edited_by?: string | null
          match_date?: string
          match_type?: string
          mvp_player_id?: string | null
          notes?: string | null
          organization_id?: string
          rival_name?: string
          status?: string
          technical_notes?: string | null
          trainer_id?: string | null
          updated_at?: string
          venue_id?: string | null
          xp_multiplier?: number
        }
        Relationships: [
          {
            foreignKeyName: "matches_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_mvp_player_id_fkey"
            columns: ["mvp_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_blocks: {
        Row: {
          code: string
          created_at: string
          duration_months: number
          id: string
          is_active: boolean
          min_attendance_pct: number
          min_evaluations: number
          min_xp: number | null
          name: string
          org_id: string | null
          sequence_order: number
        }
        Insert: {
          code: string
          created_at?: string
          duration_months: number
          id?: string
          is_active?: boolean
          min_attendance_pct?: number
          min_evaluations?: number
          min_xp?: number | null
          name: string
          org_id?: string | null
          sequence_order: number
        }
        Update: {
          code?: string
          created_at?: string
          duration_months?: number
          id?: string
          is_active?: boolean
          min_attendance_pct?: number
          min_evaluations?: number
          min_xp?: number | null
          name?: string
          org_id?: string | null
          sequence_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "membership_blocks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_progression_log: {
        Row: {
          action: string
          created_at: string
          from_block_id: string | null
          id: string
          metrics_snapshot: Json
          org_id: string
          player_id: string
          to_block_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          from_block_id?: string | null
          id?: string
          metrics_snapshot?: Json
          org_id: string
          player_id: string
          to_block_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          from_block_id?: string | null
          id?: string
          metrics_snapshot?: Json
          org_id?: string
          player_id?: string
          to_block_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membership_progression_log_from_block_id_fkey"
            columns: ["from_block_id"]
            isOneToOne: false
            referencedRelation: "membership_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_progression_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_progression_log_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_progression_log_to_block_id_fkey"
            columns: ["to_block_id"]
            isOneToOne: false
            referencedRelation: "membership_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_reports: {
        Row: {
          churned_count: number
          created_at: string
          generated_by: string | null
          id: string
          new_players_count: number
          organization_id: string
          report_month: string
          snapshot: Json
        }
        Insert: {
          churned_count?: number
          created_at?: string
          generated_by?: string | null
          id?: string
          new_players_count?: number
          organization_id: string
          report_month: string
          snapshot?: Json
        }
        Update: {
          churned_count?: number
          created_at?: string
          generated_by?: string | null
          id?: string
          new_players_count?: number
          organization_id?: string
          report_month?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "monthly_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_intake_settings: {
        Row: {
          allow_promo_codes: boolean | null
          basketball_fee: number | null
          created_at: string | null
          default_monthly_fee: number | null
          default_registration_fee: number | null
          enabled: boolean | null
          id: string
          organization_id: string
          parents_guide_url: string | null
          promo_active: boolean | null
          promo_fee: number | null
          receipt_footer_text: string | null
          require_evidence: boolean | null
          require_guardian_email: boolean | null
          soccer_fee: number | null
          transfer_bank_info: string | null
          transfer_qr_url: string | null
          updated_at: string | null
          welcome_message: string | null
          whatsapp_group_url: string | null
        }
        Insert: {
          allow_promo_codes?: boolean | null
          basketball_fee?: number | null
          created_at?: string | null
          default_monthly_fee?: number | null
          default_registration_fee?: number | null
          enabled?: boolean | null
          id?: string
          organization_id: string
          parents_guide_url?: string | null
          promo_active?: boolean | null
          promo_fee?: number | null
          receipt_footer_text?: string | null
          require_evidence?: boolean | null
          require_guardian_email?: boolean | null
          soccer_fee?: number | null
          transfer_bank_info?: string | null
          transfer_qr_url?: string | null
          updated_at?: string | null
          welcome_message?: string | null
          whatsapp_group_url?: string | null
        }
        Update: {
          allow_promo_codes?: boolean | null
          basketball_fee?: number | null
          created_at?: string | null
          default_monthly_fee?: number | null
          default_registration_fee?: number | null
          enabled?: boolean | null
          id?: string
          organization_id?: string
          parents_guide_url?: string | null
          promo_active?: boolean | null
          promo_fee?: number | null
          receipt_footer_text?: string | null
          require_evidence?: boolean | null
          require_guardian_email?: boolean | null
          soccer_fee?: number | null
          transfer_bank_info?: string | null
          transfer_qr_url?: string | null
          updated_at?: string | null
          welcome_message?: string | null
          whatsapp_group_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_intake_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_receipt_counters: {
        Row: {
          last_number: number
          org_id: string
          updated_at: string
        }
        Insert: {
          last_number?: number
          org_id: string
          updated_at?: string
        }
        Update: {
          last_number?: number
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_receipt_counters_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          approximate_students: number
          billing_admin_user_id: string | null
          billing_auto_overdue: boolean
          billing_due_day: number | null
          billing_grace_days: number
          billing_period_type: string
          billing_receipts_email: string | null
          city: string
          country: string
          created_at: string | null
          feature_analytics_enabled: boolean
          feature_evaluations_enabled: boolean
          feature_portal_familiar_enabled: boolean
          feature_stryk_way_enabled: boolean
          feature_studio_pro_enabled: boolean
          id: string
          is_active: boolean | null
          name: string
          onboarding_completed: boolean | null
          org_access_key: string
          org_code: string
          organization_type: Database["public"]["Enums"]["organization_type"]
          phone: string
          plan: Database["public"]["Enums"]["subscription_plan"] | null
          primary_sport: string
          receipt_logo_url: string | null
          updated_at: string | null
        }
        Insert: {
          approximate_students: number
          billing_admin_user_id?: string | null
          billing_auto_overdue?: boolean
          billing_due_day?: number | null
          billing_grace_days?: number
          billing_period_type?: string
          billing_receipts_email?: string | null
          city: string
          country: string
          created_at?: string | null
          feature_analytics_enabled?: boolean
          feature_evaluations_enabled?: boolean
          feature_portal_familiar_enabled?: boolean
          feature_stryk_way_enabled?: boolean
          feature_studio_pro_enabled?: boolean
          id?: string
          is_active?: boolean | null
          name: string
          onboarding_completed?: boolean | null
          org_access_key: string
          org_code: string
          organization_type: Database["public"]["Enums"]["organization_type"]
          phone: string
          plan?: Database["public"]["Enums"]["subscription_plan"] | null
          primary_sport: string
          receipt_logo_url?: string | null
          updated_at?: string | null
        }
        Update: {
          approximate_students?: number
          billing_admin_user_id?: string | null
          billing_auto_overdue?: boolean
          billing_due_day?: number | null
          billing_grace_days?: number
          billing_period_type?: string
          billing_receipts_email?: string | null
          city?: string
          country?: string
          created_at?: string | null
          feature_analytics_enabled?: boolean
          feature_evaluations_enabled?: boolean
          feature_portal_familiar_enabled?: boolean
          feature_stryk_way_enabled?: boolean
          feature_studio_pro_enabled?: boolean
          id?: string
          is_active?: boolean | null
          name?: string
          onboarding_completed?: boolean | null
          org_access_key?: string
          org_code?: string
          organization_type?: Database["public"]["Enums"]["organization_type"]
          phone?: string
          plan?: Database["public"]["Enums"]["subscription_plan"] | null
          primary_sport?: string
          receipt_logo_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          concept: string
          created_at: string
          evidence_url: string | null
          id: string
          notes: string | null
          organization_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_month: string
          player_id: string
          receipt_email: string | null
          receipt_error: string | null
          receipt_folio: string | null
          receipt_message_id: string | null
          receipt_sent_at: string | null
          receipt_sent_to: Json | null
          receipt_sequence_number: number | null
          receipt_status: string | null
          receipt_template_version: string
          recorded_by: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          concept?: string
          created_at?: string
          evidence_url?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_month: string
          player_id: string
          receipt_email?: string | null
          receipt_error?: string | null
          receipt_folio?: string | null
          receipt_message_id?: string | null
          receipt_sent_at?: string | null
          receipt_sent_to?: Json | null
          receipt_sequence_number?: number | null
          receipt_status?: string | null
          receipt_template_version?: string
          recorded_by?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          concept?: string
          created_at?: string
          evidence_url?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_month?: string
          player_id?: string
          receipt_email?: string | null
          receipt_error?: string | null
          receipt_folio?: string | null
          receipt_message_id?: string | null
          receipt_sent_at?: string | null
          receipt_sent_to?: Json | null
          receipt_sequence_number?: number | null
          receipt_status?: string | null
          receipt_template_version?: string
          recorded_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_limits: {
        Row: {
          created_at: string
          custom_branding: boolean
          data_export: boolean
          excel_import: boolean
          id: string
          max_categories: number
          max_players: number
          max_users: number
          plan_name: string
          priority_support: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_branding?: boolean
          data_export?: boolean
          excel_import?: boolean
          id?: string
          max_categories?: number
          max_players?: number
          max_users?: number
          plan_name: string
          priority_support?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_branding?: boolean
          data_export?: boolean
          excel_import?: boolean
          id?: string
          max_categories?: number
          max_players?: number
          max_users?: number
          plan_name?: string
          priority_support?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          periodicity: string
          price: number
          sport_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          periodicity?: string
          price?: number
          sport_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          periodicity?: string
          price?: number
          sport_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_organization_id: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_organization_id?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_audit_log_target_organization_id_fkey"
            columns: ["target_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_roles: {
        Row: {
          created_at: string | null
          role: Database["public"]["Enums"]["platform_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          role: Database["public"]["Enums"]["platform_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          role?: Database["public"]["Enums"]["platform_role"]
          user_id?: string
        }
        Relationships: []
      }
      player_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          organization_id: string
          player_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          organization_id: string
          player_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          organization_id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "stryk_badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_badges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_badges_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_challenges: {
        Row: {
          challenge_id: string
          completed_at: string | null
          created_at: string
          id: string
          organization_id: string
          player_id: string
          progress: number
          updated_at: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          organization_id: string
          player_id: string
          progress?: number
          updated_at?: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          player_id?: string
          progress?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "stryk_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_challenges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_challenges_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_guardians: {
        Row: {
          created_at: string | null
          guardian_id: string
          id: string
          is_primary: boolean | null
          player_id: string
        }
        Insert: {
          created_at?: string | null
          guardian_id: string
          id?: string
          is_primary?: boolean | null
          player_id: string
        }
        Update: {
          created_at?: string | null
          guardian_id?: string
          id?: string
          is_primary?: boolean | null
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_guardians_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_guardians_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_lifecycle_log: {
        Row: {
          created_at: string
          event_type: string
          from_status: string | null
          id: string
          organization_id: string
          player_id: string
          reason: string | null
          to_status: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: string
          organization_id: string
          player_id: string
          reason?: string | null
          to_status?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: string
          organization_id?: string
          player_id?: string
          reason?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_lifecycle_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_lifecycle_log_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_offboarding: {
        Row: {
          churn_detail: string | null
          churn_reason: string | null
          completed_at: string | null
          created_at: string
          id: string
          nps_score: number | null
          organization_id: string
          player_id: string
          started_at: string
          would_return: boolean | null
        }
        Insert: {
          churn_detail?: string | null
          churn_reason?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          nps_score?: number | null
          organization_id: string
          player_id: string
          started_at?: string
          would_return?: boolean | null
        }
        Update: {
          churn_detail?: string | null
          churn_reason?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          nps_score?: number | null
          organization_id?: string
          player_id?: string
          started_at?: string
          would_return?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "player_offboarding_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_offboarding_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_progress: {
        Row: {
          idp_last_session_at: string | null
          idp_streak_best: number
          idp_streak_current: number
          last_event_at: string | null
          level: number
          organization_id: string
          ovr: number
          player_id: string
          radar: Json
          streak: number
          updated_at: string
          xp_total: number
        }
        Insert: {
          idp_last_session_at?: string | null
          idp_streak_best?: number
          idp_streak_current?: number
          last_event_at?: string | null
          level?: number
          organization_id: string
          ovr?: number
          player_id: string
          radar?: Json
          streak?: number
          updated_at?: string
          xp_total?: number
        }
        Update: {
          idp_last_session_at?: string | null
          idp_streak_best?: number
          idp_streak_current?: number
          last_event_at?: string | null
          level?: number
          organization_id?: string
          ovr?: number
          player_id?: string
          radar?: Json
          streak?: number
          updated_at?: string
          xp_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_progress_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_progress_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          billing_status: string
          block_end_date: string | null
          block_id: string | null
          block_start_date: string | null
          category_id: string | null
          created_at: string
          date_of_birth: string | null
          eligible_for_progression: boolean
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          is_scholarship: boolean
          is_trial: boolean
          last_paid_month: string | null
          last_progression_at: string | null
          lifecycle_status: string
          membership_stage: string
          monthly_fee: number | null
          offboarded_at: string | null
          onboarded_at: string | null
          organization_id: string
          parent_email: string | null
          parent_phone: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          phone: string | null
          plan: string | null
          plan_id: string | null
          player_type: string
          position: string | null
          sport_id: string | null
          tutor_name: string | null
          updated_at: string
        }
        Insert: {
          billing_status?: string
          block_end_date?: string | null
          block_id?: string | null
          block_start_date?: string | null
          category_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          eligible_for_progression?: boolean
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          is_scholarship?: boolean
          is_trial?: boolean
          last_paid_month?: string | null
          last_progression_at?: string | null
          lifecycle_status?: string
          membership_stage?: string
          monthly_fee?: number | null
          offboarded_at?: string | null
          onboarded_at?: string | null
          organization_id: string
          parent_email?: string | null
          parent_phone?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone?: string | null
          plan?: string | null
          plan_id?: string | null
          player_type?: string
          position?: string | null
          sport_id?: string | null
          tutor_name?: string | null
          updated_at?: string
        }
        Update: {
          billing_status?: string
          block_end_date?: string | null
          block_id?: string | null
          block_start_date?: string | null
          category_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          eligible_for_progression?: boolean
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          is_scholarship?: boolean
          is_trial?: boolean
          last_paid_month?: string | null
          last_progression_at?: string | null
          lifecycle_status?: string
          membership_stage?: string
          monthly_fee?: number | null
          offboarded_at?: string | null
          onboarded_at?: string | null
          organization_id?: string
          parent_email?: string | null
          parent_phone?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone?: string | null
          plan?: string | null
          plan_id?: string | null
          player_type?: string
          position?: string | null
          sport_id?: string | null
          tutor_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "membership_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_organization_id: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          must_change_password: boolean | null
          organization_id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          active_organization_id?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean | null
          must_change_password?: boolean | null
          organization_id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          active_organization_id?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          must_change_password?: boolean | null
          organization_id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_organization_id_fkey"
            columns: ["active_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sports: {
        Row: {
          created_at: string | null
          id: string
          is_system: boolean | null
          name: string
          organization_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          organization_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stryk_audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          meta: Json | null
          organization_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          meta?: Json | null
          organization_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          meta?: Json | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stryk_audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stryk_badges: {
        Row: {
          created_at: string
          created_by: string | null
          criteria: Json
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          organization_id: string
          pack_id: string
          rarity: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          criteria?: Json
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          organization_id: string
          pack_id: string
          rarity?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          criteria?: Json
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          organization_id?: string
          pack_id?: string
          rarity?: string
        }
        Relationships: [
          {
            foreignKeyName: "stryk_badges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stryk_badges_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "stryk_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      stryk_challenges: {
        Row: {
          created_at: string
          created_by: string | null
          criteria: Json
          description: string | null
          end_at: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          organization_id: string
          pack_id: string
          start_at: string | null
          xp_reward: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          criteria?: Json
          description?: string | null
          end_at?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          organization_id: string
          pack_id: string
          start_at?: string | null
          xp_reward?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          criteria?: Json
          description?: string | null
          end_at?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          organization_id?: string
          pack_id?: string
          start_at?: string | null
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "stryk_challenges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stryk_challenges_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "stryk_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      stryk_events: {
        Row: {
          attributes_delta: Json
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          player_id: string
          source_id: string
          source_type: string
          xp_delta: number
        }
        Insert: {
          attributes_delta?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          player_id: string
          source_id: string
          source_type: string
          xp_delta?: number
        }
        Update: {
          attributes_delta?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          player_id?: string
          source_id?: string
          source_type?: string
          xp_delta?: number
        }
        Relationships: [
          {
            foreignKeyName: "stryk_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stryk_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      stryk_packs: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          organization_id: string
          published_at: string | null
          published_by: string | null
          status: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          organization_id: string
          published_at?: string | null
          published_by?: string | null
          status?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          organization_id?: string
          published_at?: string | null
          published_by?: string | null
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "stryk_packs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stryk_rulesets: {
        Row: {
          caps: Json
          created_at: string
          created_by: string | null
          economy: Json
          id: string
          multipliers: Json
          organization_id: string
          ovr_weights: Json
          pack_id: string
        }
        Insert: {
          caps?: Json
          created_at?: string
          created_by?: string | null
          economy?: Json
          id?: string
          multipliers?: Json
          organization_id: string
          ovr_weights?: Json
          pack_id: string
        }
        Update: {
          caps?: Json
          created_at?: string
          created_by?: string | null
          economy?: Json
          id?: string
          multipliers?: Json
          organization_id?: string
          ovr_weights?: Json
          pack_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stryk_rulesets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stryk_rulesets_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: true
            referencedRelation: "stryk_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_auth_tokens: {
        Row: {
          created_at: string
          expires_at: string
          guardian_id: string
          id: string
          last_used_at: string | null
          organization_id: string
          pin_hash: string | null
          token_hash: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          guardian_id: string
          id?: string
          last_used_at?: string | null
          organization_id: string
          pin_hash?: string | null
          token_hash: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          guardian_id?: string
          id?: string
          last_used_at?: string | null
          organization_id?: string
          pin_hash?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_auth_tokens_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_auth_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      upgrade_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          current_plan: string
          id: string
          organization_id: string
          processed_at: string | null
          processed_by: string | null
          requested_by: string
          requested_plan: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          current_plan: string
          id?: string
          organization_id: string
          processed_at?: string | null
          processed_by?: string | null
          requested_by: string
          requested_plan: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          current_plan?: string
          id?: string
          organization_id?: string
          processed_at?: string | null
          processed_by?: string | null
          requested_by?: string
          requested_plan?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "upgrade_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_org_roles: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_org_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "venues_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_default_membership_block: {
        Args: { p_player_id: string }
        Returns: undefined
      }
      check_billing_overdue: { Args: never; Returns: number }
      evaluate_membership_progression: {
        Args: { p_as_of_date: string; p_org_id: string }
        Returns: Json
      }
      generate_access_key: { Args: never; Returns: string }
      generate_intake_idempotency_key: {
        Args: {
          p_birth_date: string
          p_name_normalized: string
          p_org_id: string
          p_phone_normalized: string
        }
        Returns: string
      }
      generate_org_code: { Args: { org_name: string }; Returns: string }
      get_current_org_id: { Args: never; Returns: string }
      get_or_create_monthly_event: {
        Args: { p_org_id: string }
        Returns: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          created_by: string | null
          event_date: string | null
          id: string
          organization_id: string
          status: string
          title: string
        }[]
        SetofOptions: {
          from: "*"
          to: "evaluation_events"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_intake_access: { Args: never; Returns: boolean }
      has_org_role: {
        Args: { _role: Database["public"]["Enums"]["org_role"] }
        Returns: boolean
      }
      is_category_trainer: { Args: { _category_id: string }; Returns: boolean }
      is_evaluation_category_trainer: {
        Args: { p_category_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
      next_receipt_folio: {
        Args: { p_org_id: string }
        Returns: {
          folio: string
          sequence_number: number
        }[]
      }
      normalize_name: { Args: { name: string }; Returns: string }
      normalize_phone: { Args: { phone: string }; Returns: string }
      normalize_text: { Args: { input_text: string }; Returns: string }
      process_intake_and_create_entities: {
        Args: { p_intake_id: string }
        Returns: Json
      }
      process_intake_request: {
        Args: { p_intake_request_id: string }
        Returns: Json
      }
      reset_active_organization: { Args: never; Returns: undefined }
      reset_monthly_payment_status: { Args: never; Returns: number }
      search_players: {
        Args: {
          p_category_id?: string
          p_is_active?: boolean
          p_organization_id: string
          p_payment_status?: string
          p_search_term?: string
        }
        Returns: {
          player_category_id: string
          player_created_at: string
          player_email: string
          player_full_name: string
          player_id: string
          player_is_active: boolean
          player_is_scholarship: boolean
          player_is_trial: boolean
          player_monthly_fee: number
          player_organization_id: string
          player_payment_status: Database["public"]["Enums"]["payment_status"]
          player_phone: string
          player_plan: string
          player_plan_id: string
          player_position: string
          player_sport_id: string
          player_tutor_name: string
          player_updated_at: string
        }[]
      }
      switch_organization: {
        Args: { target_org_id: string }
        Returns: undefined
      }
      unaccent: { Args: { "": string }; Returns: string }
      user_belongs_to_org: { Args: { _org_id: string }; Returns: boolean }
      validate_org_access: {
        Args: {
          _org_access_key: string
          _org_code: string
          _user_email: string
        }
        Returns: Json
      }
    }
    Enums: {
      attendance_performance_status:
        | "excellent"
        | "focus"
        | "challenge"
        | "outstanding"
      attendance_status: "presente" | "ausente" | "justificado"
      org_role:
        | "org_owner"
        | "director_deportivo"
        | "entrenador"
        | "administrativo"
      organization_type:
        | "profesional"
        | "recreativa"
        | "escolar"
        | "gubernamental"
        | "universitaria"
        | "comunitaria"
        | "privada"
        | "federativa"
        | "club_social"
        | "otro"
      payment_method: "efectivo" | "transferencia" | "tarjeta" | "otro"
      payment_status: "al_dia" | "pendiente" | "atrasado"
      platform_role: "platform_super_admin"
      subscription_plan: "freemium" | "starter" | "professional" | "enterprise"
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
      attendance_performance_status: [
        "excellent",
        "focus",
        "challenge",
        "outstanding",
      ],
      attendance_status: ["presente", "ausente", "justificado"],
      org_role: [
        "org_owner",
        "director_deportivo",
        "entrenador",
        "administrativo",
      ],
      organization_type: [
        "profesional",
        "recreativa",
        "escolar",
        "gubernamental",
        "universitaria",
        "comunitaria",
        "privada",
        "federativa",
        "club_social",
        "otro",
      ],
      payment_method: ["efectivo", "transferencia", "tarjeta", "otro"],
      payment_status: ["al_dia", "pendiente", "atrasado"],
      platform_role: ["platform_super_admin"],
      subscription_plan: ["freemium", "starter", "professional", "enterprise"],
    },
  },
} as const
