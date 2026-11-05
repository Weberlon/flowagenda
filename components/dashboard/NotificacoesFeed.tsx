'use client';

import { useState } from 'react';
import { useNotificacoesFeed } from '@/hooks/useNotificacoesFeed';

interface NotificacoesFeedProps {
  lojistaId: string;
}

export function NotificacoesFeed({ lojistaId }: NotificacoesFeedProps) {
  const [aberto, setAberto] = useState(false);
  const { notificacoes, totalNaoLidas, marcarComoLida } = useNotificacoesFeed(lojistaId);

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setAberto(!aberto)}
        className="relative p-2.5 rounded-xl bg-[#3B4252] text-[#ECEFF4] hover:bg-[#434C5E] transition-colors focus:outline-none focus:ring-2 focus:ring-[#88C0D0]/50"
        aria-label="Notificações"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {totalNaoLidas > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#BF616A] text-[10px] font-bold text-white shadow-md animate-pulse">
            {totalNaoLidas > 9 ? '9+' : totalNaoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 mt-3 w-80 md:w-96 rounded-2xl bg-[#2E3440] border border-[#4C566A] shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#3B4252] bg-[#3B4252]/50">
            <h3 className="text-sm font-semibold text-[#ECEFF4]">Alertas de Mensagens</h3>
            <span className="text-xs font-mono text-[#88C0D0]">
              {totalNaoLidas} pendente{totalNaoLidas === 1 ? '' : 's'}
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-[#3B4252]">
            {notificacoes.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#D8DEE9]/60">
                Nenhum alerta recebido até o momento.
              </div>
            ) : (
              notificacoes.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 transition-colors ${
                    item.lida ? 'bg-[#2E3440]' : 'bg-[#3B4252]/30 border-l-4 border-[#88C0D0]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-[#88C0D0]">
                        {item.cliente_nome || item.cliente_telefone || 'Cliente'}
                      </span>
                      {item.tipo_evento && (
                        <span className="text-[10px] uppercase font-mono text-[#EBCB8B]">
                          {item.tipo_evento}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#D8DEE9]/50 font-mono">
                      {new Date(item.created_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-[#ECEFF4] leading-relaxed break-words">
                    {item.conteudo}
                  </p>

                  <div className="mt-2.5 flex items-center justify-end gap-2">
                    {item.cliente_telefone && (
                      <a
                        href={`https://wa.me/${item.cliente_telefone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-medium text-[#A3BE8C] hover:underline"
                      >
                        Responder no WhatsApp →
                      </a>
                    )}
                    {!item.lida && (
                      <button
                        onClick={() => marcarComoLida(item.id)}
                        className="text-[11px] font-medium text-[#D8DEE9]/70 hover:text-[#ECEFF4] ml-2"
                      >
                        Marcar como lida
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

