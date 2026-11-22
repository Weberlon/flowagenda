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
  | 'tratamento'
  | 'concluido'
  | 'atencao'
  | 'ausente'
  | 'implante';

export interface DenteEstado {
  numero: number;
  status: StatusDenteFDI;
  observacao?: string;
  atualizado_em?: string;
}

export type VistaMapaEstetico = 'facial' | 'corporal_frente' | 'corporal_costas';

export interface MarcadorEstetico {
  id: string;
  vista: VistaMapaEstetico;
  x: number;
  y: number;
  procedimento: string;
  produtoOuDose?: string;
  observacao?: string;
  dataRegistro: string;
}

export interface FichaHistoricoItem {
  id: string;
  data: string;
  resumo: string;
}

export interface AnamneseOdonto {
  alergias?: string;
  condicoesMedicas?: string;
  medicacoesEmUso?: string;
  alertaCritico?: boolean;
}

export type StatusPlanoTratamento = 'orcado' | 'aprovado' | 'concluido';

export interface ItemPlanoTratamento {
  id: string;
  denteOuRegiao: string;
  procedimento: string;
  valorEstimado: number;
  status: StatusPlanoTratamento;
}

export interface ExameClinicoItem {
  id: string;
  titulo: string;
  linkOuLocal: string;
  dataExame: string;
}

export interface FichaClinica {
  id: string;
  lojista_id: string;
  cliente_id: string;
  tipo_ficha: TipoFichaClinica;
  dados_json: {
    dentes?: Record<string, DenteEstado>;
    marcadores?: MarcadorEstetico[];
    historico?: FichaHistoricoItem[];
    anamnese?: AnamneseOdonto;
    planoTratamento?: ItemPlanoTratamento[];
    retornoPrevisto?: string;
    exames?: ExameClinicoItem[];
    [key: string]: unknown;
  };
  observacoes_gerais?: string | null;
  created_at: string;
  updated_at: string;
}
