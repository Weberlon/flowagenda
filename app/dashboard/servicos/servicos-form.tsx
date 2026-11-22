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
      const form = document.getElementById('servico-form') as HTMLFormElement;
      form?.reset();
      router.refresh();
    } catch (error: any) {
      alert(error?.message || 'Erro ao salvar serviço.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form id="servico-form" action={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="nome_servico" className="text-xs font-bold uppercase tracking-wider text-[#D8DEE9]">
          Nome do Serviço
        </label>
        <input
          id="nome_servico"
          name="nome_servico"
          required
          placeholder="Ex: Corte Masculino ou Limpeza"
          className="flex h-10 w-full rounded-xl border border-[#4C566A] bg-[#242933] px-3 py-2 text-sm text-[#ECEFF4] placeholder:text-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none focus:ring-1 focus:ring-[#88C0D0]"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="duracao_minutos" className="text-xs font-bold uppercase tracking-wider text-[#D8DEE9]">
          Duração na Grade
        </label>
        <select
          id="duracao_minutos"
          name="duracao_minutos"
          required
          className="flex h-10 w-full rounded-xl border border-[#4C566A] bg-[#242933] px-3 py-2 text-sm text-[#ECEFF4] focus:border-[#88C0D0] focus:outline-none focus:ring-1 focus:ring-[#88C0D0]"
        >
          <option value="15" className="bg-[#242933] text-[#ECEFF4]">15 Minutos</option>
          <option value="30" className="bg-[#242933] text-[#ECEFF4]">30 Minutos</option>
          <option value="45" className="bg-[#242933] text-[#ECEFF4]">45 Minutos</option>
          <option value="60" className="bg-[#242933] text-[#ECEFF4]">60 Minutos</option>
        </select>
        <p className="text-[11px] text-[#D8DEE9]/60">
          Determina os blocos de horário calculados para a agenda online.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="preco" className="text-xs font-bold uppercase tracking-wider text-[#D8DEE9]">
          Preço (R$)
        </label>
        <input
          id="preco"
          name="preco"
          type="number"
          step="0.01"
          required
          placeholder="50.00"
          className="flex h-10 w-full rounded-xl border border-[#4C566A] bg-[#242933] px-3 py-2 text-sm text-[#ECEFF4] placeholder:text-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none focus:ring-1 focus:ring-[#88C0D0]"
        />
      </div>

      <div className="flex items-center space-x-2 pt-2">
        <input
          type="checkbox"
          id="ativo"
          name="ativo"
          defaultChecked
          className="h-4 w-4 rounded border-[#4C566A] bg-[#242933] text-[#88C0D0] focus:ring-[#88C0D0]"
        />
        <label htmlFor="ativo" className="text-xs font-medium text-[#ECEFF4]">
          Serviço ativo (visível para clientes no link)
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#88C0D0] px-4 py-2 text-xs font-bold text-[#242933] hover:bg-[#88C0D0]/90 transition-colors shadow-md disabled:opacity-50"
      >
        {loading ? 'Salvando...' : 'Adicionar Serviço'}
      </button>
    </form>
  );
}