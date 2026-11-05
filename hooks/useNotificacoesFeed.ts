'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

export interface Notificacao {
  id: string;
  lojista_id: string;
  agendamento_id?: string | null;
  cliente_nome: string | null;
  cliente_telefone: string | null;
  tipo_evento: string;
  conteudo: string;
  lida: boolean;
  created_at: string;
}

export function useNotificacoesFeed(lojistaId: string) {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const supabase = createClient();

  const carregarNotificacoes = useCallback(async () => {
    if (!lojistaId) return;

    const { data, error } = await supabase
      .from('painel_notificacoes')
      .select('*')
      .eq('lojista_id', lojistaId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (!error && data) {
      setNotificacoes(data as Notificacao[]);
    }
    setCarregando(false);
  }, [lojistaId, supabase]);

  useEffect(() => {
    carregarNotificacoes();

    if (!lojistaId) return;

    const canal = supabase
      .channel(`realtime:painel_notificacoes:${lojistaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'painel_notificacoes',
          filter: `lojista_id=eq.${lojistaId}`,
        },
        (payload) => {
          const novaNotificacao = payload.new as Notificacao;
          setNotificacoes((prev) => [novaNotificacao, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'painel_notificacoes',
          filter: `lojista_id=eq.${lojistaId}`,
        },
        (payload) => {
          const atualizada = payload.new as Notificacao;
          setNotificacoes((prev) =>
            prev.map((item) => (item.id === atualizada.id ? atualizada : item))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [lojistaId, supabase, carregarNotificacoes]);

  const marcarComoLida = async (notificacaoId: string) => {
    setNotificacoes((prev) =>
      prev.map((item) => (item.id === notificacaoId ? { ...item, lida: true } : item))
    );

    await supabase
      .from('painel_notificacoes')
      .update({ lida: true })
      .eq('id', notificacaoId);
  };

  const totalNaoLidas = notificacoes.filter((n) => !n.lida).length;

  return { notificacoes, carregando, totalNaoLidas, marcarComoLida };
}

