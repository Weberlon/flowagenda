'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FaqItem[] = [
    {
      question: 'Preciso deixar o meu computador ou celular ligado o dia todo?',
      answer:
        'Não! O FlowAgenda opera 100% em servidores cloud de alta performance. Uma vez conectado o WhatsApp via QR Code, o robô atende seus clientes mesmo que seu celular esteja desligado, descarregado ou sem sinal de internet.',
    },
    {
      question: 'Funciona no meu número de WhatsApp atual ou preciso de um novo chip?',
      answer:
        'Funciona perfeitamente no seu número atual (comum ou WhatsApp Business). Você não precisa trocar de número, não perde seus contatos e continua usando o WhatsApp normalmente no seu celular para falar com amigos e família.',
    },
    {
      question: 'O meu cliente precisa baixar algum aplicativo para agendar?',
      answer:
        'Zero aplicativo. Seu cliente recebe o link direto na conversa do WhatsApp e agenda em menos de 30 segundos pelo próprio navegador do celular. O fluxo foi desenhado para ser tão simples que qualquer pessoa, de qualquer idade, consegue agendar sem dificuldades.',
    },
    {
      question: 'O FlowAgenda cobra comissão ou porcentagem sobre os meus atendimentos?',
      answer:
        'Nunca. Você paga apenas o valor fixo da sua assinatura mensal, sem surpresas e sem taxas escondidas. 100% do valor que você recebe dos seus clientes (em Pix, cartão ou dinheiro) fica no seu bolso.',
    },
    {
      question: 'Como funciona a taxa de implantação/setup assistido?',
      answer:
        'Nossa equipe de especialistas configura sua tabela de horários, cadastra seus serviços com durações e valores corretos, personaliza a página com seu logotipo/cores e realiza o primeiro teste de pareamento no WhatsApp. Nos planos Semestral e Anual, o Setup é bonificado com desconto ou 100% grátis.',
    },
    {
      question: 'Existe contrato de fidelidade forçada ou multa por cancelamento?',
      answer:
        'Não. Você pode cancelar sua assinatura a qualquer momento diretamente pelo painel ou com nosso suporte, sem multas, sem burocracia e sem letras miúdas. Confiamos na qualidade da ferramenta para manter você conosco pelos resultados gerados.',
    },
    {
      question: 'Como a trava de 10 minutos (PIN) evita furos e agendamentos falsos?',
      answer:
        'Quando um cliente escolhe um horário, esse espaço fica reservado temporariamente por 10 minutos com um cronômetro na tela. Ele recebe um PIN de 6 dígitos no WhatsApp e precisa digitar esse código para confirmar. Isso garante que o telefone realmente pertence a ele e impede reservas falsas ou bots concorrentes.',
    },
  ];

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 sm:py-28 bg-[#242933] border-t border-[#3B4252]/60 overflow-hidden">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Cabeçalho */}
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#88C0D0]/10 text-[#88C0D0] text-xs font-bold border border-[#88C0D0]/30">
            <HelpCircle className="h-3.5 w-3.5" />
            Transparência Total
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#ECEFF4] tracking-tight">
            Perguntas Frequentes
          </h2>
          <p className="text-sm sm:text-base text-[#D8DEE9]/80 max-w-xl mx-auto">
            Tudo o que você precisa saber sobre a secretária IA e a automação de agenda para o seu negócio.
          </p>
        </div>

        {/* Acordeão */}
        <div className="space-y-3.5">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;

            return (
              <div
                key={faq.question}
                className="overflow-hidden rounded-2xl border border-[#3B4252] bg-[#2E3440] transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="flex w-full items-center justify-between p-5 sm:p-6 text-left transition-colors hover:bg-[#3B4252]/40"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm sm:text-base font-bold text-[#ECEFF4] pr-4">
                    {faq.question}
                  </span>
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#242933] text-[#88C0D0] border border-[#3B4252] transition-transform duration-300 ${
                      isOpen ? 'rotate-180 bg-[#88C0D0] text-[#242933]' : ''
                    }`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                    >
                      <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-1 text-xs sm:text-sm text-[#D8DEE9]/80 leading-relaxed border-t border-[#3B4252]/60">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}