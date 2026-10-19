/**
 * ==============================================================================
 * FlowAgenda — Validador de Slugs e Subdomínios Multi-Tenant
 * Arquivo: lib/slug-validator.ts
 * ==============================================================================
 */

/**
 * Lista de slugs e subdomínios reservados pelo sistema.
 * Impede que lojistas registrem identificadores conflitantes com rotas críticas.
 */
export const RESERVED_SLUGS = [
  'app',
  'admin',
  'api',
  'www',
  'auth',
  'login',
  'register',
  'suporte',
  'support',
  'ajuda',
  'help',
  'mail',
  'webmail',
  'blog',
  'status',
  'dashboard',
  'checkout',
  'pagamento',
  'webhook',
  'webhooks',
  'dev',
  'staging',
  'teste',
  'flowagenda',
] as const;

export type ReservedSlug = (typeof RESERVED_SLUGS)[number];

export interface SlugValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Valida se um slug cumpre todas as regras do sistema multi-tenant:
 * 1. Tamanho: mínimo de 3 e máximo de 48 caracteres.
 * 2. Formato: estritamente minúsculas alfanuméricas e hifens (sem hifens adjacentes ou nas pontas).
 * 3. Restrição: não pode ser nenhum dos termos em RESERVED_SLUGS.
 *
 * @param slug - String do slug a ser validado
 * @returns {SlugValidationResult} Objeto indicando validade e mensagem de erro se aplicável
 */
export function isValidSlug(slug: string): SlugValidationResult {
  if (!slug || typeof slug !== 'string') {
    return {
      valid: false,
      error: 'O slug é obrigatório e deve ser uma cadeia de texto válida.',
    };
  }

  const normalized = slug.trim().toLowerCase();

  // 1. Validação de Comprimento (3 a 48 caracteres)
  if (normalized.length < 3) {
    return {
      valid: false,
      error: 'O slug deve conter no mínimo 3 caracteres.',
    };
  }

  if (normalized.length > 48) {
    return {
      valid: false,
      error: 'O slug deve conter no máximo 48 caracteres.',
    };
  }

  // 2. Validação por Expressão Regular:
  // - Apenas letras minúsculas (a-z) e números (0-9)
  // - Hifens permitidos apenas entre blocos alfanuméricos (nunca no início, fim ou repetidos)
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugRegex.test(normalized)) {
    return {
      valid: false,
      error:
        'O slug deve conter apenas letras minúsculas, números e hifens simples (sem hifens no início ou fim).',
    };
  }

  // 3. Bloqueio de Slugs Reservados
  if ((RESERVED_SLUGS as readonly string[]).includes(normalized)) {
    return {
      valid: false,
      error: `O subdomínio "${normalized}" é reservado pelo sistema e não pode ser utilizado.`,
    };
  }

  return { valid: true };
}
