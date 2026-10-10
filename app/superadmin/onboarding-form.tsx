'use client';

import { useState } from 'react';
import { createTenantAction } from '@/app/actions/tenant';

export function OnboardingForm() {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setFeedback(null);
    try {
      const result = await createTenantAction(formData);
      if (result.success) {
        setFeedback({ text: result.message || 'Lojista cadastrado com sucesso!', isError: false });
      } else {
        setFeedback({ text: result.error || 'Ocorreu um erro ao cadastrar.', isError: true });
      }
    } catch (error: any) {
      setFeedback({ text: error.message || 'Falha de comunicação com o servidor.', isError: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="mx-auto w-full max-w-2xl space-y-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Novo Lojista</h2>
        <p className="text-sm text-slate-500">
          Cadastre um novo salão ou clínica no FlowAgenda.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="nome_estabelecimento" className="text-sm font-medium text-slate-900">
            Nome do Estabelecimento
          </label>
          <input
            id="nome_estabelecimento"
            name="nome_estabelecimento"
            required
            placeholder="Ex: Barbearia do Zé"
            className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="slug_subdominio" className="text-sm font-medium text-slate-900">
            Subdomínio (Slug)
          </label>
          <div className="flex items-center rounded-md border border-slate-300 px-3 focus-within:ring-2 focus-within:ring-slate-900 focus-within:ring-offset-2">
            <input
              id="slug_subdominio"
              name="slug_subdominio"
              required
              placeholder="barbeariadoze"
              className="flex h-10 w-full bg-transparent py-2 text-sm outline-none placeholder:text-slate-400"
            />
            <span className="text-sm text-slate-500">.flowagenda.online</span>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="dominio_proprio" className="text-sm font-medium text-slate-900">
            Domínio Próprio <span className="text-slate-500 font-normal">(Opcional)</span>
          </label>
          <input
            id="dominio_proprio"
            name="dominio_proprio"
            placeholder="Ex: barbeariadoze.com.br"
            className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="whatsapp_notificacao" className="text-sm font-medium text-slate-900">
            WhatsApp Lojista
          </label>
          <input
            id="whatsapp_notificacao"
            name="whatsapp_notificacao"
            placeholder="5511999999999"
            className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="tier" className="text-sm font-medium text-slate-900">
            Plano (Tier)
          </label>
          <select
            id="tier"
            name="tier"
            required
            className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            <option value="tier_1">Tier 1 (Básico)</option>
            <option value="tier_2">Tier 2 (Pro)</option>
            <option value="tier_3_institucional">Tier 3 (Institucional)</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="tipo_site" className="text-sm font-medium text-slate-900">
            Tipo de Site
          </label>
          <select
            id="tipo_site"
            name="tipo_site"
            required
            className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            <option value="landing_page">Landing Page (Compacta)</option>
            <option value="institucional_completo">Site Institucional Completo</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-10 w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-900/90 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      >
        {loading ? 'Cadastrando...' : 'Cadastrar Lojista'}
      </button>

      {feedback && (
        <div className={`mt-4 rounded-md p-4 text-sm border ${
          feedback.isError 
            ? 'bg-red-50 text-red-700 border-red-200' 
            : 'bg-green-50 text-green-700 border-green-200 font-medium'
        }`}>
          {feedback.text}
        </div>
      )}
    </form>
  );
}
