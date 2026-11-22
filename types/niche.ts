/**
 * ==============================================================================
 * FlowAgenda — Tipos de Domínio Multi-Nicho (Pets & Prontuários Visuais)
 * Arquivo: types/niche.ts
 * ==============================================================================
 */

export type EspeciePet = 'cachorro' | 'gato' | 'ave' | 'roedor' | 'outro';

export type PortePet = 'pequeno' | 'medio' | 'grande' | 'gigante';

export type DocilidadePet = 'docil' | 'agitado' | 'arisco' | 'morde';

export interface Pet {
  id: string;
  lojista_id: string;
  cliente_id: string;
  nome: string;
  especie: EspeciePet;
  raca: string | null;
  porte: PortePet | null;
  peso_kg: number | null;
  docilidade: DocilidadePet;
  alergias_observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export type TipoFichaClinica = 'odontograma' | 'mapa_estetico' | 'anamnese';

export type StatusDenteFDI =
  | 'higido'
  | 'carie'
  | 'restaurado'
  | 'ausente'
  | 'canal'
  | 'implante'
  | 'coroa'
  | 'extracao';

export interface DenteEstado {
  numero: number;
  status: StatusDenteFDI;
  observacao?: string;
  atualizado_em?: string;
}

export interface MarcadorEstetico {
  id: string;
  x: number;
  y: number;
  regiao: string;
  procedimento: string;
  observacao?: string;
  data?: string;
}

export interface FichaClinica {
  id: string;
  lojista_id: string;
  cliente_id: string;
  tipo: TipoFichaClinica;
  dados_json: {
    dentes?: Record<number, DenteEstado>;
    marcadores?: MarcadorEstetico[];
    [key: string]: unknown;
  };
  observacoes_gerais?: string | null;
  created_at: string;
  updated_at: string;
}
