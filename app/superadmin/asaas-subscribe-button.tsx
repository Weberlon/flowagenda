'use client';

import { useState } from 'react';

interface AsaasSubscribeButtonProps {
  lojista: any;
}

export function AsaasSubscribeButton({ lojista }: AsaasSubscribeButtonProps) {
  const [loadingSubId, setLoadingSubId] = useState<string | null>(null);

  async function handleGerarAssinatura(lojistaItem: any) {
    let cpfCnpj = lojistaItem.cpf_cnpj || '';

    // Se o lojista ainda não tem ID no Asaas, solicita o CPF/CNPJ antes de disparar
    const hasValidCustomerId =
      lojistaItem.asaas_customer_id &&
      !String(lojistaItem.asaas_customer_id).startsWith('cus_mock_');

    if (!hasValidCustomerId && !cpfCnpj) {
      const input = window.prompt(
        `Informe o CPF ou CNPJ de "${lojistaItem.nome_estabelecimento}" para criar o cadastro no Asaas:`
      );
      if (!input) return;
      cpfCnpj = input;
    }

    const cicloEscolhido = window.confirm(
      'Gerar assinatura no ciclo ANUAL? (Clique em OK para Anual ou Cancelar para Mensal)'
    )
      ? 'YEARLY'
      : 'MONTHLY';

    setLoadingSubId(lojistaItem.id);
    try {
      const res = await fetch('/api/admin/asaas/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lojistaId: lojistaItem.id,
          cycle: cicloEscolhido,
          cpfCnpj,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(`Erro: ${data.error}`);
        return;
      }

      if (data.invoiceUrl) {
        await navigator.clipboard.writeText(data.invoiceUrl).catch(() => {});
        alert(
          `Assinatura criada com sucesso!\n\nLink de pagamento copiado para a área de transferência:\n${data.invoiceUrl}`
        );
      } else {
        alert('Assinatura criada no Asaas com sucesso!');
      }

      // Recarrega a lista de lojistas para atualizar asaas_subscription_id e status_pagamento
      window.location.reload();
    } catch (error) {
      alert('Falha de comunicação ao gerar assinatura.');
    } finally {
      setLoadingSubId(null);
    }
  }

  return (
    <button
      type="button"
      onClick={() => handleGerarAssinatura(lojista)}
      disabled={loadingSubId === lojista.id}
      title="Gerar Assinatura e Copiar Link de Pagamento"
      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition"
    >
      {loadingSubId === lojista.id ? 'Gerando...' : 'Gerar Cobrança'}
    </button>
  );
}

