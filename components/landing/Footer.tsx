'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, ShieldCheck, Heart } from 'lucide-react';
import { CONTACT_CONFIG } from '@/config/contact';

interface FooterProps {
  whatsappConsultorUrl?: string;
}

export default function Footer({ whatsappConsultorUrl }: FooterProps) {
  const consultorUrl =
    whatsappConsultorUrl ||
    CONTACT_CONFIG.getUrl(CONTACT_CONFIG.getActivationMessage());

  const anoAtual = new Date().getFullYear();

  return (
    <footer className="border-t border-[#3B4252] bg-[#1E232A] text-[#ECEFF4] pt-16 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Coluna 1 & 2: Identidade e Proposta */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#88C0D0] to-[#81A1C1] text-[#242933] font-black shadow-md">
                <Calendar className="h-5 w-5" />
              </div>
              <span className="text-xl font-black tracking-tight text-[#ECEFF4]">FlowAgenda</span>
            </Link>

            <p className="text-xs sm:text-sm text-[#D8DEE9]/80 leading-relaxed max-w-sm font-normal">
              A plataforma definitiva de atendimento autônomo e agendamento via WhatsApp para negócios locais. Agenda cheia, zero furos e clientes fidelizados 24 horas por dia.
            </p>

            <div className="flex items-center gap-2 text-xs font-mono text-[#A3BE8C]">
              <span className="h-2 w-2 rounded-full bg-[#A3BE8C] animate-pulse" />
              <span>Sistemas operando em 100% de normalidade</span>
            </div>
          </div>

          {/* Coluna 3: Navegação Rápida */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#D8DEE9]/60 font-mono">
              Navegação
            </h4>
            <ul className="space-y-2 text-xs text-[#D8DEE9]/80">
              <li>
                <a href="#como-funciona" className="hover:text-[#88C0D0] transition-colors">
                  Como Funciona
                </a>
              </li>
              <li>
                <a href="#motor" className="hover:text-[#88C0D0] transition-colors">
                  Motor de Tração
                </a>
              </li>
              <li>
                <a href="#nichos" className="hover:text-[#88C0D0] transition-colors">
                  Nichos Atendidos
                </a>
              </li>
              <li>
                <a href="#depoimentos" className="hover:text-[#88C0D0] transition-colors">
                  Depoimentos
                </a>
              </li>
              <li>
                <a href="#planos" className="hover:text-[#88C0D0] transition-colors">
                  Planos & Preços
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-[#88C0D0] transition-colors">
                  Perguntas Frequentes
                </a>
              </li>
            </ul>
          </div>

          {/* Coluna 4: Segmentos */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#D8DEE9]/60 font-mono">
              Segmentos
            </h4>
            <ul className="space-y-2 text-xs text-[#D8DEE9]/80">
              <li>Barbearias & Navalha</li>
              <li>Salões de Beleza & Cabelo</li>
              <li>Clínicas de Estética & Biomedicina</li>
              <li>Consultórios Odontológicos</li>
              <li>Pet Shops & Banho e Tosa</li>
              <li>Estúdios de Tatuagem & Piercing</li>
            </ul>
          </div>

          {/* Coluna 5: Acesso & Suporte */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#D8DEE9]/60 font-mono">
              Acesso & Atendimento
            </h4>
            <ul className="space-y-2 text-xs text-[#D8DEE9]/80">
              <li>
                <Link href="/login" className="hover:text-[#88C0D0] transition-colors font-semibold text-[#ECEFF4]">
                  → Login do Lojista
                </Link>
              </li>
              <li>
                <a
                  href={consultorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#88C0D0] transition-colors"
                >
                  Suporte Comercial WhatsApp
                </a>
              </li>
              <li>
                <span className="text-[11px] text-[#D8DEE9]/60 block pt-2">
                  Processamento financeiro homologado via <strong>Asaas IP S.A.</strong>
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Linha Inferior com Copyright e Políticas */}
        <div className="pt-8 border-t border-[#3B4252]/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#D8DEE9]/60">
          <p>© {anoAtual} FlowAgenda. Todos os direitos reservados. Feito para o Brasil.</p>

          <div className="flex items-center gap-6">
            <span>Privacidade & Dados Protegidos (LGPD)</span>
            <span>Termos de Uso</span>
          </div>
        </div>
      </div>
    </footer>
  );
}