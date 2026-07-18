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
      audit_log: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          details: Json | null
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          details?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          details?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      category_change_requests: {
        Row: {
          created_at: string
          id: string
          obrazlozenje: string | null
          player_id: string
          reseno_at: string | null
          resio_by: string | null
          status: Database["public"]["Enums"]["request_status"]
          trazena_kat: Database["public"]["Enums"]["quality_category"]
          trenutna_kat: Database["public"]["Enums"]["quality_category"] | null
        }
        Insert: {
          created_at?: string
          id?: string
          obrazlozenje?: string | null
          player_id: string
          reseno_at?: string | null
          resio_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          trazena_kat: Database["public"]["Enums"]["quality_category"]
          trenutna_kat?: Database["public"]["Enums"]["quality_category"] | null
        }
        Update: {
          created_at?: string
          id?: string
          obrazlozenje?: string | null
          player_id?: string
          reseno_at?: string | null
          resio_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          trazena_kat?: Database["public"]["Enums"]["quality_category"]
          trenutna_kat?: Database["public"]["Enums"]["quality_category"] | null
        }
        Relationships: [
          {
            foreignKeyName: "category_change_requests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
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
      draws: {
        Row: {
          broj_nosilaca: number
          created_at: string
          event_id: string
          id: string
          kostur: number | null
          rng_seed: string | null
          seed_izvor: Json | null
          status: Database["public"]["Enums"]["draw_status"]
          tip: Database["public"]["Enums"]["draw_type"]
          updated_at: string
        }
        Insert: {
          broj_nosilaca?: number
          created_at?: string
          event_id: string
          id?: string
          kostur?: number | null
          rng_seed?: string | null
          seed_izvor?: Json | null
          status?: Database["public"]["Enums"]["draw_status"]
          tip: Database["public"]["Enums"]["draw_type"]
          updated_at?: string
        }
        Update: {
          broj_nosilaca?: number
          created_at?: string
          event_id?: string
          id?: string
          kostur?: number | null
          rng_seed?: string | null
          seed_izvor?: Json | null
          status?: Database["public"]["Enums"]["draw_status"]
          tip?: Database["public"]["Enums"]["draw_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "draws_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "player_podiums"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "draws_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "tournament_events"
            referencedColumns: ["id"]
          },
        ]
      }
      entries: {
        Row: {
          bodovi_snapshot: number | null
          created_at: string
          event_id: string
          id: string
          partner_id: string | null
          player_id: string
          seed: number | null
          status: Database["public"]["Enums"]["entry_status"]
          updated_at: string
        }
        Insert: {
          bodovi_snapshot?: number | null
          created_at?: string
          event_id: string
          id?: string
          partner_id?: string | null
          player_id: string
          seed?: number | null
          status?: Database["public"]["Enums"]["entry_status"]
          updated_at?: string
        }
        Update: {
          bodovi_snapshot?: number | null
          created_at?: string
          event_id?: string
          id?: string
          partner_id?: string | null
          player_id?: string
          seed?: number | null
          status?: Database["public"]["Enums"]["entry_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "player_podiums"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "tournament_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      match_sets: {
        Row: {
          gem1: number
          gem2: number
          id: string
          match_id: string
          set_no: number
          tb1: number | null
          tb2: number | null
        }
        Insert: {
          gem1: number
          gem2: number
          id?: string
          match_id: string
          set_no: number
          tb1?: number | null
          tb2?: number | null
        }
        Update: {
          gem1?: number
          gem2?: number
          id?: string
          match_id?: string
          set_no?: number
          tb1?: number | null
          tb2?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_sets_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          draw_id: string
          grupa: string | null
          id: string
          kolo: number
          next_match_id: string | null
          next_slot: number | null
          partner1_id: string | null
          partner2_id: string | null
          player1_id: string | null
          player2_id: string | null
          pozicija: number
          seed1: number | null
          seed2: number | null
          status: Database["public"]["Enums"]["match_status"]
          teren: string | null
          termin: string | null
          updated_at: string
          winner_slot: number | null
        }
        Insert: {
          created_at?: string
          draw_id: string
          grupa?: string | null
          id?: string
          kolo: number
          next_match_id?: string | null
          next_slot?: number | null
          partner1_id?: string | null
          partner2_id?: string | null
          player1_id?: string | null
          player2_id?: string | null
          pozicija: number
          seed1?: number | null
          seed2?: number | null
          status?: Database["public"]["Enums"]["match_status"]
          teren?: string | null
          termin?: string | null
          updated_at?: string
          winner_slot?: number | null
        }
        Update: {
          created_at?: string
          draw_id?: string
          grupa?: string | null
          id?: string
          kolo?: number
          next_match_id?: string | null
          next_slot?: number | null
          partner1_id?: string | null
          partner2_id?: string | null
          player1_id?: string | null
          player2_id?: string | null
          pozicija?: number
          seed1?: number | null
          seed2?: number | null
          status?: Database["public"]["Enums"]["match_status"]
          teren?: string | null
          termin?: string | null
          updated_at?: string
          winner_slot?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_draw_id_fkey"
            columns: ["draw_id"]
            isOneToOne: false
            referencedRelation: "draws"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_next_match_id_fkey"
            columns: ["next_match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_partner1_id_fkey"
            columns: ["partner1_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_partner2_id_fkey"
            columns: ["partner2_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          autor: string | null
          created_at: string
          id: string
          naslov: string
          objavljena: boolean
          sadrzaj: string
          updated_at: string
        }
        Insert: {
          autor?: string | null
          created_at?: string
          id?: string
          naslov: string
          objavljena?: boolean
          sadrzaj: string
          updated_at?: string
        }
        Update: {
          autor?: string | null
          created_at?: string
          id?: string
          naslov?: string
          objavljena?: boolean
          sadrzaj?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          created_at: string
          created_by: string | null
          datum: string
          id: string
          iznos: number
          napomena: string | null
          player_id: string
          sezona: number
          tip: Database["public"]["Enums"]["payment_type"]
          turnir_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          datum?: string
          id?: string
          iznos: number
          napomena?: string | null
          player_id: string
          sezona: number
          tip: Database["public"]["Enums"]["payment_type"]
          turnir_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          datum?: string
          id?: string
          iznos?: number
          napomena?: string | null
          player_id?: string
          sezona?: number
          tip?: Database["public"]["Enums"]["payment_type"]
          turnir_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_turnir_id_fkey"
            columns: ["turnir_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
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
      scoring_tables: {
        Row: {
          bodovi: number
          created_at: string
          id: string
          kolo: string
          kostur: number
          model: Database["public"]["Enums"]["scoring_model"]
          serija: Database["public"]["Enums"]["tournament_series"]
          updated_at: string
        }
        Insert: {
          bodovi: number
          created_at?: string
          id?: string
          kolo: string
          kostur: number
          model?: Database["public"]["Enums"]["scoring_model"]
          serija: Database["public"]["Enums"]["tournament_series"]
          updated_at?: string
        }
        Update: {
          bodovi?: number
          created_at?: string
          id?: string
          kolo?: string
          kostur?: number
          model?: Database["public"]["Enums"]["scoring_model"]
          serija?: Database["public"]["Enums"]["tournament_series"]
          updated_at?: string
        }
        Relationships: []
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
          direktor_ime: string | null
          domacin: string | null
          id: string
          klub_id: string | null
          kontakt: string | null
          lat: number | null
          legacy_id: string | null
          lng: number | null
          lokacija: string | null
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
          direktor_ime?: string | null
          domacin?: string | null
          id?: string
          klub_id?: string | null
          kontakt?: string | null
          lat?: number | null
          legacy_id?: string | null
          lng?: number | null
          lokacija?: string | null
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
          direktor_ime?: string | null
          domacin?: string | null
          id?: string
          klub_id?: string | null
          kontakt?: string | null
          lat?: number | null
          legacy_id?: string | null
          lng?: number | null
          lokacija?: string | null
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
      player_podiums: {
        Row: {
          disciplina: Database["public"]["Enums"]["discipline"] | null
          event_id: string | null
          kategorija: string | null
          mesto: number | null
          player_id: string | null
          turnir_id: string | null
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
    }
    Functions: {
      admin_list_referees: {
        Args: never
        Returns: {
          email: string
          ime: string
          player_id: string
        }[]
      }
      admin_list_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          player_ime: string
          roles: string[]
          user_id: string
        }[]
      }
      admin_recalc_rankings: { Args: never; Returns: undefined }
      admin_update_player: {
        Args: {
          _email: string
          _godiste: number
          _ime: string
          _is_active: boolean
          _kategorija: Database["public"]["Enums"]["quality_category"]
          _klub_id: string
          _player_id: string
          _prezime: string
          _telefon: string
        }
        Returns: undefined
      }
      assign_tournament_director: {
        Args: {
          _direktor_ime?: string
          _player_id: string
          _tournament_id: string
        }
        Returns: undefined
      }
      can_manage_event: { Args: { _event_id: string }; Returns: boolean }
      can_self_enter_event: { Args: { _event_id: string }; Returns: boolean }
      claim_player: { Args: { p_player_id: string }; Returns: undefined }
      clear_match_result: { Args: { _match_id: string }; Returns: undefined }
      finish_tournament: {
        Args: { _tournament_id: string }
        Returns: undefined
      }
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_coordinator: { Args: never; Returns: boolean }
      is_referee: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      is_tournament_director: {
        Args: { _tournament_id: string }
        Returns: boolean
      }
      log_audit: {
        Args: {
          _action: string
          _details?: Json
          _entity: string
          _entity_id: string
        }
        Returns: undefined
      }
      merge_players: {
        Args: { _dup: string; _keep: string }
        Returns: undefined
      }
      my_player_candidates: {
        Args: never
        Returns: {
          godiste: number
          ime: string
          klub: string
          player_id: string
          prezime: string
          zauzet: boolean
        }[]
      }
      my_player_id: { Args: never; Returns: string }
      publish_news: {
        Args: { _naslov: string; _sadrzaj: string; _turnir_id?: string }
        Returns: undefined
      }
      recalc_weekly_rankings: { Args: never; Returns: undefined }
      reopen_tournament: {
        Args: { _tournament_id: string }
        Returns: undefined
      }
      request_category_change: {
        Args: {
          _obrazlozenje?: string
          _trazena: Database["public"]["Enums"]["quality_category"]
        }
        Returns: undefined
      }
      resolve_category_change: {
        Args: { _approve: boolean; _request_id: string }
        Returns: undefined
      }
      revoke_draw: { Args: { _draw_id: string }; Returns: undefined }
      set_referee_role: {
        Args: { _grant: boolean; _user_id: string }
        Returns: undefined
      }
      update_scoring_points: { Args: { _updates: Json }; Returns: number }
    }
    Enums: {
      app_role: "igrac" | "sudija" | "koordinator" | "admin"
      competition_system: "kvalitativni" | "starosni"
      discipline: "singl" | "dubl" | "miks"
      draw_status: "radna" | "objavljen" | "zakljucan" | "opozvan"
      draw_type: "eliminacija" | "grupa" | "grupa5"
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
      request_status: "na_cekanju" | "odobren" | "odbijen"
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
      draw_status: ["radna", "objavljen", "zakljucan", "opozvan"],
      draw_type: ["eliminacija", "grupa", "grupa5"],
      entry_status: [
        "prijavljen",
        "na_cekanju",
        "odjavljen",
        "gost",
        "odbijen",
      ],
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
      request_status: ["na_cekanju", "odobren", "odbijen"],
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
