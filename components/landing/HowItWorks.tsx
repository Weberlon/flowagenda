'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { QrCode, Sliders, Bot, ArrowRight, ShieldCheck } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Conecte seu WhatsApp em 60 segundos',
      description:
        'Aponte a câmera do seu celular para o QR Code no painel do FlowAgenda. Funciona no seu número atual, sem precisar comprar outro chip e sem perder suas conversas.',
      badge: 'Sem complicação',
      icon: QrCode,
      color: '#88C0D0',
    },
    {
      number: '02',
      title: 'Cadastre seus serviços e horários',
      description:
        'Defina a duração dos procedimentos, os valores e os profissionais da equipe. Nossa equipe de implantação também pode configurar tudo para você no setup assistido.',
      badge: 'Grade flexível',
      icon: Sliders,
      color: '#81A1C1',
    },
    {
      number: '03',
      title: 'A Secretária IA assume o atendimento',
      description:
        'O robô atende clientes 24h por dia, responde dúvidas sobre preços, envia o link direto, valida o horário com código PIN e dispara lembretes automáticos prévios.',
      badge: 'Tração 24/7',
      icon: Bot,
      color: '#A3BE8C',
    },
  ];

  return (
    <section id="como-funciona" className="relative py-20 sm:py-28 bg-[#242933] overflow-hidden border-t border-[#3B4252]/60">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho da Seção */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#2E3440]/90 px-4 py-1.5 text-xs font-semibold text-[#88C0D0] mb-4 backdrop-blur-xl shadow-sm"
          >
            <span className="h-2 w-2 rounded-full bg-[#88C0D0] animate-pulse" />
            Processo Simples & Prático
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#ECEFF4] tracking-tight leading-tight"
          >
            Como o FlowAgenda transforma sua operação em{' '}
            <span className="text-[#88C0D0]">3 etapas simples</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-sm sm:text-base text-[#D8DEE9]/80 mt-4 leading-relaxed"
          >
            Esqueça softwares complexos que exigem semanas de treinamento. Em poucos minutos seu WhatsApp já estará respondendo e agendando de forma 100% autônoma.
          </motion.p>
        </div>

        {/* 3 Cards de Etapas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="group relative rounded-3xl border border-[#3B4252] bg-gradient-to-br from-[#2E3440] to-[#2E3440]/80 p-7 sm:p-8 shadow-xl hover:border-[#88C0D0]/40 transition-all hover:-translate-y-1"
              >
                {/* Linha de Conexão no Topo */}
                <div className="flex items-center justify-between mb-6">
                  <span className="font-mono text-3xl font-black text-[#88C0D0]/40 group-hover:text-[#88C0D0] transition-colors">
                    {step.number}
                  </span>
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] shadow-md group-hover:scale-105 transition-transform"
                    style={{ backgroundColor: `${step.color}15`, borderColor: `${step.color}35`, color: step.color }}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                </div>

                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider mb-3 bg-[#3B4252] text-[#88C0D0] border border-[#4C566A]/50">
                  {step.badge}
                </span>

                <h3 className="text-xl font-bold text-[#ECEFF4] tracking-tight mb-3">
                  {step.title}
                </h3>

                <p className="text-xs sm:text-sm text-[#D8DEE9]/80 leading-relaxed font-normal">
                  {step.description}
                </p>

                <div className="pt-6 mt-6 border-t border-[#3B4252]/60 flex items-center gap-2 text-xs font-semibold text-[#88C0D0]">
                  <span>Passo {index + 1} de 3</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Banner de Garantia */}
        <div className="mt-12 rounded-2xl border border-[#A3BE8C]/30 bg-[#A3BE8C]/10 p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#A3BE8C]/20 text-[#A3BE8C]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#ECEFF4]">Configuração 100% assistida pela nossa equipe</p>
              <p className="text-xs text-[#D8DEE9]/80">Se preferir, nós cuidamos de toda a parametrização inicial para você sem custo extra.</p>
            </div>
          </div>
          <span className="shrink-0 text-xs font-mono font-bold text-[#A3BE8C] bg-[#2E3440] px-3 py-1.5 rounded-xl border border-[#A3BE8C]/40">
            Suporte Humanizado
          </span>
        </div>
      </div>
    </section>
  );
}