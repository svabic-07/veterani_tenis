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
      clubs: {
        Row: {
          created_at: string
          grad: string | null
          id: string
          legacy_id: string | null
          naziv: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          grad?: string | null
          id?: string
          legacy_id?: string | null
          naziv: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          grad?: string | null
          id?: string
          legacy_id?: string | null
          naziv?: string
          updated_at?: string
        }
        Relationships: []
      }
      player_private: {
        Row: {
          created_at: string
          email: string | null
          jmbg_enc: string | null
          player_id: string
          telefon: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          jmbg_enc?: string | null
          player_id: string
          telefon?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          jmbg_enc?: string | null
          player_id?: string
          telefon?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_private_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string
          drzava: string
          foto_url: string | null
          godiste: number | null
          id: string
          ime: string
          is_active: boolean
          itf_ipin: string | null
          kategorija: Database["public"]["Enums"]["quality_category"] | null
          klub_id: string | null
          legacy_id: string | null
          pol: Database["public"]["Enums"]["gender"] | null
          prezime: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          drzava?: string
          foto_url?: string | null
          godiste?: number | null
          id?: string
          ime: string
          is_active?: boolean
          itf_ipin?: string | null
          kategorija?: Database["public"]["Enums"]["quality_category"] | null
          klub_id?: string | null
          legacy_id?: string | null
          pol?: Database["public"]["Enums"]["gender"] | null
          prezime: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          drzava?: string
          foto_url?: string | null
          godiste?: number | null
          id?: string
          ime?: string
          is_active?: boolean
          itf_ipin?: string | null
          kategorija?: Database["public"]["Enums"]["quality_category"] | null
          klub_id?: string | null
          legacy_id?: string | null
          pol?: Database["public"]["Enums"]["gender"] | null
          prezime?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_klub_id_fkey"
            columns: ["klub_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          locale: string
          player_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          locale?: string
          player_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          locale?: string
          player_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      ranking_points: {
        Row: {
          aktivno_do: string | null
          bodovi: number
          created_at: string
          disciplina: Database["public"]["Enums"]["discipline"]
          id: string
          kategorija: string
          player_id: string
          tournament_id: string | null
        }
        Insert: {
          aktivno_do?: string | null
          bodovi?: number
          created_at?: string
          disciplina: Database["public"]["Enums"]["discipline"]
          id?: string
          kategorija: string
          player_id: string
          tournament_id?: string | null
        }
        Update: {
          aktivno_do?: string | null
          bodovi?: number
          created_at?: string
          disciplina?: Database["public"]["Enums"]["discipline"]
          id?: string
          kategorija?: string
          player_id?: string
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ranking_points_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ranking_points_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      rankings: {
        Row: {
          bodovi: number
          broj_turnira: number
          created_at: string
          disciplina: Database["public"]["Enums"]["discipline"]
          id: string
          kategorija: string
          mesto: number | null
          nedelja: string
          player_id: string
        }
        Insert: {
          bodovi?: number
          broj_turnira?: number
          created_at?: string
          disciplina: Database["public"]["Enums"]["discipline"]
          id?: string
          kategorija: string
          mesto?: number | null
          nedelja: string
          player_id: string
        }
        Update: {
          bodovi?: number
          broj_turnira?: number
          created_at?: string
          disciplina?: Database["public"]["Enums"]["discipline"]
          id?: string
          kategorija?: string
          mesto?: number | null
          nedelja?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rankings_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          aktivna: boolean
          created_at: string
          default_scoring: Database["public"]["Enums"]["scoring_model"]
          id: string
          kraj: string | null
          n_best: number
          naziv: string
          pocetak: string | null
          updated_at: string
        }
        Insert: {
          aktivna?: boolean
          created_at?: string
          default_scoring?: Database["public"]["Enums"]["scoring_model"]
          id?: string
          kraj?: string | null
          n_best?: number
          naziv: string
          pocetak?: string | null
          updated_at?: string
        }
        Update: {
          aktivna?: boolean
          created_at?: string
          default_scoring?: Database["public"]["Enums"]["scoring_model"]
          id?: string
          kraj?: string | null
          n_best?: number
          naziv?: string
          pocetak?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tournament_events: {
        Row: {
          created_at: string
          disciplina: Database["public"]["Enums"]["discipline"]
          id: string
          kategorija: string
          turnir_id: string
        }
        Insert: {
          created_at?: string
          disciplina: Database["public"]["Enums"]["discipline"]
          id?: string
          kategorija: string
          turnir_id: string
        }
        Update: {
          created_at?: string
          disciplina?: Database["public"]["Enums"]["discipline"]
          id?: string
          kategorija?: string
          turnir_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_events_turnir_id_fkey"
            columns: ["turnir_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string
          datum_do: string | null
          datum_od: string | null
          direktor_id: string | null
          id: string
          klub_id: string | null
          lat: number | null
          legacy_id: string | null
          lng: number | null
          mesto: string | null
          naziv: string
          rok_prijave: string | null
          scoring_model: Database["public"]["Enums"]["scoring_model"] | null
          season_id: string | null
          serija: Database["public"]["Enums"]["tournament_series"]
          sistem: Database["public"]["Enums"]["competition_system"]
          status: Database["public"]["Enums"]["tournament_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          datum_do?: string | null
          datum_od?: string | null
          direktor_id?: string | null
          id?: string
          klub_id?: string | null
          lat?: number | null
          legacy_id?: string | null
          lng?: number | null
          mesto?: string | null
          naziv: string
          rok_prijave?: string | null
          scoring_model?: Database["public"]["Enums"]["scoring_model"] | null
          season_id?: string | null
          serija: Database["public"]["Enums"]["tournament_series"]
          sistem?: Database["public"]["Enums"]["competition_system"]
          status?: Database["public"]["Enums"]["tournament_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          datum_do?: string | null
          datum_od?: string | null
          direktor_id?: string | null
          id?: string
          klub_id?: string | null
          lat?: number | null
          legacy_id?: string | null
          lng?: number | null
          mesto?: string | null
          naziv?: string
          rok_prijave?: string | null
          scoring_model?: Database["public"]["Enums"]["scoring_model"] | null
          season_id?: string | null
          serija?: Database["public"]["Enums"]["tournament_series"]
          sistem?: Database["public"]["Enums"]["competition_system"]
          status?: Database["public"]["Enums"]["tournament_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_direktor_id_fkey"
            columns: ["direktor_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_klub_id_fkey"
            columns: ["klub_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_player: { Args: { p_player_id: string }; Returns: undefined }
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_coordinator: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_referee: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_staff: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_tournament_director: {
        Args: { _tournament_id: string }
        Returns: boolean
      }
      my_player_candidates: {
        Args: Record<PropertyKey, never>
        Returns: {
          godiste: number
          ime: string
          klub: string
          player_id: string
          prezime: string
          zauzet: boolean
        }[]
      }
    }
    Enums: {
      app_role: "igrac" | "sudija" | "koordinator" | "admin"
      competition_system: "kvalitativni" | "starosni"
      discipline: "singl" | "dubl" | "miks"
      entry_status:
        | "prijavljen"
        | "na_cekanju"
        | "odjavljen"
        | "gost"
        | "odbijen"
      gender: "m" | "z"
      match_status:
        | "zakazan"
        | "u_toku"
        | "zavrsen"
        | "walkover"
        | "predaja"
        | "retiranje"
        | "bye"
      payment_type: "clanarina" | "kotizacija"
      quality_category: "I" | "II" | "III" | "IV" | "V"
      sanction_type: "opomena" | "oduzimanje_bodova" | "iskljucenje"
      scoring_model: "klasicni" | "svi_boduju"
      tournament_series: "s2000" | "s1000" | "s500" | "s250" | "master"
      tournament_status:
        | "najava"
        | "prijave"
        | "zreb"
        | "u_toku"
        | "zavrsen"
        | "ponovo_otvoren"
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
      app_role: ["igrac", "sudija", "koordinator", "admin"],
      competition_system: ["kvalitativni", "starosni"],
      discipline: ["singl", "dubl", "miks"],
      entry_status: ["prijavljen", "na_cekanju", "odjavljen", "gost", "odbijen"],
      gender: ["m", "z"],
      match_status: [
        "zakazan",
        "u_toku",
        "zavrsen",
        "walkover",
        "predaja",
        "retiranje",
        "bye",
      ],
      payment_type: ["clanarina", "kotizacija"],
      quality_category: ["I", "II", "III", "IV", "V"],
      sanction_type: ["opomena", "oduzimanje_bodova", "iskljucenje"],
      scoring_model: ["klasicni", "svi_boduju"],
      tournament_series: ["s2000", "s1000", "s500", "s250", "master"],
      tournament_status: [
        "najava",
        "prijave",
        "zreb",
        "u_toku",
        "zavrsen",
        "ponovo_otvoren",
      ],
    },
  },
} as const
