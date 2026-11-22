'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  Scissors,
  Users,
  Settings,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { NotificacoesFeed } from '@/components/dashboard/NotificacoesFeed';

interface DashboardHeaderNavProps {
  lojista: {
    id: string;
    nome_estabelecimento: string;
    slug_subdominio?: string;
    tier: string;
  };
  userEmail?: string;
}

export function DashboardHeaderNav({ lojista, userEmail }: DashboardHeaderNavProps) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { href: '/dashboard', label: 'Agenda & Métricas', icon: Calendar },
    { href: '/dashboard/servicos', label: 'Serviços', icon: Scissors },
    { href: '/dashboard/clientes', label: 'Clientes (CRM)', icon: Users },
    { href: '/dashboard/configuracoes', label: 'Configurações IA', icon: Settings },
  ];

  return (
    <>
      {/* Header Principal */}
      <header className="relative z-30 flex h-16 items-center justify-between border-b border-[#3B4252] bg-[#2E3440] px-4 sm:px-6 shadow-sm">
        <div className="flex items-center gap-3">
          {/* Botão Hambúrguer Mobile */}
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-[#4C566A] bg-[#242933] text-[#ECEFF4] hover:bg-[#3B4252] transition-colors"
            aria-label="Abrir menu de navegação"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#ECEFF4] truncate max-w-[200px] sm:max-w-md">
              {lojista.nome_estabelecimento}
            </h2>
            {lojista.slug_subdominio && (
              <a
                href={`https://${lojista.slug_subdominio}.flowagenda.online`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-[#88C0D0] hover:underline"
              >
                <span>{lojista.slug_subdominio}.flowagenda.online</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <NotificacoesFeed lojistaId={lojista.id} />
          {userEmail && (
            <div className="text-xs sm:text-sm font-medium text-[#88C0D0] font-mono truncate max-w-[140px] sm:max-w-xs">
              {userEmail}
            </div>
          )}
        </div>
      </header>

      {/* Drawer Mobile (Slide-over) */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer Painel */}
          <div className="relative flex flex-col w-72 max-w-[85vw] bg-[#242933] border-r border-[#3B4252] text-[#ECEFF4] shadow-2xl p-5 space-y-6 z-10">
            {/* Topo do Drawer */}
            <div className="flex items-center justify-between pb-4 border-b border-[#3B4252]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#88C0D0] to-[#81A1C1] text-[#242933] font-black">
                  <Calendar className="h-5 w-5" />
                </div>
                <span className="font-bold text-base text-[#ECEFF4]">FlowAgenda</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#4C566A] bg-[#2E3440] text-[#D8DEE9] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Informações do Estabelecimento */}
            <div className="rounded-xl border border-[#3B4252] bg-[#2E3440] p-3 text-xs space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#D8DEE9]/60">
                Estabelecimento
              </span>
              <p className="font-semibold text-[#ECEFF4] truncate">{lojista.nome_estabelecimento}</p>
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#88C0D0]/15 text-[#88C0D0] border border-[#88C0D0]/30">
                Plano {lojista.tier.toUpperCase().replace('_', ' ')}
              </span>
            </div>

            {/* Links de Navegação Mobile */}
            <nav className="space-y-1.5 flex-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileDrawerOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-xs sm:text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-[#88C0D0] text-[#242933] shadow-md font-bold'
                        : 'text-[#D8DEE9] hover:bg-[#3B4252] hover:text-[#ECEFF4]'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Rodapé do Drawer */}
            <div className="pt-4 border-t border-[#3B4252] space-y-3 text-xs">
              {lojista.slug_subdominio && (
                <a
                  href={`https://${lojista.slug_subdominio}.flowagenda.online`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-xl border border-[#4C566A] bg-[#2E3440] px-3 py-2 text-[11px] text-[#88C0D0] font-semibold"
                >
                  <span>Abrir Página Pública</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}

              <div className="text-[11px] text-[#D8DEE9]/60 text-center">
                Secretária IA Conectada • 24/7
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}