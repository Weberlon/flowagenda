'use client';

import { useState } from 'react';
import { addServicoAction } from '@/app/actions/dashboard';
import { useRouter } from 'next/navigation';

export function ServicosForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
      await addServicoAction(formData);
      // Reset form na mão (poderia usar useRef)
      const form = document.getElementById('servico-form') as HTMLFormElement;
      form.reset();
      router.refresh();
    } catch (error) {
      alert('Erro ao salvar serviço.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form id="servico-form" action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="nome_servico" className="text-sm font-medium text-slate-900">
          Nome do Serviço
        </label>
        <input
          id="nome_servico"
          name="nome_servico"
          required
          placeholder="Ex: Corte de Cabelo"
          className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="duracao_minutos" className="text-sm font-medium text-slate-900">
          Duração (Minutos)
        </label>
        <select
          id="duracao_minutos"
          name="duracao_minutos"
          required
          className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
        >
          <option value="15">15 Minutos</option>
          <option value="30">30 Minutos</option>
          <option value="45">45 Minutos</option>
          <option value="60">60 Minutos</option>
        </select>
        <p className="text-xs text-slate-500">A duração determina as lacunas de tempo visíveis na agenda para o cliente.</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="preco" className="text-sm font-medium text-slate-900">
          Preço (R$)
        </label>
        <input
          id="preco"
          name="preco"
          type="number"
          step="0.01"
          required
          placeholder="45.00"
          className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
        />
      </div>

      <div className="flex items-center space-x-2 pt-2">
        <input
          type="checkbox"
          id="ativo"
          name="ativo"
          defaultChecked
          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
        />
        <label htmlFor="ativo" className="text-sm font-medium text-slate-900">
          Serviço Ativo (Visível para agendamento)
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-900/90 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      >
        {loading ? 'Salvando...' : 'Salvar Serviço'}
      </button>
    </form>
  );
}
