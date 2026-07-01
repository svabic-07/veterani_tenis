/**
 * Supabase generisani tipovi.
 * Regeneriše se komandom (posle migracija):
 *   pnpm db:types
 * ili preko Supabase MCP `generate_typescript_types`.
 *
 * Privremeni placeholder dok se ne kreira šema.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
