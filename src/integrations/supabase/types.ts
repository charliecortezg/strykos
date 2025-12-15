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
      categories: {
        Row: {
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
      match_players: {
        Row: {
          assists: number | null
          attended: boolean
          created_at: string
          goals: number | null
          id: string
          match_id: string
          organization_id: string
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
          match_id: string
          organization_id: string
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
          match_id?: string
          organization_id?: string
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
          last_edited_at: string | null
          last_edited_by: string | null
          match_date: string
          match_type: string
          notes: string | null
          organization_id: string
          rival_name: string
          status: string
          technical_notes: string | null
          trainer_id: string | null
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by?: string | null
          goals_against?: number
          goals_for?: number
          id?: string
          last_edited_at?: string | null
          last_edited_by?: string | null
          match_date: string
          match_type?: string
          notes?: string | null
          organization_id: string
          rival_name: string
          status?: string
          technical_notes?: string | null
          trainer_id?: string | null
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string | null
          goals_against?: number
          goals_for?: number
          id?: string
          last_edited_at?: string | null
          last_edited_by?: string | null
          match_date?: string
          match_type?: string
          notes?: string | null
          organization_id?: string
          rival_name?: string
          status?: string
          technical_notes?: string | null
          trainer_id?: string | null
          updated_at?: string
          venue_id?: string | null
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
      organizations: {
        Row: {
          approximate_students: number
          city: string
          country: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          org_access_key: string
          org_code: string
          organization_type: Database["public"]["Enums"]["organization_type"]
          phone: string
          plan: Database["public"]["Enums"]["subscription_plan"] | null
          primary_sport: string
          updated_at: string | null
        }
        Insert: {
          approximate_students: number
          city: string
          country: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          org_access_key: string
          org_code: string
          organization_type: Database["public"]["Enums"]["organization_type"]
          phone: string
          plan?: Database["public"]["Enums"]["subscription_plan"] | null
          primary_sport: string
          updated_at?: string | null
        }
        Update: {
          approximate_students?: number
          city?: string
          country?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          org_access_key?: string
          org_code?: string
          organization_type?: Database["public"]["Enums"]["organization_type"]
          phone?: string
          plan?: Database["public"]["Enums"]["subscription_plan"] | null
          primary_sport?: string
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
      players: {
        Row: {
          category_id: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          is_scholarship: boolean
          is_trial: boolean
          monthly_fee: number | null
          organization_id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          phone: string | null
          plan: string | null
          plan_id: string | null
          position: string | null
          sport_id: string | null
          tutor_name: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          is_scholarship?: boolean
          is_trial?: boolean
          monthly_fee?: number | null
          organization_id: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone?: string | null
          plan?: string | null
          plan_id?: string | null
          position?: string | null
          sport_id?: string | null
          tutor_name?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          is_scholarship?: boolean
          is_trial?: boolean
          monthly_fee?: number | null
          organization_id?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone?: string | null
          plan?: string | null
          plan_id?: string | null
          position?: string | null
          sport_id?: string | null
          tutor_name?: string | null
          updated_at?: string
        }
        Relationships: [
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
      generate_access_key: { Args: never; Returns: string }
      generate_org_code: { Args: { org_name: string }; Returns: string }
      get_current_org_id: { Args: never; Returns: string }
      has_org_role: {
        Args: { _role: Database["public"]["Enums"]["org_role"] }
        Returns: boolean
      }
      is_category_trainer: { Args: { _category_id: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      reset_monthly_payment_status: { Args: never; Returns: number }
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
