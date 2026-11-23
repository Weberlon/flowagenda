/**
 * ==============================================================================
 * FlowAgenda — Limites de Equipe por Plano + Upsell de Profissional Extra
 * Arquivo: lib/plan-limits.ts
 * ==============================================================================
 */

export const TETO_BASE_PROFISSIONAIS: Record<string, number> = {
  tier_1: 1,
  essencial: 1,
  tier_2: 3,
  profissional: 3,
  tier_3: 7,
  tier_3_institucional: 7,
  autoridade: 7,
};

export function obterTetoProfissionaisPlano(params: {
  tier?: string | null;
  configuracoes?: Record<string, any> | null;
}): {
  tetoBase: number;
  extrasContratados: number;
  tetoTotal: number;
} {
  const tierKey = (params.tier || 'tier_1').toLowerCase().trim();
  const tetoBase = TETO_BASE_PROFISSIONAIS[tierKey] ?? 1;
  const extrasRaw = Number(params.configuracoes?.upsells?.profissionais_extras || 0);
  const extrasContratados = Number.isFinite(extrasRaw) && extrasRaw > 0 ? Math.floor(extrasRaw) : 0;

  return {
    tetoBase,
    extrasContratados,
    tetoTotal: tetoBase + extrasContratados,
  };
}
