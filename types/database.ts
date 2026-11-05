import type { Lojista, ModoAvaliacao } from './lojista';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type { Lojista, ModoAvaliacao };

export interface Database {
  public: {
    Tables: {
      lojistas: {
        Row: Lojista;
        Insert: Partial<Lojista> & {
          nome_estabelecimento: string;
          slug_subdominio: string;
        };
        Update: Partial<Lojista>;
        Relationships: [];
      };
      [key: string]: {
        Row: Record<string, any>;
        Insert: Record<string, any>;
        Update: Record<string, any>;
        Relationships: any[];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: any;
    };
    Enums: {
      [_ in never]: any;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

